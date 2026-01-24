use crate::error::{AxisError, Result};
use crate::models::{
    get_hook_templates, GitHookType, HookDetails, HookInfo, HookResult, HookTemplate,
};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use strum::IntoEnumIterator;

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

    /// Get the hooks directory path
    pub fn hooks_path(&self) -> &Path {
        &self.hooks_path
    }

    // ==================== Hook Execution ====================

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
    fn execute_hook(
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
                        let _ = stdin_handle.write_all(input.as_bytes());
                        // Drop stdin to close it so the child can finish
                        drop(stdin_handle);
                    }
                }

                match child.wait_with_output() {
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
            let mut cmd = Command::new(hook_path);
            cmd.args(args);
            cmd
        }

        #[cfg(windows)]
        {
            // On Windows, execute through sh (from Git for Windows)
            let mut cmd = Command::new("sh");
            cmd.arg(hook_path);
            cmd.args(args);
            cmd
        }
    }

    // ==================== Hook Runners ====================

    /// Run pre-commit hook
    pub fn run_pre_commit(&self) -> HookResult {
        self.execute_hook(GitHookType::PreCommit, &[], None)
    }

    /// Run prepare-commit-msg hook
    pub fn run_prepare_commit_msg(
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
    }

    /// Run commit-msg hook
    pub fn run_commit_msg(&self, msg_file: &Path) -> HookResult {
        let msg_file_str = msg_file.to_string_lossy();
        self.execute_hook(GitHookType::CommitMsg, &[msg_file_str.as_ref()], None)
    }

    /// Run post-commit hook
    pub fn run_post_commit(&self) -> HookResult {
        self.execute_hook(GitHookType::PostCommit, &[], None)
    }

    /// Run pre-push hook
    /// refs format: "<local ref> <local sha> <remote ref> <remote sha>\n" per line
    pub fn run_pre_push(
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
    }

    /// Run post-merge hook
    pub fn run_post_merge(&self, is_squash: bool) -> HookResult {
        let flag = if is_squash { "1" } else { "0" };
        self.execute_hook(GitHookType::PostMerge, &[flag], None)
    }

    /// Run pre-rebase hook
    pub fn run_pre_rebase(&self, upstream: &str, rebased_branch: Option<&str>) -> HookResult {
        let mut args = vec![upstream];
        if let Some(branch) = rebased_branch {
            args.push(branch);
        }
        self.execute_hook(GitHookType::PreRebase, &args, None)
    }

    /// Run post-checkout hook
    pub fn run_post_checkout(
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
    }

    /// Run post-rewrite hook
    /// rewrites format: "<old sha> <new sha>\n" per line
    pub fn run_post_rewrite(&self, command: &str, rewrites_stdin: &str) -> HookResult {
        self.execute_hook(GitHookType::PostRewrite, &[command], Some(rewrites_stdin))
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
