mod bisect;
mod branches;
mod diff;
mod gitflow;
mod gitignore;
mod graph;
mod grep;
mod hooks;
mod lfs;
mod merge;
mod patches;
mod reflog;
mod remotes;
mod repository;
mod staging;
mod stash;
mod submodules;
mod tags;
mod worktrees;

use crate::services::{Git2Service, GitService};
use std::sync::Arc;

/// Unified async API for all repository operations.
/// Hides whether operations use `git2` (`spawn_blocking`) or CLI (`tokio::process`).
///
/// Guards (`RepoReadGuard` / `RepoWriteGuard`) implement `Deref<Target = RepoOperations>`,
/// so callers just write `guard.stash_list().await` without knowing the backend.
pub struct RepoOperations {
    pub(crate) service: Arc<GitService>,
}

impl RepoOperations {
    pub fn new(service: Arc<GitService>) -> Self {
        Self { service }
    }

    /// Run a `git2` operation on a blocking thread.
    /// The `RwLock` guard is held for the duration of the call.
    async fn git2<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&Git2Service) -> R + Send + 'static,
        R: Send + 'static,
    {
        let service = self.service.clone();
        tauri::async_runtime::spawn_blocking(move || f(service.git2()))
            .await
            .unwrap_or_else(|e| panic!("git2 task panicked: {e}"))
    }
}
