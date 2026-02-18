use crate::error::Result;
use crate::models::{DiffOptions, FileDiff, FileLogOptions, FileLogResult};

use super::RepoOperations;

/// Diff operations.
impl RepoOperations {
    pub async fn diff_workdir(&self, options: &DiffOptions) -> Result<Vec<FileDiff>> {
        let options = options.clone();
        self.git2(move |g| g.diff_workdir(&options)).await
    }

    pub async fn diff_staged(&self, options: &DiffOptions) -> Result<Vec<FileDiff>> {
        let options = options.clone();
        self.git2(move |g| g.diff_staged(&options)).await
    }

    pub async fn diff_head(&self, options: &DiffOptions) -> Result<Vec<FileDiff>> {
        let options = options.clone();
        self.git2(move |g| g.diff_head(&options)).await
    }

    pub async fn diff_commit(&self, oid_str: &str, options: &DiffOptions) -> Result<Vec<FileDiff>> {
        let oid_str = oid_str.to_string();
        let options = options.clone();
        self.git2(move |g| g.diff_commit(&oid_str, &options)).await
    }

    pub async fn diff_commits(
        &self,
        from_oid: &str,
        to_oid: &str,
        options: &DiffOptions,
    ) -> Result<Vec<FileDiff>> {
        let from_oid = from_oid.to_string();
        let to_oid = to_oid.to_string();
        let options = options.clone();
        self.git2(move |g| g.diff_commits(&from_oid, &to_oid, &options))
            .await
    }

    pub async fn diff_file(
        &self,
        path: &str,
        staged: bool,
        options: &DiffOptions,
    ) -> Result<Option<FileDiff>> {
        let path = path.to_string();
        let options = options.clone();
        self.git2(move |g| g.diff_file(&path, staged, &options))
            .await
    }

    pub async fn get_file_history(&self, options: FileLogOptions) -> Result<FileLogResult> {
        self.git2(move |g| g.get_file_history(&options)).await
    }

    pub async fn get_file_diff_in_commit(
        &self,
        commit_oid: &str,
        path: &str,
        options: &DiffOptions,
    ) -> Result<Option<FileDiff>> {
        let commit_oid = commit_oid.to_string();
        let path = path.to_string();
        let options = options.clone();
        self.git2(move |g| g.get_file_diff_in_commit(&commit_oid, &path, &options))
            .await
    }
}
