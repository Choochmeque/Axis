use crate::error::{AxisError, Result};
use crate::services::{FileWatcher, Git2Service, GitCliService, HookService};
use std::path::Path;
use tauri::AppHandle;

/// Unified service for Git operations, combining:
/// - Git2Service (libgit2 operations)
/// - GitCliService (CLI operations for merge/rebase/etc)
/// - HookService (git hook execution and management)
/// - FileWatcher (per-repo file watching)
pub struct GitService {
    git2: Git2Service,
    git_cli: GitCliService,
    hook: HookService,
    watcher: FileWatcher,
}

impl GitService {
    /// Open a repository and create all associated services
    pub fn open(path: &Path, app_handle: AppHandle, is_active: bool) -> Result<Self> {
        let git2 = Git2Service::open(path)?;
        let git_cli = GitCliService::new(path);
        let hook = HookService::new(git2.repo());
        let watcher = FileWatcher::new(path.to_path_buf(), app_handle, is_active)
            .map_err(|e| AxisError::Other(format!("Failed to create file watcher: {e}")))?;

        Ok(Self {
            git2,
            git_cli,
            hook,
            watcher,
        })
    }

    /// Access the Git2 (libgit2) service
    pub fn git2(&self) -> &Git2Service {
        &self.git2
    }

    /// Access the Git CLI service
    pub fn git_cli(&self) -> &GitCliService {
        &self.git_cli
    }

    /// Access the Hook service
    pub fn hook(&self) -> &HookService {
        &self.hook
    }

    /// Set whether this repo is the active one (affects event emission mode)
    pub fn set_active(&self, active: bool) {
        self.watcher.set_active(active);
    }

    /// Check if this repository is currently active
    pub fn is_active(&self) -> bool {
        self.watcher.is_active()
    }

    /// Stop the file watcher
    pub fn stop_watcher(&self) {
        self.watcher.stop();
    }
}
