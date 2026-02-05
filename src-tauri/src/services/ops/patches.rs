use crate::error::Result;
use crate::models::{ArchiveResult, PatchResult};
use std::path::Path;

use super::RepoOperations;

/// Archive and patch operations.
impl RepoOperations {
    pub async fn archive(
        &self,
        reference: &str,
        format: &str,
        output_path: &Path,
        prefix: Option<&str>,
    ) -> Result<ArchiveResult> {
        self.service
            .git_cli()
            .archive(reference, format, output_path, prefix)
            .await
    }

    pub async fn format_patch(&self, range: &str, output_dir: &Path) -> Result<PatchResult> {
        self.service.git_cli().format_patch(range, output_dir).await
    }

    pub async fn create_patch_from_diff(
        &self,
        commit_oid: Option<&str>,
        output_path: &Path,
    ) -> Result<PatchResult> {
        self.service
            .git_cli()
            .create_patch_from_diff(commit_oid, output_path)
            .await
    }

    pub async fn apply_patch(
        &self,
        patch_path: &Path,
        check_only: bool,
        reverse: bool,
    ) -> Result<PatchResult> {
        self.service
            .git_cli()
            .apply_patch(patch_path, check_only, reverse)
            .await
    }

    pub async fn apply_mailbox(
        &self,
        patch_paths: &[std::path::PathBuf],
        three_way: bool,
    ) -> Result<PatchResult> {
        self.service
            .git_cli()
            .apply_mailbox(patch_paths, three_way)
            .await
    }

    pub async fn am_abort(&self) -> Result<PatchResult> {
        self.service.git_cli().am_abort().await
    }

    pub async fn am_continue(&self) -> Result<PatchResult> {
        self.service.git_cli().am_continue().await
    }

    pub async fn am_skip(&self) -> Result<PatchResult> {
        self.service.git_cli().am_skip().await
    }
}
