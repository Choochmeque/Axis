use crate::error::Result;
use crate::models::{
    AddSubmoduleOptions, SshCredentials, Submodule, SubmoduleResult, SyncSubmoduleOptions,
    UpdateSubmoduleOptions,
};

use super::RepoOperations;

/// Submodule operations.
impl RepoOperations {
    pub async fn submodule_list(&self) -> Result<Vec<Submodule>> {
        self.service.git_cli().submodule_list().await
    }

    pub async fn submodule_add(
        &self,
        options: &AddSubmoduleOptions,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<SubmoduleResult> {
        self.service
            .git_cli()
            .submodule_add(options, ssh_credentials.as_ref())
            .await
    }

    pub async fn submodule_init(&self, paths: &[String]) -> Result<SubmoduleResult> {
        self.service.git_cli().submodule_init(paths).await
    }

    pub async fn submodule_update(
        &self,
        options: &UpdateSubmoduleOptions,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<SubmoduleResult> {
        self.service
            .git_cli()
            .submodule_update(options, ssh_credentials.as_ref())
            .await
    }

    pub async fn submodule_sync(&self, options: &SyncSubmoduleOptions) -> Result<SubmoduleResult> {
        self.service.git_cli().submodule_sync(options).await
    }

    pub async fn submodule_deinit(&self, paths: &[String], force: bool) -> Result<SubmoduleResult> {
        self.service.git_cli().submodule_deinit(paths, force).await
    }

    pub async fn submodule_remove(&self, path: &str) -> Result<SubmoduleResult> {
        self.service.git_cli().submodule_remove(path).await
    }

    pub async fn submodule_summary(&self) -> Result<String> {
        self.service.git_cli().submodule_summary().await
    }
}
