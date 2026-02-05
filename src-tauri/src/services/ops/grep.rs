use crate::error::Result;
use crate::models::{GrepOptions, GrepResult};

use super::RepoOperations;

/// Grep operations.
impl RepoOperations {
    pub async fn grep(&self, options: &GrepOptions) -> Result<GrepResult> {
        self.service.git_cli().grep(options).await
    }

    pub async fn grep_commit(&self, commit_oid: &str, options: &GrepOptions) -> Result<GrepResult> {
        self.service
            .git_cli()
            .grep_commit(commit_oid, options)
            .await
    }
}
