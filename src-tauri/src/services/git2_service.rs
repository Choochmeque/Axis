use crate::error::{AxisError, Result};
use crate::models::{
    Branch, BranchFilter, BranchType, Commit, FileStatus, LogOptions, Repository,
    RepositoryState, RepositoryStatus,
};
use chrono::{DateTime, Utc};
use git2::{Repository as Git2Repository, StatusOptions};
use std::path::Path;

pub struct Git2Service {
    repo: Git2Repository,
}

impl Git2Service {
    /// Open an existing repository
    pub fn open(path: &Path) -> Result<Self> {
        let repo = Git2Repository::open(path)?;
        Ok(Git2Service { repo })
    }

    /// Initialize a new repository
    pub fn init(path: &Path, bare: bool) -> Result<Self> {
        let repo = if bare {
            Git2Repository::init_bare(path)?
        } else {
            Git2Repository::init(path)?
        };
        Ok(Git2Service { repo })
    }

    /// Get repository information
    pub fn get_repository_info(&self) -> Result<Repository> {
        let path = self
            .repo
            .workdir()
            .or_else(|| self.repo.path().parent())
            .ok_or_else(|| AxisError::InvalidRepositoryPath("Unknown path".to_string()))?;

        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        let current_branch = self.get_current_branch_name();
        let state = RepositoryState::from(self.repo.state());

        Ok(Repository {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            path: path.to_path_buf(),
            is_bare: self.repo.is_bare(),
            current_branch,
            state,
        })
    }

    /// Get the current branch name
    pub fn get_current_branch_name(&self) -> Option<String> {
        self.repo
            .head()
            .ok()
            .and_then(|head| {
                if head.is_branch() {
                    head.shorthand().map(|s| s.to_string())
                } else {
                    // Detached HEAD - return short commit hash
                    head.target().map(|oid| oid.to_string()[..7].to_string())
                }
            })
    }

    /// Get repository status (staged, unstaged, untracked, conflicted files)
    pub fn status(&self) -> Result<RepositoryStatus> {
        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true)
            .include_ignored(false)
            .include_unmodified(false);

        let statuses = self.repo.statuses(Some(&mut opts))?;

        let mut result = RepositoryStatus::default();

        for entry in statuses.iter() {
            let file_status = FileStatus::from_git2_status(&entry);

            if file_status.is_conflict {
                result.conflicted.push(file_status);
            } else if file_status.staged_status.is_some() && file_status.unstaged_status.is_some() {
                // File has both staged and unstaged changes
                result.staged.push(file_status.clone());
                result.unstaged.push(file_status);
            } else if file_status.staged_status.is_some() {
                result.staged.push(file_status);
            } else if let Some(ref unstaged) = file_status.unstaged_status {
                if *unstaged == crate::models::StatusType::Untracked {
                    result.untracked.push(file_status);
                } else {
                    result.unstaged.push(file_status);
                }
            }
        }

        Ok(result)
    }

    /// Get commit history
    pub fn log(&self, options: LogOptions) -> Result<Vec<Commit>> {
        let mut revwalk = self.repo.revwalk()?;

        // Start from specified ref or HEAD
        if let Some(ref from_ref) = options.from_ref {
            let obj = self.repo.revparse_single(from_ref)?;
            revwalk.push(obj.id())?;
        } else {
            revwalk.push_head()?;
        }

        // Sort by time (newest first)
        revwalk.set_sorting(git2::Sort::TIME)?;

        let mut commits = Vec::new();
        let skip = options.skip.unwrap_or(0);
        let limit = options.limit.unwrap_or(100);

        for (i, oid_result) in revwalk.enumerate() {
            if i < skip {
                continue;
            }
            if commits.len() >= limit {
                break;
            }

            let oid = oid_result?;
            let commit = self.repo.find_commit(oid)?;
            commits.push(Commit::from_git2_commit(&commit));
        }

        Ok(commits)
    }

    /// List branches
    pub fn list_branches(&self, filter: BranchFilter) -> Result<Vec<Branch>> {
        let mut branches = Vec::new();

        let branch_type = match (filter.include_local, filter.include_remote) {
            (true, true) => None,
            (true, false) => Some(git2::BranchType::Local),
            (false, true) => Some(git2::BranchType::Remote),
            (false, false) => return Ok(branches),
        };

        let git_branches = self.repo.branches(branch_type)?;
        let head = self.repo.head().ok();
        let head_oid = head.as_ref().and_then(|h| h.target());

        for branch_result in git_branches {
            let (branch, branch_type) = branch_result?;

            if let Some(name) = branch.name()? {
                let reference = branch.get();
                let target_oid = reference.target();

                if let Some(oid) = target_oid {
                    let commit = self.repo.find_commit(oid)?;
                    let is_head = head_oid.map(|h| h == oid).unwrap_or(false);

                    let (ahead, behind) = self.get_ahead_behind(&branch)?;

                    let upstream = branch
                        .upstream()
                        .ok()
                        .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));

                    branches.push(Branch {
                        name: name.to_string(),
                        full_name: reference.name().unwrap_or(name).to_string(),
                        branch_type: match branch_type {
                            git2::BranchType::Local => BranchType::Local,
                            git2::BranchType::Remote => BranchType::Remote,
                        },
                        is_head,
                        upstream,
                        ahead,
                        behind,
                        target_oid: oid.to_string(),
                        last_commit_summary: commit.summary().unwrap_or("").to_string(),
                        last_commit_time: DateTime::from_timestamp(commit.time().seconds(), 0)
                            .unwrap_or_default()
                            .with_timezone(&Utc),
                    });
                }
            }
        }

        // Sort: current branch first, then alphabetically
        branches.sort_by(|a, b| {
            if a.is_head {
                std::cmp::Ordering::Less
            } else if b.is_head {
                std::cmp::Ordering::Greater
            } else {
                a.name.cmp(&b.name)
            }
        });

        Ok(branches)
    }

    /// Get ahead/behind counts for a branch compared to its upstream
    fn get_ahead_behind(&self, branch: &git2::Branch) -> Result<(Option<usize>, Option<usize>)> {
        let upstream = match branch.upstream() {
            Ok(u) => u,
            Err(_) => return Ok((None, None)),
        };

        let local_oid = branch.get().target();
        let upstream_oid = upstream.get().target();

        match (local_oid, upstream_oid) {
            (Some(local), Some(upstream)) => {
                let (ahead, behind) = self.repo.graph_ahead_behind(local, upstream)?;
                Ok((Some(ahead), Some(behind)))
            }
            _ => Ok((None, None)),
        }
    }

    /// Get a single commit by OID
    pub fn get_commit(&self, oid_str: &str) -> Result<Commit> {
        let oid = git2::Oid::from_str(oid_str)
            .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?;
        let commit = self.repo.find_commit(oid)?;
        Ok(Commit::from_git2_commit(&commit))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;

    fn setup_test_repo() -> (TempDir, Git2Service) {
        let tmp = TempDir::new().unwrap();
        let service = Git2Service::init(tmp.path(), false).unwrap();
        (tmp, service)
    }

    fn create_initial_commit(service: &Git2Service, tmp: &TempDir) {
        // Create a file
        let file_path = tmp.path().join("README.md");
        fs::write(&file_path, "# Test Repository").unwrap();

        // Stage the file
        let mut index = service.repo.index().unwrap();
        index.add_path(Path::new("README.md")).unwrap();
        index.write().unwrap();

        // Create commit
        let tree_id = index.write_tree().unwrap();
        let tree = service.repo.find_tree(tree_id).unwrap();
        let sig = git2::Signature::now("Test User", "test@example.com").unwrap();

        service
            .repo
            .commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
            .unwrap();
    }

    #[test]
    fn test_init_repository() {
        let tmp = TempDir::new().unwrap();
        let service = Git2Service::init(tmp.path(), false);
        assert!(service.is_ok());

        let service = service.unwrap();
        let info = service.get_repository_info().unwrap();
        assert!(!info.is_bare);
        assert_eq!(info.state, RepositoryState::Clean);
    }

    #[test]
    fn test_init_bare_repository() {
        let tmp = TempDir::new().unwrap();
        let service = Git2Service::init(tmp.path(), true).unwrap();
        let info = service.get_repository_info().unwrap();
        assert!(info.is_bare);
    }

    #[test]
    fn test_open_repository() {
        let (tmp, _) = setup_test_repo();
        let service = Git2Service::open(tmp.path());
        assert!(service.is_ok());
    }

    #[test]
    fn test_status_empty_repo() {
        let (_tmp, service) = setup_test_repo();
        let status = service.status().unwrap();
        assert!(status.staged.is_empty());
        assert!(status.unstaged.is_empty());
        assert!(status.untracked.is_empty());
        assert!(status.conflicted.is_empty());
    }

    #[test]
    fn test_status_with_untracked_file() {
        let (tmp, service) = setup_test_repo();

        // Create an untracked file
        let file_path = tmp.path().join("test.txt");
        fs::write(&file_path, "test content").unwrap();

        let status = service.status().unwrap();
        assert_eq!(status.untracked.len(), 1);
        assert_eq!(status.untracked[0].path, "test.txt");
    }

    #[test]
    fn test_log_with_commits() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let commits = service.log(LogOptions::default()).unwrap();
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].summary, "Initial commit");
    }

    #[test]
    fn test_list_branches() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let branches = service.list_branches(BranchFilter::local_only()).unwrap();
        assert!(!branches.is_empty());

        // Default branch should be main or master
        let has_default_branch = branches
            .iter()
            .any(|b| b.name == "main" || b.name == "master");
        assert!(has_default_branch);
    }

    #[test]
    fn test_get_current_branch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let branch = service.get_current_branch_name();
        assert!(branch.is_some());
    }
}
