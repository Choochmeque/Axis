use crate::error::Result;
use crate::models::{ReflogEntry, ReflogOptions};

use super::RepoOperations;

/// Reflog operations.
impl RepoOperations {
    pub async fn get_reflog(&self, options: &ReflogOptions) -> Result<Vec<ReflogEntry>> {
        let options = options.clone();
        self.git2(move |g| g.get_reflog(&options)).await
    }

    pub async fn get_reflog_count(&self, refname: &str) -> Result<usize> {
        let refname = refname.to_string();
        self.git2(move |g| g.get_reflog_count(&refname)).await
    }

    pub async fn list_reflogs(&self) -> Result<Vec<String>> {
        self.git2(|g| g.list_reflogs()).await
    }

    pub async fn checkout_reflog_entry(&self, reflog_ref: &str) -> Result<()> {
        let reflog_ref = reflog_ref.to_string();
        self.git2(move |g| g.checkout_reflog_entry(&reflog_ref))
            .await
    }
}
