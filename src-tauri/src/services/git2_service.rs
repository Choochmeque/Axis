use crate::error::{AxisError, Result};
use crate::models::{
    Branch, BranchFilter, BranchType, Commit, CreateTagOptions, FileStatus, LogOptions, Repository,
    RepositoryState, RepositoryStatus, Tag, TagResult, TagSignature,
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

    /// Clone a repository from a URL
    pub fn clone(url: &str, path: &Path) -> Result<Self> {
        use git2::{build::RepoBuilder, Cred, FetchOptions, RemoteCallbacks};

        let mut callbacks = RemoteCallbacks::new();

        // Set up authentication callback
        callbacks.credentials(|_url, username_from_url, allowed_types| {
            // Try SSH agent first
            if allowed_types.contains(git2::CredentialType::SSH_KEY) {
                if let Some(username) = username_from_url {
                    // Try SSH agent
                    if let Ok(cred) = Cred::ssh_key_from_agent(username) {
                        return Ok(cred);
                    }

                    // Try default SSH key locations
                    let home = std::env::var("HOME").unwrap_or_default();
                    let ssh_dir = std::path::Path::new(&home).join(".ssh");

                    // Try ed25519 key first, then RSA
                    for key_name in &["id_ed25519", "id_rsa"] {
                        let private_key = ssh_dir.join(key_name);
                        if private_key.exists() {
                            let public_key = ssh_dir.join(format!("{}.pub", key_name));
                            let public_key_opt = if public_key.exists() {
                                Some(public_key.as_path())
                            } else {
                                None
                            };

                            if let Ok(cred) =
                                Cred::ssh_key(username, public_key_opt, &private_key, None)
                            {
                                return Ok(cred);
                            }
                        }
                    }
                }
            }

            // Try credential helper for HTTPS
            if allowed_types.contains(git2::CredentialType::USER_PASS_PLAINTEXT) {
                if let Ok(cred) = Cred::credential_helper(
                    &git2::Config::open_default().unwrap_or_else(|_| {
                        git2::Config::new().expect("should create empty config")
                    }),
                    _url,
                    username_from_url,
                ) {
                    return Ok(cred);
                }
            }

            // Default credentials (for public repos)
            if allowed_types.contains(git2::CredentialType::DEFAULT) {
                return Cred::default();
            }

            Err(git2::Error::from_str("No valid credentials found"))
        });

        // Set up fetch options with callbacks
        let mut fetch_options = FetchOptions::new();
        fetch_options.remote_callbacks(callbacks);

        // Build and execute clone
        let repo = RepoBuilder::new()
            .fetch_options(fetch_options)
            .clone(url, path)?;

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

    /// Get git user signature (name and email from config)
    pub fn get_user_signature(&self) -> Result<(String, String)> {
        let sig = self.repo.signature()?;
        let name = sig.name().unwrap_or("Unknown").to_string();
        let email = sig.email().unwrap_or("unknown@example.com").to_string();
        Ok((name, email))
    }

    /// Get the current branch name
    pub fn get_current_branch_name(&self) -> Option<String> {
        self.repo.head().ok().and_then(|head| {
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

        for branch_result in git_branches {
            let (branch, branch_type) = branch_result?;

            if let Some(name) = branch.name()? {
                let reference = branch.get();
                let target_oid = reference.target();

                if let Some(oid) = target_oid {
                    let commit = self.repo.find_commit(oid)?;
                    let is_head = branch.is_head();

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

    // ==================== Staging Operations ====================

    /// Stage a file (add to index)
    pub fn stage_file(&self, path: &str) -> Result<()> {
        let mut index = self.repo.index()?;
        let full_path = self.repo.workdir().ok_or_else(|| AxisError::Other("bare repository has no workdir".into()))?.join(path);
        if full_path.exists() {
            index.add_path(Path::new(path))?;
        } else {
            index.remove_path(Path::new(path))?;
        }
        index.write()?;
        Ok(())
    }

    /// Stage multiple files
    pub fn stage_files(&self, paths: &[String]) -> Result<()> {
        let mut index = self.repo.index()?;
        let workdir = self.repo.workdir().ok_or_else(|| AxisError::Other("bare repository has no workdir".into()))?;
        for path in paths {
            let full_path = workdir.join(path);
            if full_path.exists() {
                index.add_path(Path::new(path))?;
            } else {
                index.remove_path(Path::new(path))?;
            }
        }
        index.write()?;
        Ok(())
    }

    /// Stage all changes (equivalent to git add -A)
    pub fn stage_all(&self) -> Result<()> {
        let mut index = self.repo.index()?;
        index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
        index.write()?;
        Ok(())
    }

    /// Unstage a file (remove from index, keeping workdir changes)
    pub fn unstage_file(&self, path: &str) -> Result<()> {
        let head = self.repo.head()?;
        let head_commit = head.peel_to_commit()?;
        let head_tree = head_commit.tree()?;

        let mut index = self.repo.index()?;

        // Check if file exists in HEAD
        if let Ok(entry) = head_tree.get_path(Path::new(path)) {
            // File exists in HEAD - reset to HEAD version
            let obj = entry.to_object(&self.repo)?;
            if let Some(blob) = obj.as_blob() {
                index.add(&git2::IndexEntry {
                    ctime: git2::IndexTime::new(0, 0),
                    mtime: git2::IndexTime::new(0, 0),
                    dev: 0,
                    ino: 0,
                    mode: entry.filemode() as u32,
                    uid: 0,
                    gid: 0,
                    file_size: blob.size() as u32,
                    id: entry.id(),
                    flags: 0,
                    flags_extended: 0,
                    path: path.as_bytes().to_vec(),
                })?;
            }
        } else {
            // File is new (not in HEAD) - remove from index entirely
            index.remove_path(Path::new(path))?;
        }

        index.write()?;
        Ok(())
    }

    /// Unstage multiple files
    pub fn unstage_files(&self, paths: &[String]) -> Result<()> {
        for path in paths {
            self.unstage_file(path)?;
        }
        Ok(())
    }

    /// Unstage all files (reset index to HEAD)
    pub fn unstage_all(&self) -> Result<()> {
        let head = self.repo.head()?;
        let head_commit = head.peel_to_commit()?;
        self.repo
            .reset(head_commit.as_object(), git2::ResetType::Mixed, None)?;
        Ok(())
    }

    /// Discard changes in a file (revert to index or HEAD)
    pub fn discard_file(&self, path: &str) -> Result<()> {
        let mut checkout_opts = git2::build::CheckoutBuilder::new();
        checkout_opts.force();
        checkout_opts.path(path);

        self.repo.checkout_index(None, Some(&mut checkout_opts))?;
        Ok(())
    }

    /// Discard all unstaged changes
    pub fn discard_all(&self) -> Result<()> {
        let mut checkout_opts = git2::build::CheckoutBuilder::new();
        checkout_opts.force();

        self.repo.checkout_index(None, Some(&mut checkout_opts))?;
        Ok(())
    }

    // ==================== Commit Operations ====================

    /// Create a new commit
    pub fn create_commit(
        &self,
        message: &str,
        author_name: Option<&str>,
        author_email: Option<&str>,
    ) -> Result<String> {
        let mut index = self.repo.index()?;
        let tree_id = index.write_tree()?;
        let tree = self.repo.find_tree(tree_id)?;

        // Get signature
        let sig = if let (Some(name), Some(email)) = (author_name, author_email) {
            git2::Signature::now(name, email)?
        } else {
            self.repo.signature()?
        };

        // Get parent commit(s)
        let parents = if let Ok(head) = self.repo.head() {
            if let Ok(commit) = head.peel_to_commit() {
                vec![commit]
            } else {
                vec![]
            }
        } else {
            vec![]
        };

        let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

        let oid = self
            .repo
            .commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)?;

        Ok(oid.to_string())
    }

    /// Amend the last commit
    pub fn amend_commit(&self, message: Option<&str>) -> Result<String> {
        let head = self.repo.head()?;
        let head_commit = head.peel_to_commit()?;

        let mut index = self.repo.index()?;
        let tree_id = index.write_tree()?;
        let tree = self.repo.find_tree(tree_id)?;

        let message = message.unwrap_or_else(|| head_commit.message().unwrap_or(""));

        let oid = head_commit.amend(
            Some("HEAD"),
            None, // Keep original author
            None, // Keep original committer
            None, // Keep original message encoding
            Some(message),
            Some(&tree),
        )?;

        Ok(oid.to_string())
    }

    // ==================== Diff Operations ====================

    /// Generate diff for unstaged changes (workdir vs index)
    pub fn diff_workdir(
        &self,
        options: &crate::models::DiffOptions,
    ) -> Result<Vec<crate::models::FileDiff>> {
        let mut diff_opts = git2::DiffOptions::new();
        self.apply_diff_options(&mut diff_opts, options);
        // Include untracked files in the diff with their content
        diff_opts.include_untracked(true);
        diff_opts.show_untracked_content(true);

        let diff = self
            .repo
            .diff_index_to_workdir(None, Some(&mut diff_opts))?;
        self.parse_diff(&diff)
    }

    /// Generate diff for staged changes (index vs HEAD)
    pub fn diff_staged(
        &self,
        options: &crate::models::DiffOptions,
    ) -> Result<Vec<crate::models::FileDiff>> {
        let mut diff_opts = git2::DiffOptions::new();
        self.apply_diff_options(&mut diff_opts, options);

        let head = self.repo.head()?.peel_to_tree()?;
        let diff = self
            .repo
            .diff_tree_to_index(Some(&head), None, Some(&mut diff_opts))?;
        self.parse_diff(&diff)
    }

    /// Generate diff for all uncommitted changes (workdir vs HEAD)
    pub fn diff_head(
        &self,
        options: &crate::models::DiffOptions,
    ) -> Result<Vec<crate::models::FileDiff>> {
        let mut diff_opts = git2::DiffOptions::new();
        self.apply_diff_options(&mut diff_opts, options);
        // Include untracked files in the diff with their content
        diff_opts.include_untracked(true);
        diff_opts.show_untracked_content(true);

        let head = self.repo.head()?.peel_to_tree()?;
        let diff = self
            .repo
            .diff_tree_to_workdir_with_index(Some(&head), Some(&mut diff_opts))?;
        self.parse_diff(&diff)
    }

    /// Generate diff for a specific commit (commit vs its parent)
    pub fn diff_commit(
        &self,
        oid_str: &str,
        options: &crate::models::DiffOptions,
    ) -> Result<Vec<crate::models::FileDiff>> {
        let oid = git2::Oid::from_str(oid_str)
            .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?;
        let commit = self.repo.find_commit(oid)?;
        let tree = commit.tree()?;

        let mut diff_opts = git2::DiffOptions::new();
        self.apply_diff_options(&mut diff_opts, options);

        let parent_tree = if commit.parent_count() > 0 {
            Some(commit.parent(0)?.tree()?)
        } else {
            None
        };

        let diff =
            self.repo
                .diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))?;

        self.parse_diff(&diff)
    }

    /// Generate diff between two commits
    pub fn diff_commits(
        &self,
        from_oid: &str,
        to_oid: &str,
        options: &crate::models::DiffOptions,
    ) -> Result<Vec<crate::models::FileDiff>> {
        let from = git2::Oid::from_str(from_oid)
            .map_err(|_| AxisError::InvalidReference(from_oid.to_string()))?;
        let to = git2::Oid::from_str(to_oid)
            .map_err(|_| AxisError::InvalidReference(to_oid.to_string()))?;

        let from_commit = self.repo.find_commit(from)?;
        let to_commit = self.repo.find_commit(to)?;

        let from_tree = from_commit.tree()?;
        let to_tree = to_commit.tree()?;

        let mut diff_opts = git2::DiffOptions::new();
        self.apply_diff_options(&mut diff_opts, options);

        let diff =
            self.repo
                .diff_tree_to_tree(Some(&from_tree), Some(&to_tree), Some(&mut diff_opts))?;

        self.parse_diff(&diff)
    }

    /// Get diff for a single file (staged or unstaged)
    pub fn diff_file(
        &self,
        path: &str,
        staged: bool,
        options: &crate::models::DiffOptions,
    ) -> Result<Option<crate::models::FileDiff>> {
        let diffs = if staged {
            self.diff_staged(options)?
        } else {
            self.diff_workdir(options)?
        };

        Ok(diffs.into_iter().find(|d| {
            d.new_path.as_ref().map(|p| p == path).unwrap_or(false)
                || d.old_path.as_ref().map(|p| p == path).unwrap_or(false)
        }))
    }

    /// Apply diff options to git2 DiffOptions
    fn apply_diff_options(
        &self,
        opts: &mut git2::DiffOptions,
        custom: &crate::models::DiffOptions,
    ) {
        if let Some(context) = custom.context_lines {
            opts.context_lines(context);
        }
        if let Some(true) = custom.ignore_whitespace {
            opts.ignore_whitespace(true);
        }
        if let Some(true) = custom.ignore_whitespace_eol {
            opts.ignore_whitespace_eol(true);
        }
    }

    // ==================== Branch Operations ====================

    /// Create a new branch
    pub fn create_branch(
        &self,
        name: &str,
        options: &crate::models::CreateBranchOptions,
    ) -> Result<Branch> {
        let target = if let Some(ref start_point) = options.start_point {
            let obj = self.repo.revparse_single(start_point)?;
            self.repo.find_commit(obj.id())?
        } else {
            self.repo.head()?.peel_to_commit()?
        };

        let mut branch = self.repo.branch(name, &target, options.force)?;

        // Set up tracking if specified
        if let Some(ref upstream) = options.track {
            branch.set_upstream(Some(upstream))?;
        }

        self.branch_to_model(&branch, git2::BranchType::Local)
    }

    /// Delete a branch
    pub fn delete_branch(&self, name: &str, force: bool) -> Result<()> {
        let mut branch = self.repo.find_branch(name, git2::BranchType::Local)?;

        if !force {
            // Check if branch is fully merged
            let head = self.repo.head()?;
            if let Ok(head_commit) = head.peel_to_commit() {
                let branch_commit = branch.get().peel_to_commit()?;
                let merge_base = self.repo.merge_base(head_commit.id(), branch_commit.id())?;
                if merge_base != branch_commit.id() {
                    return Err(AxisError::BranchNotMerged(name.to_string()));
                }
            }
        }

        branch.delete()?;
        Ok(())
    }

    /// Rename a branch
    pub fn rename_branch(&self, old_name: &str, new_name: &str, force: bool) -> Result<Branch> {
        let mut branch = self.repo.find_branch(old_name, git2::BranchType::Local)?;
        let new_branch = branch.rename(new_name, force)?;
        self.branch_to_model(&new_branch, git2::BranchType::Local)
    }

    /// Checkout a branch
    pub fn checkout_branch(
        &self,
        name: &str,
        options: &crate::models::CheckoutOptions,
    ) -> Result<()> {
        // If create is true and branch doesn't exist, create it first
        let branch = if options.create {
            match self.repo.find_branch(name, git2::BranchType::Local) {
                Ok(b) => b,
                Err(_) => {
                    let head = self.repo.head()?.peel_to_commit()?;
                    let mut new_branch = self.repo.branch(name, &head, false)?;

                    // Set up tracking if specified
                    if let Some(ref upstream) = options.track {
                        new_branch.set_upstream(Some(upstream))?;
                    }

                    new_branch
                }
            }
        } else {
            self.repo.find_branch(name, git2::BranchType::Local)?
        };

        let refname = branch
            .get()
            .name()
            .ok_or_else(|| AxisError::InvalidReference(name.to_string()))?;

        let obj = self.repo.revparse_single(refname)?;

        let mut checkout_builder = git2::build::CheckoutBuilder::new();
        if options.force {
            checkout_builder.force();
        } else {
            checkout_builder.safe();
        }

        self.repo.checkout_tree(&obj, Some(&mut checkout_builder))?;
        self.repo.set_head(refname)?;

        Ok(())
    }

    /// Checkout a remote branch (creates local tracking branch)
    pub fn checkout_remote_branch(
        &self,
        remote_name: &str,
        branch_name: &str,
        local_name: Option<&str>,
    ) -> Result<()> {
        let local_branch_name = local_name.unwrap_or(branch_name);
        let remote_ref = format!("{}/{}", remote_name, branch_name);

        // Find the remote branch
        let remote_branch = self
            .repo
            .find_branch(&remote_ref, git2::BranchType::Remote)?;
        let target = remote_branch.get().peel_to_commit()?;

        // Create local branch
        let mut local_branch = self.repo.branch(local_branch_name, &target, false)?;

        // Set upstream
        local_branch.set_upstream(Some(&remote_ref))?;

        // Checkout the new branch
        self.checkout_branch(
            local_branch_name,
            &crate::models::CheckoutOptions::default(),
        )
    }

    /// Get branch details
    pub fn get_branch(&self, name: &str, branch_type: BranchType) -> Result<Branch> {
        let git_branch_type = match branch_type {
            BranchType::Local => git2::BranchType::Local,
            BranchType::Remote => git2::BranchType::Remote,
        };
        let branch = self.repo.find_branch(name, git_branch_type)?;
        self.branch_to_model(&branch, git_branch_type)
    }

    /// Convert a git2 Branch to our Branch model
    fn branch_to_model(
        &self,
        branch: &git2::Branch,
        branch_type: git2::BranchType,
    ) -> Result<Branch> {
        let name = branch.name()?.unwrap_or("").to_string();
        let reference = branch.get();
        let oid = reference
            .target()
            .ok_or_else(|| AxisError::InvalidReference(name.clone()))?;

        let commit = self.repo.find_commit(oid)?;
        // Use branch.is_head() to check if this branch is currently checked out
        let is_head = branch.is_head();

        let (ahead, behind) = self.get_ahead_behind(branch)?;
        let upstream = branch
            .upstream()
            .ok()
            .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));

        Ok(Branch {
            name: name.clone(),
            full_name: reference.name().unwrap_or(&name).to_string(),
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
        })
    }

    // ==================== Remote Operations ====================

    /// List all remotes
    pub fn list_remotes(&self) -> Result<Vec<crate::models::Remote>> {
        let remote_names = self.repo.remotes()?;
        let mut remotes = Vec::new();

        for name in remote_names.iter().flatten() {
            if let Ok(remote) = self.repo.find_remote(name) {
                remotes.push(crate::models::Remote {
                    name: name.to_string(),
                    url: remote.url().map(|s| s.to_string()),
                    push_url: remote.pushurl().map(|s| s.to_string()),
                    fetch_refspecs: remote
                        .fetch_refspecs()?
                        .iter()
                        .flatten()
                        .map(|s| s.to_string())
                        .collect(),
                    push_refspecs: remote
                        .push_refspecs()?
                        .iter()
                        .flatten()
                        .map(|s| s.to_string())
                        .collect(),
                });
            }
        }

        Ok(remotes)
    }

    /// Get a single remote by name
    pub fn get_remote(&self, name: &str) -> Result<crate::models::Remote> {
        let remote = self.repo.find_remote(name)?;
        Ok(crate::models::Remote {
            name: name.to_string(),
            url: remote.url().map(|s| s.to_string()),
            push_url: remote.pushurl().map(|s| s.to_string()),
            fetch_refspecs: remote
                .fetch_refspecs()?
                .iter()
                .flatten()
                .map(|s| s.to_string())
                .collect(),
            push_refspecs: remote
                .push_refspecs()?
                .iter()
                .flatten()
                .map(|s| s.to_string())
                .collect(),
        })
    }

    /// Add a new remote
    pub fn add_remote(&self, name: &str, url: &str) -> Result<crate::models::Remote> {
        let remote = self.repo.remote(name, url)?;
        Ok(crate::models::Remote {
            name: name.to_string(),
            url: remote.url().map(|s| s.to_string()),
            push_url: remote.pushurl().map(|s| s.to_string()),
            fetch_refspecs: remote
                .fetch_refspecs()?
                .iter()
                .flatten()
                .map(|s| s.to_string())
                .collect(),
            push_refspecs: remote
                .push_refspecs()?
                .iter()
                .flatten()
                .map(|s| s.to_string())
                .collect(),
        })
    }

    /// Remove a remote
    pub fn remove_remote(&self, name: &str) -> Result<()> {
        self.repo.remote_delete(name)?;
        Ok(())
    }

    /// Rename a remote
    pub fn rename_remote(&self, old_name: &str, new_name: &str) -> Result<Vec<String>> {
        let problems = self.repo.remote_rename(old_name, new_name)?;
        Ok(problems.iter().flatten().map(|s| s.to_string()).collect())
    }

    /// Set the URL for a remote
    pub fn set_remote_url(&self, name: &str, url: &str) -> Result<()> {
        self.repo.remote_set_url(name, url)?;
        Ok(())
    }

    /// Set the push URL for a remote
    pub fn set_remote_push_url(&self, name: &str, url: &str) -> Result<()> {
        self.repo.remote_set_pushurl(name, Some(url))?;
        Ok(())
    }

    /// Fetch from a remote
    pub fn fetch(
        &self,
        remote_name: &str,
        options: &crate::models::FetchOptions,
        refspecs: Option<&[&str]>,
    ) -> Result<crate::models::FetchResult> {
        let mut remote = self.repo.find_remote(remote_name)?;

        let mut fetch_opts = git2::FetchOptions::new();

        // Set up callbacks for progress and credentials
        let mut callbacks = git2::RemoteCallbacks::new();
        callbacks.credentials(|_url, username_from_url, allowed_types| {
            // Try SSH agent first
            if allowed_types.contains(git2::CredentialType::SSH_KEY) {
                if let Some(username) = username_from_url {
                    return git2::Cred::ssh_key_from_agent(username);
                }
            }

            // Try default credentials
            if allowed_types.contains(git2::CredentialType::DEFAULT) {
                return git2::Cred::default();
            }

            Err(git2::Error::from_str("no valid credentials found"))
        });

        fetch_opts.remote_callbacks(callbacks);

        if options.prune {
            fetch_opts.prune(git2::FetchPrune::On);
        }

        if options.tags {
            fetch_opts.download_tags(git2::AutotagOption::All);
        }

        if let Some(depth) = options.depth {
            fetch_opts.depth(depth as i32);
        }

        // Perform fetch
        let default_refspecs: Vec<&str> = vec![];
        let specs = refspecs.unwrap_or(&default_refspecs);
        remote.fetch(specs, Some(&mut fetch_opts), None)?;

        // Get fetch stats
        let stats = remote.stats();

        Ok(crate::models::FetchResult {
            remote: remote_name.to_string(),
            updated_refs: Vec::new(), // TODO: track updated refs
            stats: crate::models::FetchProgress {
                total_objects: stats.total_objects(),
                indexed_objects: stats.indexed_objects(),
                received_objects: stats.received_objects(),
                local_objects: stats.local_objects(),
                total_deltas: stats.total_deltas(),
                indexed_deltas: stats.indexed_deltas(),
                received_bytes: stats.received_bytes(),
            },
        })
    }

    /// Push to a remote
    pub fn push(
        &self,
        remote_name: &str,
        refspecs: &[String],
        options: &crate::models::PushOptions,
    ) -> Result<crate::models::PushResult> {
        let mut remote = self.repo.find_remote(remote_name)?;

        let mut push_opts = git2::PushOptions::new();

        // Set up callbacks for credentials
        let mut callbacks = git2::RemoteCallbacks::new();
        callbacks.credentials(|_url, username_from_url, allowed_types| {
            // Try SSH agent first
            if allowed_types.contains(git2::CredentialType::SSH_KEY) {
                if let Some(username) = username_from_url {
                    return git2::Cred::ssh_key_from_agent(username);
                }
            }

            // Try default credentials
            if allowed_types.contains(git2::CredentialType::DEFAULT) {
                return git2::Cred::default();
            }

            Err(git2::Error::from_str("no valid credentials found"))
        });

        push_opts.remote_callbacks(callbacks);

        // Build refspecs with force prefix if needed
        let refspecs: Vec<String> = if options.force {
            refspecs
                .iter()
                .map(|r| {
                    if r.starts_with('+') {
                        r.clone()
                    } else {
                        format!("+{}", r)
                    }
                })
                .collect()
        } else {
            refspecs.to_vec()
        };

        let refspec_strs: Vec<&str> = refspecs.iter().map(|s| s.as_str()).collect();

        remote.push(&refspec_strs, Some(&mut push_opts))?;

        Ok(crate::models::PushResult {
            remote: remote_name.to_string(),
            pushed_refs: Vec::new(), // TODO: track pushed refs
        })
    }

    /// Push the current branch to its upstream
    pub fn push_current_branch(
        &self,
        remote_name: &str,
        options: &crate::models::PushOptions,
    ) -> Result<crate::models::PushResult> {
        let head = self.repo.head()?;
        let branch_name = head
            .shorthand()
            .ok_or_else(|| AxisError::BranchNotFound("HEAD".to_string()))?;

        let refspec = format!("refs/heads/{}:refs/heads/{}", branch_name, branch_name);
        self.push(remote_name, &[refspec], options)
    }

    /// Pull from a remote (fetch + merge/rebase)
    /// Note: Full merge/rebase requires CLI for complex cases
    pub fn pull(
        &self,
        remote_name: &str,
        branch_name: &str,
        options: &crate::models::PullOptions,
    ) -> Result<()> {
        // First, fetch
        self.fetch(remote_name, &crate::models::FetchOptions::default(), None)?;

        // Get the remote tracking branch
        let remote_ref = format!("{}/{}", remote_name, branch_name);
        let fetch_head = self
            .repo
            .find_reference(&format!("refs/remotes/{}", remote_ref))?;
        let fetch_commit = fetch_head.peel_to_commit()?;

        // Get local branch commit
        let local_ref = self.repo.head()?;
        let local_commit = local_ref.peel_to_commit()?;

        // Check if we can fast-forward
        let (ahead, behind) = self
            .repo
            .graph_ahead_behind(local_commit.id(), fetch_commit.id())?;

        if behind == 0 {
            // Already up to date
            return Ok(());
        }

        if ahead == 0 {
            // Can fast-forward
            let refname = local_ref
                .name()
                .ok_or_else(|| AxisError::InvalidReference("HEAD".to_string()))?;

            self.repo.reference(
                refname,
                fetch_commit.id(),
                true,
                &format!("pull: fast-forward {} from {}", branch_name, remote_ref),
            )?;

            // Update working directory
            let mut checkout_opts = git2::build::CheckoutBuilder::new();
            checkout_opts.force();
            self.repo.checkout_head(Some(&mut checkout_opts))?;

            return Ok(());
        }

        if options.ff_only {
            return Err(AxisError::CannotFastForward);
        }

        // For non-fast-forward cases, we need to merge or rebase
        // This is complex and better handled by Git CLI for now
        if options.rebase {
            return Err(AxisError::RebaseRequired);
        }

        // Perform merge using git2
        let annotated = self.repo.find_annotated_commit(fetch_commit.id())?;
        let (analysis, _preference) = self.repo.merge_analysis(&[&annotated])?;

        if analysis.is_up_to_date() {
            return Ok(());
        }

        if analysis.is_fast_forward() {
            // Already handled above, but just in case
            let refname = local_ref
                .name()
                .ok_or_else(|| AxisError::InvalidReference("HEAD".to_string()))?;

            self.repo
                .reference(refname, fetch_commit.id(), true, "fast-forward merge")?;
            self.repo
                .checkout_head(Some(&mut git2::build::CheckoutBuilder::new().force()))?;
            return Ok(());
        }

        if analysis.is_normal() {
            // Perform merge
            self.repo.merge(&[&annotated], None, None)?;

            // Check for conflicts
            if self.repo.index()?.has_conflicts() {
                return Err(AxisError::MergeConflict);
            }

            // Create merge commit
            let tree_id = self.repo.index()?.write_tree()?;
            let tree = self.repo.find_tree(tree_id)?;
            let sig = self.repo.signature()?;
            let message = format!("Merge branch '{}' of {}", branch_name, remote_name);

            self.repo.commit(
                Some("HEAD"),
                &sig,
                &sig,
                &message,
                &tree,
                &[&local_commit, &fetch_commit],
            )?;

            // Clean up merge state
            self.repo.cleanup_state()?;
        }

        Ok(())
    }

    /// Set upstream tracking branch for a local branch
    pub fn set_branch_upstream(&self, branch_name: &str, upstream: Option<&str>) -> Result<()> {
        let mut branch = self
            .repo
            .find_branch(branch_name, git2::BranchType::Local)?;
        branch.set_upstream(upstream)?;
        Ok(())
    }

    /// Parse a git2 Diff into our FileDiff model
    fn parse_diff(&self, diff: &git2::Diff) -> Result<Vec<crate::models::FileDiff>> {
        use crate::models::{DiffHunk, DiffLine, DiffLineType, DiffStatus, FileDiff};
        use std::cell::RefCell;

        let files: RefCell<Vec<FileDiff>> = RefCell::new(Vec::new());
        let current_hunks: RefCell<Vec<DiffHunk>> = RefCell::new(Vec::new());
        let current_lines: RefCell<Vec<DiffLine>> = RefCell::new(Vec::new());

        diff.foreach(
            &mut |delta, _progress| {
                // Finalize previous file's hunks
                {
                    let mut files = files.borrow_mut();
                    let mut hunks = current_hunks.borrow_mut();
                    let lines = current_lines.borrow_mut();

                    if let Some(last_hunk) = hunks.last_mut() {
                        last_hunk.lines = lines.clone();
                    }

                    if let Some(last_file) = files.last_mut() {
                        last_file.hunks = hunks.clone();
                    }

                    hunks.clear();
                }
                current_lines.borrow_mut().clear();

                let status = match delta.status() {
                    git2::Delta::Added => DiffStatus::Added,
                    git2::Delta::Deleted => DiffStatus::Deleted,
                    git2::Delta::Modified => DiffStatus::Modified,
                    git2::Delta::Renamed => DiffStatus::Renamed,
                    git2::Delta::Copied => DiffStatus::Copied,
                    git2::Delta::Typechange => DiffStatus::TypeChanged,
                    git2::Delta::Untracked => DiffStatus::Untracked,
                    git2::Delta::Conflicted => DiffStatus::Conflicted,
                    _ => DiffStatus::Modified,
                };

                let old_file = delta.old_file();
                let new_file = delta.new_file();

                files.borrow_mut().push(FileDiff {
                    old_path: old_file.path().map(|p| p.to_string_lossy().to_string()),
                    new_path: new_file.path().map(|p| p.to_string_lossy().to_string()),
                    old_oid: if old_file.id().is_zero() {
                        None
                    } else {
                        Some(old_file.id().to_string())
                    },
                    new_oid: if new_file.id().is_zero() {
                        None
                    } else {
                        Some(new_file.id().to_string())
                    },
                    status,
                    binary: delta.flags().is_binary(),
                    hunks: Vec::new(),
                    additions: 0,
                    deletions: 0,
                });

                true
            },
            None, // Binary callback
            Some(&mut |_delta, hunk| {
                // Finalize previous hunk's lines
                {
                    let mut hunks = current_hunks.borrow_mut();
                    let lines = current_lines.borrow_mut();

                    if let Some(last_hunk) = hunks.last_mut() {
                        last_hunk.lines = lines.clone();
                    }
                }
                current_lines.borrow_mut().clear();

                let header = String::from_utf8_lossy(hunk.header()).to_string();

                current_hunks.borrow_mut().push(DiffHunk {
                    header,
                    old_start: hunk.old_start(),
                    old_lines: hunk.old_lines(),
                    new_start: hunk.new_start(),
                    new_lines: hunk.new_lines(),
                    lines: Vec::new(),
                });

                true
            }),
            Some(&mut |_delta, _hunk, line| {
                let line_type = match line.origin() {
                    '+' => DiffLineType::Addition,
                    '-' => DiffLineType::Deletion,
                    ' ' => DiffLineType::Context,
                    '=' | '>' | '<' => DiffLineType::Header,
                    'B' => DiffLineType::Binary,
                    _ => DiffLineType::Context,
                };

                let content = String::from_utf8_lossy(line.content()).to_string();

                current_lines.borrow_mut().push(DiffLine {
                    line_type,
                    content,
                    old_line_no: line.old_lineno(),
                    new_line_no: line.new_lineno(),
                });

                // Update stats in the current file
                let mut files = files.borrow_mut();
                if let Some(file) = files.last_mut() {
                    match line.origin() {
                        '+' => file.additions += 1,
                        '-' => file.deletions += 1,
                        _ => {}
                    }
                }

                true
            }),
        )?;

        // Finalize the last file and hunk
        {
            let mut files = files.borrow_mut();
            let mut hunks = current_hunks.borrow_mut();
            let lines = current_lines.borrow();

            if let Some(last_hunk) = hunks.last_mut() {
                last_hunk.lines = lines.clone();
            }

            if let Some(last_file) = files.last_mut() {
                last_file.hunks = hunks.clone();
            }
        }

        Ok(files.into_inner())
    }

    // ==================== Graph Operations ====================

    /// Build a commit graph with lane assignments for visualization
    pub fn build_graph(
        &self,
        options: crate::models::GraphOptions,
    ) -> Result<crate::models::GraphResult> {
        use crate::models::{
            CommitRef, EdgeType, GraphCommit, GraphEdge, GraphResult, LaneState, RefType,
        };

        let mut revwalk = self.repo.revwalk()?;

        // Configure revwalk
        if options.all_branches {
            // Add all branches
            for branch_result in self.repo.branches(None)? {
                let (branch, _) = branch_result?;
                if let Some(oid) = branch.get().target() {
                    let _ = revwalk.push(oid);
                }
            }
        } else if let Some(ref from_ref) = options.from_ref {
            let obj = self.repo.revparse_single(from_ref)?;
            revwalk.push(obj.id())?;
        } else {
            revwalk.push_head()?;
        }

        // Sort topologically with time as secondary
        revwalk.set_sorting(git2::Sort::TOPOLOGICAL | git2::Sort::TIME)?;

        // Collect refs for each commit
        let commit_refs = self.collect_commit_refs()?;

        // Process commits and build graph
        let mut lane_state = LaneState::new();
        let mut graph_commits = Vec::new();
        let skip = options.skip.unwrap_or(0);
        let limit = options.limit.unwrap_or(100);
        let mut total_count = 0;

        for oid_result in revwalk {
            let oid = oid_result?;
            total_count += 1;

            if total_count <= skip {
                continue;
            }

            if graph_commits.len() >= limit {
                continue; // Keep counting for total
            }

            let commit = self.repo.find_commit(oid)?;
            let oid_str = oid.to_string();

            // Get lane for this commit
            let (lane, is_new_lane) = lane_state.get_lane_for_commit(&oid_str);

            // Build parent edges
            let parent_oids: Vec<String> = commit.parent_ids().map(|id| id.to_string()).collect();
            let mut parent_edges = Vec::new();

            for (i, parent_oid) in parent_oids.iter().enumerate() {
                // First parent continues on the same lane unless this is a branch boundary.
                let parent_lane = if i == 0 {
                    lane_state.find_lane(parent_oid).unwrap_or(lane)
                } else {
                    lane_state.get_parent_lane(parent_oid)
                };

                let edge_type = if i == 0 {
                    if parent_lane == lane && !is_new_lane {
                        EdgeType::Straight
                    } else {
                        EdgeType::Branch
                    }
                } else {
                    EdgeType::Merge
                };

                parent_edges.push(GraphEdge {
                    parent_oid: parent_oid.clone(),
                    parent_lane,
                    edge_type,
                });
            }

            // Update lane state
            lane_state.process_commit(&oid_str, lane, &parent_oids);

            // Get refs for this commit
            let refs = commit_refs.get(&oid_str).cloned().unwrap_or_default();

            graph_commits.push(GraphCommit {
                commit: Commit::from_git2_commit(&commit),
                lane,
                parent_edges,
                refs,
            });
        }

        let max_lane = graph_commits.iter().map(|c| c.lane).max().unwrap_or(0);
        let has_more = total_count > skip + graph_commits.len();

        Ok(GraphResult {
            commits: graph_commits,
            total_count,
            max_lane,
            has_more,
        })
    }

    /// Collect all refs (branches and tags) and map them to commit OIDs
    fn collect_commit_refs(
        &self,
    ) -> Result<std::collections::HashMap<String, Vec<crate::models::CommitRef>>> {
        use crate::models::{CommitRef, RefType};
        use std::collections::HashMap;

        let mut commit_refs: HashMap<String, Vec<CommitRef>> = HashMap::new();

        // Get HEAD for is_head check
        let head_oid = self.repo.head().ok().and_then(|h| h.target());

        // Collect branches
        for branch_result in self.repo.branches(None)? {
            let (branch, branch_type) = branch_result?;
            if let (Some(name), Some(oid)) = (branch.name()?, branch.get().target()) {
                let oid_str = oid.to_string();
                let ref_type = match branch_type {
                    git2::BranchType::Local => RefType::LocalBranch,
                    git2::BranchType::Remote => RefType::RemoteBranch,
                };
                let is_head = head_oid.map(|h| h == oid).unwrap_or(false) && branch.is_head();

                commit_refs.entry(oid_str).or_default().push(CommitRef {
                    name: name.to_string(),
                    ref_type,
                    is_head,
                });
            }
        }

        // Collect tags
        self.repo.tag_foreach(|oid, name| {
            let name_str = String::from_utf8_lossy(name);
            // Remove "refs/tags/" prefix
            let short_name = name_str.strip_prefix("refs/tags/").unwrap_or(&name_str);

            // Resolve annotated tags to their target commit
            let target_oid = if let Ok(tag) = self.repo.find_tag(oid) {
                tag.target_id()
            } else {
                oid
            };

            commit_refs
                .entry(target_oid.to_string())
                .or_default()
                .push(CommitRef {
                    name: short_name.to_string(),
                    ref_type: RefType::Tag,
                    is_head: false,
                });
            true
        })?;

        Ok(commit_refs)
    }

    // ==================== Search Operations ====================

    /// Search commits by message, author, or hash
    pub fn search_commits(
        &self,
        options: crate::models::SearchOptions,
    ) -> Result<crate::models::SearchResult> {
        use crate::models::SearchResult;

        let query = options.query.to_lowercase();
        let limit = options.limit.unwrap_or(50);

        let mut revwalk = self.repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        let mut matches = Vec::new();
        let mut total_matches = 0;

        for oid_result in revwalk {
            let oid = oid_result?;
            let commit = self.repo.find_commit(oid)?;

            let mut is_match = false;

            // Search in hash
            if options.search_hash {
                let oid_str = oid.to_string().to_lowercase();
                if oid_str.starts_with(&query) || oid_str.contains(&query) {
                    is_match = true;
                }
            }

            // Search in message
            if !is_match && options.search_message {
                if let Some(message) = commit.message() {
                    if message.to_lowercase().contains(&query) {
                        is_match = true;
                    }
                }
            }

            // Search in author
            if !is_match && options.search_author {
                let author = commit.author();
                if let Some(name) = author.name() {
                    if name.to_lowercase().contains(&query) {
                        is_match = true;
                    }
                }
                if !is_match {
                    if let Some(email) = author.email() {
                        if email.to_lowercase().contains(&query) {
                            is_match = true;
                        }
                    }
                }
            }

            if is_match {
                total_matches += 1;
                if matches.len() < limit {
                    matches.push(Commit::from_git2_commit(&commit));
                }
            }
        }

        Ok(SearchResult {
            commits: matches,
            total_matches,
        })
    }

    // ==================== Blame Operations ====================

    /// Get blame information for a file
    pub fn blame_file(
        &self,
        path: &str,
        commit_oid: Option<&str>,
    ) -> Result<crate::models::BlameResult> {
        use crate::models::{BlameLine, BlameResult};

        let mut blame_opts = git2::BlameOptions::new();

        // If a specific commit is provided, blame up to that commit
        if let Some(oid_str) = commit_oid {
            let oid = git2::Oid::from_str(oid_str)
                .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?;
            blame_opts.newest_commit(oid);
        }

        let blame = self
            .repo
            .blame_file(Path::new(path), Some(&mut blame_opts))?;

        // Read file content to get line contents
        let file_content = if let Some(oid_str) = commit_oid {
            let oid = git2::Oid::from_str(oid_str)?;
            let commit = self.repo.find_commit(oid)?;
            let tree = commit.tree()?;
            let entry = tree.get_path(Path::new(path))?;
            let blob = entry.to_object(&self.repo)?.peel_to_blob()?;
            String::from_utf8_lossy(blob.content()).to_string()
        } else {
            // Read from workdir
            let workdir = self.repo.workdir().ok_or_else(|| {
                AxisError::GitError(git2::Error::from_str("No working directory"))
            })?;
            std::fs::read_to_string(workdir.join(path))?
        };

        let lines: Vec<&str> = file_content.lines().collect();
        let mut blame_lines = Vec::new();
        let mut last_oid: Option<git2::Oid> = None;

        for (i, line_content) in lines.iter().enumerate() {
            let line_num = i + 1;

            if let Some(hunk) = blame.get_line(line_num) {
                let commit_oid = hunk.final_commit_id();
                let is_group_start = last_oid != Some(commit_oid);
                last_oid = Some(commit_oid);

                let (author, timestamp) = if let Ok(commit) = self.repo.find_commit(commit_oid) {
                    let sig = commit.author();
                    (
                        sig.name().unwrap_or("Unknown").to_string(),
                        chrono::DateTime::from_timestamp(sig.when().seconds(), 0)
                            .unwrap_or_default()
                            .with_timezone(&chrono::Utc),
                    )
                } else {
                    (
                        "Unknown".to_string(),
                        chrono::DateTime::from_timestamp(0, 0)
                            .unwrap_or_default()
                            .with_timezone(&chrono::Utc),
                    )
                };

                blame_lines.push(BlameLine {
                    line_number: line_num,
                    commit_oid: commit_oid.to_string(),
                    short_oid: commit_oid.to_string()[..7].to_string(),
                    author,
                    timestamp,
                    content: line_content.to_string(),
                    original_line: hunk.orig_start_line(),
                    is_group_start,
                });
            }
        }

        Ok(BlameResult {
            path: path.to_string(),
            lines: blame_lines,
        })
    }

    /// Get commit count for a reference (for pagination info)
    pub fn get_commit_count(&self, from_ref: Option<&str>) -> Result<usize> {
        let mut revwalk = self.repo.revwalk()?;

        if let Some(ref_name) = from_ref {
            let obj = self.repo.revparse_single(ref_name)?;
            revwalk.push(obj.id())?;
        } else {
            revwalk.push_head()?;
        }

        Ok(revwalk.count())
    }

    // ==================== Tag Operations ====================

    /// List all tags
    pub fn tag_list(&self) -> Result<Vec<Tag>> {
        let tag_names = self.repo.tag_names(None)?;
        let mut tags = Vec::new();

        for name in tag_names.iter().flatten() {
            let full_name = format!("refs/tags/{}", name);
            let reference = self.repo.find_reference(&full_name)?;

            // Peel to get the target (works for both lightweight and annotated)
            let target_obj = reference.peel(git2::ObjectType::Commit)?;
            let target_oid = target_obj.id().to_string();

            // Check if this is an annotated tag
            let tag_obj = reference.peel(git2::ObjectType::Tag).ok();

            let (is_annotated, message, tagger) = if let Some(obj) = tag_obj {
                if let Some(tag) = obj.as_tag() {
                    let tagger_sig = tag.tagger().map(|sig| {
                        let timestamp = DateTime::from_timestamp(sig.when().seconds(), 0)
                            .unwrap_or_else(Utc::now)
                            .with_timezone(&Utc);
                        TagSignature {
                            name: sig.name().unwrap_or("Unknown").to_string(),
                            email: sig.email().unwrap_or("").to_string(),
                            timestamp,
                        }
                    });
                    (true, tag.message().map(|m| m.to_string()), tagger_sig)
                } else {
                    (false, None, None)
                }
            } else {
                (false, None, None)
            };

            // Get target commit info
            let (target_summary, target_time) = if let Ok(commit) = target_obj.peel_to_commit() {
                let summary = commit.summary().map(|s| s.to_string());
                let time = DateTime::from_timestamp(commit.time().seconds(), 0)
                    .map(|dt| dt.with_timezone(&Utc));
                (summary, time)
            } else {
                (None, None)
            };

            tags.push(Tag {
                name: name.to_string(),
                full_name,
                target_oid: target_oid.clone(),
                short_oid: target_oid.chars().take(7).collect(),
                is_annotated,
                message,
                tagger,
                target_summary,
                target_time,
            });
        }

        // Sort alphabetically by name
        tags.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(tags)
    }

    /// Create a new tag
    pub fn tag_create(&self, name: &str, options: &CreateTagOptions) -> Result<TagResult> {
        // Get target commit
        let target_ref = options.target.as_deref().unwrap_or("HEAD");
        let obj = self.repo.revparse_single(target_ref)?;
        let commit = obj.peel_to_commit()?;

        // Check if tag exists
        let tag_ref = format!("refs/tags/{}", name);
        if self.repo.find_reference(&tag_ref).is_ok() {
            if !options.force {
                return Ok(TagResult {
                    success: false,
                    message: format!("Tag '{}' already exists", name),
                    tag: None,
                });
            }
            // Delete existing tag if force is set
            self.repo.find_reference(&tag_ref)?.delete()?;
        }

        if options.annotated {
            // Create annotated tag
            let sig = self.repo.signature()?;
            let message = options.message.as_deref().unwrap_or("");
            self.repo
                .tag(name, commit.as_object(), &sig, message, options.force)?;
        } else {
            // Create lightweight tag
            self.repo
                .tag_lightweight(name, commit.as_object(), options.force)?;
        }

        // Return the created tag
        let tags = self.tag_list()?;
        let created_tag = tags.into_iter().find(|t| t.name == name);

        Ok(TagResult {
            success: true,
            message: format!("Tag '{}' created successfully", name),
            tag: created_tag,
        })
    }

    /// Delete a tag
    pub fn tag_delete(&self, name: &str) -> Result<TagResult> {
        let tag_ref = format!("refs/tags/{}", name);

        match self.repo.find_reference(&tag_ref) {
            Ok(mut reference) => {
                reference.delete()?;
                Ok(TagResult {
                    success: true,
                    message: format!("Tag '{}' deleted successfully", name),
                    tag: None,
                })
            }
            Err(_) => Ok(TagResult {
                success: false,
                message: format!("Tag '{}' not found", name),
                tag: None,
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_repo() -> (TempDir, Git2Service) {
        let tmp = TempDir::new().expect("should create temp directory");
        let service =
            Git2Service::init(tmp.path(), false).expect("should initialize test repository");
        (tmp, service)
    }

    fn create_initial_commit(service: &Git2Service, tmp: &TempDir) {
        // Create a file
        let file_path = tmp.path().join("README.md");
        fs::write(&file_path, "# Test Repository").expect("should write README.md file");

        // Stage the file
        let mut index = service.repo.index().expect("should get repository index");
        index
            .add_path(Path::new("README.md"))
            .expect("should add README.md to index");
        index.write().expect("should write index to disk");

        // Create commit
        let tree_id = index.write_tree().expect("should write tree from index");
        let tree = service
            .repo
            .find_tree(tree_id)
            .expect("should find tree by id");
        let sig =
            git2::Signature::now("Test User", "test@example.com").expect("should create signature");

        service
            .repo
            .commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
            .expect("should create initial commit");
    }

    #[test]
    fn test_init_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service = Git2Service::init(tmp.path(), false);
        assert!(service.is_ok());

        let service = service.expect("should unwrap initialized service");
        let info = service
            .get_repository_info()
            .expect("should get repository info");
        assert!(!info.is_bare);
        assert_eq!(info.state, RepositoryState::Clean);
    }

    #[test]
    fn test_init_bare_repository() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service =
            Git2Service::init(tmp.path(), true).expect("should initialize bare repository");
        let info = service
            .get_repository_info()
            .expect("should get repository info");
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
        let status = service.status().expect("should get status of empty repo");
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
        fs::write(&file_path, "test content").expect("should write test.txt file");

        let status = service
            .status()
            .expect("should get status with untracked file");
        assert_eq!(status.untracked.len(), 1);
        assert_eq!(status.untracked[0].path, "test.txt");
    }

    #[test]
    fn test_log_with_commits() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let commits = service
            .log(LogOptions::default())
            .expect("should get commit log");
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].summary, "Initial commit");
    }

    #[test]
    fn test_list_branches() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let branches = service
            .list_branches(BranchFilter::local_only())
            .expect("should list branches");
        assert!(!branches.is_empty());

        // Default branch should be main or master
        let has_default_branch = branches
            .iter()
            .any(|b| b.name == "main" || b.name == "master");
        assert!(has_default_branch);
    }

    #[test]
    fn test_is_head_only_for_checked_out_branch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a new branch at the same commit (doesn't checkout)
        let head_commit = service
            .repo
            .head()
            .expect("should get HEAD")
            .peel_to_commit()
            .expect("should peel to commit");
        service
            .repo
            .branch("feature-branch", &head_commit, false)
            .expect("should create branch");

        // Both branches now point to the same commit
        let branches = service
            .list_branches(BranchFilter::local_only())
            .expect("should list branches");
        assert_eq!(branches.len(), 2);

        // Only one branch should have is_head = true
        let head_branches: Vec<_> = branches.iter().filter(|b| b.is_head).collect();
        assert_eq!(
            head_branches.len(),
            1,
            "Only one branch should be marked as HEAD"
        );

        // The head branch should be main/master, not feature-branch
        let head_branch = head_branches[0];
        assert!(head_branch.name == "main" || head_branch.name == "master");
        assert_ne!(head_branch.name, "feature-branch");
    }

    #[test]
    fn test_get_current_branch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let branch = service.get_current_branch_name();
        assert!(branch.is_some());
    }

    // ==================== Phase 2 Tests ====================

    #[test]
    fn test_stage_file() {
        let (tmp, service) = setup_test_repo();

        // Create an untracked file
        let file_path = tmp.path().join("test.txt");
        fs::write(&file_path, "test content").expect("should write test.txt file");

        // Stage the file
        service
            .stage_file("test.txt")
            .expect("should stage test.txt");

        let status = service.status().expect("should get status after staging");
        assert_eq!(status.staged.len(), 1);
        assert_eq!(status.staged[0].path, "test.txt");
        assert!(status.untracked.is_empty());
    }

    #[test]
    fn test_stage_multiple_files() {
        let (tmp, service) = setup_test_repo();

        // Create multiple files
        fs::write(tmp.path().join("file1.txt"), "content 1").expect("should write file1.txt");
        fs::write(tmp.path().join("file2.txt"), "content 2").expect("should write file2.txt");

        // Stage multiple files
        service
            .stage_files(&["file1.txt".to_string(), "file2.txt".to_string()])
            .expect("should stage multiple files");

        let status = service
            .status()
            .expect("should get status after staging multiple files");
        assert_eq!(status.staged.len(), 2);
    }

    #[test]
    fn test_stage_all() {
        let (tmp, service) = setup_test_repo();

        // Create multiple files
        fs::write(tmp.path().join("file1.txt"), "content 1").expect("should write file1.txt");
        fs::write(tmp.path().join("file2.txt"), "content 2").expect("should write file2.txt");
        fs::write(tmp.path().join("file3.txt"), "content 3").expect("should write file3.txt");

        // Stage all
        service.stage_all().expect("should stage all files");

        let status = service
            .status()
            .expect("should get status after staging all");
        assert_eq!(status.staged.len(), 3);
        assert!(status.untracked.is_empty());
    }

    #[test]
    fn test_stage_deleted_file() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Delete the README.md that was created in initial commit
        let file_path = tmp.path().join("README.md");
        fs::remove_file(&file_path).expect("should delete README.md");

        // Verify the file shows as unstaged deletion
        let status = service.status().expect("should get status");
        assert_eq!(status.unstaged.len(), 1);
        assert_eq!(status.unstaged[0].path, "README.md");

        // Stage the deleted file
        service
            .stage_file("README.md")
            .expect("should stage deleted file");

        // Verify it's now staged as deletion
        let status = service.status().expect("should get status after staging");
        assert_eq!(status.staged.len(), 1);
        assert_eq!(status.staged[0].path, "README.md");
        assert!(status.unstaged.is_empty());
    }

    #[test]
    fn test_stage_multiple_deleted_files() {
        let (tmp, service) = setup_test_repo();

        // Create initial commit with multiple files
        fs::write(tmp.path().join("file1.txt"), "content 1").expect("should write file1");
        fs::write(tmp.path().join("file2.txt"), "content 2").expect("should write file2");
        service.stage_all().expect("should stage all");
        service
            .create_commit("Add files", Some("Test User"), Some("test@example.com"))
            .expect("should create commit");

        // Delete both files
        fs::remove_file(tmp.path().join("file1.txt")).expect("should delete file1");
        fs::remove_file(tmp.path().join("file2.txt")).expect("should delete file2");

        // Stage deleted files
        service
            .stage_files(&["file1.txt".to_string(), "file2.txt".to_string()])
            .expect("should stage deleted files");

        // Verify both are staged
        let status = service.status().expect("should get status");
        assert_eq!(status.staged.len(), 2);
        assert!(status.unstaged.is_empty());
    }

    #[test]
    fn test_unstage_file() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create and stage a new file
        let file_path = tmp.path().join("new_file.txt");
        fs::write(&file_path, "new content").expect("should write new_file.txt");
        service
            .stage_file("new_file.txt")
            .expect("should stage new_file.txt");

        let status = service.status().expect("should get status after staging");
        assert_eq!(status.staged.len(), 1);

        // Unstage the file
        service
            .unstage_file("new_file.txt")
            .expect("should unstage new_file.txt");

        let status = service.status().expect("should get status after unstaging");
        assert!(status.staged.is_empty());
        assert_eq!(status.untracked.len(), 1);
    }

    #[test]
    fn test_discard_file() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Modify the README
        let file_path = tmp.path().join("README.md");
        fs::write(&file_path, "Modified content").expect("should write modified content");

        let status = service
            .status()
            .expect("should get status after modification");
        assert_eq!(status.unstaged.len(), 1);

        // Discard changes
        service
            .discard_file("README.md")
            .expect("should discard changes to README.md");

        let status = service.status().expect("should get status after discard");
        assert!(status.unstaged.is_empty());

        // Verify content is restored
        let content = fs::read_to_string(&file_path).expect("should read restored file");
        assert_eq!(content, "# Test Repository");
    }

    #[test]
    fn test_create_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create and stage a new file
        fs::write(tmp.path().join("new_file.txt"), "new content")
            .expect("should write new_file.txt");
        service
            .stage_file("new_file.txt")
            .expect("should stage new_file.txt");

        // Create commit
        let oid = service
            .create_commit("Add new file", Some("Test User"), Some("test@example.com"))
            .expect("should create commit");

        assert!(!oid.is_empty());

        // Verify commit is in history
        let commits = service
            .log(LogOptions::default())
            .expect("should get commit log");
        assert_eq!(commits.len(), 2);
        assert_eq!(commits[0].summary, "Add new file");
    }

    #[test]
    fn test_amend_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Amend the commit with a new message
        let oid = service
            .amend_commit(Some("Amended initial commit"))
            .expect("should amend commit");
        assert!(!oid.is_empty());

        // Verify commit message was updated
        let commits = service
            .log(LogOptions::default())
            .expect("should get commit log");
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].summary, "Amended initial commit");
    }

    #[test]
    fn test_diff_workdir() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Modify the README
        let file_path = tmp.path().join("README.md");
        fs::write(&file_path, "# Modified Test Repository").expect("should write modified README");

        let diffs = service
            .diff_workdir(&crate::models::DiffOptions::default())
            .expect("should get workdir diff");
        assert_eq!(diffs.len(), 1);
        assert_eq!(
            diffs[0].new_path.as_ref().expect("should have new_path"),
            "README.md"
        );
        assert_eq!(diffs[0].status, crate::models::DiffStatus::Modified);
        assert!(diffs[0].additions > 0 || diffs[0].deletions > 0);
    }

    #[test]
    fn test_diff_staged() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create and stage a new file
        fs::write(tmp.path().join("new_file.txt"), "new content")
            .expect("should write new_file.txt");
        service
            .stage_file("new_file.txt")
            .expect("should stage new_file.txt");

        let diffs = service
            .diff_staged(&crate::models::DiffOptions::default())
            .expect("should get staged diff");
        assert_eq!(diffs.len(), 1);
        assert_eq!(
            diffs[0].new_path.as_ref().expect("should have new_path"),
            "new_file.txt"
        );
        assert_eq!(diffs[0].status, crate::models::DiffStatus::Added);
    }

    #[test]
    fn test_diff_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Get the commit OID
        let commits = service
            .log(LogOptions::default())
            .expect("should get commit log");
        let oid = &commits[0].oid;

        let diffs = service
            .diff_commit(oid, &crate::models::DiffOptions::default())
            .expect("should get commit diff");
        assert_eq!(diffs.len(), 1);
        assert_eq!(
            diffs[0].new_path.as_ref().expect("should have new_path"),
            "README.md"
        );
        assert_eq!(diffs[0].status, crate::models::DiffStatus::Added);
    }

    #[test]
    fn test_diff_file() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Modify the README
        fs::write(tmp.path().join("README.md"), "# Modified Content")
            .expect("should write modified content");

        // Get diff for specific file
        let diff = service
            .diff_file("README.md", false, &crate::models::DiffOptions::default())
            .expect("should get file diff");
        assert!(diff.is_some());
        let diff = diff.expect("should have diff for modified file");
        assert_eq!(
            diff.new_path.as_ref().expect("should have new_path"),
            "README.md"
        );
    }

    // ==================== Phase 3 Tests: Branch Operations ====================

    #[test]
    fn test_create_branch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let options = crate::models::CreateBranchOptions::default();
        let branch = service
            .create_branch("feature/test", &options)
            .expect("should create branch");

        assert_eq!(branch.name, "feature/test");
        assert_eq!(branch.branch_type, BranchType::Local);
        assert!(!branch.is_head); // Not checked out yet
    }

    #[test]
    fn test_create_branch_from_specific_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Get the initial commit OID
        let commits = service
            .log(LogOptions::default())
            .expect("should get commit log");
        let initial_oid = &commits[0].oid;

        let options = crate::models::CreateBranchOptions {
            start_point: Some(initial_oid.clone()),
            force: false,
            track: None,
        };
        let branch = service
            .create_branch("branch-from-commit", &options)
            .expect("should create branch from specific commit");

        assert_eq!(branch.name, "branch-from-commit");
        assert_eq!(branch.target_oid, *initial_oid);
    }

    #[test]
    fn test_checkout_branch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a new branch
        let options = crate::models::CreateBranchOptions::default();
        service
            .create_branch("feature/checkout-test", &options)
            .expect("should create branch");

        // Checkout the branch
        let checkout_opts = crate::models::CheckoutOptions::default();
        service
            .checkout_branch("feature/checkout-test", &checkout_opts)
            .expect("should checkout branch");

        // Verify we're on the new branch
        let current = service.get_current_branch_name();
        assert_eq!(current, Some("feature/checkout-test".to_string()));
    }

    #[test]
    fn test_checkout_branch_with_create() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Checkout with create flag - should create and checkout in one operation
        let checkout_opts = crate::models::CheckoutOptions {
            create: true,
            force: false,
            track: None,
        };
        service
            .checkout_branch("feature/new-branch", &checkout_opts)
            .expect("should create and checkout branch in one operation");

        // Verify we're on the new branch
        let current = service.get_current_branch_name();
        assert_eq!(current, Some("feature/new-branch".to_string()));
    }

    #[test]
    fn test_rename_branch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a branch
        let options = crate::models::CreateBranchOptions::default();
        service
            .create_branch("old-name", &options)
            .expect("should create branch");

        // Rename it
        let renamed = service
            .rename_branch("old-name", "new-name", false)
            .expect("should rename branch");

        assert_eq!(renamed.name, "new-name");

        // Verify old name doesn't exist
        let branches = service
            .list_branches(BranchFilter::local_only())
            .expect("should list branches");
        assert!(!branches.iter().any(|b| b.name == "old-name"));
        assert!(branches.iter().any(|b| b.name == "new-name"));
    }

    #[test]
    fn test_delete_branch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a branch
        let options = crate::models::CreateBranchOptions::default();
        service
            .create_branch("to-delete", &options)
            .expect("should create branch");

        // Verify it exists
        let branches = service
            .list_branches(BranchFilter::local_only())
            .expect("should list branches");
        assert!(branches.iter().any(|b| b.name == "to-delete"));

        // Delete it (force=true to avoid merge check)
        service
            .delete_branch("to-delete", true)
            .expect("should delete branch");

        // Verify it's gone
        let branches = service
            .list_branches(BranchFilter::local_only())
            .expect("should list branches after delete");
        assert!(!branches.iter().any(|b| b.name == "to-delete"));
    }

    #[test]
    fn test_get_branch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a branch
        let options = crate::models::CreateBranchOptions::default();
        service
            .create_branch("test-get", &options)
            .expect("should create branch");

        // Get it by name
        let branch = service
            .get_branch("test-get", BranchType::Local)
            .expect("should get branch by name");
        assert_eq!(branch.name, "test-get");
        assert_eq!(branch.branch_type, BranchType::Local);
    }

    // ==================== Phase 3 Tests: Remote Operations ====================

    #[test]
    fn test_add_remote() {
        let (_tmp, service) = setup_test_repo();

        let remote = service
            .add_remote("origin", "https://github.com/user/repo.git")
            .expect("should add remote");

        assert_eq!(remote.name, "origin");
        assert_eq!(
            remote.url.as_deref(),
            Some("https://github.com/user/repo.git")
        );
    }

    #[test]
    fn test_list_remotes() {
        let (_tmp, service) = setup_test_repo();

        // Add some remotes
        service
            .add_remote("origin", "https://github.com/user/repo.git")
            .expect("should add origin remote");
        service
            .add_remote("upstream", "https://github.com/other/repo.git")
            .expect("should add upstream remote");

        let remotes = service.list_remotes().expect("should list remotes");
        assert_eq!(remotes.len(), 2);
        assert!(remotes.iter().any(|r| r.name == "origin"));
        assert!(remotes.iter().any(|r| r.name == "upstream"));
    }

    #[test]
    fn test_get_remote() {
        let (_tmp, service) = setup_test_repo();

        service
            .add_remote("origin", "https://github.com/user/repo.git")
            .expect("should add remote");

        let remote = service
            .get_remote("origin")
            .expect("should get remote by name");
        assert_eq!(remote.name, "origin");
        assert_eq!(
            remote.url.as_deref(),
            Some("https://github.com/user/repo.git")
        );
    }

    #[test]
    fn test_remove_remote() {
        let (_tmp, service) = setup_test_repo();

        service
            .add_remote("origin", "https://github.com/user/repo.git")
            .expect("should add remote");

        // Verify it exists
        let remotes = service.list_remotes().expect("should list remotes");
        assert_eq!(remotes.len(), 1);

        // Remove it
        service
            .remove_remote("origin")
            .expect("should remove remote");

        // Verify it's gone
        let remotes = service
            .list_remotes()
            .expect("should list remotes after remove");
        assert!(remotes.is_empty());
    }

    #[test]
    fn test_rename_remote() {
        let (_tmp, service) = setup_test_repo();

        service
            .add_remote("old-remote", "https://github.com/user/repo.git")
            .expect("should add remote");

        // Rename it
        service
            .rename_remote("old-remote", "new-remote")
            .expect("should rename remote");

        // Verify the rename
        let remotes = service.list_remotes().expect("should list remotes");
        assert!(!remotes.iter().any(|r| r.name == "old-remote"));
        assert!(remotes.iter().any(|r| r.name == "new-remote"));
    }

    #[test]
    fn test_set_remote_url() {
        let (_tmp, service) = setup_test_repo();

        service
            .add_remote("origin", "https://github.com/user/old-repo.git")
            .expect("should add remote");

        // Change the URL
        service
            .set_remote_url("origin", "https://github.com/user/new-repo.git")
            .expect("should set remote URL");

        let remote = service.get_remote("origin").expect("should get remote");
        assert_eq!(
            remote.url.as_deref(),
            Some("https://github.com/user/new-repo.git")
        );
    }

    // ==================== Phase 4 Tests: Graph, Search, Blame ====================

    #[test]
    fn test_build_graph() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Add another commit
        fs::write(tmp.path().join("file2.txt"), "content").expect("should write file2.txt");
        service
            .stage_file("file2.txt")
            .expect("should stage file2.txt");
        service
            .create_commit("Second commit", None, None)
            .expect("should create second commit");

        let options = crate::models::GraphOptions::default();
        let result = service.build_graph(options).expect("should build graph");

        assert_eq!(result.commits.len(), 2);
        assert_eq!(result.total_count, 2);
        assert!(!result.has_more);
    }

    #[test]
    fn test_build_graph_with_branch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a branch and add a commit
        let branch_opts = crate::models::CreateBranchOptions::default();
        service
            .create_branch("feature", &branch_opts)
            .expect("should create feature branch");

        let checkout_opts = crate::models::CheckoutOptions::default();
        service
            .checkout_branch("feature", &checkout_opts)
            .expect("should checkout feature branch");

        fs::write(tmp.path().join("feature.txt"), "feature content")
            .expect("should write feature.txt");
        service
            .stage_file("feature.txt")
            .expect("should stage feature.txt");
        service
            .create_commit("Feature commit", None, None)
            .expect("should create feature commit");

        let options = crate::models::GraphOptions {
            all_branches: true,
            ..Default::default()
        };
        let result = service
            .build_graph(options)
            .expect("should build graph with all branches");

        assert_eq!(result.commits.len(), 2);
        // Both commits should have refs
        let has_feature_ref = result
            .commits
            .iter()
            .any(|c| c.refs.iter().any(|r| r.name == "feature"));
        assert!(has_feature_ref);
    }

    #[test]
    fn test_build_graph_pagination() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Add more commits
        for i in 2..=5 {
            fs::write(tmp.path().join(format!("file{}.txt", i)), "content")
                .expect("should write file");
            service
                .stage_file(&format!("file{}.txt", i))
                .expect("should stage file");
            service
                .create_commit(&format!("Commit {}", i), None, None)
                .expect("should create commit");
        }

        // Get first page
        let options = crate::models::GraphOptions {
            limit: Some(2),
            ..Default::default()
        };
        let result = service
            .build_graph(options)
            .expect("should build first page of graph");

        assert_eq!(result.commits.len(), 2);
        assert_eq!(result.total_count, 5);
        assert!(result.has_more);

        // Get second page
        let options = crate::models::GraphOptions {
            limit: Some(2),
            skip: Some(2),
            ..Default::default()
        };
        let result = service
            .build_graph(options)
            .expect("should build second page of graph");

        assert_eq!(result.commits.len(), 2);
    }

    #[test]
    fn test_search_commits_by_message() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        fs::write(tmp.path().join("feature.txt"), "content").expect("should write feature.txt");
        service
            .stage_file("feature.txt")
            .expect("should stage feature.txt");
        service
            .create_commit("Add amazing feature", None, None)
            .expect("should create feature commit");

        fs::write(tmp.path().join("bugfix.txt"), "content").expect("should write bugfix.txt");
        service
            .stage_file("bugfix.txt")
            .expect("should stage bugfix.txt");
        service
            .create_commit("Fix critical bug", None, None)
            .expect("should create bugfix commit");

        let options = crate::models::SearchOptions {
            query: "amazing".to_string(),
            search_message: true,
            search_author: false,
            search_hash: false,
            limit: Some(10),
        };
        let result = service
            .search_commits(options)
            .expect("should search commits by message");

        assert_eq!(result.total_matches, 1);
        assert!(result.commits[0].summary.contains("amazing"));
    }

    #[test]
    fn test_search_commits_by_hash() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let commits = service
            .log(LogOptions::default())
            .expect("should get commit log");
        let first_commit_oid = &commits[0].oid;
        let short_oid = &first_commit_oid[..7];

        let options = crate::models::SearchOptions {
            query: short_oid.to_string(),
            search_message: false,
            search_author: false,
            search_hash: true,
            limit: Some(10),
        };
        let result = service
            .search_commits(options)
            .expect("should search commits by hash");

        assert_eq!(result.total_matches, 1);
        assert!(result.commits[0].oid.starts_with(short_oid));
    }

    #[test]
    fn test_blame_file() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let result = service
            .blame_file("README.md", None)
            .expect("should blame file");

        assert_eq!(result.path, "README.md");
        assert!(!result.lines.is_empty());
        assert_eq!(result.lines[0].line_number, 1);
        assert!(result.lines[0].content.contains("Test Repository"));
    }

    #[test]
    fn test_blame_file_at_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Modify the file and create another commit
        fs::write(tmp.path().join("README.md"), "# Updated Title\nNew line")
            .expect("should write updated README");
        service
            .stage_file("README.md")
            .expect("should stage README.md");
        service
            .create_commit("Update README", None, None)
            .expect("should create update commit");

        // Get the first commit OID
        let commits = service
            .log(LogOptions {
                limit: Some(10),
                ..Default::default()
            })
            .expect("should get commit log");
        let first_commit_oid = &commits[1].oid; // Second in list (older)

        // Blame at the first commit
        let result = service
            .blame_file("README.md", Some(first_commit_oid))
            .expect("should blame file at specific commit");

        assert_eq!(result.lines.len(), 1);
        assert!(result.lines[0].content.contains("Test Repository"));
    }

    #[test]
    fn test_get_commit_count() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Add more commits
        for i in 2..=3 {
            fs::write(tmp.path().join(format!("file{}.txt", i)), "content")
                .expect("should write file");
            service
                .stage_file(&format!("file{}.txt", i))
                .expect("should stage file");
            service
                .create_commit(&format!("Commit {}", i), None, None)
                .expect("should create commit");
        }

        let count = service
            .get_commit_count(None)
            .expect("should get commit count");
        assert_eq!(count, 3);
    }

    // ==================== Tag Tests ====================

    #[test]
    fn test_tag_list_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let tags = service.tag_list().expect("should list tags");
        assert!(tags.is_empty());
    }

    #[test]
    fn test_tag_create_lightweight() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let result = service
            .tag_create("v1.0.0", &CreateTagOptions::default())
            .expect("should create lightweight tag");
        assert!(result.success);

        let tags = service.tag_list().expect("should list tags");
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "v1.0.0");
        assert!(!tags[0].is_annotated);
    }

    #[test]
    fn test_tag_create_annotated() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let result = service
            .tag_create(
                "v2.0.0",
                &CreateTagOptions {
                    annotated: true,
                    message: Some("Release version 2.0.0".to_string()),
                    ..Default::default()
                },
            )
            .expect("should create annotated tag");

        assert!(result.success);

        let tags = service.tag_list().expect("should list tags");
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "v2.0.0");
        assert!(tags[0].is_annotated);
    }

    #[test]
    fn test_tag_delete() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a tag
        service
            .tag_create("v1.0.0", &CreateTagOptions::default())
            .expect("should create tag");
        assert_eq!(service.tag_list().expect("should list tags").len(), 1);

        // Delete the tag
        let result = service.tag_delete("v1.0.0").expect("should delete tag");
        assert!(result.success);

        assert!(service
            .tag_list()
            .expect("should list tags after delete")
            .is_empty());
    }
}
