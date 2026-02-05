use crate::error::Result;
use crate::models::{BlameResult, GraphOptions, GraphResult, SearchOptions, SearchResult};

use super::RepoOperations;

/// Graph, search, blame operations.
impl RepoOperations {
    pub async fn build_graph(&self, options: GraphOptions) -> Result<GraphResult> {
        self.git2(move |g| g.build_graph(options)).await
    }

    pub async fn search_commits(&self, options: SearchOptions) -> Result<SearchResult> {
        self.git2(move |g| g.search_commits(options)).await
    }

    pub async fn blame_file(&self, path: &str, commit_oid: Option<&str>) -> Result<BlameResult> {
        let path = path.to_string();
        let commit_oid = commit_oid.map(|s| s.to_string());
        self.git2(move |g| g.blame_file(&path, commit_oid.as_deref()))
            .await
    }

    pub async fn get_commit_count(&self, from_ref: Option<&str>) -> Result<usize> {
        let from_ref = from_ref.map(|s| s.to_string());
        self.git2(move |g| g.get_commit_count(from_ref.as_deref()))
            .await
    }
}
