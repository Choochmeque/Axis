use crate::error::Result;
use crate::models::{
    GitFlowBranchType, GitFlowConfig, GitFlowFinishOptions, GitFlowInitOptions, GitFlowResult,
    SshCredentials,
};

use super::RepoOperations;

/// Gitflow operations.
impl RepoOperations {
    pub async fn gitflow_is_initialized(&self) -> Result<bool> {
        self.service.git_cli().gitflow_is_initialized().await
    }

    pub async fn gitflow_config(&self) -> Result<Option<GitFlowConfig>> {
        self.service.git_cli().gitflow_config().await
    }

    pub async fn gitflow_init(&self, options: &GitFlowInitOptions) -> Result<GitFlowResult> {
        self.service.git_cli().gitflow_init(options).await
    }

    pub async fn gitflow_start(
        &self,
        branch_type: GitFlowBranchType,
        name: &str,
        base: Option<&str>,
    ) -> Result<GitFlowResult> {
        self.service
            .git_cli()
            .gitflow_start(branch_type, name, base)
            .await
    }

    pub async fn gitflow_finish(
        &self,
        branch_type: GitFlowBranchType,
        name: &str,
        options: &GitFlowFinishOptions,
    ) -> Result<GitFlowResult> {
        self.service
            .git_cli()
            .gitflow_finish(branch_type, name, options)
            .await
    }

    pub async fn gitflow_publish(
        &self,
        branch_type: GitFlowBranchType,
        name: &str,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<GitFlowResult> {
        self.service
            .git_cli()
            .gitflow_publish(branch_type, name, ssh_credentials.as_ref())
            .await
    }

    pub async fn gitflow_list(&self, branch_type: GitFlowBranchType) -> Result<Vec<String>> {
        self.service.git_cli().gitflow_list(branch_type).await
    }
}
