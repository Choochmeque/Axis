use crate::error::Result;
use crate::models::{Commit, LargeBinaryFileInfo, ResetMode, SigningConfig};

use super::RepoOperations;

/// Stage, unstage, discard, commit operations.
impl RepoOperations {
    pub async fn stage_file(&self, path: &str) -> Result<()> {
        let path = path.to_string();
        self.git2(move |g| g.stage_file(&path)).await
    }

    pub async fn stage_files(&self, paths: &[String]) -> Result<()> {
        let paths = paths.to_vec();
        self.git2(move |g| g.stage_files(&paths)).await
    }

    pub async fn stage_all(&self) -> Result<()> {
        self.git2(|g| g.stage_all()).await
    }

    pub async fn unstage_file(&self, path: &str) -> Result<()> {
        let path = path.to_string();
        self.git2(move |g| g.unstage_file(&path)).await
    }

    pub async fn unstage_files(&self, paths: &[String]) -> Result<()> {
        let paths = paths.to_vec();
        self.git2(move |g| g.unstage_files(&paths)).await
    }

    pub async fn unstage_all(&self) -> Result<()> {
        self.git2(|g| g.unstage_all()).await
    }

    pub async fn discard_file(&self, path: &str) -> Result<()> {
        let path = path.to_string();
        self.git2(move |g| g.discard_file(&path)).await
    }

    pub async fn discard_unstaged(&self) -> Result<()> {
        self.git2(|g| g.discard_unstaged()).await
    }

    pub async fn delete_file(&self, path: &str) -> Result<()> {
        let path = path.to_string();
        self.git2(move |g| g.delete_file(&path)).await
    }

    pub async fn create_commit(
        &self,
        message: &str,
        author_name: Option<&str>,
        author_email: Option<&str>,
        signing_config: Option<&SigningConfig>,
    ) -> Result<String> {
        let message = message.to_string();
        let author_name = author_name.map(|s| s.to_string());
        let author_email = author_email.map(|s| s.to_string());
        let signing_config = signing_config.cloned();
        self.git2(move |g| {
            g.create_commit(
                &message,
                author_name.as_deref(),
                author_email.as_deref(),
                signing_config.as_ref(),
            )
        })
        .await
    }

    pub async fn amend_commit(&self, message: Option<&str>) -> Result<String> {
        let message = message.map(|s| s.to_string());
        self.git2(move |g| g.amend_commit(message.as_deref())).await
    }

    pub async fn get_commit(&self, oid_str: &str) -> Result<Commit> {
        let oid_str = oid_str.to_string();
        self.git2(move |g| g.get_commit(&oid_str)).await
    }

    pub async fn get_file_blob(&self, path: &str, commit_oid: Option<&str>) -> Result<Vec<u8>> {
        let path = path.to_string();
        let commit_oid = commit_oid.map(|s| s.to_string());
        self.git2(move |g| g.get_file_blob(&path, commit_oid.as_deref()))
            .await
    }

    pub async fn check_files_for_lfs(
        &self,
        paths: &[String],
        threshold: u64,
        tracked_patterns: &[String],
    ) -> Result<Vec<LargeBinaryFileInfo>> {
        let paths = paths.to_vec();
        let tracked_patterns = tracked_patterns.to_vec();
        self.git2(move |g| g.check_files_for_lfs(&paths, threshold, &tracked_patterns))
            .await
    }

    // --- CLI-based staging ops (hunk-level) ---

    pub async fn stage_hunk(&self, patch: &str) -> Result<()> {
        self.service.git_cli().stage_hunk(patch).await
    }

    pub async fn unstage_hunk(&self, patch: &str) -> Result<()> {
        self.service.git_cli().unstage_hunk(patch).await
    }

    pub async fn discard_hunk(&self, patch: &str) -> Result<()> {
        self.service.git_cli().discard_hunk(patch).await
    }

    // --- CLI-based reset ---

    pub async fn reset(
        &self,
        target: &str,
        mode: ResetMode,
    ) -> Result<crate::services::GitCommandResult> {
        self.service.git_cli().reset(target, mode).await
    }
}
