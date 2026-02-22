use std::path::Path;

use crate::error::Result;
use crate::models::{GitHookType, HookDetails, HookInfo, HookResult, HookTemplate};
use crate::services::{HookProgressEmitter, HookService};

use super::RepoOperations;

/// Hook execution and management operations.
impl RepoOperations {
    // ---- Execution (async) ----

    pub async fn run_pre_commit(&self, emitter: Option<&HookProgressEmitter>) -> HookResult {
        self.service.hook().run_pre_commit(emitter).await
    }

    pub async fn run_prepare_commit_msg(
        &self,
        msg_file: &Path,
        source: Option<&str>,
        sha: Option<&str>,
        emitter: Option<&HookProgressEmitter>,
    ) -> HookResult {
        self.service
            .hook()
            .run_prepare_commit_msg(msg_file, source, sha, emitter)
            .await
    }

    pub async fn run_commit_msg(
        &self,
        msg_file: &Path,
        emitter: Option<&HookProgressEmitter>,
    ) -> HookResult {
        self.service.hook().run_commit_msg(msg_file, emitter).await
    }

    pub async fn run_post_commit(&self, emitter: Option<&HookProgressEmitter>) -> HookResult {
        self.service.hook().run_post_commit(emitter).await
    }

    pub async fn run_pre_push(
        &self,
        remote_name: &str,
        remote_url: &str,
        refs_stdin: &str,
        emitter: Option<&HookProgressEmitter>,
    ) -> HookResult {
        self.service
            .hook()
            .run_pre_push(remote_name, remote_url, refs_stdin, emitter)
            .await
    }

    pub async fn run_post_merge(
        &self,
        is_squash: bool,
        emitter: Option<&HookProgressEmitter>,
    ) -> HookResult {
        self.service.hook().run_post_merge(is_squash, emitter).await
    }

    pub async fn run_pre_rebase(
        &self,
        upstream: &str,
        rebased_branch: Option<&str>,
        emitter: Option<&HookProgressEmitter>,
    ) -> HookResult {
        self.service
            .hook()
            .run_pre_rebase(upstream, rebased_branch, emitter)
            .await
    }

    pub async fn run_post_checkout(
        &self,
        prev_head: &str,
        new_head: &str,
        is_branch: bool,
        emitter: Option<&HookProgressEmitter>,
    ) -> HookResult {
        self.service
            .hook()
            .run_post_checkout(prev_head, new_head, is_branch, emitter)
            .await
    }

    pub async fn run_post_rewrite(
        &self,
        command: &str,
        rewrites_stdin: &str,
        emitter: Option<&HookProgressEmitter>,
    ) -> HookResult {
        self.service
            .hook()
            .run_post_rewrite(command, rewrites_stdin, emitter)
            .await
    }

    // ---- Management (sync) ----

    pub fn list_hooks(&self) -> Vec<HookInfo> {
        self.service.hook().list_hooks()
    }

    pub fn get_hook_details(&self, hook_type: GitHookType) -> Result<HookDetails> {
        self.service.hook().get_hook_details(hook_type)
    }

    pub fn create_hook(&self, hook_type: GitHookType, content: &str) -> Result<()> {
        self.service.hook().create_hook(hook_type, content)
    }

    pub fn update_hook(&self, hook_type: GitHookType, content: &str) -> Result<()> {
        self.service.hook().update_hook(hook_type, content)
    }

    pub fn delete_hook(&self, hook_type: GitHookType) -> Result<()> {
        self.service.hook().delete_hook(hook_type)
    }

    pub fn toggle_hook(&self, hook_type: GitHookType) -> Result<bool> {
        self.service.hook().toggle_hook(hook_type)
    }

    // Allow unused_self: these methods keep &self for API consistency with other RepoOperations methods.
    // Callers access templates through the ops layer rather than HookService directly.
    #[must_use]
    #[allow(clippy::unused_self)]
    pub fn get_templates(&self) -> Vec<HookTemplate> {
        HookService::get_templates()
    }

    #[must_use]
    #[allow(clippy::unused_self)]
    pub fn get_templates_for_type(&self, hook_type: GitHookType) -> Vec<HookTemplate> {
        HookService::get_templates_for_type(hook_type)
    }
}
