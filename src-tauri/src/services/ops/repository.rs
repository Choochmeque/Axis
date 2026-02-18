use crate::error::Result;
use crate::models::{
    LogOptions, Repository, RepositoryStatus, SignatureVerification, SigningFormat,
};

use super::RepoOperations;

/// Repository info, status, config, and signing operations.
impl RepoOperations {
    pub async fn get_repository_info(&self) -> Result<Repository> {
        self.git2(super::super::git2_service::Git2Service::get_repository_info)
            .await
    }

    pub async fn get_current_branch(&self) -> Option<String> {
        self.git2(super::super::git2_service::Git2Service::get_current_branch)
            .await
    }

    pub async fn get_head_oid(&self) -> String {
        self.git2(super::super::git2_service::Git2Service::get_head_oid)
            .await
    }

    pub async fn get_head_oid_opt(&self) -> Option<String> {
        self.git2(super::super::git2_service::Git2Service::get_head_oid_opt)
            .await
    }

    pub async fn status(&self) -> Result<RepositoryStatus> {
        self.git2(super::super::git2_service::Git2Service::status)
            .await
    }

    pub async fn log(&self, options: LogOptions) -> Result<Vec<crate::models::Commit>> {
        self.git2(move |g| g.log(&options)).await
    }

    pub async fn get_user_signature(&self) -> Result<(String, String)> {
        self.git2(super::super::git2_service::Git2Service::get_user_signature)
            .await
    }

    pub async fn get_repo_user_config(&self) -> Result<(Option<String>, Option<String>)> {
        self.git2(super::super::git2_service::Git2Service::get_repo_user_config)
            .await
    }

    pub async fn get_global_user_config(&self) -> Result<(Option<String>, Option<String>)> {
        self.git2(super::super::git2_service::Git2Service::get_global_user_config)
            .await
    }

    pub async fn set_repo_user_config(
        &self,
        name: Option<&str>,
        email: Option<&str>,
    ) -> Result<()> {
        let name = name.map(std::string::ToString::to_string);
        let email = email.map(std::string::ToString::to_string);
        self.git2(move |g| g.set_repo_user_config(name.as_deref(), email.as_deref()))
            .await
    }

    pub async fn resolve_ref(&self, refspec: &str) -> Option<String> {
        let refspec = refspec.to_string();
        self.git2(move |g| {
            g.repo().ok().and_then(|repo| {
                repo.revparse_single(&refspec)
                    .ok()
                    .map(|obj| obj.id().to_string())
            })
        })
        .await
    }

    pub async fn verify_commit_signature(
        &self,
        oid_str: &str,
        format: &SigningFormat,
    ) -> Result<SignatureVerification> {
        let oid_str = oid_str.to_string();
        let format = format.clone();
        self.git2(move |g| g.verify_commit_signature(&oid_str, &format))
            .await
    }
}
