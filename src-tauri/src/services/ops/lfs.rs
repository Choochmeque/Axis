use crate::error::Result;
use crate::models::{
    GitEnvironment, LfsEnvironment, LfsFetchOptions, LfsFile, LfsMigrateOptions, LfsPruneOptions,
    LfsPruneResult, LfsPullOptions, LfsPushOptions, LfsResult, LfsStatus, LfsTrackedPattern,
};
use crate::services::GitCliService;

use super::RepoOperations;

/// LFS operations.
impl RepoOperations {
    pub async fn lfs_check_installed() -> Result<(bool, Option<String>)> {
        GitCliService::lfs_check_installed().await
    }

    pub async fn get_git_environment() -> Result<GitEnvironment> {
        GitCliService::get_git_environment().await
    }

    pub async fn lfs_status(&self) -> Result<LfsStatus> {
        self.service.git_cli().lfs_status().await
    }

    pub async fn lfs_install(&self) -> Result<LfsResult> {
        self.service.git_cli().lfs_install().await
    }

    pub async fn lfs_track(&self, pattern: &str) -> Result<LfsResult> {
        self.service.git_cli().lfs_track(pattern).await
    }

    pub async fn lfs_untrack(&self, pattern: &str) -> Result<LfsResult> {
        self.service.git_cli().lfs_untrack(pattern).await
    }

    pub async fn lfs_list_tracked_patterns(&self) -> Result<Vec<LfsTrackedPattern>> {
        self.service.git_cli().lfs_list_tracked_patterns().await
    }

    pub async fn lfs_list_files(&self) -> Result<Vec<LfsFile>> {
        self.service.git_cli().lfs_list_files().await
    }

    pub async fn lfs_fetch(&self, options: &LfsFetchOptions) -> Result<LfsResult> {
        self.service.git_cli().lfs_fetch(options).await
    }

    pub async fn lfs_pull(&self, options: &LfsPullOptions) -> Result<LfsResult> {
        self.service.git_cli().lfs_pull(options).await
    }

    pub async fn lfs_push(&self, options: &LfsPushOptions) -> Result<LfsResult> {
        self.service.git_cli().lfs_push(options).await
    }

    pub async fn lfs_migrate(&self, options: &LfsMigrateOptions) -> Result<LfsResult> {
        self.service.git_cli().lfs_migrate(options).await
    }

    pub async fn lfs_env(&self) -> Result<LfsEnvironment> {
        self.service.git_cli().lfs_env().await
    }

    pub async fn lfs_is_pointer(&self, path: &str) -> Result<bool> {
        self.service.git_cli().lfs_is_pointer(path).await
    }

    pub async fn lfs_prune(&self, options: &LfsPruneOptions) -> Result<LfsPruneResult> {
        self.service.git_cli().lfs_prune(options).await
    }
}
