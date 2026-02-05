use crate::error::Result;
use crate::models::{StashApplyOptions, StashEntry, StashResult, StashSaveOptions};

use super::RepoOperations;

/// Stash operations.
impl RepoOperations {
    pub async fn stash_list(&self) -> Result<Vec<StashEntry>> {
        self.service.git_cli().stash_list().await
    }

    pub async fn stash_save(&self, options: &StashSaveOptions) -> Result<StashResult> {
        self.service.git_cli().stash_save(options).await
    }

    pub async fn stash_apply(&self, options: &StashApplyOptions) -> Result<StashResult> {
        self.service.git_cli().stash_apply(options).await
    }

    pub async fn stash_pop(&self, options: &StashApplyOptions) -> Result<StashResult> {
        self.service.git_cli().stash_pop(options).await
    }

    pub async fn stash_drop(&self, index: Option<usize>) -> Result<StashResult> {
        self.service.git_cli().stash_drop(index).await
    }

    pub async fn stash_clear(&self) -> Result<StashResult> {
        self.service.git_cli().stash_clear().await
    }

    pub async fn stash_show(&self, index: Option<usize>, stat_only: bool) -> Result<String> {
        self.service.git_cli().stash_show(index, stat_only).await
    }

    pub async fn stash_branch(&self, name: &str, index: Option<usize>) -> Result<StashResult> {
        self.service.git_cli().stash_branch(name, index).await
    }
}
