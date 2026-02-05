use crate::error::Result;
use crate::models::{AddWorktreeOptions, RemoveWorktreeOptions, Worktree, WorktreeResult};

use super::RepoOperations;

/// Worktree operations.
impl RepoOperations {
    pub async fn worktree_list(&self) -> Result<Vec<Worktree>> {
        self.service.git_cli().worktree_list().await
    }

    pub async fn worktree_add(&self, options: &AddWorktreeOptions) -> Result<WorktreeResult> {
        self.service.git_cli().worktree_add(options).await
    }

    pub async fn worktree_remove(&self, options: &RemoveWorktreeOptions) -> Result<WorktreeResult> {
        self.service.git_cli().worktree_remove(options).await
    }

    pub async fn worktree_lock(&self, path: &str, reason: Option<&str>) -> Result<WorktreeResult> {
        self.service.git_cli().worktree_lock(path, reason).await
    }

    pub async fn worktree_unlock(&self, path: &str) -> Result<WorktreeResult> {
        self.service.git_cli().worktree_unlock(path).await
    }

    pub async fn worktree_prune(&self, dry_run: bool) -> Result<WorktreeResult> {
        self.service.git_cli().worktree_prune(dry_run).await
    }
}
