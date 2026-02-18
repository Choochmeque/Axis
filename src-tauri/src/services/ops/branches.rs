use crate::error::Result;
use crate::models::{
    Branch, BranchCompareResult, BranchFilter, BranchType, CheckoutOptions, CreateBranchOptions,
    SshCredentials,
};

use super::RepoOperations;

/// Branch operations.
impl RepoOperations {
    pub async fn list_branches(&self, filter: BranchFilter) -> Result<Vec<Branch>> {
        self.git2(move |g| g.list_branches(filter)).await
    }

    pub async fn create_branch(&self, name: &str, options: &CreateBranchOptions) -> Result<Branch> {
        let name = name.to_string();
        let options = options.clone();
        self.git2(move |g| g.create_branch(&name, &options)).await
    }

    pub async fn delete_branch(&self, name: &str, force: bool) -> Result<()> {
        let name = name.to_string();
        self.git2(move |g| g.delete_branch(&name, force)).await
    }

    pub async fn delete_remote_branch(
        &self,
        remote_name: &str,
        branch_name: &str,
        force: bool,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<()> {
        let remote_name = remote_name.to_string();
        let branch_name = branch_name.to_string();
        self.git2(move |g| {
            g.delete_remote_branch(&remote_name, &branch_name, force, ssh_credentials)
        })
        .await
    }

    pub async fn rename_branch(
        &self,
        old_name: &str,
        new_name: &str,
        force: bool,
    ) -> Result<Branch> {
        let old_name = old_name.to_string();
        let new_name = new_name.to_string();
        self.git2(move |g| g.rename_branch(&old_name, &new_name, force))
            .await
    }

    pub async fn checkout_branch(&self, name: &str, options: &CheckoutOptions) -> Result<()> {
        let name = name.to_string();
        let options = options.clone();
        self.git2(move |g| g.checkout_branch(&name, &options)).await
    }

    pub async fn checkout_remote_branch(
        &self,
        remote_name: &str,
        branch_name: &str,
        local_name: Option<&str>,
        force: bool,
    ) -> Result<()> {
        let remote_name = remote_name.to_string();
        let branch_name = branch_name.to_string();
        let local_name = local_name.map(std::string::ToString::to_string);
        self.git2(move |g| {
            g.checkout_remote_branch(&remote_name, &branch_name, local_name.as_deref(), force)
        })
        .await
    }

    pub async fn get_branch(&self, name: &str, branch_type: BranchType) -> Result<Branch> {
        let name = name.to_string();
        self.git2(move |g| g.get_branch(&name, branch_type)).await
    }

    pub async fn compare_branches(
        &self,
        base_ref: &str,
        compare_ref: &str,
    ) -> Result<BranchCompareResult> {
        let base_ref = base_ref.to_string();
        let compare_ref = compare_ref.to_string();
        self.git2(move |g| g.compare_branches(&base_ref, &compare_ref))
            .await
    }

    pub async fn set_branch_upstream(
        &self,
        branch_name: &str,
        upstream: Option<&str>,
    ) -> Result<()> {
        let branch_name = branch_name.to_string();
        let upstream = upstream.map(std::string::ToString::to_string);
        self.git2(move |g| g.set_branch_upstream(&branch_name, upstream.as_deref()))
            .await
    }
}
