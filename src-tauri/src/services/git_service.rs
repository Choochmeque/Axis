use crate::error::{AxisError, Result};
use crate::models::SshCredentials;
use crate::services::{FileWatcher, Git2Service, GitCliService, HookService};
use std::path::Path;
use tauri::AppHandle;

/// Unified service for Git operations, combining:
/// - `Git2Service` (libgit2 operations)
/// - `GitCliService` (CLI operations for merge/rebase/etc)
/// - `HookService` (git hook execution and management)
/// - `FileWatcher` (per-repo file watching)
pub struct GitService {
    git2: Git2Service,
    git_cli: GitCliService,
    hook: HookService,
    watcher: FileWatcher,
}

impl GitService {
    /// Create `GitService` for testing (no `FileWatcher`/`AppHandle` required)
    #[cfg(feature = "integration")]
    pub fn new_for_test(path: &Path) -> Result<Self> {
        let git2 = Git2Service::open(path)?;
        let git_cli = GitCliService::new(path);
        let hook = HookService::new(&git2.repo()?);

        Ok(Self {
            git2,
            git_cli,
            hook,
            watcher: FileWatcher::dummy(),
        })
    }

    /// Open a repository and create all associated services
    pub fn open(path: &Path, app_handle: AppHandle, is_active: bool) -> Result<Self> {
        let git2 = Git2Service::open(path)?;
        let git_cli = GitCliService::new(path);
        let hook = HookService::new(&git2.repo()?);
        let watcher = FileWatcher::new(path.to_path_buf(), app_handle, is_active)
            .map_err(|e| AxisError::Other(format!("Failed to create file watcher: {e}")))?;

        Ok(Self {
            git2,
            git_cli,
            hook,
            watcher,
        })
    }

    /// Initialize a new repository and create all associated services
    pub fn init(path: &Path, bare: bool, app_handle: AppHandle) -> Result<Self> {
        let git2 = Git2Service::init(path, bare)?;
        let git_cli = GitCliService::new(path);
        let hook = HookService::new(&git2.repo()?);
        let watcher = FileWatcher::new(path.to_path_buf(), app_handle, true)
            .map_err(|e| AxisError::Other(format!("Failed to create file watcher: {e}")))?;

        Ok(Self {
            git2,
            git_cli,
            hook,
            watcher,
        })
    }

    /// Clone a repository and create all associated services.
    /// Runs on a blocking thread to allow progress callbacks.
    pub async fn clone<F>(
        url: &str,
        path: &Path,
        app_handle: AppHandle,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<Self>
    where
        F: FnMut(&git2::Progress<'_>) -> bool + Send + 'static,
    {
        let url = url.to_string();
        let path = path.to_path_buf();
        let git2 = tauri::async_runtime::spawn_blocking(move || {
            Git2Service::clone(&url, &path, progress_cb, ssh_credentials)
        })
        .await
        .map_err(|e| AxisError::Other(format!("Clone task panicked: {e}")))??;

        let path = git2.path().to_path_buf();
        let git_cli = GitCliService::new(&path);
        let hook = HookService::new(&git2.repo()?);
        let watcher = FileWatcher::new(path, app_handle, true)
            .map_err(|e| AxisError::Other(format!("Failed to create file watcher: {e}")))?;

        Ok(Self {
            git2,
            git_cli,
            hook,
            watcher,
        })
    }

    /// Access the Git2 (libgit2) service
    pub const fn git2(&self) -> &Git2Service {
        &self.git2
    }

    /// Access the Git CLI service
    pub const fn git_cli(&self) -> &GitCliService {
        &self.git_cli
    }

    /// Access the Hook service
    pub const fn hook(&self) -> &HookService {
        &self.hook
    }

    /// Set whether this repo is the active one (affects event emission mode)
    pub fn set_active(&self, active: bool) {
        self.watcher.set_active(active);
    }
}
