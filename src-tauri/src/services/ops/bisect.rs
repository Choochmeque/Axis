use crate::error::Result;
use crate::models::BisectState;
use crate::services::GitCommandResult;

use super::RepoOperations;

/// Bisect operations.
impl RepoOperations {
    pub fn is_bisecting(&self) -> Result<bool> {
        self.service.git_cli().is_bisecting()
    }

    pub async fn bisect_start(&self, bad: Option<&str>, good: &str) -> Result<GitCommandResult> {
        self.service.git_cli().bisect_start(bad, good).await
    }

    pub async fn bisect_good(&self, commit: Option<&str>) -> Result<GitCommandResult> {
        self.service.git_cli().bisect_good(commit).await
    }

    pub async fn bisect_bad(&self, commit: Option<&str>) -> Result<GitCommandResult> {
        self.service.git_cli().bisect_bad(commit).await
    }

    pub async fn bisect_skip(&self, commit: Option<&str>) -> Result<GitCommandResult> {
        self.service.git_cli().bisect_skip(commit).await
    }

    pub async fn bisect_reset(&self, commit: Option<&str>) -> Result<GitCommandResult> {
        self.service.git_cli().bisect_reset(commit).await
    }

    pub async fn bisect_log(&self) -> Result<GitCommandResult> {
        self.service.git_cli().bisect_log().await
    }

    pub async fn bisect_visualize(&self) -> Result<GitCommandResult> {
        self.service.git_cli().bisect_visualize().await
    }

    pub async fn get_bisect_state(&self) -> Result<BisectState> {
        self.service.git_cli().get_bisect_state().await
    }
}
