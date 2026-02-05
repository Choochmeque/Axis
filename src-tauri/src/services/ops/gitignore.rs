use crate::error::Result;
use crate::models::{IgnoreOptions, IgnoreResult};

use super::RepoOperations;

/// Gitignore operations.
impl RepoOperations {
    pub async fn add_to_gitignore(
        &self,
        pattern: &str,
        gitignore_rel_path: &str,
    ) -> Result<IgnoreResult> {
        let pattern = pattern.to_string();
        let gitignore_rel_path = gitignore_rel_path.to_string();
        self.git2(move |g| g.add_to_gitignore(&pattern, &gitignore_rel_path))
            .await
    }

    pub async fn add_to_global_gitignore(&self, pattern: &str) -> Result<IgnoreResult> {
        let pattern = pattern.to_string();
        self.git2(move |g| g.add_to_global_gitignore(&pattern))
            .await
    }

    pub async fn get_ignore_options(&self, file_path: &str) -> Result<IgnoreOptions> {
        let file_path = file_path.to_string();
        self.git2(move |g| g.get_ignore_options(&file_path)).await
    }
}
