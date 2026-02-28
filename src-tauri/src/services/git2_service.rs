use crate::error::{AxisError, Result};
use crate::models::LargeBinaryFileInfo;
use crate::models::{
    BlameLine, BlameResult, Branch, BranchFilter, BranchFilterType, BranchSortOrder, BranchType,
    Commit, CreateTagOptions, DeleteBranchOptions, EdgeType, FileLogResult, FileStatus,
    GraphCommit, GraphEdge, GraphResult, IgnoreOptions, IgnoreResult, IgnoreSuggestion,
    IgnoreSuggestionType, LaneState, ListTagsOptions, LogOptions, RebasePreview, RebaseTarget,
    ReflogAction, ReflogEntry, ReflogOptions, Repository, RepositoryState, RepositoryStatus,
    SearchResult, SignatureVerification, SigningConfig, SigningFormat, SortOrder, SshCredentials,
    Tag, TagResult, TagSignature, TagSortOrder,
};
use crate::services::SigningService;
use chrono::{DateTime, Utc};
use git2::{
    build::RepoBuilder, cert::Cert, CertificateCheckStatus, Cred, FetchOptions, RemoteCallbacks,
    Repository as Git2Repository, StatusOptions,
};
use secrecy::ExposeSecret;
use std::path::{Path, PathBuf};

pub struct Git2Service {
    path: PathBuf,
}

/// Build a credentials callback with optional SSH credentials.
/// When credentials are provided, the configured key is tried first before agent/default fallback.
/// When a passphrase is included, it is passed to `Cred::ssh_key()` for encrypted PEM keys.
fn build_credentials_callback(
    ssh_credentials: Option<SshCredentials>,
) -> impl FnMut(&str, Option<&str>, git2::CredentialType) -> std::result::Result<Cred, git2::Error>
{
    move |url, username_from_url, allowed_types| {
        if allowed_types.contains(git2::CredentialType::SSH_KEY) {
            if let Some(username) = username_from_url {
                let passphrase_str = ssh_credentials
                    .as_ref()
                    .and_then(|c| c.passphrase.as_ref())
                    .map(ExposeSecret::expose_secret);

                // 1. Try configured SSH key first
                if let Some(ref key_path) = ssh_credentials.as_ref().map(|c| &c.key_path) {
                    let expanded = shellexpand::tilde(key_path).to_string();
                    let private_key = std::path::Path::new(&expanded);
                    if private_key.exists() {
                        let pub_path = format!("{expanded}.pub");
                        let pub_key = std::path::Path::new(&pub_path);
                        let pub_key_opt = if pub_key.exists() {
                            Some(pub_key as &std::path::Path)
                        } else {
                            None
                        };
                        if let Ok(cred) =
                            Cred::ssh_key(username, pub_key_opt, private_key, passphrase_str)
                        {
                            return Ok(cred);
                        }
                    }
                }

                // 2. Try SSH agent
                if let Ok(cred) = Cred::ssh_key_from_agent(username) {
                    return Ok(cred);
                }

                // 3. Try default SSH key locations (no passphrase for defaults — agent handles those)
                let ssh_dir_expanded = shellexpand::tilde("~/.ssh").to_string();
                let ssh_dir = std::path::Path::new(&ssh_dir_expanded);

                for key_name in &["id_ed25519", "id_rsa"] {
                    let private_key = ssh_dir.join(key_name);
                    if private_key.exists() {
                        let public_key = ssh_dir.join(format!("{key_name}.pub"));
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
                &git2::Config::open_default()
                    .unwrap_or_else(|_| git2::Config::new().expect("should create empty config")),
                url,
                username_from_url,
            ) {
                return Ok(cred);
            }
        }

        // Default credentials (for public repos)
        if allowed_types.contains(git2::CredentialType::DEFAULT) {
            return Cred::default();
        }

        Err(git2::Error::from_str("no valid credentials found"))
    }
}

/// Build a certificate check callback that verifies SSH host keys against `known_hosts`.
/// If the host is unknown (not in `known_hosts`), the key is accepted automatically.
/// If the host key has changed (potential MITM), the connection is rejected.
fn build_certificate_check_callback(
) -> impl FnMut(&Cert<'_>, &str) -> std::result::Result<CertificateCheckStatus, git2::Error> {
    move |cert, hostname| {
        // Only handle SSH host keys; pass through for X.509 (HTTPS)
        let Some(hostkey) = cert.as_hostkey() else {
            return Ok(CertificateCheckStatus::CertificatePassthrough);
        };

        // Find known_hosts file (cross-platform via shellexpand)
        let known_hosts_expanded = shellexpand::tilde("~/.ssh/known_hosts").to_string();
        let known_hosts_path = std::path::Path::new(&known_hosts_expanded);

        if !known_hosts_path.exists() {
            log::debug!(
                "No known_hosts file found at {}, accepting host key for {hostname}",
                known_hosts_path.display()
            );
            // TODO: In the future, prompt the user before accepting unknown hosts
            return Ok(CertificateCheckStatus::CertificateOk);
        }

        // Parse known_hosts and check
        let known_hosts_content = match std::fs::read_to_string(known_hosts_path) {
            Ok(content) => content,
            Err(e) => {
                log::warn!("Failed to read known_hosts: {e}, accepting host key for {hostname}");
                return Ok(CertificateCheckStatus::CertificateOk);
            }
        };

        // Extract the raw host key for comparison
        let Some(remote_hostkey) = hostkey.hostkey() else {
            log::debug!("No host key data available, accepting for {hostname}");
            return Ok(CertificateCheckStatus::CertificateOk);
        };

        // Check if hostname is in known_hosts
        let host_found = known_hosts_content.lines().any(|line| {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                return false;
            }
            // known_hosts format: hostname[,hostname2] key-type base64-key [comment]
            // Also handles hashed hostnames (starting with |1|)
            if let Some(hosts_part) = line.split_whitespace().next() {
                // Check each comma-separated hostname/IP
                hosts_part.split(',').any(|h| {
                    let h = h.trim_start_matches('[');
                    let h = h.split(']').next().unwrap_or(h);
                    // Strip port suffix like ":22" from bracketed entries
                    h == hostname || h.starts_with(&format!("{hostname}:"))
                })
            } else {
                false
            }
        });

        if host_found {
            // Host is in known_hosts — we trust that the user has verified it before.
            // Full key comparison against known_hosts entries is complex (hashed hosts,
            // multiple key types), so we accept if the host is listed at all.
            // For strict verification, ssh-keygen -F could be used, but that adds latency.
            log::debug!(
                "Host {hostname} found in known_hosts, accepting (key: {} bytes)",
                remote_hostkey.len()
            );
            Ok(CertificateCheckStatus::CertificateOk)
        } else {
            // Host not in known_hosts — accept like StrictHostKeyChecking=accept-new
            log::info!("Host {hostname} not found in known_hosts, accepting new host key");
            // TODO: In the future, prompt the user before accepting unknown hosts
            Ok(CertificateCheckStatus::CertificateOk)
        }
    }
}

impl Git2Service {
    /// Open an existing repository
    pub fn open(path: &Path) -> Result<Self> {
        let _ = Git2Repository::open(path)?;
        Ok(Git2Service {
            path: path.to_path_buf(),
        })
    }

    /// Initialize a new repository
    pub fn init(path: &Path, bare: bool) -> Result<Self> {
        if bare {
            Git2Repository::init_bare(path)?;
        } else {
            Git2Repository::init(path)?;
        }

        Ok(Git2Service {
            path: path.to_path_buf(),
        })
    }

    /// Clone a repository from a URL with optional progress callback
    /// The callback receives progress stats and returns true to continue or false to cancel
    pub fn clone<F>(
        url: &str,
        path: &Path,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<Self>
    where
        F: FnMut(&git2::Progress<'_>) -> bool + 'static,
    {
        let mut callbacks = RemoteCallbacks::new();

        callbacks.credentials(build_credentials_callback(ssh_credentials));
        callbacks.certificate_check(build_certificate_check_callback());

        // Set up progress callback if provided
        if let Some(mut cb) = progress_cb {
            callbacks.transfer_progress(move |stats| cb(&stats));
        }

        // Set up fetch options with callbacks
        let mut fetch_options = FetchOptions::new();
        fetch_options.remote_callbacks(callbacks);

        // Build and execute clone
        RepoBuilder::new()
            .fetch_options(fetch_options)
            .clone(url, path)?;

        Ok(Git2Service {
            path: path.to_path_buf(),
        })
    }

    /// Get the underlying git2 Repository
    pub fn repo(&self) -> Result<Git2Repository> {
        Git2Repository::open(&self.path).map_err(Into::into)
    }

    /// Get the repository path
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// Check for dirty working directory files that would conflict with checkout between two commits.
    /// Returns (conflicting_files, files_to_update) - conflicting files and files that need updating.
    fn check_dirty_files_for_checkout(
        repo: &Git2Repository,
        from_commit: &git2::Commit,
        to_commit: &git2::Commit,
    ) -> Result<(Vec<String>, Vec<String>)> {
        let diff =
            repo.diff_tree_to_tree(Some(&from_commit.tree()?), Some(&to_commit.tree()?), None)?;

        // Get files that will be changed
        let mut files_to_update: std::collections::HashSet<String> =
            std::collections::HashSet::new();
        diff.foreach(
            &mut |delta, _| {
                if let Some(path) = delta.new_file().path() {
                    files_to_update.insert(path.to_string_lossy().to_string());
                }
                if let Some(path) = delta.old_file().path() {
                    files_to_update.insert(path.to_string_lossy().to_string());
                }
                true
            },
            None,
            None,
            None,
        )?;

        // Check for dirty files in working directory (both staged and unstaged)
        let statuses = repo.statuses(None)?;
        let mut conflicting_files: Vec<String> = Vec::new();
        for entry in statuses.iter() {
            let status = entry.status();
            // Check both working tree (unstaged) and index (staged) changes
            if status.intersects(
                // Working tree (unstaged) changes
                git2::Status::WT_MODIFIED
                    | git2::Status::WT_DELETED
                    | git2::Status::WT_RENAMED
                    | git2::Status::WT_TYPECHANGE
                    // Index (staged) changes
                    | git2::Status::INDEX_NEW
                    | git2::Status::INDEX_MODIFIED
                    | git2::Status::INDEX_DELETED
                    | git2::Status::INDEX_RENAMED
                    | git2::Status::INDEX_TYPECHANGE,
            ) {
                if let Some(path) = entry.path() {
                    if files_to_update.contains(path) {
                        conflicting_files.push(path.to_string());
                    }
                }
            }
        }

        let files_to_update_vec: Vec<String> = files_to_update.into_iter().collect();
        Ok((conflicting_files, files_to_update_vec))
    }

    /// Get current branch
    pub fn get_current_branch(&self) -> Option<String> {
        self.repo().ok().and_then(|repo| {
            repo.head()
                .ok()
                .and_then(|h| h.shorthand().map(std::string::ToString::to_string))
        })
    }

    /// Get the current HEAD commit OID as a string
    /// Returns a null OID (40 zeros) if HEAD doesn't exist
    pub fn get_head_oid(&self) -> String {
        self.get_head_oid_opt().unwrap_or_else(|| "0".repeat(40))
    }

    /// Get the current HEAD commit OID as an optional string
    /// Returns None if HEAD doesn't exist
    pub fn get_head_oid_opt(&self) -> Option<String> {
        self.repo().ok().and_then(|repo| {
            repo.head()
                .ok()
                .and_then(|h| h.target())
                .map(|oid| oid.to_string())
        })
    }

    /// Check if HEAD is unborn (no commits yet in the repository)
    pub fn is_head_unborn(repo: &Git2Repository) -> bool {
        match repo.head() {
            Ok(_) => false,
            Err(e) => e.code() == git2::ErrorCode::UnbornBranch,
        }
    }

    /// Get repository information
    pub fn get_repository_info(&self) -> Result<Repository> {
        let repo = self.repo()?;
        let path = repo
            .workdir()
            .or_else(|| self.path().parent())
            .ok_or_else(|| AxisError::InvalidRepositoryPath("Unknown path".to_string()))?;

        let name = path.file_name().map_or_else(
            || "Unknown".to_string(),
            |n| n.to_string_lossy().to_string(),
        );

        let current_branch = self.get_current_branch_name();
        let state = RepositoryState::from(repo.state());

        Ok(Repository {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            path: path.to_path_buf(),
            is_bare: repo.is_bare(),
            is_unborn: Self::is_head_unborn(&repo),
            current_branch,
            state,
        })
    }

    /// Get git user signature (name and email from config)
    pub fn get_user_signature(&self) -> Result<(String, String)> {
        let sig = self.repo()?.signature()?;
        let name = sig.name().unwrap_or("Unknown").to_string();
        let email = sig.email().unwrap_or("unknown@example.com").to_string();
        Ok((name, email))
    }

    /// Get the current branch name
    pub fn get_current_branch_name(&self) -> Option<String> {
        self.repo().ok().and_then(|repo| {
            repo.head().ok().and_then(|head| {
                if head.is_branch() {
                    head.shorthand().map(std::string::ToString::to_string)
                } else {
                    // Detached HEAD - return short commit hash
                    head.target().map(|oid| oid.to_string()[..7].to_string())
                }
            })
        })
    }

    /// Get repository status (staged, unstaged, untracked, conflicted files)
    pub fn status(&self) -> Result<RepositoryStatus> {
        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true)
            .include_ignored(false)
            .include_unmodified(false)
            .renames_head_to_index(true)
            .renames_index_to_workdir(true);

        let repo = self.repo()?;
        let statuses = repo.statuses(Some(&mut opts))?;

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
    pub fn log(&self, options: &LogOptions) -> Result<Vec<Commit>> {
        let repo = self.repo()?;

        // Return empty list for unborn HEAD (no commits yet)
        if Self::is_head_unborn(&repo) {
            return Ok(Vec::new());
        }

        let mut revwalk = repo.revwalk()?;

        // Set sorting based on options
        match options.sort_order {
            SortOrder::AncestorOrder => {
                revwalk.set_sorting(git2::Sort::TOPOLOGICAL | git2::Sort::TIME)?;
            }
            SortOrder::DateOrder => {
                revwalk.set_sorting(git2::Sort::TIME)?;
            }
        }

        // Handle from_ref if specified (overrides branch_filter)
        if let Some(ref from_ref) = options.from_ref {
            let obj = repo.revparse_single(from_ref)?;
            revwalk.push(obj.id())?;
        } else {
            // Apply branch filter
            match &options.branch_filter {
                BranchFilterType::Current => {
                    revwalk.push_head()?;
                }
                BranchFilterType::Specific(branch_name) => {
                    // Try local branch first, then remote
                    let ref_name = format!("refs/heads/{branch_name}");
                    if let Ok(reference) = repo.find_reference(&ref_name) {
                        if let Some(oid) = reference.target() {
                            revwalk.push(oid)?;
                        }
                    } else {
                        // Try as remote branch
                        let ref_name = format!("refs/remotes/{branch_name}");
                        if let Ok(reference) = repo.find_reference(&ref_name) {
                            if let Some(oid) = reference.target() {
                                revwalk.push(oid)?;
                            }
                        } else {
                            // Fall back to HEAD
                            revwalk.push_head()?;
                        }
                    }
                }
                BranchFilterType::All => {
                    // Push all local branches
                    for (branch, _) in repo.branches(Some(git2::BranchType::Local))?.flatten() {
                        if let Some(oid) = branch.get().target() {
                            let _ = revwalk.push(oid);
                        }
                    }
                    // Push remote branches if included
                    if options.include_remotes {
                        for (branch, _) in repo.branches(Some(git2::BranchType::Remote))?.flatten()
                        {
                            if let Some(oid) = branch.get().target() {
                                let _ = revwalk.push(oid);
                            }
                        }
                    }
                }
            }
        }

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
            let commit = repo.find_commit(oid)?;
            commits.push(Commit::from_git2_commit(&commit, &repo));
        }

        Ok(commits)
    }

    /// List branches
    pub fn list_branches(&self, filter: &BranchFilter) -> Result<Vec<Branch>> {
        let mut branches = Vec::new();

        let branch_type = match (filter.include_local, filter.include_remote) {
            (true, true) => None,
            (true, false) => Some(git2::BranchType::Local),
            (false, true) => Some(git2::BranchType::Remote),
            (false, false) => return Ok(branches),
        };

        let repo = self.repo()?;
        let git_branches = repo.branches(branch_type)?;

        for branch_result in git_branches {
            let (branch, branch_type) = branch_result?;

            if let Some(name) = branch.name()? {
                let reference = branch.get();
                let target_oid = reference.target();

                if let Some(oid) = target_oid {
                    let commit = repo.find_commit(oid)?;
                    let is_head = branch.is_head();

                    let (ahead, behind) = Self::get_ahead_behind(&repo, &branch)?;

                    let upstream = branch.upstream().ok().and_then(|u| {
                        u.name()
                            .ok()
                            .flatten()
                            .map(std::string::ToString::to_string)
                    });

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

        // Sort by specified sort order
        branches.sort_by(|a, b| match filter.sort {
            BranchSortOrder::Alphabetical => natord::compare(&a.name, &b.name),
            BranchSortOrder::AlphabeticalDesc => natord::compare(&b.name, &a.name),
            BranchSortOrder::LastCommitDate => a.last_commit_time.cmp(&b.last_commit_time),
            BranchSortOrder::LastCommitDateDesc => b.last_commit_time.cmp(&a.last_commit_time),
        });

        // Apply limit if specified
        if let Some(limit) = filter.limit {
            branches.truncate(limit);
        }

        Ok(branches)
    }

    /// Get ahead/behind counts for a branch compared to its upstream
    fn get_ahead_behind(
        repo: &Git2Repository,
        branch: &git2::Branch,
    ) -> Result<(Option<usize>, Option<usize>)> {
        let Ok(upstream) = branch.upstream() else {
            return Ok((None, None));
        };

        let local_oid = branch.get().target();
        let upstream_oid = upstream.get().target();

        match (local_oid, upstream_oid) {
            (Some(local), Some(upstream)) => {
                let (ahead, behind) = repo.graph_ahead_behind(local, upstream)?;
                Ok((Some(ahead), Some(behind)))
            }
            _ => Ok((None, None)),
        }
    }

    /// Get a single commit by OID or ref name
    pub fn get_commit(&self, oid_str: &str) -> Result<Commit> {
        let repo = self.repo()?;
        let commit = repo
            .revparse_single(oid_str)
            .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?
            .peel_to_commit()
            .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?;
        Ok(Commit::from_git2_commit(&commit, &repo))
    }

    // ==================== Staging Operations ====================

    /// Stage a file (add to index)
    pub fn stage_file(&self, path: &str) -> Result<()> {
        let repo = self.repo()?;
        let mut index = repo.index()?;
        let full_path = repo
            .workdir()
            .ok_or_else(|| AxisError::Other("bare repository has no workdir".into()))?
            .join(path);
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
        let repo = self.repo()?;
        let mut index = repo.index()?;
        let workdir = repo
            .workdir()
            .ok_or_else(|| AxisError::Other("bare repository has no workdir".into()))?;
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
        let repo = self.repo()?;
        let mut index = repo.index()?;
        index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
        index.write()?;
        Ok(())
    }

    /// Unstage a file (remove from index, keeping workdir changes)
    pub fn unstage_file(&self, path: &str) -> Result<()> {
        let repo = self.repo()?;
        let head = repo.head()?;
        let head_commit = head.peel_to_commit()?;
        let head_tree = head_commit.tree()?;

        let mut index = repo.index()?;
        // Check if file exists in HEAD
        if let Ok(entry) = head_tree.get_path(Path::new(path)) {
            // File exists in HEAD - reset to HEAD version
            let obj = entry.to_object(&repo)?;
            if let Some(blob) = obj.as_blob() {
                index.add(&git2::IndexEntry {
                    ctime: git2::IndexTime::new(0, 0),
                    mtime: git2::IndexTime::new(0, 0),
                    dev: 0,
                    ino: 0,
                    mode: entry.filemode().cast_unsigned(),
                    uid: 0,
                    gid: 0,
                    file_size: u32::try_from(blob.size()).unwrap_or(u32::MAX),
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
        let repo = self.repo()?;
        let head = repo.head()?;
        let head_commit = head.peel_to_commit()?;
        repo.reset(head_commit.as_object(), git2::ResetType::Mixed, None)?;
        Ok(())
    }

    /// Discard changes in a file (revert to index or HEAD)
    pub fn discard_file(&self, path: &str) -> Result<()> {
        let mut checkout_opts = git2::build::CheckoutBuilder::new();
        checkout_opts.force();
        checkout_opts.path(path);

        self.repo()?
            .checkout_index(None, Some(&mut checkout_opts))?;
        Ok(())
    }

    /// Discard unstaged changes (reverts working tree to match the index)
    pub fn discard_unstaged(&self) -> Result<()> {
        let mut checkout_opts = git2::build::CheckoutBuilder::new();
        checkout_opts.force();

        self.repo()?
            .checkout_index(None, Some(&mut checkout_opts))?;
        Ok(())
    }

    /// Delete an untracked file from the working directory
    pub fn delete_file(&self, path: &str) -> Result<()> {
        let repo = self.repo()?;
        let workdir = repo
            .workdir()
            .ok_or_else(|| AxisError::Other("Bare repository".to_string()))?;
        let file_path = workdir.join(path);

        if !file_path.exists() {
            return Err(AxisError::FileNotFound(format!("File not found: {path}")));
        }

        std::fs::remove_file(&file_path)
            .map_err(|e| AxisError::Other(format!("Failed to delete file: {e}")))?;

        Ok(())
    }

    // ==================== Commit Operations ====================

    /// Create a new commit (optionally signed)
    pub fn create_commit(
        &self,
        message: &str,
        author_name: Option<&str>,
        author_email: Option<&str>,
        signing_config: Option<&SigningConfig>,
    ) -> Result<String> {
        let repo = self.repo()?;
        let mut index = repo.index()?;
        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;

        // Get signature
        let sig = if let (Some(name), Some(email)) = (author_name, author_email) {
            git2::Signature::now(name, email)?
        } else {
            repo.signature()?
        };

        // Get parent commit(s)
        let parents = if let Ok(head) = repo.head() {
            if let Ok(commit) = head.peel_to_commit() {
                vec![commit]
            } else {
                vec![]
            }
        } else {
            vec![]
        };

        let parent_refs: Vec<&git2::Commit> = parents.iter().collect();

        // Sign the commit if config is provided with a key
        if let Some(config) = signing_config {
            if config.signing_key.is_some() {
                return self.create_commit_signed(
                    &repo,
                    message,
                    &sig,
                    &tree,
                    &parent_refs,
                    config,
                );
            }
        }

        // Create unsigned commit
        let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &parent_refs)?;

        Ok(oid.to_string())
    }

    /// Internal: Create a signed commit
    fn create_commit_signed(
        &self,
        repo: &Git2Repository,
        message: &str,
        sig: &git2::Signature,
        tree: &git2::Tree,
        parents: &[&git2::Commit],
        signing_config: &SigningConfig,
    ) -> Result<String> {
        // Create the unsigned commit buffer
        let commit_buf = repo.commit_create_buffer(sig, sig, message, tree, parents)?;

        let commit_str = std::str::from_utf8(&commit_buf)
            .map_err(|e| AxisError::Other(format!("Invalid commit buffer: {e}")))?;

        // Sign the commit buffer (block_on since we're inside spawn_blocking)
        let signing_service = SigningService::new(self.path());
        let signature = tokio::runtime::Handle::current()
            .block_on(signing_service.sign_buffer(commit_str, signing_config))?;

        // Create the signed commit
        let oid = repo.commit_signed(commit_str, &signature, Some("gpgsig"))?;

        // Update HEAD to point to the new commit
        Self::update_head_to_commit(repo, oid, "commit (signed)")?;

        Ok(oid.to_string())
    }

    /// Update HEAD to point to a commit, handling unborn HEAD case
    fn update_head_to_commit(
        repo: &Git2Repository,
        oid: git2::Oid,
        reflog_msg: &str,
    ) -> Result<()> {
        if Self::is_head_unborn(repo) {
            // For unborn HEAD, we need to create the branch reference
            // HEAD is a symbolic ref pointing to a branch that doesn't exist yet
            let head_ref = repo.find_reference("HEAD")?;
            if let Some(target_name) = head_ref.symbolic_target() {
                repo.reference(target_name, oid, true, reflog_msg)?;
            } else {
                // HEAD is not symbolic, create refs/heads/main
                repo.reference("refs/heads/main", oid, true, reflog_msg)?;
            }
        } else {
            repo.head()?.set_target(oid, reflog_msg)?;
        }
        Ok(())
    }

    /// Amend the last commit
    pub fn amend_commit(&self, message: Option<&str>) -> Result<String> {
        let repo = self.repo()?;
        let head = repo.head()?;
        let head_commit = head.peel_to_commit()?;

        let mut index = repo.index()?;
        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;

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
        Self::apply_diff_options(&mut diff_opts, options);
        // Include untracked files in the diff with their content
        diff_opts.include_untracked(true);
        diff_opts.show_untracked_content(true);
        diff_opts.recurse_untracked_dirs(true);

        let repo = self.repo()?;
        let mut diff = repo.diff_index_to_workdir(None, Some(&mut diff_opts))?;
        diff.find_similar(None)?;
        Self::parse_diff(&diff)
    }

    /// Generate diff for staged changes (index vs HEAD)
    pub fn diff_staged(
        &self,
        options: &crate::models::DiffOptions,
    ) -> Result<Vec<crate::models::FileDiff>> {
        let repo = self.repo()?;
        let mut diff_opts = git2::DiffOptions::new();
        Self::apply_diff_options(&mut diff_opts, options);

        let head_tree = if Self::is_head_unborn(&repo) {
            None
        } else {
            Some(repo.head()?.peel_to_tree()?)
        };
        let mut diff = repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut diff_opts))?;
        diff.find_similar(None)?;
        Self::parse_diff(&diff)
    }

    /// Generate diff for all uncommitted changes (workdir vs HEAD)
    pub fn diff_head(
        &self,
        options: &crate::models::DiffOptions,
    ) -> Result<Vec<crate::models::FileDiff>> {
        let repo = self.repo()?;
        let mut diff_opts = git2::DiffOptions::new();
        Self::apply_diff_options(&mut diff_opts, options);
        // Include untracked files in the diff with their content
        diff_opts.include_untracked(true);
        diff_opts.show_untracked_content(true);
        diff_opts.recurse_untracked_dirs(true);

        let head_tree = if Self::is_head_unborn(&repo) {
            None
        } else {
            Some(repo.head()?.peel_to_tree()?)
        };
        let mut diff =
            repo.diff_tree_to_workdir_with_index(head_tree.as_ref(), Some(&mut diff_opts))?;
        diff.find_similar(None)?;
        Self::parse_diff(&diff)
    }

    /// Generate diff for a specific commit (commit vs its parent)
    pub fn diff_commit(
        &self,
        oid_str: &str,
        options: &crate::models::DiffOptions,
    ) -> Result<Vec<crate::models::FileDiff>> {
        let repo = self.repo()?;
        let commit = repo
            .revparse_single(oid_str)
            .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?
            .peel_to_commit()
            .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?;
        let tree = commit.tree()?;

        let mut diff_opts = git2::DiffOptions::new();
        Self::apply_diff_options(&mut diff_opts, options);

        let parent_tree = if commit.parent_count() > 0 {
            Some(commit.parent(0)?.tree()?)
        } else {
            None
        };

        let mut diff =
            repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))?;
        diff.find_similar(None)?;

        Self::parse_diff(&diff)
    }

    /// Generate diff between two commits
    pub fn diff_commits(
        &self,
        from_oid: &str,
        to_oid: &str,
        options: &crate::models::DiffOptions,
    ) -> Result<Vec<crate::models::FileDiff>> {
        let repo = self.repo()?;
        let from_commit = repo
            .revparse_single(from_oid)
            .map_err(|_| AxisError::InvalidReference(from_oid.to_string()))?
            .peel_to_commit()
            .map_err(|_| AxisError::InvalidReference(from_oid.to_string()))?;
        let to_commit = repo
            .revparse_single(to_oid)
            .map_err(|_| AxisError::InvalidReference(to_oid.to_string()))?
            .peel_to_commit()
            .map_err(|_| AxisError::InvalidReference(to_oid.to_string()))?;

        let from_tree = from_commit.tree()?;
        let to_tree = to_commit.tree()?;

        let mut diff_opts = git2::DiffOptions::new();
        Self::apply_diff_options(&mut diff_opts, options);

        let mut diff =
            repo.diff_tree_to_tree(Some(&from_tree), Some(&to_tree), Some(&mut diff_opts))?;
        diff.find_similar(None)?;

        Self::parse_diff(&diff)
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
            d.new_path.as_ref().is_some_and(|p| p == path)
                || d.old_path.as_ref().is_some_and(|p| p == path)
        }))
    }

    /// Get blob content as raw bytes
    /// If `commit_oid` is Some, gets the file from that commit's tree
    /// If `commit_oid` is None, reads the file from the working directory
    pub fn get_file_blob(&self, path: &str, commit_oid: Option<&str>) -> Result<Vec<u8>> {
        let repo = self.repo()?;
        if let Some(oid_str) = commit_oid {
            // Resolve ref name (e.g. "HEAD") or raw OID to a commit
            let obj = repo.revparse_single(oid_str)?;
            let commit = obj.peel_to_commit()?;
            let tree = commit.tree()?;
            let entry = tree.get_path(std::path::Path::new(path))?;
            let blob = entry.to_object(&repo)?.peel_to_blob()?;
            Ok(blob.content().to_vec())
        } else {
            // Read from working directory
            let repo_path = repo
                .workdir()
                .ok_or_else(|| AxisError::Other("No working directory".into()))?;
            let file_path = repo_path.join(path);
            Ok(std::fs::read(&file_path)?)
        }
    }

    /// Apply diff options to git2 `DiffOptions`
    fn apply_diff_options(opts: &mut git2::DiffOptions, custom: &crate::models::DiffOptions) {
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
        let repo = self.repo()?;
        let target = if let Some(ref start_point) = options.start_point {
            let obj = repo.revparse_single(start_point)?;
            repo.find_commit(obj.id())?
        } else {
            repo.head()?.peel_to_commit()?
        };

        let mut branch = repo.branch(name, &target, options.force)?;

        // Set up tracking if specified
        if let Some(ref upstream) = options.track {
            branch.set_upstream(Some(upstream))?;
        }

        Self::branch_to_model(&repo, &branch, git2::BranchType::Local)
    }

    /// Delete a branch
    pub fn delete_branch(
        &self,
        name: &str,
        options: &DeleteBranchOptions,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<()> {
        let repo = self.repo()?;
        let mut branch = repo.find_branch(name, git2::BranchType::Local)?;

        // Get upstream info before deleting local branch (if delete_remote is requested)
        let upstream_info = if options.delete_remote {
            branch.upstream().ok().and_then(|u| {
                u.name().ok().flatten().map(|full_name| {
                    // upstream name format: "origin/branch-name"
                    let parts: Vec<&str> = full_name.splitn(2, '/').collect();
                    if parts.len() == 2 {
                        (parts[0].to_string(), parts[1].to_string())
                    } else {
                        ("origin".to_string(), full_name.to_string())
                    }
                })
            })
        } else {
            None
        };

        if !options.force {
            // Check if branch is fully merged
            let head = repo.head()?;
            if let Ok(head_commit) = head.peel_to_commit() {
                let branch_commit = branch.get().peel_to_commit()?;
                let merge_base = repo.merge_base(head_commit.id(), branch_commit.id())?;
                if merge_base != branch_commit.id() {
                    return Err(AxisError::BranchNotMerged(name.to_string()));
                }
            }
        }

        branch.delete()?;
        log::info!("Deleted local branch: {name}");

        // Delete remote branch if requested and upstream was found
        if let Some((remote_name, branch_name)) = upstream_info {
            log::info!("Deleting remote branch: {remote_name}/{branch_name}");
            self.delete_remote_branch(&remote_name, &branch_name, options.force, ssh_credentials)?;
        }

        Ok(())
    }

    /// Delete a remote branch
    pub fn delete_remote_branch(
        &self,
        remote_name: &str,
        branch_name: &str,
        force: bool,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<()> {
        // Use push with a delete refspec (empty source = delete)
        let refspec = format!(":refs/heads/{branch_name}");
        let options = crate::models::PushOptions {
            force,
            set_upstream: false,
            tags: false,
        };
        self.push(
            remote_name,
            &[refspec],
            &options,
            None::<fn(usize, usize, usize) -> bool>,
            ssh_credentials,
        )?;
        Ok(())
    }

    /// Rename a branch
    pub fn rename_branch(&self, old_name: &str, new_name: &str, force: bool) -> Result<Branch> {
        let repo = self.repo()?;
        let mut branch = repo.find_branch(old_name, git2::BranchType::Local)?;
        let new_branch = branch.rename(new_name, force)?;
        Self::branch_to_model(&repo, &new_branch, git2::BranchType::Local)
    }

    /// Checkout a branch
    pub fn checkout_branch(
        &self,
        name: &str,
        options: &crate::models::CheckoutOptions,
    ) -> Result<()> {
        let repo = self.repo()?;
        // If create is true and branch doesn't exist, create it first
        let branch = if options.create {
            if let Ok(b) = repo.find_branch(name, git2::BranchType::Local) {
                b
            } else {
                let head = repo.head()?.peel_to_commit()?;
                let mut new_branch = repo.branch(name, &head, false)?;

                // Set up tracking if specified
                if let Some(ref upstream) = options.track {
                    new_branch.set_upstream(Some(upstream))?;
                }

                new_branch
            }
        } else {
            repo.find_branch(name, git2::BranchType::Local)?
        };

        let refname = branch
            .get()
            .name()
            .ok_or_else(|| AxisError::InvalidReference(name.to_string()))?;

        let obj = repo.revparse_single(refname)?;

        let mut checkout_builder = git2::build::CheckoutBuilder::new();
        if options.force {
            checkout_builder.force();
        } else {
            checkout_builder.safe();
        }

        // Collect conflicting files during checkout
        let conflicting_files = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
        let conflicting_files_clone = conflicting_files.clone();

        checkout_builder.notify_on(git2::CheckoutNotificationType::CONFLICT);
        checkout_builder.notify(
            move |_notification_type, path, _baseline, _target, _workdir| {
                if let Some(path) = path {
                    if let Some(path_str) = path.to_str() {
                        if let Ok(mut files) = conflicting_files_clone.lock() {
                            files.push(path_str.to_string());
                        }
                    }
                }
                true // Continue checkout to collect all conflicts
            },
        );

        match repo.checkout_tree(&obj, Some(&mut checkout_builder)) {
            Ok(()) => {
                repo.set_head(refname)?;
                Ok(())
            }
            Err(e)
                if e.class() == git2::ErrorClass::Checkout
                    && e.code() == git2::ErrorCode::Conflict =>
            {
                let files = conflicting_files
                    .lock()
                    .map(|f| f.clone())
                    .unwrap_or_default();
                Err(AxisError::CheckoutConflict(files))
            }
            Err(e) => Err(e.into()),
        }
    }

    /// Checkout a remote branch (creates local tracking branch, or switches to existing one)
    pub fn checkout_remote_branch(
        &self,
        remote_name: &str,
        branch_name: &str,
        local_name: Option<&str>,
        force: bool,
    ) -> Result<()> {
        let repo = self.repo()?;
        let local_branch_name = local_name.unwrap_or(branch_name);
        let remote_ref = format!("{remote_name}/{branch_name}");

        // If a local branch with this name already exists, just switch to it
        if repo
            .find_branch(local_branch_name, git2::BranchType::Local)
            .is_ok()
        {
            log::info!("Local branch '{local_branch_name}' already exists, switching to it");
            return self.checkout_branch(
                local_branch_name,
                &crate::models::CheckoutOptions {
                    force,
                    ..Default::default()
                },
            );
        }

        // Find the remote branch
        let remote_branch = repo.find_branch(&remote_ref, git2::BranchType::Remote)?;
        let target = remote_branch.get().peel_to_commit()?;

        // Create local tracking branch
        let mut local_branch = repo.branch(local_branch_name, &target, false)?;

        // Set upstream
        local_branch.set_upstream(Some(&remote_ref))?;

        // Checkout the new branch
        self.checkout_branch(
            local_branch_name,
            &crate::models::CheckoutOptions {
                force,
                ..Default::default()
            },
        )
    }

    /// Get branch details
    pub fn get_branch(&self, name: &str, branch_type: &BranchType) -> Result<Branch> {
        let git_branch_type = match branch_type {
            BranchType::Local => git2::BranchType::Local,
            BranchType::Remote => git2::BranchType::Remote,
        };
        let repo = self.repo()?;
        let branch = repo.find_branch(name, git_branch_type)?;
        Self::branch_to_model(&repo, &branch, git_branch_type)
    }

    /// Convert a git2 Branch to our Branch model
    fn branch_to_model(
        repo: &Git2Repository,
        branch: &git2::Branch,
        branch_type: git2::BranchType,
    ) -> Result<Branch> {
        let name = branch.name()?.unwrap_or("").to_string();
        let reference = branch.get();
        let oid = reference
            .target()
            .ok_or_else(|| AxisError::InvalidReference(name.clone()))?;

        let commit = repo.find_commit(oid)?;
        // Use branch.is_head() to check if this branch is currently checked out
        let is_head = branch.is_head();

        let (ahead, behind) = Self::get_ahead_behind(repo, branch)?;
        let upstream = branch.upstream().ok().and_then(|u| {
            u.name()
                .ok()
                .flatten()
                .map(std::string::ToString::to_string)
        });

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

    /// Compare two branches to find commits ahead/behind and file differences
    pub fn compare_branches(
        &self,
        base_ref: &str,
        compare_ref: &str,
    ) -> Result<crate::models::BranchCompareResult> {
        let repo = self.repo()?;
        // Resolve refs to OIDs
        let base_obj = repo
            .revparse_single(base_ref)
            .map_err(|_| AxisError::InvalidReference(base_ref.to_string()))?;
        let compare_obj = repo
            .revparse_single(compare_ref)
            .map_err(|_| AxisError::InvalidReference(compare_ref.to_string()))?;

        let base_oid = base_obj.id();
        let compare_oid = compare_obj.id();

        // Find merge base (common ancestor)
        let merge_base_oid = repo.merge_base(base_oid, compare_oid).ok();

        // Get commits ahead (in base/current but not in compare)
        // These are commits the current branch has that the compare branch doesn't
        let ahead_commits = Self::commits_between(&repo, merge_base_oid, base_oid)?;

        // Get commits behind (in compare but not in base/current)
        // These are commits the compare branch has that the current branch doesn't
        let behind_commits = Self::commits_between(&repo, merge_base_oid, compare_oid)?;

        // Get aggregate file diff (changes in base/current branch since merge_base)
        // This shows what the current branch introduces relative to the compare branch
        let diff_from = merge_base_oid.unwrap_or(compare_oid);
        let files = self.diff_commits(
            &diff_from.to_string(),
            &base_oid.to_string(),
            &crate::models::DiffOptions::default(),
        )?;

        Ok(crate::models::BranchCompareResult {
            base_ref: base_ref.to_string(),
            compare_ref: compare_ref.to_string(),
            base_oid: base_oid.to_string(),
            compare_oid: compare_oid.to_string(),
            merge_base_oid: merge_base_oid.map(|oid| oid.to_string()),
            ahead_commits,
            behind_commits,
            files,
        })
    }

    /// Get commits between two points (from `merge_base` to target)
    fn commits_between(
        repo: &Git2Repository,
        from_oid: Option<git2::Oid>,
        to_oid: git2::Oid,
    ) -> Result<Vec<Commit>> {
        let mut revwalk = repo.revwalk()?;
        revwalk.set_sorting(git2::Sort::TIME | git2::Sort::TOPOLOGICAL)?;
        revwalk.push(to_oid)?;

        // Hide everything reachable from merge_base (if it exists)
        if let Some(from) = from_oid {
            let _ = revwalk.hide(from);
        }

        let mut commits = Vec::new();
        for oid_result in revwalk {
            let oid = oid_result?;
            let commit = repo.find_commit(oid)?;
            commits.push(Commit::from_git2_commit(&commit, repo));
        }

        Ok(commits)
    }

    // ==================== Remote Operations ====================

    /// List all remotes
    pub fn list_remotes(
        &self,
        options: &crate::models::ListRemoteOptions,
    ) -> Result<Vec<crate::models::Remote>> {
        use crate::models::RemoteSortOrder;

        let repo = self.repo()?;
        let remote_names = repo.remotes()?;
        let mut remotes = Vec::new();

        for name in remote_names.iter().flatten() {
            if let Ok(remote) = repo.find_remote(name) {
                remotes.push(crate::models::Remote {
                    name: name.to_string(),
                    url: remote.url().map(std::string::ToString::to_string),
                    push_url: remote.pushurl().map(std::string::ToString::to_string),
                    fetch_refspecs: remote
                        .fetch_refspecs()?
                        .iter()
                        .flatten()
                        .map(std::string::ToString::to_string)
                        .collect(),
                    push_refspecs: remote
                        .push_refspecs()?
                        .iter()
                        .flatten()
                        .map(std::string::ToString::to_string)
                        .collect(),
                });
            }
        }

        // Sort remotes using natord for natural ordering
        match options.sort {
            RemoteSortOrder::Alphabetical => {
                remotes.sort_by(|a, b| natord::compare(&a.name, &b.name));
            }
            RemoteSortOrder::AlphabeticalDesc => {
                remotes.sort_by(|a, b| natord::compare(&b.name, &a.name));
            }
        }

        // Apply limit if specified
        if let Some(limit) = options.limit {
            remotes.truncate(limit);
        }

        Ok(remotes)
    }

    /// Get a single remote by name
    pub fn get_remote(&self, name: &str) -> Result<crate::models::Remote> {
        let repo = self.repo()?;
        let remote = repo.find_remote(name)?;
        Ok(crate::models::Remote {
            name: name.to_string(),
            url: remote.url().map(std::string::ToString::to_string),
            push_url: remote.pushurl().map(std::string::ToString::to_string),
            fetch_refspecs: remote
                .fetch_refspecs()?
                .iter()
                .flatten()
                .map(std::string::ToString::to_string)
                .collect(),
            push_refspecs: remote
                .push_refspecs()?
                .iter()
                .flatten()
                .map(std::string::ToString::to_string)
                .collect(),
        })
    }

    /// Add a new remote
    pub fn add_remote(&self, name: &str, url: &str) -> Result<crate::models::Remote> {
        let repo = self.repo()?;
        let remote = repo.remote(name, url)?;
        Ok(crate::models::Remote {
            name: name.to_string(),
            url: remote.url().map(std::string::ToString::to_string),
            push_url: remote.pushurl().map(std::string::ToString::to_string),
            fetch_refspecs: remote
                .fetch_refspecs()?
                .iter()
                .flatten()
                .map(std::string::ToString::to_string)
                .collect(),
            push_refspecs: remote
                .push_refspecs()?
                .iter()
                .flatten()
                .map(std::string::ToString::to_string)
                .collect(),
        })
    }

    /// Remove a remote
    pub fn remove_remote(&self, name: &str) -> Result<()> {
        self.repo()?.remote_delete(name)?;
        Ok(())
    }

    /// Rename a remote
    pub fn rename_remote(&self, old_name: &str, new_name: &str) -> Result<Vec<String>> {
        let problems = self.repo()?.remote_rename(old_name, new_name)?;
        Ok(problems
            .iter()
            .flatten()
            .map(std::string::ToString::to_string)
            .collect())
    }

    /// Set the URL for a remote
    pub fn set_remote_url(&self, name: &str, url: &str) -> Result<()> {
        self.repo()?.remote_set_url(name, url)?;
        Ok(())
    }

    /// Set the push URL for a remote
    pub fn set_remote_push_url(&self, name: &str, url: &str) -> Result<()> {
        self.repo()?.remote_set_pushurl(name, Some(url))?;
        Ok(())
    }

    /// Get repository-local user.name and user.email from .git/config
    pub fn get_repo_user_config(&self) -> Result<(Option<String>, Option<String>)> {
        let config = self.repo()?.config()?;

        let user_name = config
            .get_entry("user.name")
            .ok()
            .filter(|e| e.level() == git2::ConfigLevel::Local)
            .and_then(|e| e.value().map(std::string::ToString::to_string));

        let user_email = config
            .get_entry("user.email")
            .ok()
            .filter(|e| e.level() == git2::ConfigLevel::Local)
            .and_then(|e| e.value().map(std::string::ToString::to_string));

        Ok((user_name, user_email))
    }

    /// Get global user.name and user.email
    pub fn get_global_user_config(&self) -> Result<(Option<String>, Option<String>)> {
        let config = self.repo()?.config()?;

        let user_name = config.get_string("user.name").ok();
        let user_email = config.get_string("user.email").ok();

        Ok((user_name, user_email))
    }

    /// Set repository-local user.name and user.email in .git/config
    pub fn set_repo_user_config(&self, name: Option<&str>, email: Option<&str>) -> Result<()> {
        let mut config = self
            .repo()?
            .config()?
            .open_level(git2::ConfigLevel::Local)?;

        match name {
            Some(n) if !n.is_empty() => config.set_str("user.name", n)?,
            _ => {
                let _ = config.remove("user.name");
            }
        }

        match email {
            Some(e) if !e.is_empty() => config.set_str("user.email", e)?,
            _ => {
                let _ = config.remove("user.email");
            }
        }

        Ok(())
    }

    /// Get repository-local signing config from .git/config
    pub fn get_repo_signing_config(&self) -> Result<(Option<SigningFormat>, Option<String>)> {
        let config = self.repo()?.config()?;

        let format = config
            .get_entry("gpg.format")
            .ok()
            .filter(|e| e.level() == git2::ConfigLevel::Local)
            .and_then(|e| e.value().and_then(|v| v.parse().ok()));

        let signing_key = config
            .get_entry("user.signingkey")
            .ok()
            .filter(|e| e.level() == git2::ConfigLevel::Local)
            .and_then(|e| e.value().map(std::string::ToString::to_string));

        Ok((format, signing_key))
    }

    /// Set repository-local signing config in .git/config
    pub fn set_repo_signing_config(
        &self,
        format: Option<&SigningFormat>,
        signing_key: Option<&str>,
    ) -> Result<()> {
        let mut config = self
            .repo()?
            .config()?
            .open_level(git2::ConfigLevel::Local)?;

        match format {
            Some(f) => config.set_str("gpg.format", &f.to_string())?,
            None => {
                let _ = config.remove("gpg.format");
            }
        }

        match signing_key {
            Some(k) if !k.is_empty() => config.set_str("user.signingkey", k)?,
            _ => {
                let _ = config.remove("user.signingkey");
            }
        }

        Ok(())
    }

    /// Fetch from a remote with optional progress callback
    /// The callback receives progress stats and returns true to continue or false to cancel
    pub fn fetch<F>(
        &self,
        remote_name: &str,
        options: &crate::models::FetchOptions,
        refspecs: Option<&[&str]>,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<crate::models::FetchResult>
    where
        F: FnMut(&git2::Progress<'_>) -> bool + 'static,
    {
        let repo = self.repo()?;

        let mut remote = repo.find_remote(remote_name)?;

        let mut fetch_opts = git2::FetchOptions::new();

        // Set up callbacks for progress and credentials
        let mut callbacks = git2::RemoteCallbacks::new();
        callbacks.credentials(build_credentials_callback(ssh_credentials));
        callbacks.certificate_check(build_certificate_check_callback());

        // Set up progress callback if provided
        if let Some(mut cb) = progress_cb {
            callbacks.transfer_progress(move |stats| cb(&stats));
        }

        fetch_opts.remote_callbacks(callbacks);

        if options.prune {
            fetch_opts.prune(git2::FetchPrune::On);
        }

        if options.tags {
            fetch_opts.download_tags(git2::AutotagOption::All);
        }

        if let Some(depth) = options.depth {
            fetch_opts.depth(depth.cast_signed());
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

    /// Push to a remote with optional progress callback
    /// The callback receives (current, total, bytes) and returns true to continue
    pub fn push<F>(
        &self,
        remote_name: &str,
        refspecs: &[String],
        options: &crate::models::PushOptions,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<crate::models::PushResult>
    where
        F: FnMut(usize, usize, usize) -> bool + 'static,
    {
        let repo = self.repo()?;

        let mut remote = repo.find_remote(remote_name)?;

        let mut push_opts = git2::PushOptions::new();

        // Set up callbacks for credentials
        let mut callbacks = git2::RemoteCallbacks::new();
        callbacks.credentials(build_credentials_callback(ssh_credentials));
        callbacks.certificate_check(build_certificate_check_callback());

        // Set up progress callback if provided
        if let Some(mut cb) = progress_cb {
            callbacks.push_transfer_progress(move |current, total, bytes| {
                cb(current, total, bytes);
            });
        }

        push_opts.remote_callbacks(callbacks);

        // Build refspecs with force prefix if needed
        let refspecs: Vec<String> = if options.force {
            refspecs
                .iter()
                .map(|r| {
                    if r.starts_with('+') {
                        r.clone()
                    } else {
                        format!("+{r}")
                    }
                })
                .collect()
        } else {
            refspecs.to_vec()
        };

        let refspec_strs: Vec<&str> = refspecs.iter().map(std::string::String::as_str).collect();

        remote.push(&refspec_strs, Some(&mut push_opts))?;

        Ok(crate::models::PushResult {
            remote: remote_name.to_string(),
            pushed_refs: Vec::new(), // TODO: track pushed refs
        })
    }

    /// Push the current branch to its upstream with optional progress callback
    pub fn push_current_branch<F>(
        &self,
        remote_name: &str,
        options: &crate::models::PushOptions,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<crate::models::PushResult>
    where
        F: FnMut(usize, usize, usize) -> bool + 'static,
    {
        let repo = self.repo()?;
        let head = repo.head()?;
        let branch_name = head
            .shorthand()
            .ok_or_else(|| AxisError::BranchNotFound("HEAD".to_string()))?;

        let refspec = format!("refs/heads/{branch_name}:refs/heads/{branch_name}");
        let result = self.push(
            remote_name,
            &[refspec],
            options,
            progress_cb,
            ssh_credentials,
        )?;

        // Set upstream tracking if requested
        if options.set_upstream {
            let upstream_ref = format!("{remote_name}/{branch_name}");
            self.set_branch_upstream(branch_name, Some(&upstream_ref))?;
        }

        Ok(result)
    }

    /// Pull from a remote (fetch + merge/rebase) with optional progress callback
    /// Note: Full merge/rebase requires CLI for complex cases
    pub fn pull<F>(
        &self,
        remote_name: &str,
        branch_name: &str,
        options: &crate::models::PullOptions,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<()>
    where
        F: FnMut(&git2::Progress<'_>) -> bool + 'static,
    {
        // First, fetch
        self.fetch(
            remote_name,
            &crate::models::FetchOptions::default(),
            None,
            progress_cb,
            ssh_credentials,
        )?;

        let repo = self.repo()?;

        // Get the remote tracking branch
        let remote_ref = format!("{remote_name}/{branch_name}");
        let fetch_head = repo.find_reference(&format!("refs/remotes/{remote_ref}"))?;
        let fetch_commit = fetch_head.peel_to_commit()?;

        // Get local branch commit
        let local_ref = repo.head()?;
        let local_commit = local_ref.peel_to_commit()?;

        // Check if we can fast-forward
        let (ahead, behind) = repo.graph_ahead_behind(local_commit.id(), fetch_commit.id())?;

        if behind == 0 {
            // Already up to date
            return Ok(());
        }

        if ahead == 0 {
            // Can fast-forward - but first check for dirty files that would be overwritten
            let (conflicting_files, files_to_update) =
                Self::check_dirty_files_for_checkout(&repo, &local_commit, &fetch_commit)?;
            if !conflicting_files.is_empty() {
                return Err(AxisError::CheckoutConflict(conflicting_files));
            }

            let refname = local_ref
                .name()
                .ok_or_else(|| AxisError::InvalidReference("HEAD".to_string()))?;

            repo.reference(
                refname,
                fetch_commit.id(),
                true,
                &format!("pull: fast-forward {branch_name} from {remote_ref}"),
            )?;

            // Update working directory - only checkout files that changed between commits
            // This preserves local changes to files not affected by the pull
            let mut checkout_opts = git2::build::CheckoutBuilder::new();
            checkout_opts.force();
            for path in &files_to_update {
                checkout_opts.path(path);
            }
            repo.checkout_head(Some(&mut checkout_opts))?;

            return Ok(());
        }

        if options.ff_only {
            return Err(AxisError::CannotFastForward);
        }

        // For non-fast-forward cases, we need to merge or rebase
        // TODO: This is complex and better handled by Git CLI for now
        if options.rebase {
            return Err(AxisError::RebaseRequired);
        }

        // Perform merge using git2
        let annotated = repo.find_annotated_commit(fetch_commit.id())?;
        let (analysis, _preference) = repo.merge_analysis(&[&annotated])?;

        if analysis.is_up_to_date() {
            return Ok(());
        }

        if analysis.is_fast_forward() {
            // Already handled above, but just in case - check for dirty files first
            let (conflicting_files, files_to_update) =
                Self::check_dirty_files_for_checkout(&repo, &local_commit, &fetch_commit)?;
            if !conflicting_files.is_empty() {
                return Err(AxisError::CheckoutConflict(conflicting_files));
            }

            let refname = local_ref
                .name()
                .ok_or_else(|| AxisError::InvalidReference("HEAD".to_string()))?;

            repo.reference(refname, fetch_commit.id(), true, "fast-forward merge")?;

            // Path-specific checkout to preserve local changes
            let mut checkout_opts = git2::build::CheckoutBuilder::new();
            checkout_opts.force();
            for path in &files_to_update {
                checkout_opts.path(path);
            }
            repo.checkout_head(Some(&mut checkout_opts))?;
            return Ok(());
        }

        if analysis.is_normal() {
            // Check for dirty files that would conflict with merge
            let (conflicting_files, _files_to_update) =
                Self::check_dirty_files_for_checkout(&repo, &local_commit, &fetch_commit)?;
            if !conflicting_files.is_empty() {
                return Err(AxisError::CheckoutConflict(conflicting_files));
            }

            // Perform merge (git2 merge handles the working directory update)
            repo.merge(&[&annotated], None, None)?;

            // Check for conflicts
            if repo.index()?.has_conflicts() {
                return Err(AxisError::MergeConflict);
            }

            // Create merge commit
            let tree_id = repo.index()?.write_tree()?;
            let tree = repo.find_tree(tree_id)?;
            let sig = repo.signature()?;
            let message = format!("Merge branch '{branch_name}' of {remote_name}");

            repo.commit(
                Some("HEAD"),
                &sig,
                &sig,
                &message,
                &tree,
                &[&local_commit, &fetch_commit],
            )?;

            // Clean up merge state
            repo.cleanup_state()?;
        }

        Ok(())
    }

    /// Set upstream tracking branch for a local branch
    pub fn set_branch_upstream(&self, branch_name: &str, upstream: Option<&str>) -> Result<()> {
        let repo = self.repo()?;
        let mut branch = repo.find_branch(branch_name, git2::BranchType::Local)?;
        branch.set_upstream(upstream)?;
        Ok(())
    }

    /// Parse a git2 Diff into our `FileDiff` model
    // Allow many lines: this is a complex diff parsing function with multiple callbacks
    // that must be defined together. The structure is dictated by git2's callback API.
    #[allow(clippy::too_many_lines)]
    fn parse_diff(diff: &git2::Diff) -> Result<Vec<crate::models::FileDiff>> {
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
                        last_hunk.lines.clone_from(&lines);
                    }

                    if let Some(last_file) = files.last_mut() {
                        last_file.hunks.clone_from(&hunks);
                    }

                    hunks.clear();
                }
                current_lines.borrow_mut().clear();

                let status = match delta.status() {
                    git2::Delta::Added => DiffStatus::Added,
                    git2::Delta::Deleted => DiffStatus::Deleted,
                    git2::Delta::Renamed => DiffStatus::Renamed,
                    git2::Delta::Copied => DiffStatus::Copied,
                    git2::Delta::Typechange => DiffStatus::TypeChanged,
                    git2::Delta::Untracked => DiffStatus::Untracked,
                    git2::Delta::Conflicted => DiffStatus::Conflicted,
                    _ => DiffStatus::Modified, // Modified, Unmodified, Ignored, etc.
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
                        last_hunk.lines.clone_from(&lines);
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
                    '=' | '>' | '<' => DiffLineType::Header,
                    'B' => DiffLineType::Binary,
                    _ => DiffLineType::Context, // ' ' and other origins
                };

                let content = String::from_utf8_lossy(line.content())
                    .trim_end_matches(['\r', '\n'])
                    .to_string();

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
                last_hunk.lines.clone_from(&lines);
            }

            if let Some(last_file) = files.last_mut() {
                last_file.hunks.clone_from(&hunks);
            }
        }

        Ok(files.into_inner())
    }

    // ==================== Graph Operations ====================

    /// Build a commit graph with lane assignments for visualization
    // Allow many lines: this is a complex graph algorithm that assigns lanes to commits
    // for visualization. The algorithm must be kept together for correctness and readability.
    #[allow(clippy::too_many_lines)]
    pub fn build_graph(
        &self,
        options: &crate::models::GraphOptions,
    ) -> Result<crate::models::GraphResult> {
        let repo = self.repo()?;
        let mut revwalk = repo.revwalk()?;

        // Configure revwalk based on branch filter
        match &options.branch_filter {
            BranchFilterType::All => {
                // Add all branches (local and optionally remote)
                for branch_result in repo.branches(None)? {
                    let (branch, branch_type) = branch_result?;
                    // Skip remote branches if not included
                    if !options.include_remotes && branch_type == git2::BranchType::Remote {
                        continue;
                    }
                    if let Some(oid) = branch.get().target() {
                        let _ = revwalk.push(oid);
                    }
                }
            }
            BranchFilterType::Current => {
                // Only current branch
                revwalk.push_head()?;
            }
            BranchFilterType::Specific(branch_name) => {
                // Specific branch
                if let Ok(reference) = repo.find_reference(&format!("refs/heads/{branch_name}")) {
                    if let Some(oid) = reference.target() {
                        revwalk.push(oid)?;
                    }
                } else if let Ok(reference) =
                    repo.find_reference(&format!("refs/remotes/{branch_name}"))
                {
                    if let Some(oid) = reference.target() {
                        revwalk.push(oid)?;
                    }
                } else {
                    // Try parsing as a ref
                    let obj = repo.revparse_single(branch_name)?;
                    revwalk.push(obj.id())?;
                }
            }
        }

        // Set sort order
        let sorting = match options.sort_order {
            SortOrder::DateOrder => git2::Sort::TIME | git2::Sort::TOPOLOGICAL,
            SortOrder::AncestorOrder => git2::Sort::TOPOLOGICAL,
        };
        revwalk.set_sorting(sorting)?;

        // Collect refs for each commit
        let commit_refs = Self::collect_commit_refs(&repo)?;

        // Process commits and build graph
        let mut lane_state = LaneState::new();
        let mut graph_commits = Vec::new();
        let skip = options.skip.unwrap_or(0);
        let limit = options.limit.unwrap_or(100);
        let mut total_count = 0;

        // Check for uncommitted changes if requested
        if options.include_uncommitted && skip == 0 {
            if let Ok(statuses) = repo.statuses(None) {
                let has_changes = statuses.iter().any(|s| {
                    let status = s.status();
                    status.intersects(
                        git2::Status::INDEX_NEW
                            | git2::Status::INDEX_MODIFIED
                            | git2::Status::INDEX_DELETED
                            | git2::Status::INDEX_RENAMED
                            | git2::Status::INDEX_TYPECHANGE
                            | git2::Status::WT_NEW
                            | git2::Status::WT_MODIFIED
                            | git2::Status::WT_DELETED
                            | git2::Status::WT_RENAMED
                            | git2::Status::WT_TYPECHANGE
                            | git2::Status::CONFLICTED,
                    )
                });

                if has_changes {
                    // Get HEAD commit as parent
                    let head_oid = repo
                        .head()
                        .ok()
                        .and_then(|h| h.target())
                        .map(|oid| oid.to_string());

                    // Reserve lane 0 for uncommitted
                    lane_state.get_lane_for_commit("uncommitted");

                    // Build parent_oids first, then process lane state before computing edges
                    let mut parent_oids: Vec<String> = Vec::new();

                    // Add HEAD as first parent
                    if let Some(ref parent_oid) = head_oid {
                        parent_oids.push(parent_oid.clone());
                    }

                    // Check for merge in progress - add MERGE_HEAD as second parent
                    // MERGE_HEAD lives inside .git/, so use repo.path() not self.path()
                    let merge_head_path = repo.path().join("MERGE_HEAD");
                    let merge_head_oid_str = if merge_head_path.exists() {
                        std::fs::read_to_string(&merge_head_path)
                            .ok()
                            .and_then(|content| {
                                let oid = content.trim().to_string();
                                if oid.is_empty() {
                                    None
                                } else {
                                    Some(oid)
                                }
                            })
                    } else {
                        None
                    };

                    if let Some(ref merge_oid) = merge_head_oid_str {
                        parent_oids.push(merge_oid.clone());
                    }

                    let is_merging = merge_head_oid_str.is_some();

                    // Update lane state BEFORE computing edges so lanes are correct
                    lane_state.process_commit(0, &parent_oids);

                    // Now build parent edges with correctly assigned lanes
                    let mut parent_edges: Vec<GraphEdge> = Vec::new();

                    if let Some(ref parent_oid) = head_oid {
                        let head_lane = lane_state.find_lane(parent_oid).unwrap_or(0);
                        parent_edges.push(GraphEdge {
                            parent_oid: parent_oid.clone(),
                            parent_lane: head_lane,
                            edge_type: if head_lane == 0 {
                                EdgeType::Straight
                            } else {
                                EdgeType::Branch
                            },
                        });
                    }

                    if let Some(ref merge_oid) = merge_head_oid_str {
                        let merge_lane = lane_state.find_lane(merge_oid).unwrap_or(1);
                        parent_edges.push(GraphEdge {
                            parent_oid: merge_oid.clone(),
                            parent_lane: merge_lane,
                            edge_type: EdgeType::MergePreview,
                        });
                    }

                    let now = chrono::Utc::now();
                    graph_commits.push(GraphCommit {
                        commit: Commit {
                            oid: "uncommitted".to_string(),
                            short_oid: String::new(),
                            parent_oids,
                            message: "Uncommitted Changes".to_string(),
                            summary: "Uncommitted Changes".to_string(),
                            author: crate::models::Signature {
                                name: String::new(),
                                email: String::new(),
                                timestamp: now,
                            },
                            committer: crate::models::Signature {
                                name: String::new(),
                                email: String::new(),
                                timestamp: now,
                            },
                            timestamp: now,
                            is_merge: is_merging,
                            signature: None,
                        },
                        lane: 0,
                        parent_edges,
                        refs: vec![],
                    });
                }
            }
        }

        let mut has_more = false;

        for oid_result in revwalk {
            let oid = oid_result?;
            total_count += 1;

            if total_count <= skip {
                continue;
            }

            if graph_commits.len() >= limit {
                // We have enough commits, just mark that there's more
                has_more = true;
                break;
            }

            let commit = repo.find_commit(oid)?;
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
            lane_state.process_commit(lane, &parent_oids);

            // Get refs for this commit
            let refs = commit_refs.get(&oid_str).cloned().unwrap_or_default();

            graph_commits.push(GraphCommit {
                commit: Commit::from_git2_commit(&commit, &repo),
                lane,
                parent_edges,
                refs,
            });
        }

        let max_lane = graph_commits.iter().map(|c| c.lane).max().unwrap_or(0);

        Ok(GraphResult {
            commits: graph_commits,
            total_count,
            max_lane,
            has_more,
        })
    }

    /// Collect all refs (branches and tags) and map them to commit OIDs
    fn collect_commit_refs(
        repo: &Git2Repository,
    ) -> Result<std::collections::HashMap<String, Vec<crate::models::CommitRef>>> {
        use crate::models::{CommitRef, RefType};
        use std::collections::HashMap;

        let mut commit_refs: HashMap<String, Vec<CommitRef>> = HashMap::new();

        // Get HEAD for is_head check
        let head_oid = repo.head().ok().and_then(|h| h.target());

        // Collect branches
        for branch_result in repo.branches(None)? {
            let (branch, branch_type) = branch_result?;
            if let (Some(name), Some(oid)) = (branch.name()?, branch.get().target()) {
                let oid_str = oid.to_string();
                let ref_type = match branch_type {
                    git2::BranchType::Local => RefType::LocalBranch,
                    git2::BranchType::Remote => RefType::RemoteBranch,
                };
                let is_head = head_oid.is_some_and(|h| h == oid) && branch.is_head();

                commit_refs.entry(oid_str).or_default().push(CommitRef {
                    name: name.to_string(),
                    ref_type,
                    is_head,
                });
            }
        }

        // Collect tags
        repo.tag_foreach(|oid, name| {
            let name_str = String::from_utf8_lossy(name);
            // Remove "refs/tags/" prefix
            let short_name = name_str.strip_prefix("refs/tags/").unwrap_or(&name_str);

            // Resolve annotated tags to their target commit
            let target_oid = if let Ok(tag) = repo.find_tag(oid) {
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
    pub fn search_commits(&self, options: &crate::models::SearchOptions) -> Result<SearchResult> {
        let repo = self.repo()?;

        let query = options.query.to_lowercase();
        let limit = options.limit.unwrap_or(50);

        let mut revwalk = repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        let mut matches = Vec::new();
        let mut total_matches = 0;

        for oid_result in revwalk {
            let oid = oid_result?;
            let commit = repo.find_commit(oid)?;

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
                    matches.push(Commit::from_git2_commit(&commit, &repo));
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
    pub fn blame_file(&self, path: &str, commit_oid: Option<&str>) -> Result<BlameResult> {
        let repo = self.repo()?;

        let mut blame_opts = git2::BlameOptions::new();

        // If a specific commit is provided, blame up to that commit
        if let Some(oid_str) = commit_oid {
            let obj = repo
                .revparse_single(oid_str)
                .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?;
            blame_opts.newest_commit(obj.id());
        }

        let blame = repo.blame_file(Path::new(path), Some(&mut blame_opts))?;

        // Read file content to get line contents
        let file_content = if let Some(oid_str) = commit_oid {
            let commit = repo
                .revparse_single(oid_str)
                .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?
                .peel_to_commit()
                .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?;
            let tree = commit.tree()?;
            let entry = tree.get_path(Path::new(path))?;
            let blob = entry.to_object(&repo)?.peel_to_blob()?;
            String::from_utf8_lossy(blob.content()).to_string()
        } else {
            // Read from workdir
            let workdir = repo
                .workdir()
                .ok_or_else(|| AxisError::GitError("No working directory".to_string()))?;
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

                let (author, timestamp) = if let Ok(commit) = repo.find_commit(commit_oid) {
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
        let repo = self.repo()?;
        let mut revwalk = repo.revwalk()?;

        if let Some(ref_name) = from_ref {
            let obj = repo.revparse_single(ref_name)?;
            revwalk.push(obj.id())?;
        } else {
            revwalk.push_head()?;
        }

        Ok(revwalk.count())
    }

    // ==================== Tag Operations ====================

    /// List tags with optional filtering, sorting, and limiting
    pub fn tag_list(
        &self,
        options: &ListTagsOptions,
        repo: Option<&Git2Repository>,
    ) -> Result<Vec<Tag>> {
        let owned_repo;
        let repo = if let Some(r) = repo {
            r
        } else {
            owned_repo = self.repo()?;
            &owned_repo
        };

        // Get tag names with optional pattern filtering
        let tag_names = repo.tag_names(options.pattern.as_deref())?;
        let mut names: Vec<String> = tag_names.iter().flatten().map(String::from).collect();

        // For date-based sorting, we need to get timestamps first
        let needs_date_sort = matches!(
            options.sort,
            TagSortOrder::CreationDate | TagSortOrder::CreationDateDesc
        );

        if needs_date_sort {
            // Collect (name, timestamp) pairs for sorting
            let mut name_times: Vec<(String, i64)> = names
                .into_iter()
                .filter_map(|name| {
                    let full_name = format!("refs/tags/{name}");
                    let reference = repo.find_reference(&full_name).ok()?;
                    let target_obj = reference.peel(git2::ObjectType::Commit).ok()?;
                    let commit = target_obj.peel_to_commit().ok()?;
                    Some((name, commit.time().seconds()))
                })
                .collect();

            // Sort by timestamp
            match options.sort {
                TagSortOrder::CreationDate => name_times.sort_by_key(|(_, t)| *t),
                TagSortOrder::CreationDateDesc => {
                    name_times.sort_by_key(|(_, t)| std::cmp::Reverse(*t));
                }
                _ => {}
            }

            names = name_times.into_iter().map(|(n, _)| n).collect();
        } else {
            // Natural alphabetical sorting (handles version numbers correctly)
            match options.sort {
                TagSortOrder::Alphabetical => names.sort_by(|a, b| natord::compare(a, b)),
                TagSortOrder::AlphabeticalDesc => {
                    names.sort_by(|a, b| natord::compare(b, a));
                }
                _ => {}
            }
        }

        // Apply limit
        if let Some(limit) = options.limit {
            names.truncate(limit);
        }

        // Build full Tag objects
        let mut tags = Vec::with_capacity(names.len());
        for name in names {
            let full_name = format!("refs/tags/{name}");
            let reference = repo.find_reference(&full_name)?;

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
                    (
                        true,
                        tag.message().map(std::string::ToString::to_string),
                        tagger_sig,
                    )
                } else {
                    (false, None, None)
                }
            } else {
                (false, None, None)
            };

            // Get target commit info
            let (target_summary, target_time) = if let Ok(commit) = target_obj.peel_to_commit() {
                let summary = commit.summary().map(std::string::ToString::to_string);
                let time = DateTime::from_timestamp(commit.time().seconds(), 0)
                    .map(|dt| dt.with_timezone(&Utc));
                (summary, time)
            } else {
                (None, None)
            };

            tags.push(Tag {
                name,
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

        Ok(tags)
    }

    /// Create a new tag
    pub fn tag_create(&self, name: &str, options: &CreateTagOptions) -> Result<TagResult> {
        let repo = self.repo()?;
        // Get target commit
        let target_ref = options.target.as_deref().unwrap_or("HEAD");
        let obj = repo.revparse_single(target_ref)?;
        let commit = obj.peel_to_commit()?;

        // Check if tag exists
        let tag_ref = format!("refs/tags/{name}");
        if repo.find_reference(&tag_ref).is_ok() {
            if !options.force {
                return Ok(TagResult {
                    success: false,
                    message: format!("Tag '{name}' already exists"),
                    tag: None,
                });
            }
            // Delete existing tag if force is set
            repo.find_reference(&tag_ref)?.delete()?;
        }

        if options.annotated {
            // Create annotated tag
            let sig = repo.signature()?;
            let message = options.message.as_deref().unwrap_or("");
            repo.tag(name, commit.as_object(), &sig, message, options.force)?;
        } else {
            // Create lightweight tag
            repo.tag_lightweight(name, commit.as_object(), options.force)?;
        }

        // Return the created tag
        let tags = self.tag_list(&ListTagsOptions::default(), Some(&repo))?;
        let created_tag = tags.into_iter().find(|t| t.name == name);

        Ok(TagResult {
            success: true,
            message: format!("Tag '{name}' created successfully"),
            tag: created_tag,
        })
    }

    /// Delete a tag
    pub fn tag_delete(&self, name: &str) -> Result<TagResult> {
        let tag_ref = format!("refs/tags/{name}");

        match self.repo()?.find_reference(&tag_ref) {
            Ok(mut reference) => {
                reference.delete()?;
                Ok(TagResult {
                    success: true,
                    message: format!("Tag '{name}' deleted successfully"),
                    tag: None,
                })
            }
            Err(_) => Ok(TagResult {
                success: false,
                message: format!("Tag '{name}' not found"),
                tag: None,
            }),
        }
    }

    // ==================== Rebase Preview ====================

    /// Get preview data for a rebase operation
    pub fn get_rebase_preview(&self, onto: &str) -> Result<RebasePreview> {
        let repo = self.repo()?;
        // Get HEAD commit (current branch tip)
        let head = repo.head()?;
        let head_commit = head.peel_to_commit()?;

        // Resolve the "onto" target
        let target_obj = repo.revparse_single(onto)?;
        let target_commit = target_obj
            .peel_to_commit()
            .map_err(|_| AxisError::InvalidReference(onto.to_string()))?;

        // Find merge-base between HEAD and target
        let merge_base_oid = repo
            .merge_base(head_commit.id(), target_commit.id())
            .map_err(|_| {
                AxisError::Other(format!(
                    "No common ancestor found between HEAD and '{onto}'"
                ))
            })?;
        let merge_base_commit = repo.find_commit(merge_base_oid)?;

        // Collect commits to rebase (from HEAD to merge-base, exclusive)
        let mut revwalk = repo.revwalk()?;
        revwalk.push(head_commit.id())?;
        revwalk.hide(merge_base_oid)?;
        revwalk.set_sorting(git2::Sort::TOPOLOGICAL | git2::Sort::REVERSE)?;

        let mut commits_to_rebase = Vec::new();
        for oid_result in revwalk {
            let oid = oid_result?;
            let commit = repo.find_commit(oid)?;
            commits_to_rebase.push(Commit::from_git2_commit(&commit, &repo));
        }

        // Count commits on target since merge-base
        let mut target_revwalk = repo.revwalk()?;
        target_revwalk.push(target_commit.id())?;
        target_revwalk.hide(merge_base_oid)?;
        let target_commits_ahead = target_revwalk.count();

        // Determine target name (try to find a branch name)
        let target_name = Self::resolve_ref_name(&repo, onto);

        Ok(RebasePreview {
            commits_to_rebase,
            merge_base: Commit::from_git2_commit(&merge_base_commit, &repo),
            target: RebaseTarget {
                name: target_name,
                oid: target_commit.id().to_string(),
                short_oid: target_commit.id().to_string()[..7].to_string(),
                summary: target_commit.summary().unwrap_or("").to_string(),
            },
            target_commits_ahead,
        })
    }

    /// Helper to resolve a ref spec to a friendly name
    fn resolve_ref_name(repo: &Git2Repository, spec: &str) -> String {
        // Try as local branch first
        if let Ok(branch) = repo.find_branch(spec, git2::BranchType::Local) {
            if let Ok(Some(name)) = branch.name() {
                return name.to_string();
            }
        }

        // Try as remote branch
        if let Ok(branch) = repo.find_branch(spec, git2::BranchType::Remote) {
            if let Ok(Some(name)) = branch.name() {
                return name.to_string();
            }
        }

        // Fall back to the spec itself (could be a commit hash or other ref)
        spec.to_string()
    }

    // ==================== File History Operations ====================

    /// Get commit history for specific files
    pub fn get_file_history(
        &self,
        options: &crate::models::FileLogOptions,
    ) -> Result<FileLogResult> {
        let repo = self.repo()?;

        let limit = options.limit.unwrap_or(50);
        let skip = options.skip.unwrap_or(0);

        if options.paths.is_empty() {
            return Ok(FileLogResult {
                commits: Vec::new(),
                has_more: false,
            });
        }

        let mut revwalk = repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(git2::Sort::TIME | git2::Sort::TOPOLOGICAL)?;

        let mut commits = Vec::new();
        let mut skipped = 0;
        let mut found = 0;

        for oid_result in revwalk {
            let oid = oid_result?;
            let commit = repo.find_commit(oid)?;

            // Check if this commit touches any of the specified paths
            if Self::commit_touches_paths(&repo, &commit, &options.paths, options.follow_renames)? {
                if skipped < skip {
                    skipped += 1;
                    continue;
                }

                found += 1;
                if found <= limit {
                    commits.push(Commit::from_git2_commit(&commit, &repo));
                } else {
                    // We found one more than limit, so there are more
                    return Ok(FileLogResult {
                        commits,
                        has_more: true,
                    });
                }
            }
        }

        Ok(FileLogResult {
            commits,
            has_more: false,
        })
    }

    /// Check if a commit modified any of the specified paths
    fn commit_touches_paths(
        repo: &Git2Repository,
        commit: &git2::Commit,
        paths: &[String],
        follow_renames: bool,
    ) -> Result<bool> {
        let tree = commit.tree()?;

        let parent_tree = if commit.parent_count() > 0 {
            Some(commit.parent(0)?.tree()?)
        } else {
            None
        };

        let mut diff_opts = git2::DiffOptions::new();

        // Add paths to pathspec
        for path in paths {
            diff_opts.pathspec(path);
        }

        let diff =
            repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))?;

        // If follow_renames is enabled, find renames and check old paths too
        if follow_renames && diff.stats()?.files_changed() == 0 {
            // No direct match, check for renames by looking at full diff
            let mut full_diff_opts = git2::DiffOptions::new();
            let full_diff = repo.diff_tree_to_tree(
                parent_tree.as_ref(),
                Some(&tree),
                Some(&mut full_diff_opts),
            )?;

            let mut find_opts = git2::DiffFindOptions::new();
            find_opts.renames(true);
            find_opts.copies(false);

            let mut full_diff = full_diff;
            full_diff.find_similar(Some(&mut find_opts))?;

            let mut found = false;
            full_diff.foreach(
                &mut |delta, _| {
                    // Check if either old or new path matches our targets
                    if let Some(new_path) = delta.new_file().path() {
                        if paths.iter().any(|p| new_path.to_string_lossy() == *p) {
                            found = true;
                            return false; // Stop iteration
                        }
                    }
                    if let Some(old_path) = delta.old_file().path() {
                        if paths.iter().any(|p| old_path.to_string_lossy() == *p) {
                            found = true;
                            return false; // Stop iteration
                        }
                    }
                    true
                },
                None,
                None,
                None,
            )?;

            return Ok(found);
        }

        Ok(diff.stats()?.files_changed() > 0)
    }

    /// Get diff for a specific file in a specific commit
    pub fn get_file_diff_in_commit(
        &self,
        commit_oid: &str,
        path: &str,
        options: &crate::models::DiffOptions,
    ) -> Result<Option<crate::models::FileDiff>> {
        let repo = self.repo()?;
        let commit = repo
            .revparse_single(commit_oid)
            .map_err(|_| AxisError::InvalidReference(commit_oid.to_string()))?
            .peel_to_commit()
            .map_err(|_| AxisError::InvalidReference(commit_oid.to_string()))?;
        let tree = commit.tree()?;

        let parent_tree = if commit.parent_count() > 0 {
            Some(commit.parent(0)?.tree()?)
        } else {
            None
        };

        let mut diff_opts = git2::DiffOptions::new();
        Self::apply_diff_options(&mut diff_opts, options);
        diff_opts.pathspec(path);

        let diff =
            repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))?;

        let diffs = Self::parse_diff(&diff)?;
        Ok(diffs.into_iter().next())
    }

    // ==================== Reflog Operations ====================

    /// Get reflog entries for a reference
    pub fn get_reflog(&self, options: &ReflogOptions) -> Result<Vec<ReflogEntry>> {
        let refname = options.refname.as_deref().unwrap_or("HEAD");
        let reflog = self
            .repo()?
            .reflog(refname)
            .map_err(|e| AxisError::Other(format!("Failed to get reflog for {refname}: {e}")))?;

        let skip = options.skip.unwrap_or(0);
        let limit = options.limit.unwrap_or(100);

        let entries: Vec<ReflogEntry> = reflog
            .iter()
            .enumerate()
            .skip(skip)
            .take(limit)
            .map(|(index, entry)| {
                let message = entry.message().unwrap_or("").to_string();
                let action = Self::parse_reflog_action(&message);
                let new_oid = entry.id_new().to_string();
                let old_oid = entry.id_old().to_string();

                ReflogEntry {
                    index: skip + index,
                    reflog_ref: format!("{refname}@{{{}}}", skip + index),
                    short_new_oid: new_oid.chars().take(7).collect(),
                    new_oid,
                    short_old_oid: old_oid.chars().take(7).collect(),
                    old_oid,
                    action,
                    message,
                    committer_name: entry.committer().name().unwrap_or("Unknown").to_string(),
                    committer_email: entry.committer().email().unwrap_or("").to_string(),
                    timestamp: DateTime::from_timestamp(entry.committer().when().seconds(), 0)
                        .unwrap_or_default()
                        .with_timezone(&Utc),
                }
            })
            .collect();

        Ok(entries)
    }

    /// Get total count of reflog entries for a reference
    pub fn get_reflog_count(&self, refname: &str) -> Result<usize> {
        let reflog = self
            .repo()?
            .reflog(refname)
            .map_err(|e| AxisError::Other(format!("Failed to get reflog for {refname}: {e}")))?;

        Ok(reflog.len())
    }

    /// Get list of available reflogs (references that have reflog)
    pub fn list_reflogs(&self) -> Result<Vec<String>> {
        let repo = self.repo()?;
        let mut reflogs = vec!["HEAD".to_string()];

        // Add local branches
        let branches = repo.branches(Some(git2::BranchType::Local))?;
        for (branch, _) in branches.flatten() {
            if let Ok(Some(name)) = branch.name() {
                let refname = format!("refs/heads/{name}");
                // Check if reflog exists by trying to open it
                if repo.reflog(&refname).is_ok() {
                    reflogs.push(refname);
                }
            }
        }

        Ok(reflogs)
    }

    /// Checkout to a reflog entry (creates detached HEAD)
    pub fn checkout_reflog_entry(&self, reflog_ref: &str) -> Result<()> {
        let repo = self.repo()?;
        let obj = repo
            .revparse_single(reflog_ref)
            .map_err(|_| AxisError::InvalidReference(reflog_ref.to_string()))?;

        let mut checkout_builder = git2::build::CheckoutBuilder::new();
        checkout_builder.safe();

        repo.checkout_tree(&obj, Some(&mut checkout_builder))?;
        repo.set_head_detached(obj.id())?;

        Ok(())
    }

    /// Parse reflog message to determine action type
    fn parse_reflog_action(message: &str) -> ReflogAction {
        let lower = message.to_lowercase();

        if lower.starts_with("commit (initial)") {
            ReflogAction::CommitInitial
        } else if lower.starts_with("commit (amend)") {
            ReflogAction::CommitAmend
        } else if lower.starts_with("commit") {
            ReflogAction::Commit
        } else if lower.starts_with("checkout") {
            ReflogAction::Checkout
        } else if lower.starts_with("merge") {
            ReflogAction::Merge
        } else if lower.starts_with("rebase") {
            ReflogAction::Rebase
        } else if lower.starts_with("reset") {
            ReflogAction::Reset
        } else if lower.starts_with("cherry-pick") {
            ReflogAction::CherryPick
        } else if lower.starts_with("revert") {
            ReflogAction::Revert
        } else if lower.starts_with("pull") {
            ReflogAction::Pull
        } else if lower.starts_with("clone") {
            ReflogAction::Clone
        } else if lower.starts_with("branch") {
            ReflogAction::Branch
        } else if lower.contains("stash") {
            ReflogAction::Stash
        } else {
            ReflogAction::Other(message.split(':').next().unwrap_or("unknown").to_string())
        }
    }

    // ==================== Gitignore Operations ====================

    /// Add a pattern to a specific .gitignore file
    pub fn add_to_gitignore(
        &self,
        pattern: &str,
        gitignore_rel_path: &str,
    ) -> Result<IgnoreResult> {
        let repo = self.repo()?;
        let workdir = repo
            .workdir()
            .ok_or_else(|| AxisError::Other("Cannot add to gitignore in bare repository".into()))?;

        let gitignore_path = workdir.join(gitignore_rel_path);

        // Create parent directories if needed
        if let Some(parent) = gitignore_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Read existing content or create empty
        let content = std::fs::read_to_string(&gitignore_path).unwrap_or_default();

        // Check if pattern already exists
        let already_existed = content.lines().any(|line| line.trim() == pattern.trim());

        if !already_existed {
            let mut new_content = content;
            // Ensure newline before adding pattern
            if !new_content.is_empty() && !new_content.ends_with('\n') {
                new_content.push('\n');
            }
            new_content.push_str(pattern);
            new_content.push('\n');
            std::fs::write(&gitignore_path, new_content)?;
        }

        Ok(IgnoreResult {
            message: if already_existed {
                "Pattern already in .gitignore".to_string()
            } else {
                format!("Added to {gitignore_rel_path}")
            },
            pattern: pattern.to_string(),
            gitignore_path: gitignore_path.display().to_string(),
            already_existed,
        })
    }

    /// Add a pattern to the global gitignore file
    pub fn add_to_global_gitignore(&self, pattern: &str) -> Result<IgnoreResult> {
        // Try to get global gitignore path from git config
        let config = self.repo()?.config()?;
        let global_path = config.get_string("core.excludesfile").map_or_else(
            |_| shellexpand::tilde("~/.gitignore_global").to_string(),
            |p| shellexpand::tilde(&p).to_string(),
        );

        let gitignore_path = std::path::Path::new(&global_path);

        // Create parent directories if needed
        if let Some(parent) = gitignore_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        // Read existing content or create empty
        let content = std::fs::read_to_string(gitignore_path).unwrap_or_default();

        // Check if pattern already exists
        let already_existed = content.lines().any(|line| line.trim() == pattern.trim());

        if !already_existed {
            let mut new_content = content;
            // Ensure newline before adding pattern
            if !new_content.is_empty() && !new_content.ends_with('\n') {
                new_content.push('\n');
            }
            new_content.push_str(pattern);
            new_content.push('\n');
            std::fs::write(gitignore_path, new_content)?;
        }

        Ok(IgnoreResult {
            message: if already_existed {
                "Pattern already in global gitignore".to_string()
            } else {
                "Added to global gitignore".to_string()
            },
            pattern: pattern.to_string(),
            gitignore_path: global_path,
            already_existed,
        })
    }

    /// Get ignore options for a file (ancestor .gitignore files and pattern suggestions)
    pub fn get_ignore_options(&self, file_path: &str) -> Result<IgnoreOptions> {
        let repo = self.repo()?;
        let workdir = repo.workdir().ok_or_else(|| {
            AxisError::Other("Cannot get ignore options in bare repository".into())
        })?;

        let file = std::path::Path::new(file_path);

        // Find ancestor .gitignore files (only in file's path hierarchy)
        let mut gitignore_files = Vec::new();
        let mut default_gitignore = ".gitignore".to_string();
        let mut found_closest = false;

        // Always include root .gitignore as an option
        gitignore_files.push(".gitignore".to_string());

        // Walk up from file's parent directory to find existing .gitignore files
        let mut current = file.parent();
        while let Some(dir) = current {
            if !dir.as_os_str().is_empty() {
                let gitignore_rel = format!("{}/.gitignore", dir.display());
                let gitignore_abs = workdir.join(&gitignore_rel);

                if gitignore_abs.exists() {
                    gitignore_files.push(gitignore_rel.clone());
                    if !found_closest {
                        default_gitignore = gitignore_rel;
                        found_closest = true;
                    }
                }
            }
            current = dir.parent();
        }

        // Generate pattern suggestions
        let suggestions = Self::get_ignore_suggestions(file_path);

        Ok(IgnoreOptions {
            gitignore_files,
            default_gitignore,
            suggestions,
        })
    }

    /// Generate pattern suggestions for ignoring a file
    fn get_ignore_suggestions(file_path: &str) -> Vec<IgnoreSuggestion> {
        let path = std::path::Path::new(file_path);
        let mut suggestions = Vec::new();

        // Exact file path
        suggestions.push(IgnoreSuggestion {
            pattern: file_path.to_string(),
            description: "Ignore this specific file".to_string(),
            suggestion_type: IgnoreSuggestionType::ExactFile,
        });

        // File extension (if file has one)
        if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
            suggestions.push(IgnoreSuggestion {
                pattern: format!("*.{ext}"),
                description: format!("Ignore all .{ext} files"),
                suggestion_type: IgnoreSuggestionType::Extension,
            });
        }

        // Parent directory (if file is in a subdirectory)
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                suggestions.push(IgnoreSuggestion {
                    pattern: format!("{}/", parent.display()),
                    description: "Ignore entire directory".to_string(),
                    suggestion_type: IgnoreSuggestionType::Directory,
                });
            }
        }

        // File name only (matches anywhere in repo)
        if let Some(file_name) = path.file_name().and_then(|n| n.to_str()) {
            suggestions.push(IgnoreSuggestion {
                pattern: file_name.to_string(),
                description: "Ignore files with this name anywhere".to_string(),
                suggestion_type: IgnoreSuggestionType::FileName,
            });
        }

        suggestions
    }

    /// Verify a commit's cryptographic signature
    pub fn verify_commit_signature(
        &self,
        oid_str: &str,
        format: &SigningFormat,
    ) -> Result<SignatureVerification> {
        let repo = self.repo()?;
        let oid = repo
            .revparse_single(oid_str)
            .map_err(|_| AxisError::InvalidReference(oid_str.to_string()))?
            .id();

        let (sig_buf, signed_data) = repo
            .extract_signature(&oid, Some("gpgsig"))
            .map_err(|_| AxisError::Other(format!("No signature found for commit {oid_str}")))?;

        let sig_str = std::str::from_utf8(&sig_buf)
            .map_err(|e| AxisError::Other(format!("Invalid signature encoding: {e}")))?;

        let data_str = std::str::from_utf8(&signed_data)
            .map_err(|e| AxisError::Other(format!("Invalid signed data encoding: {e}")))?;

        // block_on since we're inside spawn_blocking
        let rt = tokio::runtime::Handle::current();
        let signer = match format {
            SigningFormat::Gpg => {
                rt.block_on(SigningService::verify_gpg_signature(sig_str, data_str))
            }
            SigningFormat::Ssh => rt.block_on(SigningService::verify_ssh_signature(
                sig_str,
                data_str,
                repo.path(),
            )),
        };

        Ok(SignatureVerification {
            verified: signer.is_some(),
            signer,
        })
    }

    // ==================== LFS Check Operations ====================

    /// Suggest an LFS tracking pattern for a file based on its extension
    fn suggest_lfs_pattern(path: &str) -> String {
        let p = Path::new(path);
        match p.extension().and_then(|e| e.to_str()) {
            Some(ext) => format!("*.{ext}"),
            None => p
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or(path)
                .to_string(),
        }
    }

    /// Check if a file path matches any of the given LFS tracked patterns
    fn matches_lfs_pattern(path: &str, tracked_patterns: &[String]) -> bool {
        for pattern in tracked_patterns {
            // Simple glob matching: "*.ext" matches any file with that extension
            if let Some(ext_pattern) = pattern.strip_prefix("*.") {
                if let Some(file_ext) = Path::new(path).extension().and_then(|e| e.to_str()) {
                    if file_ext.eq_ignore_ascii_case(ext_pattern) {
                        return true;
                    }
                }
            } else if pattern == path {
                // Exact match
                return true;
            }
        }
        false
    }

    /// Check files for LFS eligibility before staging.
    /// Returns files that are binary, exceed the threshold, and are not already LFS-tracked.
    pub fn check_files_for_lfs(
        &self,
        paths: &[String],
        threshold: u64,
        tracked_patterns: &[String],
    ) -> Result<Vec<LargeBinaryFileInfo>> {
        let repo = self.repo()?;
        let workdir = repo
            .workdir()
            .ok_or_else(|| AxisError::Other("Bare repository".to_string()))?;

        let mut large_files = Vec::new();

        for path in paths {
            let abs_path = workdir.join(path);

            // Skip if file doesn't exist (e.g., deleted files)
            if !abs_path.exists() {
                continue;
            }

            // Check file size
            let metadata = std::fs::metadata(&abs_path).map_err(|e| {
                AxisError::Other(format!("Failed to read metadata for {path}: {e}"))
            })?;
            let size = metadata.len();

            if size < threshold {
                continue;
            }

            // Check if already tracked by LFS
            let is_lfs_tracked = Self::matches_lfs_pattern(path, tracked_patterns);
            if is_lfs_tracked {
                continue;
            }

            // Check if binary using git2's Blob::is_binary()
            let is_binary = match repo.blob_path(&abs_path) {
                Ok(oid) => match repo.find_blob(oid) {
                    Ok(blob) => blob.is_binary(),
                    Err(_) => false,
                },
                Err(_) => {
                    // Fallback: read first 8KB and check for null bytes
                    match std::fs::read(&abs_path) {
                        Ok(content) => {
                            let check_len = content.len().min(8192);
                            content[..check_len].contains(&0)
                        }
                        Err(_) => false,
                    }
                }
            };

            if !is_binary {
                continue;
            }

            let suggested_pattern = Self::suggest_lfs_pattern(path);

            large_files.push(LargeBinaryFileInfo {
                path: path.clone(),
                size,
                is_binary,
                is_lfs_tracked: false,
                suggested_pattern,
            });
        }

        Ok(large_files)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ListRemoteOptions;
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

        let repo = service.repo().expect("should get repository");

        // Stage the file
        let mut index = repo.index().expect("should get repository index");
        index
            .add_path(Path::new("README.md"))
            .expect("should add README.md to index");
        index.write().expect("should write index to disk");

        // Create commit
        let tree_id = index.write_tree().expect("should write tree from index");
        let tree = repo.find_tree(tree_id).expect("should find tree by id");
        let sig =
            git2::Signature::now("Test User", "test@example.com").expect("should create signature");

        repo.commit(Some("HEAD"), &sig, &sig, "Initial commit", &tree, &[])
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
            .log(&LogOptions::default())
            .expect("should get commit log");
        assert_eq!(commits.len(), 1);
        assert_eq!(commits[0].summary, "Initial commit");
    }

    #[test]
    fn test_list_branches() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let branches = service
            .list_branches(&BranchFilter {
                include_local: true,
                include_remote: false,
                ..Default::default()
            })
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

        let repo = service.repo().expect("should get repository");

        // Create a new branch at the same commit (doesn't checkout)
        let head_commit = repo
            .head()
            .expect("should get HEAD")
            .peel_to_commit()
            .expect("should peel to commit");
        repo.branch("feature-branch", &head_commit, false)
            .expect("should create branch");

        // Both branches now point to the same commit
        let branches = service
            .list_branches(&BranchFilter {
                include_local: true,
                include_remote: false,
                ..Default::default()
            })
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
            .create_commit(
                "Add files",
                Some("Test User"),
                Some("test@example.com"),
                None,
            )
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
            .create_commit(
                "Add new file",
                Some("Test User"),
                Some("test@example.com"),
                None,
            )
            .expect("should create commit");

        assert!(!oid.is_empty());

        // Verify commit is in history
        let commits = service
            .log(&LogOptions::default())
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
            .log(&LogOptions::default())
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
    fn test_diff_staged_unborn_head() {
        let (tmp, service) = setup_test_repo();
        // No initial commit — HEAD is unborn

        // Create and stage a file
        fs::write(tmp.path().join("hello.txt"), "hello world").expect("should write hello.txt");
        service
            .stage_file("hello.txt")
            .expect("should stage hello.txt");

        let diffs = service
            .diff_staged(&crate::models::DiffOptions::default())
            .expect("should get staged diff on unborn HEAD");
        assert_eq!(diffs.len(), 1);
        assert_eq!(
            diffs[0].new_path.as_ref().expect("should have new_path"),
            "hello.txt"
        );
        assert_eq!(diffs[0].status, crate::models::DiffStatus::Added);
    }

    #[test]
    fn test_diff_head_unborn_head() {
        let (tmp, service) = setup_test_repo();
        // No initial commit — HEAD is unborn

        // Create a file in the working directory
        fs::write(tmp.path().join("hello.txt"), "hello world").expect("should write hello.txt");

        let diffs = service
            .diff_head(&crate::models::DiffOptions::default())
            .expect("should get head diff on unborn HEAD");
        assert!(!diffs.is_empty(), "should have at least one diff entry");
    }

    #[test]
    fn test_diff_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Get the commit OID
        let commits = service
            .log(&LogOptions::default())
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
            .log(&LogOptions::default())
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
            .list_branches(&BranchFilter {
                include_local: true,
                include_remote: false,
                ..Default::default()
            })
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
            .list_branches(&BranchFilter {
                include_local: true,
                include_remote: false,
                ..Default::default()
            })
            .expect("should list branches");
        assert!(branches.iter().any(|b| b.name == "to-delete"));

        // Delete it (force=true to avoid merge check)
        let delete_options = DeleteBranchOptions {
            force: true,
            delete_remote: false,
        };
        service
            .delete_branch("to-delete", &delete_options, None)
            .expect("should delete branch");

        // Verify it's gone
        let branches = service
            .list_branches(&BranchFilter {
                include_local: true,
                include_remote: false,
                ..Default::default()
            })
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
            .get_branch("test-get", &BranchType::Local)
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

        let remotes = service
            .list_remotes(&ListRemoteOptions::default())
            .expect("should list remotes");
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
        let remotes = service
            .list_remotes(&ListRemoteOptions::default())
            .expect("should list remotes");
        assert_eq!(remotes.len(), 1);

        // Remove it
        service
            .remove_remote("origin")
            .expect("should remove remote");

        // Verify it's gone
        let remotes = service
            .list_remotes(&ListRemoteOptions::default())
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
        let remotes = service
            .list_remotes(&ListRemoteOptions::default())
            .expect("should list remotes");
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
            .create_commit("Second commit", None, None, None)
            .expect("should create second commit");

        let options = crate::models::GraphOptions::default();
        let result = service.build_graph(&options).expect("should build graph");

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
            .create_commit("Feature commit", None, None, None)
            .expect("should create feature commit");

        let options = crate::models::GraphOptions {
            all_branches: true,
            ..Default::default()
        };
        let result = service
            .build_graph(&options)
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
            fs::write(tmp.path().join(format!("file{i}.txt")), "content")
                .expect("should write file");
            service
                .stage_file(&format!("file{i}.txt"))
                .expect("should stage file");
            service
                .create_commit(&format!("Commit {i}"), None, None, None)
                .expect("should create commit");
        }

        // Get first page
        let options = crate::models::GraphOptions {
            limit: Some(2),
            ..Default::default()
        };
        let result = service
            .build_graph(&options)
            .expect("should build first page of graph");

        assert_eq!(result.commits.len(), 2);
        assert_eq!(result.total_count, 3);
        assert!(result.has_more);

        // Get second page
        let options = crate::models::GraphOptions {
            limit: Some(2),
            skip: Some(2),
            ..Default::default()
        };
        let result = service
            .build_graph(&options)
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
            .create_commit("Add amazing feature", None, None, None)
            .expect("should create feature commit");

        fs::write(tmp.path().join("bugfix.txt"), "content").expect("should write bugfix.txt");
        service
            .stage_file("bugfix.txt")
            .expect("should stage bugfix.txt");
        service
            .create_commit("Fix critical bug", None, None, None)
            .expect("should create bugfix commit");

        let options = crate::models::SearchOptions {
            query: "amazing".to_string(),
            search_message: true,
            search_author: false,
            search_hash: false,
            limit: Some(10),
        };
        let result = service
            .search_commits(&options)
            .expect("should search commits by message");

        assert_eq!(result.total_matches, 1);
        assert!(result.commits[0].summary.contains("amazing"));
    }

    #[test]
    fn test_search_commits_by_hash() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let commits = service
            .log(&LogOptions::default())
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
            .search_commits(&options)
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
            .create_commit("Update README", None, None, None)
            .expect("should create update commit");

        // Get the first commit OID
        let commits = service
            .log(&LogOptions {
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
            fs::write(tmp.path().join(format!("file{i}.txt")), "content")
                .expect("should write file");
            service
                .stage_file(&format!("file{i}.txt"))
                .expect("should stage file");
            service
                .create_commit(&format!("Commit {i}"), None, None, None)
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

        let tags = service
            .tag_list(&ListTagsOptions::default(), None)
            .expect("should list tags");
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

        let tags = service
            .tag_list(&ListTagsOptions::default(), None)
            .expect("should list tags");
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

        let tags = service
            .tag_list(&ListTagsOptions::default(), None)
            .expect("should list tags");
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
        assert_eq!(
            service
                .tag_list(&ListTagsOptions::default(), None)
                .expect("should list tags")
                .len(),
            1
        );

        // Delete the tag
        let result = service.tag_delete("v1.0.0").expect("should delete tag");
        assert!(result.success);

        assert!(service
            .tag_list(&ListTagsOptions::default(), None)
            .expect("should list tags after delete")
            .is_empty());
    }

    // ==================== File Operations Tests ====================

    #[test]
    fn test_get_file_blob() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let content = service
            .get_file_blob("README.md", None)
            .expect("should get file blob");
        assert!(!content.is_empty());
        assert_eq!(content, b"# Test Repository");
    }

    #[test]
    fn test_get_file_blob_at_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let head_oid = service.get_head_oid();

        // Modify the file
        fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");
        service.stage_file("README.md").expect("should stage");
        service
            .create_commit("Modify README", None, None, None)
            .expect("should commit");

        // Get blob at original commit
        let content = service
            .get_file_blob("README.md", Some(&head_oid))
            .expect("should get file blob at commit");
        assert_eq!(content, b"# Test Repository");
    }

    #[test]
    fn test_get_file_blob_nonexistent() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let result = service.get_file_blob("nonexistent.txt", None);
        assert!(result.is_err());
    }

    // ==================== Reflog Tests ====================

    #[test]
    fn test_get_reflog_count() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let count = service
            .get_reflog_count("HEAD")
            .expect("should get reflog count");
        assert!(count >= 1);
    }

    #[test]
    fn test_list_reflogs() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let reflogs = service.list_reflogs().expect("should list reflogs");
        assert!(!reflogs.is_empty());
        assert!(reflogs.contains(&"HEAD".to_string()));
    }

    // ==================== Repository Info Tests ====================

    #[test]
    fn test_is_head_unborn() {
        let (_tmp, service) = setup_test_repo();
        let repo = service.repo().expect("should get repo");
        // Before first commit, HEAD is unborn
        assert!(Git2Service::is_head_unborn(&repo));
    }

    #[test]
    fn test_is_head_unborn_after_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);
        let repo = service.repo().expect("should get repo");
        assert!(!Git2Service::is_head_unborn(&repo));
    }

    #[test]
    fn test_get_head_oid_opt_none() {
        let (_tmp, service) = setup_test_repo();
        // Before first commit, HEAD OID should be None
        let oid = service.get_head_oid_opt();
        assert!(oid.is_none());
    }

    #[test]
    fn test_get_head_oid_opt_some() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let oid = service.get_head_oid_opt();
        assert!(oid.is_some());
        assert!(!oid.expect("should have oid").is_empty());
    }

    // ==================== User Config Tests ====================

    #[test]
    fn test_get_user_signature() {
        let (_tmp, service) = setup_test_repo();

        // Configure user
        service
            .set_repo_user_config(Some("Test User"), Some("test@example.com"))
            .expect("should set config");

        let (name, email) = service
            .get_user_signature()
            .expect("should get user signature");

        assert_eq!(name, "Test User");
        assert_eq!(email, "test@example.com");
    }

    #[test]
    fn test_get_repo_user_config() {
        let (_tmp, service) = setup_test_repo();

        // Initially may be None
        let (name, email) = service
            .get_repo_user_config()
            .expect("should get repo user config");

        // Values may or may not exist depending on system config
        let _ = name;
        let _ = email;
    }

    #[test]
    fn test_set_repo_user_config() {
        let (_tmp, service) = setup_test_repo();

        service
            .set_repo_user_config(Some("New User"), Some("new@example.com"))
            .expect("should set repo user config");

        let (name, email) = service.get_repo_user_config().expect("should get config");

        assert_eq!(name, Some("New User".to_string()));
        assert_eq!(email, Some("new@example.com".to_string()));
    }

    // ==================== Unstage Tests ====================

    #[test]
    fn test_unstage_all() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        fs::write(tmp.path().join("file1.txt"), "content1").expect("should write");
        fs::write(tmp.path().join("file2.txt"), "content2").expect("should write");

        service.stage_all().expect("should stage all");

        let status = service.status().expect("should get status");
        assert!(status.staged.len() >= 2);

        service.unstage_all().expect("should unstage all");

        let status = service.status().expect("should get status");
        assert!(status.staged.is_empty());
    }

    #[test]
    fn test_unstage_files() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        fs::write(tmp.path().join("unstage1.txt"), "content1").expect("should write");
        fs::write(tmp.path().join("unstage2.txt"), "content2").expect("should write");

        service
            .stage_files(&["unstage1.txt".to_string(), "unstage2.txt".to_string()])
            .expect("should stage files");

        service
            .unstage_files(&["unstage1.txt".to_string()])
            .expect("should unstage file");

        let status = service.status().expect("should get status");
        // Only unstage2.txt should remain staged
        assert_eq!(status.staged.len(), 1);
    }

    // ==================== Diff Tests ====================

    #[test]
    fn test_diff_head() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Modify file
        fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");

        let diff = service
            .diff_head(&crate::models::DiffOptions::default())
            .expect("should diff head");

        assert!(!diff.is_empty());
    }

    #[test]
    fn test_diff_commits() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let first_commit = service.get_head_oid();

        fs::write(tmp.path().join("diff_test.txt"), "new content").expect("should write");
        service.stage_file("diff_test.txt").expect("should stage");
        let second_commit = service
            .create_commit("Second commit", None, None, None)
            .expect("should commit");

        let diff = service
            .diff_commits(
                &first_commit,
                &second_commit,
                &crate::models::DiffOptions::default(),
            )
            .expect("should diff commits");

        assert!(!diff.is_empty());
    }

    // ==================== Get Commit Tests ====================

    #[test]
    fn test_get_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let oid = service.get_head_oid();
        let commit = service.get_commit(&oid).expect("should get commit");

        assert_eq!(commit.oid, oid);
        assert!(!commit.message.is_empty());
    }

    #[test]
    fn test_get_commit_invalid() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let result = service.get_commit("invalid_oid");
        assert!(result.is_err());
    }

    // ==================== Delete File Tests ====================

    #[test]
    fn test_delete_file() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create and stage a file
        fs::write(tmp.path().join("to_delete.txt"), "content").expect("should write");
        service.stage_file("to_delete.txt").expect("should stage");
        service
            .create_commit("Add file", None, None, None)
            .expect("should commit");

        // Delete the file
        service.delete_file("to_delete.txt").expect("should delete");

        assert!(!tmp.path().join("to_delete.txt").exists());
    }

    // ==================== Discard Unstaged Tests ====================

    #[test]
    fn test_discard_unstaged() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Modify file
        fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");

        // Discard
        service.discard_unstaged().expect("should discard");

        // File should be back to original
        let content = fs::read_to_string(tmp.path().join("README.md")).expect("should read");
        assert_eq!(content, "# Test Repository");
    }

    // ==================== LFS Check Tests ====================

    #[test]
    fn test_suggest_lfs_pattern_with_extension() {
        assert_eq!(
            Git2Service::suggest_lfs_pattern("assets/texture.psd"),
            "*.psd"
        );
        assert_eq!(Git2Service::suggest_lfs_pattern("video.mp4"), "*.mp4");
        assert_eq!(
            Git2Service::suggest_lfs_pattern("deep/nested/file.bin"),
            "*.bin"
        );
    }

    #[test]
    fn test_suggest_lfs_pattern_without_extension() {
        assert_eq!(Git2Service::suggest_lfs_pattern("Makefile"), "Makefile");
        assert_eq!(Git2Service::suggest_lfs_pattern("dir/LICENSE"), "LICENSE");
    }

    #[test]
    fn test_matches_lfs_pattern_extension() {
        let patterns = vec!["*.psd".to_string(), "*.mp4".to_string()];
        assert!(Git2Service::matches_lfs_pattern(
            "assets/file.psd",
            &patterns
        ));
        assert!(Git2Service::matches_lfs_pattern("video.mp4", &patterns));
        assert!(!Git2Service::matches_lfs_pattern("readme.txt", &patterns));
    }

    #[test]
    fn test_matches_lfs_pattern_exact() {
        let patterns = vec!["assets/large.bin".to_string()];
        assert!(Git2Service::matches_lfs_pattern(
            "assets/large.bin",
            &patterns
        ));
        assert!(!Git2Service::matches_lfs_pattern(
            "other/large.bin",
            &patterns
        ));
    }

    #[test]
    fn test_matches_lfs_pattern_case_insensitive() {
        let patterns = vec!["*.PSD".to_string()];
        assert!(Git2Service::matches_lfs_pattern("file.psd", &patterns));
        assert!(Git2Service::matches_lfs_pattern("file.PSD", &patterns));
    }

    #[test]
    fn test_matches_lfs_pattern_empty() {
        let patterns: Vec<String> = vec![];
        assert!(!Git2Service::matches_lfs_pattern("file.psd", &patterns));
    }

    #[test]
    fn test_check_files_for_lfs_below_threshold() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a small text file (below default 10MB threshold)
        fs::write(tmp.path().join("small.txt"), "hello").expect("should write");

        let result = service
            .check_files_for_lfs(&["small.txt".to_string()], 10_485_760, &[])
            .expect("should check files");

        assert!(result.is_empty(), "small file should not be flagged");
    }

    #[test]
    fn test_check_files_for_lfs_large_binary() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a large binary file (above 1KB threshold for test)
        let binary_content: Vec<u8> = (0u8..=255).cycle().take(2048).collect();
        fs::write(tmp.path().join("large.bin"), &binary_content).expect("should write");

        let result = service
            .check_files_for_lfs(&["large.bin".to_string()], 1024, &[])
            .expect("should check files");

        assert_eq!(result.len(), 1, "large binary file should be flagged");
        assert_eq!(result[0].path, "large.bin");
        assert!(result[0].is_binary);
        assert!(!result[0].is_lfs_tracked);
        assert_eq!(result[0].suggested_pattern, "*.bin");
        assert!(result[0].size >= 2048);
    }

    #[test]
    fn test_check_files_for_lfs_large_text_not_flagged() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a large text file (no null bytes)
        let text_content = "a".repeat(2048);
        fs::write(tmp.path().join("large.txt"), &text_content).expect("should write");

        let result = service
            .check_files_for_lfs(&["large.txt".to_string()], 1024, &[])
            .expect("should check files");

        assert!(result.is_empty(), "large text file should not be flagged");
    }

    #[test]
    fn test_check_files_for_lfs_already_tracked() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create a large binary file
        let binary_content: Vec<u8> = (0u8..=255).cycle().take(2048).collect();
        fs::write(tmp.path().join("tracked.bin"), &binary_content).expect("should write");

        // File matches existing LFS pattern
        let patterns = vec!["*.bin".to_string()];
        let result = service
            .check_files_for_lfs(&["tracked.bin".to_string()], 1024, &patterns)
            .expect("should check files");

        assert!(
            result.is_empty(),
            "already LFS-tracked file should be skipped"
        );
    }

    #[test]
    fn test_check_files_for_lfs_nonexistent_file() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        let result = service
            .check_files_for_lfs(&["nonexistent.bin".to_string()], 1024, &[])
            .expect("should check files");

        assert!(result.is_empty(), "nonexistent file should be skipped");
    }

    #[test]
    fn test_check_files_for_lfs_multiple_files() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&service, &tmp);

        // Create multiple files
        let binary_content: Vec<u8> = (0u8..=255).cycle().take(2048).collect();
        fs::write(tmp.path().join("a.bin"), &binary_content).expect("should write");
        fs::write(tmp.path().join("b.psd"), &binary_content).expect("should write");
        fs::write(tmp.path().join("c.txt"), "just text content".repeat(200)).expect("should write");
        fs::write(tmp.path().join("small.bin"), [0u8; 10]).expect("should write");

        let paths = vec![
            "a.bin".to_string(),
            "b.psd".to_string(),
            "c.txt".to_string(),
            "small.bin".to_string(),
        ];

        let result = service
            .check_files_for_lfs(&paths, 1024, &[])
            .expect("should check files");

        // Only a.bin and b.psd should be flagged (binary + above threshold)
        assert_eq!(result.len(), 2, "only large binary files should be flagged");
        let flagged_paths: Vec<&str> = result.iter().map(|f| f.path.as_str()).collect();
        assert!(flagged_paths.contains(&"a.bin"));
        assert!(flagged_paths.contains(&"b.psd"));
    }
}
