use crate::error::Result;
use crate::models::{
    FetchOptions, FetchResult, ListRemoteOptions, PullOptions, PushOptions, PushResult, Remote,
    SshCredentials,
};

use super::RepoOperations;

/// Remote, fetch, push, pull operations.
impl RepoOperations {
    pub async fn list_remotes(&self, options: ListRemoteOptions) -> Result<Vec<Remote>> {
        self.git2(move |g| g.list_remotes(&options)).await
    }

    pub async fn get_remote(&self, name: &str) -> Result<Remote> {
        let name = name.to_string();
        self.git2(move |g| g.get_remote(&name)).await
    }

    pub async fn add_remote(&self, name: &str, url: &str) -> Result<Remote> {
        let name = name.to_string();
        let url = url.to_string();
        self.git2(move |g| g.add_remote(&name, &url)).await
    }

    pub async fn remove_remote(&self, name: &str) -> Result<()> {
        let name = name.to_string();
        self.git2(move |g| g.remove_remote(&name)).await
    }

    pub async fn rename_remote(&self, old_name: &str, new_name: &str) -> Result<Vec<String>> {
        let old_name = old_name.to_string();
        let new_name = new_name.to_string();
        self.git2(move |g| g.rename_remote(&old_name, &new_name))
            .await
    }

    pub async fn set_remote_url(&self, name: &str, url: &str) -> Result<()> {
        let name = name.to_string();
        let url = url.to_string();
        self.git2(move |g| g.set_remote_url(&name, &url)).await
    }

    pub async fn set_remote_push_url(&self, name: &str, url: &str) -> Result<()> {
        let name = name.to_string();
        let url = url.to_string();
        self.git2(move |g| g.set_remote_push_url(&name, &url)).await
    }

    /// Fetch from a remote with optional progress callback.
    /// The callback receives progress stats and returns true to continue or false to cancel.
    pub async fn fetch<F>(
        &self,
        remote_name: &str,
        options: &FetchOptions,
        refspecs: Option<&[&str]>,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<FetchResult>
    where
        F: FnMut(&git2::Progress<'_>) -> bool + Send + 'static,
    {
        let remote_name = remote_name.to_string();
        let options = options.clone();
        let refspecs_owned: Option<Vec<String>> =
            refspecs.map(|r| r.iter().map(std::string::ToString::to_string).collect());
        self.git2(move |g| {
            let refs: Option<Vec<&str>> = refspecs_owned
                .as_ref()
                .map(|v| v.iter().map(std::string::String::as_str).collect());
            g.fetch(
                &remote_name,
                &options,
                refs.as_deref(),
                progress_cb,
                ssh_credentials,
            )
        })
        .await
    }

    /// Push to a remote with optional progress callback.
    /// The callback receives (current, total, bytes) and returns true to continue.
    pub async fn push<F>(
        &self,
        remote_name: &str,
        refspecs: &[String],
        options: &PushOptions,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<PushResult>
    where
        F: FnMut(usize, usize, usize) -> bool + Send + 'static,
    {
        let remote_name = remote_name.to_string();
        let refspecs = refspecs.to_vec();
        let options = options.clone();
        self.git2(move |g| {
            g.push(
                &remote_name,
                &refspecs,
                &options,
                progress_cb,
                ssh_credentials,
            )
        })
        .await
    }

    /// Push the current branch to its upstream with optional progress callback.
    pub async fn push_current_branch<F>(
        &self,
        remote_name: &str,
        options: &PushOptions,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<PushResult>
    where
        F: FnMut(usize, usize, usize) -> bool + Send + 'static,
    {
        let remote_name = remote_name.to_string();
        let options = options.clone();
        self.git2(move |g| {
            g.push_current_branch(&remote_name, &options, progress_cb, ssh_credentials)
        })
        .await
    }

    /// Pull from a remote (fetch + merge/rebase) with optional progress callback.
    pub async fn pull<F>(
        &self,
        remote_name: &str,
        branch_name: &str,
        options: &PullOptions,
        progress_cb: Option<F>,
        ssh_credentials: Option<SshCredentials>,
    ) -> Result<()>
    where
        F: FnMut(&git2::Progress<'_>) -> bool + Send + 'static,
    {
        let remote_name = remote_name.to_string();
        let branch_name = branch_name.to_string();
        let options = options.clone();
        self.git2(move |g| {
            g.pull(
                &remote_name,
                &branch_name,
                &options,
                progress_cb,
                ssh_credentials,
            )
        })
        .await
    }

    /// Build the refs stdin string for the pre-push hook.
    /// Format: `<local ref> <local sha> <remote ref> <remote sha>\n` per ref.
    pub async fn build_push_refs_stdin(&self, remote_name: &str, refspecs: &[String]) -> String {
        let mut refs_lines = Vec::new();

        for refspec in refspecs {
            // Parse refspec (e.g., "refs/heads/main:refs/heads/main" or just "main")
            let (local_ref, remote_ref) = if refspec.contains(':') {
                let parts: Vec<&str> = refspec.split(':').collect();
                (parts[0].to_string(), parts[1].to_string())
            } else {
                let full_ref = format!("refs/heads/{refspec}");
                (full_ref.clone(), full_ref)
            };

            // Get local SHA
            let local_sha = self
                .resolve_ref(&local_ref)
                .await
                .unwrap_or_else(|| "0".repeat(40));

            // Get remote SHA (what the remote currently has)
            let remote_ref_name = format!(
                "refs/remotes/{remote_name}/{}",
                refspec
                    .split(':')
                    .next()
                    .unwrap_or(refspec)
                    .replace("refs/heads/", "")
            );
            let remote_sha = self
                .resolve_ref(&remote_ref_name)
                .await
                .unwrap_or_else(|| "0".repeat(40));

            refs_lines.push(format!("{local_ref} {local_sha} {remote_ref} {remote_sha}"));
        }

        refs_lines.join("\n") + "\n"
    }
}
