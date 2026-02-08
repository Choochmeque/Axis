use crate::error::{AxisError, Result};
use crate::models::{
    get_hook_templates, GitHookType, HookDetails, HookInfo, HookResult, HookTemplate,
};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use strum::IntoEnumIterator;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

use crate::services::create_command;

/// Service for Git hook execution and management.
/// Created once per repository when the repo is opened.
pub struct HookService {
    repo_path: PathBuf,
    hooks_path: PathBuf,
}

impl HookService {
    /// Create a new HookService for a repository
    pub fn new(repo: &git2::Repository) -> Self {
        let repo_path = repo.workdir().unwrap_or_else(|| repo.path()).to_path_buf();
        let hooks_path = Self::resolve_hooks_path(repo);
        Self {
            repo_path,
            hooks_path,
        }
    }

    /// Resolve the hooks path, respecting core.hooksPath config
    fn resolve_hooks_path(repo: &git2::Repository) -> PathBuf {
        if let Ok(config) = repo.config() {
            if let Ok(custom_path) = config.get_string("core.hooksPath") {
                let path = PathBuf::from(&custom_path);
                if path.is_absolute() {
                    return path;
                }
                // Relative to repo workdir
                if let Some(workdir) = repo.workdir() {
                    return workdir.join(path);
                }
            }
        }
        // Default: .git/hooks
        repo.path().join("hooks")
    }

    #[cfg(test)]
    /// Get the hooks directory path
    pub fn hooks_path(&self) -> &Path {
        &self.hooks_path
    }

    // ==================== Hook Execution ====================

    #[cfg(test)]
    /// Check if a hook exists and is executable
    fn hook_exists(&self, hook_type: GitHookType) -> bool {
        let hook_path = self.hooks_path.join(hook_type.filename());
        if !hook_path.exists() || !hook_path.is_file() {
            return false;
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(meta) = hook_path.metadata() {
                return meta.permissions().mode() & 0o111 != 0;
            }
            false
        }

        #[cfg(not(unix))]
        {
            true // On Windows, we'll try to execute through sh
        }
    }

    /// Execute a hook with arguments and optional stdin
    async fn execute_hook(
        &self,
        hook_type: GitHookType,
        args: &[&str],
        stdin_data: Option<&str>,
    ) -> HookResult {
        let hook_path = self.hooks_path.join(hook_type.filename());

        // Check if hook exists
        if !hook_path.exists() || !hook_path.is_file() {
            return HookResult::skipped(hook_type);
        }

        // On Unix, check executable bit
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(meta) = hook_path.metadata() {
                if meta.permissions().mode() & 0o111 == 0 {
                    return HookResult::not_executable(hook_type);
                }
            }
        }

        // Build command based on platform
        let mut cmd = self.build_command(&hook_path, args);

        cmd.current_dir(&self.repo_path)
            .env("GIT_DIR", self.repo_path.join(".git"))
            .env("GIT_WORK_TREE", &self.repo_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if stdin_data.is_some() {
            cmd.stdin(Stdio::piped());
        }

        match cmd.spawn() {
            Ok(mut child) => {
                // Write stdin data if provided
                if let Some(input) = stdin_data {
                    if let Some(mut stdin_handle) = child.stdin.take() {
                        let _ = stdin_handle.write_all(input.as_bytes()).await;
                        // Drop stdin to close it so the child can finish
                        drop(stdin_handle);
                    }
                }

                match child.wait_with_output().await {
                    Ok(output) => HookResult {
                        hook_type,
                        success: output.status.success(),
                        exit_code: output.status.code().unwrap_or(-1),
                        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                        skipped: false,
                    },
                    Err(e) => {
                        HookResult::error(hook_type, &format!("Failed to wait for hook: {e}"))
                    }
                }
            }
            Err(e) => HookResult::error(hook_type, &format!("Failed to execute hook: {e}")),
        }
    }

    /// Build the appropriate command for the platform
    fn build_command(&self, hook_path: &Path, args: &[&str]) -> Command {
        #[cfg(unix)]
        {
            // On Unix, execute directly - OS handles shebang
            let mut cmd = create_command(hook_path);
            cmd.args(args);
            cmd
        }

        #[cfg(windows)]
        {
            // On Windows, execute through sh (from Git for Windows)
            let mut cmd = create_command("sh");
            cmd.arg(hook_path);
            cmd.args(args);
            cmd
        }
    }

    // ==================== Hook Runners ====================

    /// Run pre-commit hook
    pub async fn run_pre_commit(&self) -> HookResult {
        self.execute_hook(GitHookType::PreCommit, &[], None).await
    }

    /// Run prepare-commit-msg hook
    pub async fn run_prepare_commit_msg(
        &self,
        msg_file: &Path,
        source: Option<&str>,
        sha: Option<&str>,
    ) -> HookResult {
        let msg_file_str = msg_file.to_string_lossy();
        let mut args: Vec<&str> = vec![msg_file_str.as_ref()];
        if let Some(s) = source {
            args.push(s);
        }
        if let Some(s) = sha {
            args.push(s);
        }
        self.execute_hook(GitHookType::PrepareCommitMsg, &args, None)
            .await
    }

    /// Run commit-msg hook
    pub async fn run_commit_msg(&self, msg_file: &Path) -> HookResult {
        let msg_file_str = msg_file.to_string_lossy();
        self.execute_hook(GitHookType::CommitMsg, &[msg_file_str.as_ref()], None)
            .await
    }

    /// Run post-commit hook
    pub async fn run_post_commit(&self) -> HookResult {
        self.execute_hook(GitHookType::PostCommit, &[], None).await
    }

    /// Run pre-push hook
    /// refs format: "<local ref> <local sha> <remote ref> <remote sha>\n" per line
    pub async fn run_pre_push(
        &self,
        remote_name: &str,
        remote_url: &str,
        refs_stdin: &str,
    ) -> HookResult {
        self.execute_hook(
            GitHookType::PrePush,
            &[remote_name, remote_url],
            Some(refs_stdin),
        )
        .await
    }

    /// Run post-merge hook
    pub async fn run_post_merge(&self, is_squash: bool) -> HookResult {
        let flag = if is_squash { "1" } else { "0" };
        self.execute_hook(GitHookType::PostMerge, &[flag], None)
            .await
    }

    /// Run pre-rebase hook
    pub async fn run_pre_rebase(&self, upstream: &str, rebased_branch: Option<&str>) -> HookResult {
        let mut args = vec![upstream];
        if let Some(branch) = rebased_branch {
            args.push(branch);
        }
        self.execute_hook(GitHookType::PreRebase, &args, None).await
    }

    /// Run post-checkout hook
    pub async fn run_post_checkout(
        &self,
        prev_head: &str,
        new_head: &str,
        is_branch: bool,
    ) -> HookResult {
        let flag = if is_branch { "1" } else { "0" };
        self.execute_hook(
            GitHookType::PostCheckout,
            &[prev_head, new_head, flag],
            None,
        )
        .await
    }

    /// Run post-rewrite hook
    /// rewrites format: "<old sha> <new sha>\n" per line
    pub async fn run_post_rewrite(&self, command: &str, rewrites_stdin: &str) -> HookResult {
        self.execute_hook(GitHookType::PostRewrite, &[command], Some(rewrites_stdin))
            .await
    }

    // ==================== Hook Management ====================

    /// List all hooks with their status
    pub fn list_hooks(&self) -> Vec<HookInfo> {
        GitHookType::iter()
            .map(|hook_type| self.get_hook_info(hook_type))
            .collect()
    }

    /// Get info for a specific hook
    pub fn get_hook_info(&self, hook_type: GitHookType) -> HookInfo {
        let filename = hook_type.filename();
        let hook_path = self.hooks_path.join(filename);
        let disabled_path = self.hooks_path.join(format!("{filename}.disabled"));

        let (exists, enabled, actual_path) = if hook_path.exists() && hook_path.is_file() {
            (true, true, hook_path.clone())
        } else if disabled_path.exists() && disabled_path.is_file() {
            (true, false, disabled_path)
        } else {
            (false, false, hook_path.clone())
        };

        let is_executable = if exists {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                actual_path
                    .metadata()
                    .map(|m| m.permissions().mode() & 0o111 != 0)
                    .unwrap_or(false)
            }
            #[cfg(not(unix))]
            {
                true // On Windows, assume executable
            }
        } else {
            false
        };

        HookInfo {
            hook_type,
            exists,
            enabled,
            path: actual_path.to_string_lossy().to_string(),
            is_executable,
        }
    }

    /// Get hook details including content
    pub fn get_hook_details(&self, hook_type: GitHookType) -> Result<HookDetails> {
        let info = self.get_hook_info(hook_type);
        let content = if info.exists {
            Some(fs::read_to_string(&info.path).map_err(AxisError::from)?)
        } else {
            None
        };

        Ok(HookDetails { info, content })
    }

    /// Create a new hook
    pub fn create_hook(&self, hook_type: GitHookType, content: &str) -> Result<()> {
        // Ensure hooks directory exists
        fs::create_dir_all(&self.hooks_path).map_err(AxisError::from)?;

        let hook_path = self.hooks_path.join(hook_type.filename());

        // Check if hook already exists
        if hook_path.exists() {
            return Err(AxisError::Other(format!(
                "Hook {} already exists",
                hook_type.filename()
            )));
        }

        // Write the hook file
        let mut file = fs::File::create(&hook_path).map_err(AxisError::from)?;
        file.write_all(content.as_bytes())
            .map_err(AxisError::from)?;

        // Make executable on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&hook_path)
                .map_err(AxisError::from)?
                .permissions();
            perms.set_mode(perms.mode() | 0o755);
            fs::set_permissions(&hook_path, perms).map_err(AxisError::from)?;
        }

        Ok(())
    }

    /// Update an existing hook
    pub fn update_hook(&self, hook_type: GitHookType, content: &str) -> Result<()> {
        let info = self.get_hook_info(hook_type);

        if !info.exists {
            return Err(AxisError::Other(format!(
                "Hook {} does not exist",
                hook_type.filename()
            )));
        }

        // Write the updated content
        fs::write(&info.path, content).map_err(AxisError::from)?;

        // Ensure executable on Unix
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&info.path)
                .map_err(AxisError::from)?
                .permissions();
            if perms.mode() & 0o111 == 0 {
                perms.set_mode(perms.mode() | 0o755);
                fs::set_permissions(&info.path, perms).map_err(AxisError::from)?;
            }
        }

        Ok(())
    }

    /// Delete a hook
    pub fn delete_hook(&self, hook_type: GitHookType) -> Result<()> {
        let info = self.get_hook_info(hook_type);

        if !info.exists {
            return Err(AxisError::Other(format!(
                "Hook {} does not exist",
                hook_type.filename()
            )));
        }

        fs::remove_file(&info.path).map_err(AxisError::from)?;
        Ok(())
    }

    /// Toggle hook enabled/disabled state
    pub fn toggle_hook(&self, hook_type: GitHookType) -> Result<bool> {
        let filename = hook_type.filename();
        let hook_path = self.hooks_path.join(filename);
        let disabled_path = self.hooks_path.join(format!("{filename}.disabled"));

        if hook_path.exists() && hook_path.is_file() {
            // Currently enabled -> disable
            fs::rename(&hook_path, &disabled_path).map_err(AxisError::from)?;
            Ok(false) // Now disabled
        } else if disabled_path.exists() && disabled_path.is_file() {
            // Currently disabled -> enable
            fs::rename(&disabled_path, &hook_path).map_err(AxisError::from)?;
            Ok(true) // Now enabled
        } else {
            Err(AxisError::Other(format!(
                "Hook {} does not exist",
                hook_type.filename()
            )))
        }
    }

    /// Get available hook templates
    pub fn get_templates(&self) -> Vec<HookTemplate> {
        get_hook_templates()
    }

    /// Get templates for a specific hook type
    pub fn get_templates_for_type(&self, hook_type: GitHookType) -> Vec<HookTemplate> {
        get_hook_templates()
            .into_iter()
            .filter(|t| t.hook_type == hook_type)
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn setup_test_repo() -> (TempDir, git2::Repository) {
        let tmp = TempDir::new().expect("should create temp directory");
        let repo = git2::Repository::init(tmp.path()).expect("should init repo");
        (tmp, repo)
    }

    // ==================== HookService Creation Tests ====================

    #[test]
    fn test_hook_service_new() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Use canonical paths to handle symlinks (e.g., /var -> /private/var on macOS)
        let expected_path = repo.workdir().expect("should have workdir");
        let actual_path = &service.repo_path;

        // Both should resolve to the same canonical path
        assert!(
            actual_path
                .canonicalize()
                .ok()
                .map(|p| expected_path
                    .canonicalize()
                    .ok()
                    .map(|e| p == e)
                    .unwrap_or(false))
                .unwrap_or(false)
                || actual_path == expected_path
        );
        assert!(service.hooks_path.ends_with("hooks"));
    }

    #[test]
    fn test_hooks_path_default() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Default hooks path should be .git/hooks
        let expected = repo.path().join("hooks");
        assert_eq!(service.hooks_path(), expected);
    }

    // ==================== List Hooks Tests ====================

    #[test]
    fn test_list_hooks_empty_repo() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let hooks = service.list_hooks();

        // Should return all hook types
        assert!(!hooks.is_empty());

        // All hooks should not exist in fresh repo
        for hook in &hooks {
            assert!(!hook.exists);
            assert!(!hook.enabled);
        }
    }

    #[test]
    fn test_list_hooks_contains_all_types() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let hooks = service.list_hooks();
        let hook_types: Vec<_> = hooks.iter().map(|h| h.hook_type).collect();

        assert!(hook_types.contains(&GitHookType::PreCommit));
        assert!(hook_types.contains(&GitHookType::CommitMsg));
        assert!(hook_types.contains(&GitHookType::PostCommit));
        assert!(hook_types.contains(&GitHookType::PrePush));
    }

    // ==================== Get Hook Info Tests ====================

    #[test]
    fn test_get_hook_info_nonexistent() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let info = service.get_hook_info(GitHookType::PreCommit);

        assert!(!info.exists);
        assert!(!info.enabled);
        assert!(!info.is_executable);
        assert!(info.path.contains("pre-commit"));
    }

    #[test]
    fn test_get_hook_info_existing() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create hooks directory and hook file
        fs::create_dir_all(&service.hooks_path).expect("should create hooks dir");
        let hook_path = service.hooks_path.join("pre-commit");
        fs::write(&hook_path, "#!/bin/sh\nexit 0").expect("should write hook");

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&hook_path)
                .expect("should get metadata")
                .permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&hook_path, perms).expect("should set permissions");
        }

        let info = service.get_hook_info(GitHookType::PreCommit);

        assert!(info.exists);
        assert!(info.enabled);
        #[cfg(unix)]
        assert!(info.is_executable);
    }

    #[test]
    fn test_get_hook_info_disabled() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create hooks directory and disabled hook file
        fs::create_dir_all(&service.hooks_path).expect("should create hooks dir");
        let disabled_path = service.hooks_path.join("pre-commit.disabled");
        fs::write(&disabled_path, "#!/bin/sh\nexit 0").expect("should write hook");

        let info = service.get_hook_info(GitHookType::PreCommit);

        assert!(info.exists);
        assert!(!info.enabled);
    }

    // ==================== Get Hook Details Tests ====================

    #[test]
    fn test_get_hook_details_nonexistent() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let result = service.get_hook_details(GitHookType::PreCommit);
        let details = result.expect("should get details");

        assert!(!details.info.exists);
        assert!(details.content.is_none());
    }

    #[test]
    fn test_get_hook_details_existing() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        fs::create_dir_all(&service.hooks_path).expect("should create hooks dir");
        let hook_content = "#!/bin/sh\necho 'Hello from hook'";
        let hook_path = service.hooks_path.join("pre-commit");
        fs::write(&hook_path, hook_content).expect("should write hook");

        let result = service.get_hook_details(GitHookType::PreCommit);
        let details = result.expect("should get details");

        assert!(details.info.exists);
        assert_eq!(details.content, Some(hook_content.to_string()));
    }

    // ==================== Create Hook Tests ====================

    #[test]
    fn test_create_hook() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let content = "#!/bin/sh\nexit 0";
        let result = service.create_hook(GitHookType::PreCommit, content);
        assert!(result.is_ok());

        let hook_path = service.hooks_path.join("pre-commit");
        assert!(hook_path.exists());

        let saved_content = fs::read_to_string(&hook_path).expect("should read hook");
        assert_eq!(saved_content, content);

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = fs::metadata(&hook_path)
                .expect("should get metadata")
                .permissions()
                .mode();
            assert!(mode & 0o111 != 0, "Hook should be executable");
        }
    }

    #[test]
    fn test_create_hook_already_exists() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create first hook
        let content = "#!/bin/sh\nexit 0";
        service
            .create_hook(GitHookType::PreCommit, content)
            .expect("should create hook");

        // Try to create again
        let result = service.create_hook(GitHookType::PreCommit, content);
        assert!(result.is_err());
        assert!(result
            .expect_err("should be error")
            .to_string()
            .contains("already exists"));
    }

    // ==================== Update Hook Tests ====================

    #[test]
    fn test_update_hook() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create hook first
        let initial = "#!/bin/sh\nexit 0";
        service
            .create_hook(GitHookType::PreCommit, initial)
            .expect("should create hook");

        // Update hook
        let updated = "#!/bin/sh\necho 'updated'\nexit 0";
        let result = service.update_hook(GitHookType::PreCommit, updated);
        assert!(result.is_ok());

        let hook_path = service.hooks_path.join("pre-commit");
        let content = fs::read_to_string(&hook_path).expect("should read hook");
        assert_eq!(content, updated);
    }

    #[test]
    fn test_update_hook_nonexistent() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let result = service.update_hook(GitHookType::PreCommit, "content");
        assert!(result.is_err());
        assert!(result
            .expect_err("should be error")
            .to_string()
            .contains("does not exist"));
    }

    // ==================== Delete Hook Tests ====================

    #[test]
    fn test_delete_hook() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create hook first
        service
            .create_hook(GitHookType::PreCommit, "#!/bin/sh\nexit 0")
            .expect("should create hook");

        let hook_path = service.hooks_path.join("pre-commit");
        assert!(hook_path.exists());

        // Delete hook
        let result = service.delete_hook(GitHookType::PreCommit);
        assert!(result.is_ok());
        assert!(!hook_path.exists());
    }

    #[test]
    fn test_delete_hook_nonexistent() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let result = service.delete_hook(GitHookType::PreCommit);
        assert!(result.is_err());
        assert!(result
            .expect_err("should be error")
            .to_string()
            .contains("does not exist"));
    }

    // ==================== Toggle Hook Tests ====================

    #[test]
    fn test_toggle_hook_disable() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create enabled hook
        service
            .create_hook(GitHookType::PreCommit, "#!/bin/sh\nexit 0")
            .expect("should create hook");

        // Toggle to disable
        let result = service.toggle_hook(GitHookType::PreCommit);
        assert!(result.is_ok());
        assert!(!result.expect("should toggle"), "Should now be disabled");

        let hook_path = service.hooks_path.join("pre-commit");
        let disabled_path = service.hooks_path.join("pre-commit.disabled");
        assert!(!hook_path.exists());
        assert!(disabled_path.exists());
    }

    #[test]
    fn test_toggle_hook_enable() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create disabled hook
        fs::create_dir_all(&service.hooks_path).expect("should create dir");
        let disabled_path = service.hooks_path.join("pre-commit.disabled");
        fs::write(&disabled_path, "#!/bin/sh\nexit 0").expect("should write");

        // Toggle to enable
        let result = service.toggle_hook(GitHookType::PreCommit);
        assert!(result.is_ok());
        assert!(result.expect("should toggle"), "Should now be enabled");

        let hook_path = service.hooks_path.join("pre-commit");
        assert!(hook_path.exists());
        assert!(!disabled_path.exists());
    }

    #[test]
    fn test_toggle_hook_nonexistent() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let result = service.toggle_hook(GitHookType::PreCommit);
        assert!(result.is_err());
    }

    // ==================== Templates Tests ====================

    #[test]
    fn test_get_templates() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let templates = service.get_templates();

        // Should have some templates
        assert!(!templates.is_empty());

        // Each template should have required fields
        for template in &templates {
            assert!(!template.name.is_empty());
            assert!(!template.content.is_empty());
        }
    }

    #[test]
    fn test_get_templates_for_type() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let templates = service.get_templates_for_type(GitHookType::PreCommit);

        // All templates should be for pre-commit
        for template in &templates {
            assert_eq!(template.hook_type, GitHookType::PreCommit);
        }
    }

    // ==================== Hook Exists Tests ====================

    #[test]
    fn test_hook_exists_false() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        assert!(!service.hook_exists(GitHookType::PreCommit));
    }

    #[test]
    fn test_hook_exists_true() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        service
            .create_hook(GitHookType::PreCommit, "#!/bin/sh\nexit 0")
            .expect("should create hook");

        assert!(service.hook_exists(GitHookType::PreCommit));
    }

    #[test]
    fn test_hook_exists_directory_not_file() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create a directory with the hook name
        fs::create_dir_all(service.hooks_path.join("pre-commit")).expect("should create dir");

        assert!(!service.hook_exists(GitHookType::PreCommit));
    }

    // ==================== Execute Hook Tests ====================

    #[tokio::test]
    async fn test_execute_hook_nonexistent() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let result = service.run_pre_commit().await;

        assert!(result.skipped);
        assert!(result.success);
    }

    #[tokio::test]
    #[cfg(unix)]
    async fn test_execute_hook_success() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create a simple hook that succeeds
        let hook_content = "#!/bin/sh\necho 'Success'\nexit 0";
        service
            .create_hook(GitHookType::PreCommit, hook_content)
            .expect("should create hook");

        let result = service.run_pre_commit().await;

        assert!(!result.skipped);
        assert!(result.success);
        assert_eq!(result.exit_code, 0);
        assert!(result.stdout.contains("Success"));
    }

    #[tokio::test]
    #[cfg(unix)]
    async fn test_execute_hook_failure() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create a hook that fails
        let hook_content = "#!/bin/sh\necho 'Error' >&2\nexit 1";
        service
            .create_hook(GitHookType::PreCommit, hook_content)
            .expect("should create hook");

        let result = service.run_pre_commit().await;

        assert!(!result.skipped);
        assert!(!result.success);
        assert_eq!(result.exit_code, 1);
        assert!(result.stderr.contains("Error"));
    }

    #[test]
    #[cfg(unix)]
    fn test_hook_not_executable_info() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // Create hooks directory and non-executable hook
        fs::create_dir_all(&service.hooks_path).expect("should create hooks dir");
        let hook_path = service.hooks_path.join("pre-commit");
        fs::write(&hook_path, "#!/bin/sh\nexit 0").expect("should write hook");

        // Explicitly remove execute permission
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&hook_path)
            .expect("should get metadata")
            .permissions();
        perms.set_mode(0o644);
        fs::set_permissions(&hook_path, perms).expect("should set permissions");

        // When getting hook info, it should show exists but not executable
        let info = service.get_hook_info(GitHookType::PreCommit);
        assert!(info.exists);
        assert!(!info.is_executable);

        // hook_exists should return false since file is not executable
        assert!(!service.hook_exists(GitHookType::PreCommit));
    }

    // ==================== Hook Runner Tests ====================

    #[tokio::test]
    async fn test_run_post_merge() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        // No hook exists, should be skipped
        let result = service.run_post_merge(false).await;
        assert!(result.skipped);
    }

    #[tokio::test]
    async fn test_run_post_checkout() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let result = service.run_post_checkout("abc123", "def456", true).await;
        assert!(result.skipped);
    }

    #[tokio::test]
    async fn test_run_pre_rebase() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let result = service.run_pre_rebase("upstream", Some("feature")).await;
        assert!(result.skipped);
    }

    #[tokio::test]
    async fn test_run_pre_push() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let refs = "refs/heads/main abc123 refs/heads/main def456\n";
        let result = service
            .run_pre_push("origin", "https://example.com/repo.git", refs)
            .await;
        assert!(result.skipped);
    }

    #[tokio::test]
    async fn test_run_post_rewrite() {
        let (_tmp, repo) = setup_test_repo();
        let service = HookService::new(&repo);

        let rewrites = "abc123 def456\n";
        let result = service.run_post_rewrite("rebase", rewrites).await;
        assert!(result.skipped);
    }
}
