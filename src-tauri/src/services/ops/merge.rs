use crate::error::Result;
use crate::models::{
    ConflictType, ConflictedFile, InteractiveRebaseEntry, RebasePreview, RebaseProgress,
};
use crate::services::{ConflictVersion, GitCommandResult};

use super::RepoOperations;

/// Merge, rebase, cherry-pick, revert, and conflict resolution operations.
impl RepoOperations {
    // ---- Merge ----

    pub async fn merge(
        &self,
        branch: &str,
        message: Option<&str>,
        no_ff: bool,
        squash: bool,
        ff_only: bool,
        no_commit: bool,
    ) -> Result<GitCommandResult> {
        self.service
            .git_cli()
            .merge(branch, message, no_ff, squash, ff_only, no_commit)
            .await
    }

    pub async fn merge_abort(&self) -> Result<GitCommandResult> {
        self.service.git_cli().merge_abort().await
    }

    pub async fn merge_continue(&self) -> Result<GitCommandResult> {
        self.service.git_cli().merge_continue().await
    }

    // ---- Rebase ----

    pub async fn rebase(&self, onto: &str, interactive: bool) -> Result<GitCommandResult> {
        self.service.git_cli().rebase(onto, interactive).await
    }

    pub async fn rebase_abort(&self) -> Result<GitCommandResult> {
        self.service.git_cli().rebase_abort().await
    }

    pub async fn rebase_continue(&self) -> Result<GitCommandResult> {
        self.service.git_cli().rebase_continue().await
    }

    pub async fn rebase_skip(&self) -> Result<GitCommandResult> {
        self.service.git_cli().rebase_skip().await
    }

    pub async fn interactive_rebase(
        &self,
        onto: &str,
        entries: &[InteractiveRebaseEntry],
        autosquash: bool,
    ) -> Result<GitCommandResult> {
        self.service
            .git_cli()
            .interactive_rebase(onto, entries, autosquash)
            .await
    }

    pub fn get_rebase_progress(&self) -> Result<Option<RebaseProgress>> {
        self.service.git_cli().get_rebase_progress()
    }

    pub async fn rebase_continue_with_message(&self, message: &str) -> Result<GitCommandResult> {
        self.service
            .git_cli()
            .rebase_continue_with_message(message)
            .await
    }

    pub async fn get_rebase_preview(&self, onto: &str) -> Result<RebasePreview> {
        let onto = onto.to_string();
        self.git2(move |g| g.get_rebase_preview(&onto)).await
    }

    // ---- Cherry-pick ----

    pub async fn cherry_pick(&self, commit: &str, no_commit: bool) -> Result<GitCommandResult> {
        self.service.git_cli().cherry_pick(commit, no_commit).await
    }

    pub async fn cherry_pick_abort(&self) -> Result<GitCommandResult> {
        self.service.git_cli().cherry_pick_abort().await
    }

    pub async fn cherry_pick_continue(&self) -> Result<GitCommandResult> {
        self.service.git_cli().cherry_pick_continue().await
    }

    pub async fn cherry_pick_skip(&self) -> Result<GitCommandResult> {
        self.service.git_cli().cherry_pick_skip().await
    }

    // ---- Revert ----

    pub async fn revert(&self, commit: &str, no_commit: bool) -> Result<GitCommandResult> {
        self.service.git_cli().revert(commit, no_commit).await
    }

    pub async fn revert_abort(&self) -> Result<GitCommandResult> {
        self.service.git_cli().revert_abort().await
    }

    pub async fn revert_continue(&self) -> Result<GitCommandResult> {
        self.service.git_cli().revert_continue().await
    }

    // ---- Conflict resolution ----

    pub async fn mark_resolved(&self, path: &str) -> Result<GitCommandResult> {
        self.service.git_cli().mark_resolved(path).await
    }

    pub async fn mark_unresolved(&self, path: &str) -> Result<GitCommandResult> {
        self.service.git_cli().mark_unresolved(path).await
    }

    pub async fn get_conflict_base(&self, path: &str) -> Result<String> {
        self.service.git_cli().get_conflict_base(path).await
    }

    pub async fn get_conflict_ours(&self, path: &str) -> Result<String> {
        self.service.git_cli().get_conflict_ours(path).await
    }

    pub async fn get_conflict_theirs(&self, path: &str) -> Result<String> {
        self.service.git_cli().get_conflict_theirs(path).await
    }

    pub async fn resolve_with_version(
        &self,
        path: &str,
        version: ConflictVersion,
    ) -> Result<GitCommandResult> {
        self.service
            .git_cli()
            .resolve_with_version(path, version)
            .await
    }

    pub async fn get_conflicted_files(&self) -> Result<Vec<String>> {
        self.service.git_cli().get_conflicted_files().await
    }

    /// Get conflicted files enriched with conflict metadata.
    pub async fn get_conflicted_files_enriched(&self) -> Result<Vec<ConflictedFile>> {
        let files = self.get_conflicted_files().await?;
        Ok(files
            .into_iter()
            .map(|path| ConflictedFile {
                path,
                conflict_type: ConflictType::Content,
                is_resolved: false,
            })
            .collect())
    }

    // ---- Operation state (sync, file-system checks) ----

    pub fn is_merging(&self) -> Result<bool> {
        self.service.git_cli().is_merging()
    }

    pub fn is_rebasing(&self) -> Result<bool> {
        self.service.git_cli().is_rebasing()
    }

    pub fn is_cherry_picking(&self) -> Result<bool> {
        self.service.git_cli().is_cherry_picking()
    }

    pub fn is_reverting(&self) -> Result<bool> {
        self.service.git_cli().is_reverting()
    }
}
