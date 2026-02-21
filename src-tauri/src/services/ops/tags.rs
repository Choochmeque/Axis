use crate::error::Result;
use crate::models::{CreateTagOptions, ListTagsOptions, SshCredentials, Tag, TagResult};

use super::RepoOperations;

/// Tag operations (git2 + CLI for remote ops).
impl RepoOperations {
    pub async fn tag_list(&self, options: ListTagsOptions) -> Result<Vec<Tag>> {
        self.git2(move |g| g.tag_list(options, None)).await
    }

    pub async fn tag_create(&self, name: &str, options: &CreateTagOptions) -> Result<TagResult> {
        let name = name.to_string();
        let options = options.clone();
        self.git2(move |g| g.tag_create(&name, &options)).await
    }

    pub async fn tag_delete(&self, name: &str) -> Result<TagResult> {
        let name = name.to_string();
        self.git2(move |g| g.tag_delete(&name)).await
    }

    // --- CLI-based remote tag ops ---

    pub async fn tag_push(
        &self,
        name: &str,
        remote: &str,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<TagResult> {
        self.service
            .git_cli()
            .tag_push(name, remote, ssh_credentials.as_ref())
            .await
    }

    pub async fn tag_push_all(
        &self,
        remote: &str,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<TagResult> {
        self.service
            .git_cli()
            .tag_push_all(remote, ssh_credentials.as_ref())
            .await
    }

    pub async fn tag_delete_remote(
        &self,
        name: &str,
        remote: &str,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<TagResult> {
        self.service
            .git_cli()
            .tag_delete_remote(name, remote, ssh_credentials.as_ref())
            .await
    }
}
