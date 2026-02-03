use crate::error::{AxisError, Result};
use crate::models::ResetMode;
use crate::models::{
    AddSubmoduleOptions, AddWorktreeOptions, ArchiveResult, BisectState, GitEnvironment,
    GitFlowBranchType, GitFlowConfig, GitFlowFinishOptions, GitFlowInitOptions, GitFlowResult,
    GrepMatch, GrepOptions, GrepResult, LfsEnvironment, LfsFetchOptions, LfsFile, LfsFileStatus,
    LfsMigrateMode, LfsMigrateOptions, LfsPruneOptions, LfsPruneResult, LfsPullOptions,
    LfsPushOptions, LfsResult, LfsStatus, LfsTrackedPattern, PatchResult, RemoveWorktreeOptions,
    StashApplyOptions, StashEntry, StashResult, StashSaveOptions, Submodule, SubmoduleResult,
    SubmoduleStatus, SyncSubmoduleOptions, TagResult, UpdateSubmoduleOptions, Worktree,
    WorktreeResult,
};
use crate::models::{InteractiveRebaseEntry, RebaseAction, RebaseProgress};
use chrono::{DateTime, Utc};
use std::fs;
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use std::process::{Command, Output, Stdio};

use crate::services::create_command;
use tempfile::NamedTempFile;

use bzip2::write::BzEncoder;
use flate2::write::GzEncoder;
use flate2::Compression;

/// Service for Git operations that require the system Git CLI.
/// Used for operations that libgit2 doesn't support well:
/// - Interactive rebase
/// - Complex merge strategies
/// - Cherry-pick with various options
/// - Revert operations
pub struct GitCliService {
    repo_path: std::path::PathBuf,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OperationType {
    Merge,
    Rebase,
    CherryPick,
    Revert,
    Bisect,
}

#[derive(Debug)]
pub struct GitCommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
}

impl GitCliService {
    pub fn new(repo_path: &Path) -> Self {
        GitCliService {
            repo_path: repo_path.to_path_buf(),
        }
    }

    /// Execute a git command and return the result
    fn execute(&self, args: &[&str]) -> Result<GitCommandResult> {
        let output = create_command("git")
            .args(args)
            .current_dir(&self.repo_path)
            .output()
            .map_err(AxisError::from)?;

        Ok(GitCommandResult::from(output))
    }

    /// Execute a git command with an optional SSH key override.
    /// When ssh_key_path is set, GIT_SSH_COMMAND is injected to force that key.
    fn execute_with_ssh_key(
        &self,
        args: &[&str],
        ssh_key_path: Option<&str>,
    ) -> Result<GitCommandResult> {
        let mut cmd = create_command("git");
        cmd.args(args).current_dir(&self.repo_path);

        if let Some(key_path) = ssh_key_path {
            let expanded = shellexpand::tilde(key_path).to_string();
            let ssh_command = format!("ssh -i {expanded} -o IdentitiesOnly=yes");
            cmd.env("GIT_SSH_COMMAND", &ssh_command);
        }

        let output = cmd.output().map_err(AxisError::from)?;
        Ok(GitCommandResult::from(output))
    }

    /// Execute a git command, returning an error if it fails
    fn execute_checked(&self, args: &[&str]) -> Result<GitCommandResult> {
        let result = self.execute(args)?;
        if !result.success {
            return Err(AxisError::GitError(format!(
                "Git command failed: {}",
                result.stderr.trim()
            )));
        }
        Ok(result)
    }

    // ==================== Merge Operations ====================

    /// Merge a branch into the current branch
    pub fn merge(
        &self,
        branch: &str,
        message: Option<&str>,
        no_ff: bool,
        squash: bool,
        ff_only: bool,
        no_commit: bool,
    ) -> Result<GitCommandResult> {
        let mut args = vec!["merge"];

        // ff_only and no_ff are mutually exclusive; ff_only takes precedence
        if ff_only {
            args.push("--ff-only");
        } else if no_ff {
            args.push("--no-ff");
        }

        if squash {
            args.push("--squash");
        }

        if no_commit {
            args.push("--no-commit");
        }

        if let Some(msg) = message {
            args.push("-m");
            args.push(msg);
        }

        args.push(branch);

        self.execute(&args)
    }

    /// Abort an in-progress merge
    pub fn merge_abort(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["merge", "--abort"])
    }

    /// Continue a merge after resolving conflicts
    pub fn merge_continue(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["merge", "--continue"])
    }

    // ==================== Rebase Operations ====================

    /// Start a rebase onto a target branch
    pub fn rebase(&self, onto: &str, interactive: bool) -> Result<GitCommandResult> {
        let mut args = vec!["rebase"];

        if interactive {
            args.push("-i");
        }

        args.push(onto);

        self.execute(&args)
    }

    /// Abort an in-progress rebase
    pub fn rebase_abort(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["rebase", "--abort"])
    }

    /// Continue a rebase after resolving conflicts
    pub fn rebase_continue(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["rebase", "--continue"])
    }

    /// Skip the current commit during rebase
    pub fn rebase_skip(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["rebase", "--skip"])
    }

    /// Rebase a range of commits onto a target
    pub fn rebase_onto(
        &self,
        new_base: &str,
        old_base: &str,
        branch: Option<&str>,
    ) -> Result<GitCommandResult> {
        let mut args = vec!["rebase", "--onto", new_base, old_base];

        if let Some(b) = branch {
            args.push(b);
        }

        self.execute(&args)
    }

    /// Execute an interactive rebase with a pre-built todo list
    pub fn interactive_rebase(
        &self,
        onto: &str,
        entries: &[InteractiveRebaseEntry],
        autosquash: bool,
    ) -> Result<GitCommandResult> {
        // Build the todo file content (dropped commits are simply omitted)
        let todo_content = entries
            .iter()
            .filter(|e| e.action != RebaseAction::Drop)
            .map(|entry| {
                format!(
                    "{} {} {}",
                    entry.action.to_string().to_lowercase(),
                    entry.short_oid,
                    entry.summary
                )
            })
            .collect::<Vec<_>>()
            .join("\n");

        // Write to temp file
        let mut todo_file = NamedTempFile::new().map_err(AxisError::from)?;
        writeln!(todo_file, "{todo_content}").map_err(AxisError::from)?;
        let todo_path = todo_file.path().to_string_lossy().to_string();

        // Build the GIT_SEQUENCE_EDITOR command based on platform
        // This command copies our pre-built todo file over the one git provides
        #[cfg(windows)]
        let editor_cmd = format!("cmd /c copy /y \"{}\" ", todo_path.replace('/', "\\"));
        #[cfg(not(windows))]
        let editor_cmd = format!("cp \"{}\" ", todo_path);

        // Build rebase args
        let mut args = vec!["rebase", "-i"];
        if autosquash {
            args.push("--autosquash");
        }
        args.push(onto);

        // Execute with custom editor that replaces the todo file
        let output = create_command("git")
            .args(&args)
            .current_dir(&self.repo_path)
            .env("GIT_SEQUENCE_EDITOR", &editor_cmd)
            .stdin(Stdio::null())
            .output()
            .map_err(AxisError::from)?;

        // Keep temp file alive until command completes
        drop(todo_file);

        Ok(GitCommandResult::from(output))
    }

    /// Get detailed rebase progress by parsing .git/rebase-merge or .git/rebase-apply state files
    pub fn get_rebase_progress(&self) -> Result<Option<RebaseProgress>> {
        let rebase_merge = self.repo_path.join(".git/rebase-merge");
        let rebase_apply = self.repo_path.join(".git/rebase-apply");

        let state_dir = if rebase_merge.exists() {
            rebase_merge
        } else if rebase_apply.exists() {
            rebase_apply
        } else {
            return Ok(None);
        };

        // Parse current step (msgnum) and total steps (end)
        let current_step = fs::read_to_string(state_dir.join("msgnum"))
            .ok()
            .and_then(|s| s.trim().parse::<usize>().ok())
            .unwrap_or(0);

        let total_steps = fs::read_to_string(state_dir.join("end"))
            .ok()
            .and_then(|s| s.trim().parse::<usize>().ok())
            .unwrap_or(0);

        // Parse head-name (strip refs/heads/ prefix)
        let head_name = fs::read_to_string(state_dir.join("head-name"))
            .ok()
            .map(|s| {
                let trimmed = s.trim();
                trimmed
                    .strip_prefix("refs/heads/")
                    .unwrap_or(trimmed)
                    .to_string()
            });

        // Parse onto SHA
        let onto = fs::read_to_string(state_dir.join("onto"))
            .ok()
            .map(|s| s.trim().to_string());

        // Parse stopped-sha
        let stopped_sha = fs::read_to_string(state_dir.join("stopped-sha"))
            .ok()
            .map(|s| s.trim().to_string());

        // Check amend file presence (indicates Edit action)
        let is_amend_mode = state_dir.join("amend").exists();

        // Read commit message file
        let commit_message = fs::read_to_string(state_dir.join("message"))
            .ok()
            .map(|s| s.trim_end().to_string());

        // Determine paused action
        let paused_action = if stopped_sha.is_some() {
            if is_amend_mode {
                Some(RebaseAction::Edit)
            } else if commit_message.is_some() {
                Some(RebaseAction::Reword)
            } else {
                None
            }
        } else {
            None
        };

        log::debug!(
            "Rebase progress: step {current_step}/{total_steps}, paused: {paused_action:?}, head: {head_name:?}"
        );

        Ok(Some(RebaseProgress {
            current_step,
            total_steps,
            head_name,
            onto,
            paused_action,
            stopped_sha,
            commit_message,
            is_amend_mode,
        }))
    }

    /// Continue rebase with a new commit message (used for Reword action)
    pub fn rebase_continue_with_message(&self, message: &str) -> Result<GitCommandResult> {
        let rebase_merge = self.repo_path.join(".git/rebase-merge");
        let rebase_apply = self.repo_path.join(".git/rebase-apply");

        let state_dir = if rebase_merge.exists() {
            rebase_merge
        } else if rebase_apply.exists() {
            rebase_apply
        } else {
            return Err(AxisError::Other("No rebase in progress".to_string()));
        };

        // Write the new message to the state directory
        fs::write(state_dir.join("message"), message)
            .map_err(|e| AxisError::IoError(format!("Failed to write rebase message: {e}")))?;

        // Continue rebase with GIT_EDITOR=true to skip the editor
        let output = create_command("git")
            .args(["rebase", "--continue"])
            .current_dir(&self.repo_path)
            .env("GIT_EDITOR", "true")
            .stdin(Stdio::null())
            .output()
            .map_err(AxisError::from)?;

        Ok(GitCommandResult::from(output))
    }

    // ==================== Cherry-pick Operations ====================

    /// Cherry-pick a single commit
    pub fn cherry_pick(&self, commit: &str, no_commit: bool) -> Result<GitCommandResult> {
        let mut args = vec!["cherry-pick"];

        if no_commit {
            args.push("-n");
        }

        args.push(commit);

        self.execute(&args)
    }

    /// Cherry-pick a range of commits
    pub fn cherry_pick_range(
        &self,
        from: &str,
        to: &str,
        no_commit: bool,
    ) -> Result<GitCommandResult> {
        let range = format!("{from}..{to}");
        let mut args = vec!["cherry-pick"];

        if no_commit {
            args.push("-n");
        }

        args.push(&range);

        self.execute(&args)
    }

    /// Abort an in-progress cherry-pick
    pub fn cherry_pick_abort(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["cherry-pick", "--abort"])
    }

    /// Continue cherry-pick after resolving conflicts
    pub fn cherry_pick_continue(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["cherry-pick", "--continue"])
    }

    /// Skip the current commit during cherry-pick
    pub fn cherry_pick_skip(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["cherry-pick", "--skip"])
    }

    // ==================== Revert Operations ====================

    /// Revert a commit
    pub fn revert(&self, commit: &str, no_commit: bool) -> Result<GitCommandResult> {
        let mut args = vec!["revert"];

        if no_commit {
            args.push("-n");
        }

        args.push(commit);

        self.execute(&args)
    }

    /// Abort an in-progress revert
    pub fn revert_abort(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["revert", "--abort"])
    }

    /// Continue revert after resolving conflicts
    pub fn revert_continue(&self) -> Result<GitCommandResult> {
        self.execute_checked(&["revert", "--continue"])
    }

    // ==================== Conflict Resolution ====================

    /// Mark a file as resolved
    pub fn mark_resolved(&self, path: &str) -> Result<GitCommandResult> {
        self.execute_checked(&["add", path])
    }

    /// Mark a file as unmerged (undo resolve)
    pub fn mark_unresolved(&self, path: &str) -> Result<GitCommandResult> {
        // Reset the file to re-create conflict markers
        self.execute(&["checkout", "-m", path])
    }

    /// Get the base version of a conflicted file
    pub fn get_conflict_base(&self, path: &str) -> Result<String> {
        let result = self.execute(&["show", &format!(":1:{}", path)])?;
        if result.success {
            Ok(result.stdout)
        } else {
            Err(AxisError::GitError(format!(
                "Could not get base version: {}",
                result.stderr
            )))
        }
    }

    /// Get the ours (current) version of a conflicted file
    pub fn get_conflict_ours(&self, path: &str) -> Result<String> {
        let result = self.execute(&["show", &format!(":2:{}", path)])?;
        if result.success {
            Ok(result.stdout)
        } else {
            Err(AxisError::GitError(format!(
                "Could not get ours version: {}",
                result.stderr
            )))
        }
    }

    /// Get the theirs (incoming) version of a conflicted file
    pub fn get_conflict_theirs(&self, path: &str) -> Result<String> {
        let result = self.execute(&["show", &format!(":3:{}", path)])?;
        if result.success {
            Ok(result.stdout)
        } else {
            Err(AxisError::GitError(format!(
                "Could not get theirs version: {}",
                result.stderr
            )))
        }
    }

    /// Choose a specific version for a conflicted file
    pub fn resolve_with_version(
        &self,
        path: &str,
        version: ConflictVersion,
    ) -> Result<GitCommandResult> {
        let version_arg = match version {
            ConflictVersion::Ours => "--ours",
            ConflictVersion::Theirs => "--theirs",
        };

        // Checkout the specified version
        self.execute_checked(&["checkout", version_arg, "--", path])?;
        // Mark as resolved
        self.execute_checked(&["add", path])
    }

    // ==================== Status Helpers ====================

    /// Check if we're in a merge state
    pub fn is_merging(&self) -> Result<bool> {
        let merge_head = self.repo_path.join(".git/MERGE_HEAD");
        Ok(merge_head.exists())
    }

    /// Check if we're in a rebase state
    pub fn is_rebasing(&self) -> Result<bool> {
        let rebase_merge = self.repo_path.join(".git/rebase-merge");
        let rebase_apply = self.repo_path.join(".git/rebase-apply");
        Ok(rebase_merge.exists() || rebase_apply.exists())
    }

    /// Check if we're in a cherry-pick state
    pub fn is_cherry_picking(&self) -> Result<bool> {
        let cherry_pick_head = self.repo_path.join(".git/CHERRY_PICK_HEAD");
        Ok(cherry_pick_head.exists())
    }

    /// Check if we're in a revert state
    pub fn is_reverting(&self) -> Result<bool> {
        let revert_head = self.repo_path.join(".git/REVERT_HEAD");
        Ok(revert_head.exists())
    }

    /// Get the current operation in progress
    pub fn get_operation_in_progress(&self) -> Result<Option<OperationType>> {
        if self.is_rebasing()? {
            Ok(Some(OperationType::Rebase))
        } else if self.is_merging()? {
            Ok(Some(OperationType::Merge))
        } else if self.is_cherry_picking()? {
            Ok(Some(OperationType::CherryPick))
        } else if self.is_reverting()? {
            Ok(Some(OperationType::Revert))
        } else if self.is_bisecting()? {
            Ok(Some(OperationType::Bisect))
        } else {
            Ok(None)
        }
    }

    /// Get list of conflicted files
    pub fn get_conflicted_files(&self) -> Result<Vec<String>> {
        let result = self.execute(&["diff", "--name-only", "--diff-filter=U"])?;
        if result.success {
            Ok(result.stdout.lines().map(|s| s.to_string()).collect())
        } else {
            Ok(Vec::new())
        }
    }

    // ==================== Reset Operations ====================

    /// Reset to a specific commit
    pub fn reset(&self, target: &str, mode: ResetMode) -> Result<GitCommandResult> {
        let mode_arg = match mode {
            ResetMode::Soft => "--soft",
            ResetMode::Mixed => "--mixed",
            ResetMode::Hard => "--hard",
        };

        self.execute_checked(&["reset", mode_arg, target])
    }

    // ==================== Stash Operations ====================

    /// List all stash entries
    pub fn stash_list(&self) -> Result<Vec<StashEntry>> {
        let result = self.execute(&[
            "stash",
            "list",
            "--format=%gd|%H|%s|%an|%ad",
            "--date=iso-strict",
        ])?;

        if !result.success || result.stdout.trim().is_empty() {
            return Ok(Vec::new());
        }

        let mut entries = Vec::new();
        for (index, line) in result.stdout.lines().enumerate() {
            let parts: Vec<&str> = line.splitn(5, '|').collect();
            if parts.len() >= 5 {
                let stash_ref = parts[0].to_string();
                let commit_oid = parts[1].to_string();
                let message = parts[2].to_string();
                let author = parts[3].to_string();
                let timestamp_str = parts[4];

                // Parse branch from message (format: "WIP on branch: message" or "On branch: message")
                let branch = if message.contains(" on ") {
                    message
                        .split(" on ")
                        .nth(1)
                        .and_then(|s| s.split(':').next())
                        .map(|s| s.to_string())
                } else {
                    None
                };

                let timestamp = DateTime::parse_from_rfc3339(timestamp_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                entries.push(StashEntry {
                    index,
                    stash_ref,
                    message,
                    commit_oid: commit_oid.clone(),
                    short_oid: commit_oid.chars().take(7).collect(),
                    branch,
                    author,
                    timestamp,
                });
            }
        }

        Ok(entries)
    }

    /// Create a new stash
    pub fn stash_save(&self, options: &StashSaveOptions) -> Result<StashResult> {
        let mut args = vec!["stash", "push"];

        if options.include_untracked {
            args.push("--include-untracked");
        }

        if options.keep_index {
            args.push("--keep-index");
        }

        if options.include_ignored {
            args.push("--all");
        }

        if let Some(ref msg) = options.message {
            args.push("-m");
            args.push(msg);
        }

        let result = self.execute(&args)?;

        if result.success {
            // Count affected files from output
            let files_affected = result.stdout.lines().count();
            Ok(StashResult {
                message: "Stash created successfully".to_string(),
                files_affected,
                conflicts: Vec::new(),
            })
        } else if result.stderr.contains("No local changes to save") {
            Ok(StashResult {
                message: "No changes to stash".to_string(),
                files_affected: 0,
                conflicts: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Apply a stash (keep it in the stash list)
    pub fn stash_apply(&self, options: &StashApplyOptions) -> Result<StashResult> {
        let mut args = vec!["stash", "apply"];

        if options.reinstate_index {
            args.push("--index");
        }

        let stash_ref = format!("stash@{{{}}}", options.index.unwrap_or(0));
        args.push(&stash_ref);

        let result = self.execute(&args)?;

        // Git outputs CONFLICT to stdout
        if result.stdout.contains("CONFLICT") {
            let conflicts = self.get_conflicted_files()?;
            Err(AxisError::StashApplyConflict(conflicts))
        } else if result.success {
            Ok(StashResult {
                message: "Stash applied successfully".to_string(),
                files_affected: 0,
                conflicts: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Pop a stash (apply and remove from stash list)
    pub fn stash_pop(&self, options: &StashApplyOptions) -> Result<StashResult> {
        let mut args = vec!["stash", "pop"];

        if options.reinstate_index {
            args.push("--index");
        }

        let stash_ref = format!("stash@{{{}}}", options.index.unwrap_or(0));
        args.push(&stash_ref);

        let result = self.execute(&args)?;

        // Git outputs CONFLICT to stdout
        if result.stdout.contains("CONFLICT") {
            let conflicts = self.get_conflicted_files()?;
            Err(AxisError::StashApplyConflict(conflicts))
        } else if result.success {
            Ok(StashResult {
                message: "Stash popped successfully".to_string(),
                files_affected: 0,
                conflicts: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Drop a stash entry
    pub fn stash_drop(&self, index: Option<usize>) -> Result<StashResult> {
        let stash_ref = format!("stash@{{{}}}", index.unwrap_or(0));
        let result = self.execute(&["stash", "drop", &stash_ref])?;

        if result.success {
            Ok(StashResult {
                message: "Stash dropped successfully".to_string(),
                files_affected: 0, // TODO: parse from output if needed
                conflicts: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Clear all stashes
    pub fn stash_clear(&self) -> Result<StashResult> {
        let result = self.execute(&["stash", "clear"])?;

        if result.success {
            Ok(StashResult {
                message: "All stashes cleared".to_string(),
                files_affected: 0, // TODO: parse from output if needed
                conflicts: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Show the diff of a stash
    pub fn stash_show(&self, index: Option<usize>, stat_only: bool) -> Result<String> {
        let stash_ref = format!("stash@{{{}}}", index.unwrap_or(0));
        let args = if stat_only {
            vec!["stash", "show", "--stat", &stash_ref]
        } else {
            vec!["stash", "show", "-p", &stash_ref]
        };

        let result = self.execute(&args)?;
        if result.success {
            Ok(result.stdout)
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Create a branch from a stash
    pub fn stash_branch(&self, branch_name: &str, index: Option<usize>) -> Result<StashResult> {
        let stash_ref = format!("stash@{{{}}}", index.unwrap_or(0));
        let result = self.execute(&["stash", "branch", branch_name, &stash_ref])?;

        if result.success {
            Ok(StashResult {
                message: format!("Created branch '{}' from stash", branch_name),
                files_affected: 0, // TODO: parse from output if needed
                conflicts: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    // ==================== Tag Operations (Remote Only) ====================
    // Local tag operations (list, create, delete) are handled by Git2Service

    /// Push a tag to remote
    pub fn tag_push(&self, name: &str, remote: &str) -> Result<TagResult> {
        let result = self.execute(&["push", remote, &format!("refs/tags/{}", name)])?;

        Ok(TagResult {
            success: result.success,
            message: if result.success {
                format!("Tag '{}' pushed to '{}'", name, remote)
            } else {
                result.stderr.trim().to_string()
            },
            tag: None,
        })
    }

    /// Push all tags to remote
    pub fn tag_push_all(&self, remote: &str) -> Result<TagResult> {
        let result = self.execute(&["push", remote, "--tags"])?;

        Ok(TagResult {
            success: result.success,
            message: if result.success {
                format!("All tags pushed to '{}'", remote)
            } else {
                result.stderr.trim().to_string()
            },
            tag: None,
        })
    }

    /// Delete a remote tag
    pub fn tag_delete_remote(&self, name: &str, remote: &str) -> Result<TagResult> {
        let result = self.execute(&["push", remote, "--delete", &format!("refs/tags/{}", name)])?;

        Ok(TagResult {
            success: result.success,
            message: if result.success {
                format!("Remote tag '{}' deleted from '{}'", name, remote)
            } else {
                result.stderr.trim().to_string()
            },
            tag: None,
        })
    }

    // ==================== Submodule Operations ====================

    /// List all submodules
    pub fn submodule_list(&self) -> Result<Vec<Submodule>> {
        // Use git submodule status for detailed info
        let result = self.execute(&["submodule", "status", "--recursive"])?;

        if !result.success {
            // If error contains "not a git repository", there might be no submodules
            if result.stderr.contains("No submodule mapping found") {
                return Ok(Vec::new());
            }
            return Err(AxisError::GitError(result.stderr));
        }

        let mut submodules = Vec::new();

        // Also get submodule config for URLs
        let config_result = self.execute(&["config", "--file", ".gitmodules", "--list"]);
        let configs: std::collections::HashMap<String, String> = config_result
            .map(|r| {
                r.stdout
                    .lines()
                    .filter_map(|line| {
                        let parts: Vec<&str> = line.splitn(2, '=').collect();
                        if parts.len() == 2 {
                            Some((parts[0].to_string(), parts[1].to_string()))
                        } else {
                            None
                        }
                    })
                    .collect()
            })
            .unwrap_or_default();

        for line in result.stdout.lines() {
            if line.is_empty() {
                continue;
            }

            // Format: " HEAD_OID path (branch)" or "+HEAD_OID path" (+ = modified, - = not init, U = conflict)
            let line = line.trim();
            let status_char = line.chars().next().unwrap_or(' ');
            let rest = if status_char == ' '
                || status_char == '+'
                || status_char == '-'
                || status_char == 'U'
            {
                &line[1..]
            } else {
                line
            };

            let parts: Vec<&str> = rest.trim().splitn(3, ' ').collect();
            if parts.len() >= 2 {
                let head_oid = parts[0].to_string();
                let path = parts[1].to_string();

                // Get branch from parentheses if present
                let branch = if parts.len() >= 3 {
                    let branch_part = parts[2].trim();
                    if branch_part.starts_with('(') && branch_part.ends_with(')') {
                        Some(branch_part[1..branch_part.len() - 1].to_string())
                    } else {
                        None
                    }
                } else {
                    None
                };

                // Get URL from config
                let url_key = format!("submodule.{}.url", path);
                let url = configs.get(&url_key).cloned();

                let status = match status_char {
                    ' ' => SubmoduleStatus::Current,
                    '+' => SubmoduleStatus::Modified,
                    '-' => SubmoduleStatus::Uninitialized,
                    'U' => SubmoduleStatus::Conflict,
                    _ => SubmoduleStatus::Unknown,
                };

                submodules.push(Submodule {
                    name: path.clone(),
                    path: path.clone(),
                    url,
                    head_oid: if head_oid.is_empty() {
                        None
                    } else {
                        Some(head_oid.clone())
                    },
                    short_oid: if head_oid.is_empty() {
                        None
                    } else {
                        Some(head_oid.chars().take(7).collect())
                    },
                    indexed_oid: None, // Would need additional parsing
                    branch,
                    status,
                });
            }
        }

        Ok(submodules)
    }

    /// Add a new submodule
    pub fn submodule_add(&self, options: &AddSubmoduleOptions) -> Result<SubmoduleResult> {
        let mut args = vec!["submodule", "add"];

        if let Some(ref branch) = options.branch {
            args.push("-b");
            args.push(branch);
        }

        if let Some(ref name) = options.name {
            args.push("--name");
            args.push(name);
        }

        // Store depth_str outside the if block to extend its lifetime
        let depth_str = options.depth.map(|d| d.to_string());
        if let Some(ref ds) = depth_str {
            args.push("--depth");
            args.push(ds);
        }

        args.push(&options.url);
        args.push(&options.path);

        let result = self.execute(&args)?;

        Ok(SubmoduleResult {
            success: result.success,
            message: if result.success {
                format!("Submodule '{}' added at '{}'", options.url, options.path)
            } else {
                result.stderr.trim().to_string()
            },
            submodules: if result.success {
                vec![options.path.clone()]
            } else {
                Vec::new()
            },
        })
    }

    /// Initialize submodules
    pub fn submodule_init(&self, paths: &[String]) -> Result<SubmoduleResult> {
        let mut args = vec!["submodule", "init"];

        for path in paths {
            args.push(path);
        }

        let result = self.execute(&args)?;

        Ok(SubmoduleResult {
            success: result.success,
            message: if result.success {
                "Submodules initialized".to_string()
            } else {
                result.stderr.trim().to_string()
            },
            submodules: paths.to_vec(),
        })
    }

    /// Update submodules
    pub fn submodule_update(&self, options: &UpdateSubmoduleOptions) -> Result<SubmoduleResult> {
        let mut args = vec!["submodule", "update"];

        if options.init {
            args.push("--init");
        }

        if options.recursive {
            args.push("--recursive");
        }

        if options.force {
            args.push("--force");
        }

        if options.remote {
            args.push("--remote");
        }

        if options.rebase {
            args.push("--rebase");
        } else if options.merge {
            args.push("--merge");
        }

        for path in &options.paths {
            args.push(path);
        }

        let result = self.execute(&args)?;

        Ok(SubmoduleResult {
            success: result.success,
            message: if result.success {
                "Submodules updated".to_string()
            } else {
                result.stderr.trim().to_string()
            },
            submodules: options.paths.clone(),
        })
    }

    /// Sync submodule URLs from .gitmodules
    pub fn submodule_sync(&self, options: &SyncSubmoduleOptions) -> Result<SubmoduleResult> {
        let mut args = vec!["submodule", "sync"];

        if options.recursive {
            args.push("--recursive");
        }

        for path in &options.paths {
            args.push(path);
        }

        let result = self.execute(&args)?;

        Ok(SubmoduleResult {
            success: result.success,
            message: if result.success {
                "Submodule URLs synchronized".to_string()
            } else {
                result.stderr.trim().to_string()
            },
            submodules: options.paths.clone(),
        })
    }

    /// Deinitialize submodules
    pub fn submodule_deinit(&self, paths: &[String], force: bool) -> Result<SubmoduleResult> {
        let mut args = vec!["submodule", "deinit"];

        if force {
            args.push("--force");
        }

        for path in paths {
            args.push(path);
        }

        let result = self.execute(&args)?;

        Ok(SubmoduleResult {
            success: result.success,
            message: if result.success {
                "Submodules deinitialized".to_string()
            } else {
                result.stderr.trim().to_string()
            },
            submodules: paths.to_vec(),
        })
    }

    /// Remove a submodule completely
    pub fn submodule_remove(&self, path: &str) -> Result<SubmoduleResult> {
        // Step 1: Deinit the submodule
        let deinit_result = self.execute(&["submodule", "deinit", "-f", path])?;
        if !deinit_result.success {
            return Ok(SubmoduleResult {
                success: false,
                message: format!("Failed to deinit: {}", deinit_result.stderr.trim()),
                submodules: Vec::new(),
            });
        }

        // Step 2: Remove from .git/modules
        let git_modules_path = self.repo_path.join(".git").join("modules").join(path);
        if git_modules_path.exists() {
            if let Err(e) = std::fs::remove_dir_all(&git_modules_path) {
                return Ok(SubmoduleResult {
                    success: false,
                    message: format!("Failed to remove .git/modules/{}: {}", path, e),
                    submodules: Vec::new(),
                });
            }
        }

        // Step 3: Remove from worktree and index
        let rm_result = self.execute(&["rm", "-f", path])?;
        if !rm_result.success {
            return Ok(SubmoduleResult {
                success: false,
                message: format!("Failed to remove from index: {}", rm_result.stderr.trim()),
                submodules: Vec::new(),
            });
        }

        Ok(SubmoduleResult {
            success: true,
            message: format!("Submodule '{}' removed", path),
            submodules: vec![path.to_string()],
        })
    }

    /// Get summary of submodule changes
    pub fn submodule_summary(&self) -> Result<String> {
        let result = self.execute(&["submodule", "summary"])?;
        if result.success {
            Ok(result.stdout)
        } else {
            Ok(String::new())
        }
    }

    // ==================== Git-flow Operations ====================

    /// Check if git-flow is initialized
    pub fn gitflow_is_initialized(&self) -> Result<bool> {
        let result = self.execute(&["config", "--get", "gitflow.branch.master"])?;
        Ok(result.success && !result.stdout.trim().is_empty())
    }

    /// Get current git-flow configuration
    pub fn gitflow_config(&self) -> Result<Option<GitFlowConfig>> {
        if !self.gitflow_is_initialized()? {
            return Ok(None);
        }

        let master = self.execute(&["config", "--get", "gitflow.branch.master"])?;
        let develop = self.execute(&["config", "--get", "gitflow.branch.develop"])?;
        let feature = self.execute(&["config", "--get", "gitflow.prefix.feature"])?;
        let release = self.execute(&["config", "--get", "gitflow.prefix.release"])?;
        let hotfix = self.execute(&["config", "--get", "gitflow.prefix.hotfix"])?;
        let support = self.execute(&["config", "--get", "gitflow.prefix.support"])?;
        let versiontag = self.execute(&["config", "--get", "gitflow.prefix.versiontag"])?;

        Ok(Some(GitFlowConfig {
            master: master.stdout.trim().to_string(),
            develop: develop.stdout.trim().to_string(),
            feature_prefix: feature.stdout.trim().to_string(),
            release_prefix: release.stdout.trim().to_string(),
            hotfix_prefix: hotfix.stdout.trim().to_string(),
            support_prefix: support.stdout.trim().to_string(),
            version_tag_prefix: versiontag.stdout.trim().to_string(),
        }))
    }

    /// Initialize git-flow in the repository
    pub fn gitflow_init(&self, options: &GitFlowInitOptions) -> Result<GitFlowResult> {
        let config = GitFlowConfig {
            master: options.master.clone().unwrap_or_else(|| "main".to_string()),
            develop: options
                .develop
                .clone()
                .unwrap_or_else(|| "develop".to_string()),
            feature_prefix: options
                .feature_prefix
                .clone()
                .unwrap_or_else(|| "feature/".to_string()),
            release_prefix: options
                .release_prefix
                .clone()
                .unwrap_or_else(|| "release/".to_string()),
            hotfix_prefix: options
                .hotfix_prefix
                .clone()
                .unwrap_or_else(|| "hotfix/".to_string()),
            support_prefix: options
                .support_prefix
                .clone()
                .unwrap_or_else(|| "support/".to_string()),
            version_tag_prefix: options.version_tag_prefix.clone().unwrap_or_default(),
        };

        // Set git-flow config values
        self.execute_checked(&["config", "gitflow.branch.master", &config.master])?;
        self.execute_checked(&["config", "gitflow.branch.develop", &config.develop])?;
        self.execute_checked(&["config", "gitflow.prefix.feature", &config.feature_prefix])?;
        self.execute_checked(&["config", "gitflow.prefix.release", &config.release_prefix])?;
        self.execute_checked(&["config", "gitflow.prefix.hotfix", &config.hotfix_prefix])?;
        self.execute_checked(&["config", "gitflow.prefix.support", &config.support_prefix])?;
        self.execute_checked(&[
            "config",
            "gitflow.prefix.versiontag",
            &config.version_tag_prefix,
        ])?;

        // Check if develop branch exists, create it if not
        let branch_exists = self.execute(&["rev-parse", "--verify", &config.develop])?;
        if !branch_exists.success {
            // Create develop branch from master
            let result = self.execute(&["branch", &config.develop, &config.master])?;
            if !result.success {
                return Ok(GitFlowResult {
                    success: false,
                    message: format!("Failed to create develop branch: {}", result.stderr.trim()),
                    branch: None,
                });
            }
        }

        Ok(GitFlowResult {
            success: true,
            message: "Git-flow initialized".to_string(),
            branch: Some(config.develop),
        })
    }

    /// Start a new feature/release/hotfix branch
    pub fn gitflow_start(
        &self,
        branch_type: GitFlowBranchType,
        name: &str,
        base: Option<&str>,
    ) -> Result<GitFlowResult> {
        let config = self
            .gitflow_config()?
            .ok_or_else(|| AxisError::GitError("Git-flow is not initialized".to_string()))?;

        let prefix = match branch_type {
            GitFlowBranchType::Feature => &config.feature_prefix,
            GitFlowBranchType::Release => &config.release_prefix,
            GitFlowBranchType::Hotfix => &config.hotfix_prefix,
            GitFlowBranchType::Support => &config.support_prefix,
        };

        let branch_name = format!("{}{}", prefix, name);
        let base_branch = base
            .map(|s| s.to_string())
            .unwrap_or_else(|| match branch_type {
                GitFlowBranchType::Feature => config.develop.clone(),
                GitFlowBranchType::Release => config.develop.clone(),
                GitFlowBranchType::Hotfix => config.master.clone(),
                GitFlowBranchType::Support => config.master.clone(),
            });

        // Create and checkout the new branch
        let result = self.execute(&["checkout", "-b", &branch_name, &base_branch])?;
        if !result.success {
            return Ok(GitFlowResult {
                success: false,
                message: format!("Failed to create branch: {}", result.stderr.trim()),
                branch: None,
            });
        }

        Ok(GitFlowResult {
            success: true,
            message: format!("Started {} '{}'", branch_type.as_str(), name),
            branch: Some(branch_name),
        })
    }

    /// Finish a feature/release/hotfix branch
    pub fn gitflow_finish(
        &self,
        branch_type: GitFlowBranchType,
        name: &str,
        options: &GitFlowFinishOptions,
    ) -> Result<GitFlowResult> {
        let config = self
            .gitflow_config()?
            .ok_or_else(|| AxisError::GitError("Git-flow is not initialized".to_string()))?;

        let prefix = match branch_type {
            GitFlowBranchType::Feature => &config.feature_prefix,
            GitFlowBranchType::Release => &config.release_prefix,
            GitFlowBranchType::Hotfix => &config.hotfix_prefix,
            GitFlowBranchType::Support => &config.support_prefix,
        };

        let branch_name = format!("{}{}", prefix, name);
        let target_branch = match branch_type {
            GitFlowBranchType::Feature => config.develop.clone(),
            GitFlowBranchType::Release | GitFlowBranchType::Hotfix => config.master.clone(),
            GitFlowBranchType::Support => config.master.clone(),
        };

        // Checkout target branch
        let checkout = self.execute(&["checkout", &target_branch])?;
        if !checkout.success {
            return Ok(GitFlowResult {
                success: false,
                message: format!(
                    "Failed to checkout {}: {}",
                    target_branch,
                    checkout.stderr.trim()
                ),
                branch: None,
            });
        }

        // Merge the branch
        let mut merge_args = vec!["merge"];
        if options.no_ff {
            merge_args.push("--no-ff");
        }
        if options.squash {
            merge_args.push("--squash");
        }
        if let Some(ref msg) = options.message {
            merge_args.push("-m");
            merge_args.push(msg);
        }
        merge_args.push(&branch_name);

        let merge = self.execute(&merge_args)?;
        if !merge.success {
            return Ok(GitFlowResult {
                success: false,
                message: format!("Failed to merge: {}", merge.stderr.trim()),
                branch: None,
            });
        }

        // For release/hotfix, also merge to develop and create tag
        if matches!(
            branch_type,
            GitFlowBranchType::Release | GitFlowBranchType::Hotfix
        ) {
            // Create tag
            let tag_name = format!("{}{}", config.version_tag_prefix, name);
            let mut tag_args = vec!["tag", "-a", &tag_name];
            let tag_msg = options
                .tag_message
                .clone()
                .unwrap_or_else(|| format!("Release {}", name));
            tag_args.push("-m");
            tag_args.push(&tag_msg);

            let tag_result = self.execute(&tag_args)?;
            if !tag_result.success {
                return Ok(GitFlowResult {
                    success: false,
                    message: format!("Failed to create tag: {}", tag_result.stderr.trim()),
                    branch: None,
                });
            }

            // Merge to develop if not already on develop
            if target_branch != config.develop {
                self.execute(&["checkout", &config.develop])?;
                let merge_develop = self.execute(&["merge", "--no-ff", &branch_name])?;
                if !merge_develop.success {
                    return Ok(GitFlowResult {
                        success: false,
                        message: format!(
                            "Failed to merge to develop: {}",
                            merge_develop.stderr.trim()
                        ),
                        branch: None,
                    });
                }
            }
        }

        // Delete the branch unless keep is set
        if !options.keep {
            let delete_flag = if options.force_delete { "-D" } else { "-d" };
            self.execute(&["branch", delete_flag, &branch_name])?;
        }

        Ok(GitFlowResult {
            success: true,
            message: format!("Finished {} '{name}'", branch_type.as_str()),
            branch: Some(target_branch),
        })
    }

    /// Publish a branch to remote
    pub fn gitflow_publish(
        &self,
        branch_type: GitFlowBranchType,
        name: &str,
    ) -> Result<GitFlowResult> {
        let config = self
            .gitflow_config()?
            .ok_or_else(|| AxisError::GitError("Git-flow is not initialized".to_string()))?;

        let prefix = match branch_type {
            GitFlowBranchType::Feature => &config.feature_prefix,
            GitFlowBranchType::Release => &config.release_prefix,
            GitFlowBranchType::Hotfix => &config.hotfix_prefix,
            GitFlowBranchType::Support => &config.support_prefix,
        };

        let branch_name = format!("{}{}", prefix, name);

        let result = self.execute(&["push", "-u", "origin", &branch_name])?;
        if !result.success {
            return Ok(GitFlowResult {
                success: false,
                message: format!("Failed to publish: {}", result.stderr.trim()),
                branch: None,
            });
        }

        Ok(GitFlowResult {
            success: true,
            message: format!("Published {} '{name}' to origin", branch_type.as_str()),
            branch: Some(branch_name),
        })
    }

    /// List branches of a specific type
    pub fn gitflow_list(&self, branch_type: GitFlowBranchType) -> Result<Vec<String>> {
        let config = self
            .gitflow_config()?
            .ok_or_else(|| AxisError::GitError("Git-flow is not initialized".to_string()))?;

        let prefix = match branch_type {
            GitFlowBranchType::Feature => &config.feature_prefix,
            GitFlowBranchType::Release => &config.release_prefix,
            GitFlowBranchType::Hotfix => &config.hotfix_prefix,
            GitFlowBranchType::Support => &config.support_prefix,
        };

        let result = self.execute(&["branch", "--list", &format!("{prefix}*")])?;
        if !result.success {
            return Ok(Vec::new());
        }

        let branches: Vec<String> = result
            .stdout
            .lines()
            .map(|line| line.trim().trim_start_matches("* ").to_string())
            .filter(|name| !name.is_empty())
            .map(|name| name.strip_prefix(prefix).unwrap_or(&name).to_string())
            .collect();

        Ok(branches)
    }

    // ==================== Content Search (grep) ====================

    /// Search for content in the repository
    pub fn grep(&self, options: &GrepOptions) -> Result<GrepResult> {
        let mut args = vec!["grep"];

        if options.ignore_case {
            args.push("-i");
        }
        if options.word_regexp {
            args.push("-w");
        }
        if options.extended_regexp {
            args.push("-E");
        }
        if options.invert_match {
            args.push("-v");
        }
        if options.show_line_numbers {
            args.push("-n");
        }

        let max_count_str;
        if let Some(max) = options.max_count {
            max_count_str = format!("-m{max}");
            args.push(&max_count_str);
        }

        let context_str;
        if let Some(ctx) = options.context_lines {
            context_str = format!("-C{ctx}");
            args.push(&context_str);
        }

        args.push(&options.pattern);

        for path in &options.paths {
            args.push(path);
        }

        let result = self.execute(&args)?;

        // Parse the output
        let mut matches = Vec::new();
        for line in result.stdout.lines() {
            if line.is_empty() {
                continue;
            }

            // Format: path:line_number:content or path:content
            let parts: Vec<&str> = line.splitn(3, ':').collect();
            match parts.len() {
                2 => {
                    matches.push(GrepMatch {
                        path: parts[0].to_string(),
                        line_number: None,
                        content: parts[1].to_string(),
                    });
                }
                3 => {
                    let line_num = parts[1].parse().ok();
                    matches.push(GrepMatch {
                        path: parts[0].to_string(),
                        line_number: line_num,
                        content: parts[2].to_string(),
                    });
                }
                _ => continue,
            }
        }

        let total = matches.len();
        Ok(GrepResult {
            matches,
            total_matches: total,
        })
    }

    /// Search for content in a specific commit or tree
    pub fn grep_commit(&self, commit_oid: &str, options: &GrepOptions) -> Result<GrepResult> {
        let mut args = vec!["grep"];

        if options.ignore_case {
            args.push("-i");
        }
        if options.word_regexp {
            args.push("-w");
        }
        if options.extended_regexp {
            args.push("-E");
        }
        if options.show_line_numbers {
            args.push("-n");
        }

        let max_count_str;
        if let Some(max) = options.max_count {
            max_count_str = format!("-m{max}");
            args.push(&max_count_str);
        }

        args.push(&options.pattern);
        args.push(commit_oid);

        for path in &options.paths {
            args.push("--");
            args.push(path);
        }

        let result = self.execute(&args)?;

        let mut matches = Vec::new();
        for line in result.stdout.lines() {
            if line.is_empty() {
                continue;
            }

            // Format: commit:path:line_number:content
            let parts: Vec<&str> = line.splitn(4, ':').collect();
            if parts.len() >= 3 {
                let line_num = if parts.len() == 4 {
                    parts[2].parse().ok()
                } else {
                    None
                };
                let content = if parts.len() == 4 { parts[3] } else { parts[2] };

                matches.push(GrepMatch {
                    path: parts[1].to_string(),
                    line_number: line_num,
                    content: content.to_string(),
                });
            }
        }

        let total = matches.len();
        Ok(GrepResult {
            matches,
            total_matches: total,
        })
    }

    // ==================== Hunk Staging Operations ====================

    /// Stage a specific hunk from a file using git apply
    /// The patch parameter should be a valid unified diff patch for the hunk
    pub fn stage_hunk(&self, patch: &str) -> Result<()> {
        let mut child = create_command("git")
            .args(["apply", "--cached", "--unidiff-zero", "-"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&self.repo_path)
            .spawn()
            .map_err(AxisError::from)?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(patch.as_bytes()).map_err(AxisError::from)?;
        }

        let output = child.wait_with_output().map_err(AxisError::from)?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AxisError::GitError(format!(
                "Failed to stage hunk: {}",
                stderr.trim()
            )));
        }

        Ok(())
    }

    /// Unstage a specific hunk from the index using git apply -R
    /// The patch parameter should be a valid unified diff patch for the hunk
    pub fn unstage_hunk(&self, patch: &str) -> Result<()> {
        let mut child = create_command("git")
            .args(["apply", "--cached", "--unidiff-zero", "-R", "-"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&self.repo_path)
            .spawn()
            .map_err(AxisError::from)?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(patch.as_bytes()).map_err(AxisError::from)?;
        }

        let output = child.wait_with_output().map_err(AxisError::from)?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AxisError::GitError(format!(
                "Failed to unstage hunk: {}",
                stderr.trim()
            )));
        }

        Ok(())
    }

    /// Discard a specific hunk from the working directory using git apply -R
    /// The patch parameter should be a valid unified diff patch for the hunk
    pub fn discard_hunk(&self, patch: &str) -> Result<()> {
        let mut child = create_command("git")
            .args(["apply", "--unidiff-zero", "-R", "-"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .current_dir(&self.repo_path)
            .spawn()
            .map_err(AxisError::from)?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(patch.as_bytes()).map_err(AxisError::from)?;
        }

        let output = child.wait_with_output().map_err(AxisError::from)?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AxisError::GitError(format!(
                "Failed to discard hunk: {}",
                stderr.trim()
            )));
        }

        Ok(())
    }

    // ==================== Archive Operations ====================

    /// Create an archive from a specific reference (commit, tag, branch)
    /// Supported formats: zip, tar, tar.gz, tar.bz2
    pub fn archive(
        &self,
        reference: &str,
        format: &str,
        output_path: &Path,
        prefix: Option<&str>,
    ) -> Result<ArchiveResult> {
        let mut args = vec!["archive"];

        // Determine format and compression
        let actual_format = match format {
            "zip" => "zip",
            "tar" => "tar",
            "tar.gz" | "tgz" => "tar.gz",
            "tar.bz2" | "tbz2" => "tar.bz2",
            _ => {
                return Err(AxisError::Other(format!(
                    "Unsupported archive format: {}",
                    format
                )))
            }
        };

        args.push("--format");
        match actual_format {
            "zip" => args.push("zip"),
            "tar" | "tar.gz" | "tar.bz2" => args.push("tar"),
            _ => {}
        }

        // Add prefix if specified
        let prefix_arg;
        if let Some(p) = prefix {
            prefix_arg = format!("--prefix={p}");
            args.push(&prefix_arg);
        }

        args.push("-o");
        let output_str = output_path.to_string_lossy();
        args.push(&output_str);

        args.push(reference);

        // For tar.gz and tar.bz2, stream tar output through Rust compressors
        if actual_format == "tar.gz" || actual_format == "tar.bz2" {
            let prefix_arg_tar = prefix.map(|p| format!("--prefix={p}"));
            let mut tar_args = vec!["archive", "--format", "tar"];
            if let Some(ref pa) = prefix_arg_tar {
                tar_args.push(pa);
            }
            tar_args.push(reference);

            let mut child = create_command("git")
                .args(&tar_args)
                .current_dir(&self.repo_path)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(AxisError::from)?;

            let mut stdout = child
                .stdout
                .take()
                .ok_or_else(|| AxisError::Other("Failed to capture git stdout".to_string()))?;
            let mut stderr = child
                .stderr
                .take()
                .ok_or_else(|| AxisError::Other("Failed to capture git stderr".to_string()))?;

            let stderr_handle = std::thread::spawn(move || {
                let mut buffer = String::new();
                let _ = stderr.read_to_string(&mut buffer);
                buffer
            });

            let file = File::create(output_path).map_err(AxisError::from)?;
            if actual_format == "tar.gz" {
                let mut encoder = GzEncoder::new(file, Compression::default());
                std::io::copy(&mut stdout, &mut encoder).map_err(AxisError::from)?;
                encoder.finish().map_err(AxisError::from)?;
            } else {
                let mut encoder = BzEncoder::new(file, bzip2::Compression::default());
                std::io::copy(&mut stdout, &mut encoder).map_err(AxisError::from)?;
                encoder.finish().map_err(AxisError::from)?;
            }

            let status = child.wait().map_err(AxisError::from)?;
            let stderr = stderr_handle.join().unwrap_or_default();
            if !status.success() {
                return Err(AxisError::GitError(format!(
                    "Failed to create archive: {}",
                    stderr.trim()
                )));
            }
        } else {
            let result = self.execute(&args)?;
            if !result.success {
                return Err(AxisError::GitError(format!(
                    "Failed to create archive: {}",
                    result.stderr.trim()
                )));
            }
        }

        // Get file size
        let size_bytes = std::fs::metadata(output_path).ok().map(|m| m.len());

        Ok(ArchiveResult {
            message: "Archive created successfully".to_string(),
            output_path: Some(output_path.to_string_lossy().to_string()),
            size_bytes,
        })
    }

    // ==================== Patch Operations ====================

    /// Create patch files from commits using git format-patch
    /// range can be: commit..commit, -n (last n commits), branch, etc.
    pub fn format_patch(&self, range: &str, output_dir: &Path) -> Result<PatchResult> {
        // Ensure output directory exists
        if !output_dir.exists() {
            std::fs::create_dir_all(output_dir).map_err(AxisError::from)?;
        }

        let output_str = output_dir.to_string_lossy();
        let args = vec!["format-patch", "-o", &output_str, range];

        let result = self.execute(&args)?;

        if !result.success {
            return Err(AxisError::GitError(format!(
                "Failed to create patches: {}",
                result.stderr.trim()
            )));
        }

        // Parse output to get created patch files
        let patches: Vec<String> = result
            .stdout
            .lines()
            .filter(|line| !line.is_empty())
            .map(|line| line.to_string())
            .collect();

        Ok(PatchResult {
            message: format!("Created {} patch file(s)", patches.len()),
            patches,
        })
    }

    /// Create a single patch from staged changes or specific commit
    pub fn create_patch_from_diff(
        &self,
        commit_oid: Option<&str>,
        output_path: &Path,
    ) -> Result<PatchResult> {
        let args = match commit_oid {
            Some(oid) => vec!["format-patch", "-1", "--stdout", oid],
            None => vec!["diff", "--cached"],
        };

        let result = self.execute(&args)?;

        if !result.success {
            return Err(AxisError::GitError(format!(
                "Failed to create patch: {}",
                result.stderr.trim()
            )));
        }

        if result.stdout.trim().is_empty() {
            return Err(AxisError::Other(
                "No changes to create patch from".to_string(),
            ));
        }

        // Write patch to file
        std::fs::write(output_path, &result.stdout).map_err(AxisError::from)?;

        Ok(PatchResult {
            message: "Patch created successfully".to_string(),
            patches: vec![output_path.to_string_lossy().to_string()],
        })
    }

    /// Apply a patch file using git apply
    pub fn apply_patch(
        &self,
        patch_path: &Path,
        check_only: bool,
        three_way: bool,
    ) -> Result<PatchResult> {
        let mut args = vec!["apply"];

        if check_only {
            args.push("--check");
        }

        if three_way {
            args.push("--3way");
        }

        let path_str = patch_path.to_string_lossy();
        args.push(&path_str);

        let result = self.execute(&args)?;

        if !result.success {
            return Err(AxisError::GitError(format!(
                "Failed to apply patch: {}",
                result.stderr.trim()
            )));
        }

        Ok(PatchResult {
            message: if check_only {
                "Patch can be applied cleanly".to_string()
            } else {
                "Patch applied successfully".to_string()
            },
            patches: vec![patch_path.to_string_lossy().to_string()],
        })
    }

    /// Apply patches using git am (mailbox format, creates commits)
    pub fn apply_mailbox(
        &self,
        patch_paths: &[std::path::PathBuf],
        three_way: bool,
    ) -> Result<PatchResult> {
        let mut args = vec!["am"];

        if three_way {
            args.push("--3way");
        }

        let path_strs: Vec<String> = patch_paths
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect();

        for path_str in &path_strs {
            args.push(path_str);
        }

        let result = self.execute(&args)?;

        if !result.success {
            return Err(AxisError::GitError(format!(
                "Failed to apply patches: {}",
                result.stderr.trim()
            )));
        }

        Ok(PatchResult {
            message: format!("Applied {} patch(es) successfully", patch_paths.len()),
            patches: path_strs,
        })
    }

    /// Abort an in-progress git am session
    pub fn am_abort(&self) -> Result<PatchResult> {
        let result = self.execute(&["am", "--abort"])?;

        if result.success {
            Ok(PatchResult {
                message: "Patch application aborted".to_string(),
                patches: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(format!(
                "Failed to abort patch application: {}",
                result.stderr.trim()
            )))
        }
    }

    /// Continue git am after resolving conflicts
    pub fn am_continue(&self) -> Result<PatchResult> {
        let result = self.execute(&["am", "--continue"])?;

        if result.success {
            Ok(PatchResult {
                message: "Patch application continued".to_string(),
                patches: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(format!(
                "Failed to continue patch application: {}",
                result.stderr.trim()
            )))
        }
    }

    /// Skip the current patch in git am
    pub fn am_skip(&self) -> Result<PatchResult> {
        let result = self.execute(&["am", "--skip"])?;

        if result.success {
            Ok(PatchResult {
                message: "Patch skipped".to_string(),
                patches: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(format!(
                "Failed to skip current patch: {}",
                result.stderr.trim()
            )))
        }
    }

    // ==================== Bisect Operations ====================

    /// Check if we're in a bisect state
    pub fn is_bisecting(&self) -> Result<bool> {
        let bisect_start = self.repo_path.join(".git/BISECT_START");
        Ok(bisect_start.exists())
    }

    /// Start a bisect session
    pub fn bisect_start(&self, bad: Option<&str>, good: &str) -> Result<GitCommandResult> {
        let mut args = vec!["bisect", "start"];

        // git bisect start <bad> <good> - first arg is bad, second is good
        // If bad is not provided, use HEAD as the bad commit
        let bad_commit = bad.unwrap_or("HEAD");
        args.push(bad_commit);
        args.push(good);

        self.execute(&args)
    }

    /// Mark the current commit as good
    pub fn bisect_good(&self, commit: Option<&str>) -> Result<GitCommandResult> {
        let mut args = vec!["bisect", "good"];
        if let Some(c) = commit {
            args.push(c);
        }
        self.execute(&args)
    }

    /// Mark the current commit as bad
    pub fn bisect_bad(&self, commit: Option<&str>) -> Result<GitCommandResult> {
        let mut args = vec!["bisect", "bad"];
        if let Some(c) = commit {
            args.push(c);
        }
        self.execute(&args)
    }

    /// Skip the current commit (cannot be tested)
    pub fn bisect_skip(&self, commit: Option<&str>) -> Result<GitCommandResult> {
        let mut args = vec!["bisect", "skip"];
        if let Some(c) = commit {
            args.push(c);
        }
        self.execute(&args)
    }

    /// Reset/abort the bisect session
    pub fn bisect_reset(&self, commit: Option<&str>) -> Result<GitCommandResult> {
        let mut args = vec!["bisect", "reset"];
        if let Some(c) = commit {
            args.push(c);
        }
        self.execute_checked(&args)
    }

    /// Get the bisect log
    pub fn bisect_log(&self) -> Result<GitCommandResult> {
        self.execute(&["bisect", "log"])
    }

    /// Get visualize data for bisect (commits remaining to test)
    pub fn bisect_visualize(&self) -> Result<GitCommandResult> {
        self.execute(&["bisect", "visualize", "--oneline"])
    }

    /// Parse bisect state from git files
    pub fn get_bisect_state(&self) -> Result<BisectState> {
        let is_active = self.is_bisecting()?;

        if !is_active {
            return Ok(BisectState {
                is_active: false,
                current_commit: None,
                steps_remaining: None,
                total_commits: None,
                bad_commit: None,
                good_commits: Vec::new(),
                skipped_commits: Vec::new(),
                first_bad_commit: None,
            });
        }

        // Read BISECT_START for the bad commit
        let bad_commit = std::fs::read_to_string(self.repo_path.join(".git/BISECT_START"))
            .ok()
            .map(|s| s.trim().to_string());

        // Parse good commits from refs/bisect/good-*
        let bisect_refs_path = self.repo_path.join(".git/refs/bisect");
        let mut good_commits = Vec::new();
        let mut skipped_commits = Vec::new();

        if bisect_refs_path.exists() {
            if let Ok(entries) = std::fs::read_dir(&bisect_refs_path) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.starts_with("good-") {
                        if let Ok(oid) = std::fs::read_to_string(entry.path()) {
                            good_commits.push(oid.trim().to_string());
                        }
                    } else if name.starts_with("skip-") {
                        if let Ok(oid) = std::fs::read_to_string(entry.path()) {
                            skipped_commits.push(oid.trim().to_string());
                        }
                    }
                }
            }
        }

        // Get current HEAD
        let head_result = self.execute(&["rev-parse", "HEAD"])?;
        let current_commit = if head_result.success {
            Some(head_result.stdout.trim().to_string())
        } else {
            None
        };

        // Estimate steps remaining using bisect visualize
        let viz_result = self.bisect_visualize()?;
        let (steps_remaining, total_commits) = if viz_result.success {
            let count = viz_result.stdout.lines().count();
            let steps = if count > 0 {
                Some((count as f64).log2().ceil() as usize)
            } else {
                Some(0)
            };
            (steps, Some(count))
        } else {
            (None, None)
        };

        Ok(BisectState {
            is_active,
            current_commit,
            steps_remaining,
            total_commits,
            bad_commit,
            good_commits,
            skipped_commits,
            first_bad_commit: None,
        })
    }

    // ==================== Worktree Operations ====================

    /// List all worktrees
    pub fn worktree_list(&self) -> Result<Vec<Worktree>> {
        // Use --porcelain for machine-readable output
        let result = self.execute(&["worktree", "list", "--porcelain"])?;

        if !result.success {
            return Err(AxisError::GitError(format!(
                "Failed to list worktrees: {}",
                result.stderr.trim()
            )));
        }

        let mut worktrees = Vec::new();
        let mut current_path: Option<String> = None;
        let mut head_oid: Option<String> = None;
        let mut branch: Option<String> = None;
        let mut is_locked = false;
        let mut lock_reason: Option<String> = None;
        let mut is_bare = false;
        let mut is_prunable = false;

        // Parse porcelain output format:
        // worktree /path/to/worktree
        // HEAD abc123...
        // branch refs/heads/main
        // (blank line between entries)
        for line in result.stdout.lines() {
            if line.starts_with("worktree ") {
                // Save previous worktree if any
                if let Some(path) = current_path.take() {
                    let oid = head_oid.take().unwrap_or_default();
                    worktrees.push(Worktree {
                        path,
                        branch: branch.take(),
                        head_oid: oid.clone(),
                        short_oid: oid.chars().take(7).collect(),
                        is_locked,
                        lock_reason: lock_reason.take(),
                        is_main: is_bare || worktrees.is_empty(),
                        is_prunable,
                    });
                    is_locked = false;
                    is_bare = false;
                    is_prunable = false;
                }
                current_path = Some(line.trim_start_matches("worktree ").to_string());
            } else if line.starts_with("HEAD ") {
                head_oid = Some(line.trim_start_matches("HEAD ").to_string());
            } else if line.starts_with("branch ") {
                // refs/heads/main -> main
                let full_ref = line.trim_start_matches("branch ");
                branch = Some(full_ref.trim_start_matches("refs/heads/").to_string());
            } else if line == "bare" {
                is_bare = true;
            } else if line.starts_with("locked") {
                is_locked = true;
                // Lock reason may follow after space
                let rest = line.trim_start_matches("locked").trim();
                if !rest.is_empty() {
                    lock_reason = Some(rest.to_string());
                }
            } else if line == "prunable" {
                is_prunable = true;
            }
            // "detached" line is implicit when branch is None
        }

        // Don't forget the last entry
        if let Some(path) = current_path.take() {
            let oid = head_oid.take().unwrap_or_default();
            worktrees.push(Worktree {
                path,
                branch: branch.take(),
                head_oid: oid.clone(),
                short_oid: oid.chars().take(7).collect(),
                is_locked,
                lock_reason: lock_reason.take(),
                is_main: is_bare || worktrees.is_empty(),
                is_prunable,
            });
        }

        // Mark first entry as main worktree if not already marked
        let has_main = worktrees.iter().any(|w| w.is_main);
        if !has_main {
            if let Some(first) = worktrees.first_mut() {
                first.is_main = true;
            }
        }

        Ok(worktrees)
    }

    /// Add a new worktree
    pub fn worktree_add(&self, options: &AddWorktreeOptions) -> Result<WorktreeResult> {
        let mut args = vec!["worktree", "add"];

        if options.force {
            args.push("--force");
        }

        if options.detach {
            args.push("--detach");
            args.push(&options.path);
            if let Some(ref base) = options.base {
                args.push(base);
            }
        } else if options.create_branch {
            args.push("-b");
            if let Some(ref branch_name) = options.branch {
                args.push(branch_name);
            } else {
                return Err(AxisError::Other(
                    "Branch name required when creating new branch".to_string(),
                ));
            }
            args.push(&options.path);
            if let Some(ref base) = options.base {
                args.push(base);
            }
        } else {
            // Checkout existing branch
            args.push(&options.path);
            if let Some(ref branch_name) = options.branch {
                args.push(branch_name);
            }
        }

        let result = self.execute(&args)?;

        if result.success {
            Ok(WorktreeResult {
                success: true,
                message: format!("Worktree created at {}", options.path),
                path: Some(options.path.clone()),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Remove a worktree
    pub fn worktree_remove(&self, options: &RemoveWorktreeOptions) -> Result<WorktreeResult> {
        let mut args = vec!["worktree", "remove"];

        if options.force {
            args.push("--force");
        }

        args.push(&options.path);

        let result = self.execute(&args)?;

        if result.success {
            Ok(WorktreeResult {
                success: true,
                message: format!("Worktree removed: {}", options.path),
                path: Some(options.path.clone()),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Lock a worktree to prevent deletion
    pub fn worktree_lock(&self, path: &str, reason: Option<&str>) -> Result<WorktreeResult> {
        let mut args = vec!["worktree", "lock"];

        let reason_owned: String;
        if let Some(r) = reason {
            args.push("--reason");
            reason_owned = r.to_string();
            args.push(&reason_owned);
        }

        args.push(path);

        let result = self.execute(&args)?;

        if result.success {
            Ok(WorktreeResult {
                success: true,
                message: format!("Worktree locked: {path}"),
                path: Some(path.to_string()),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Unlock a worktree
    pub fn worktree_unlock(&self, path: &str) -> Result<WorktreeResult> {
        let result = self.execute(&["worktree", "unlock", path])?;

        if result.success {
            Ok(WorktreeResult {
                success: true,
                message: format!("Worktree unlocked: {path}"),
                path: Some(path.to_string()),
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    /// Prune stale worktree references
    pub fn worktree_prune(&self, dry_run: bool) -> Result<WorktreeResult> {
        let mut args = vec!["worktree", "prune", "-v"];

        if dry_run {
            args.push("--dry-run");
        }

        let result = self.execute(&args)?;

        if result.success {
            let pruned_count = result.stderr.lines().count();
            Ok(WorktreeResult {
                success: true,
                message: if dry_run {
                    format!("Would prune {pruned_count} stale worktree(s)")
                } else {
                    format!("Pruned {pruned_count} stale worktree(s)")
                },
                path: None,
            })
        } else {
            Err(AxisError::GitError(result.stderr.trim().to_string()))
        }
    }

    // ==================== Git LFS Operations ====================

    /// Check if git-lfs is installed on the system
    pub fn lfs_check_installed() -> Result<(bool, Option<String>)> {
        let output = create_command("git")
            .args(["lfs", "version"])
            .output()
            .map_err(AxisError::from)?;

        if output.status.success() {
            let version_str = String::from_utf8_lossy(&output.stdout);
            // Parse version from "git-lfs/3.4.0 (GitHub; darwin arm64; go 1.21.3)"
            let version = version_str
                .split('/')
                .nth(1)
                .and_then(|s| s.split_whitespace().next())
                .map(|s| s.to_string());
            Ok((true, version))
        } else {
            Ok((false, None))
        }
    }

    /// Get Git environment information including versions and paths
    pub fn get_git_environment() -> Result<GitEnvironment> {
        // Get Git CLI version and path
        let (git_version, git_path) = Self::get_git_version_and_path()?;

        // Get libgit2 version using libgit2_version() method
        let libgit2_version = git2::Version::get();
        let (major, minor, rev) = libgit2_version.libgit2_version();
        let libgit2_version_str = format!("{major}.{minor}.{rev}");

        // Get LFS info
        let (lfs_installed, lfs_version) = Self::lfs_check_installed()?;

        Ok(GitEnvironment {
            git_version,
            git_path,
            libgit2_version: libgit2_version_str,
            lfs_installed,
            lfs_version,
        })
    }

    /// Get Git CLI version and path
    fn get_git_version_and_path() -> Result<(Option<String>, Option<String>)> {
        // Get git version
        let version_output = create_command("git")
            .args(["--version"])
            .output()
            .map_err(AxisError::from)?;

        let version = if version_output.status.success() {
            let version_str = String::from_utf8_lossy(&version_output.stdout);
            // Parse from "git version 2.43.0"
            version_str
                .trim()
                .strip_prefix("git version ")
                .map(|s| s.split_whitespace().next().unwrap_or(s).to_string())
        } else {
            None
        };

        // Get git path - cross-platform
        let path_cmd = if cfg!(target_os = "windows") {
            "where"
        } else {
            "which"
        };

        let path_output = create_command(path_cmd)
            .args(["git"])
            .output()
            .map_err(AxisError::from)?;

        let path = if path_output.status.success() {
            let path_str = String::from_utf8_lossy(&path_output.stdout);
            Some(path_str.lines().next().unwrap_or("").trim().to_string())
        } else {
            None
        };

        Ok((version, path))
    }

    /// Get comprehensive LFS status for the repository
    pub fn lfs_status(&self) -> Result<LfsStatus> {
        let (is_installed, version) = Self::lfs_check_installed()?;

        if !is_installed {
            return Ok(LfsStatus {
                is_installed: false,
                version: None,
                is_initialized: false,
                tracked_patterns_count: 0,
                lfs_files_count: 0,
            });
        }

        // Check if LFS is initialized (check for .git/lfs directory)
        let lfs_dir = self.repo_path.join(".git").join("lfs");
        let is_initialized = lfs_dir.exists();

        // Count tracked patterns
        let patterns = self.lfs_list_tracked_patterns().unwrap_or_default();
        let tracked_patterns_count = patterns.len();

        // Count LFS files
        let files = self.lfs_list_files().unwrap_or_default();
        let lfs_files_count = files.len();

        Ok(LfsStatus {
            is_installed: true,
            version,
            is_initialized,
            tracked_patterns_count,
            lfs_files_count,
        })
    }

    /// Initialize LFS in the repository
    pub fn lfs_install(&self) -> Result<LfsResult> {
        let result = self.execute(&["lfs", "install"])?;

        if result.success {
            Ok(LfsResult {
                success: true,
                message: "Git LFS initialized successfully".to_string(),
                affected_files: Vec::new(),
            })
        } else {
            Err(AxisError::GitError(format!(
                "Failed to initialize LFS: {}",
                result.stderr.trim()
            )))
        }
    }

    /// Track a pattern with LFS
    pub fn lfs_track(&self, pattern: &str) -> Result<LfsResult> {
        let result = self.execute(&["lfs", "track", pattern])?;

        if result.success {
            Ok(LfsResult {
                success: true,
                message: format!("Tracking pattern: {pattern}"),
                affected_files: vec![".gitattributes".to_string()],
            })
        } else {
            Err(AxisError::GitError(format!(
                "Failed to track pattern: {}",
                result.stderr.trim()
            )))
        }
    }

    /// Untrack a pattern from LFS
    pub fn lfs_untrack(&self, pattern: &str) -> Result<LfsResult> {
        let result = self.execute(&["lfs", "untrack", pattern])?;

        if result.success {
            Ok(LfsResult {
                success: true,
                message: format!("Untracked pattern: {pattern}"),
                affected_files: vec![".gitattributes".to_string()],
            })
        } else {
            Err(AxisError::GitError(format!(
                "Failed to untrack pattern: {}",
                result.stderr.trim()
            )))
        }
    }

    /// List all tracked patterns
    pub fn lfs_list_tracked_patterns(&self) -> Result<Vec<LfsTrackedPattern>> {
        let result = self.execute(&["lfs", "track"])?;

        if !result.success {
            return Ok(Vec::new());
        }

        let mut patterns = Vec::new();
        let mut current_source = String::new();

        for line in result.stdout.lines() {
            let line = line.trim();

            // Lines like "Listing tracked patterns" or empty lines
            if line.is_empty() || line.starts_with("Listing") {
                continue;
            }

            // Source file lines like "    (default): .gitattributes"
            if line.contains(".gitattributes") || line.contains("(") {
                current_source = if line.contains(".gitattributes") {
                    ".gitattributes".to_string()
                } else {
                    line.trim().to_string()
                };
                continue;
            }

            // Pattern lines like "    *.psd"
            if !line.is_empty() {
                patterns.push(LfsTrackedPattern {
                    pattern: line.to_string(),
                    source_file: current_source.clone(),
                });
            }
        }

        Ok(patterns)
    }

    /// List all LFS files in the repository
    pub fn lfs_list_files(&self) -> Result<Vec<LfsFile>> {
        // Use --long format to get OID and size
        let result = self.execute(&["lfs", "ls-files", "--long", "--size"])?;

        if !result.success {
            return Ok(Vec::new());
        }

        let mut files = Vec::new();

        for line in result.stdout.lines() {
            // Format: "oid - path" or "oid * path" (* means downloaded, - means pointer)
            // With --size: "oid - path (size)"
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.splitn(3, |c| c == '-' || c == '*').collect();
            if parts.len() >= 2 {
                let oid = parts[0].trim().to_string();
                let is_downloaded = line.contains(" * ");

                let path_and_size = parts.last().unwrap_or(&"").trim();
                let (path, size) = if path_and_size.ends_with(')') {
                    // Has size info
                    if let Some(paren_pos) = path_and_size.rfind('(') {
                        let path = path_and_size[..paren_pos].trim();
                        let size_str = &path_and_size[paren_pos + 1..path_and_size.len() - 1];
                        let size = Self::parse_size(size_str);
                        (path.to_string(), size)
                    } else {
                        (path_and_size.to_string(), 0)
                    }
                } else {
                    (path_and_size.to_string(), 0)
                };

                files.push(LfsFile {
                    path,
                    oid,
                    size,
                    is_downloaded,
                    status: if is_downloaded {
                        LfsFileStatus::Downloaded
                    } else {
                        LfsFileStatus::Pointer
                    },
                });
            }
        }

        Ok(files)
    }

    /// Parse size string like "1.5 MB" to bytes
    fn parse_size(size_str: &str) -> u64 {
        let parts: Vec<&str> = size_str.split_whitespace().collect();
        if parts.len() != 2 {
            return 0;
        }

        let value: f64 = parts[0].parse().unwrap_or(0.0);
        let multiplier: u64 = match parts[1].to_uppercase().as_str() {
            "B" => 1,
            "KB" => 1024,
            "MB" => 1024 * 1024,
            "GB" => 1024 * 1024 * 1024,
            "TB" => 1024_u64 * 1024 * 1024 * 1024,
            _ => 1,
        };

        (value * multiplier as f64) as u64
    }

    /// Fetch LFS objects from remote
    pub fn lfs_fetch(&self, options: &LfsFetchOptions) -> Result<LfsResult> {
        let mut args = vec!["lfs", "fetch"];

        if options.all {
            args.push("--all");
        }

        if options.recent {
            args.push("--recent");
        }

        let remote_owned: String;
        if let Some(ref remote) = options.remote {
            remote_owned = remote.clone();
            args.push(&remote_owned);
        }

        let result = self.execute(&args)?;

        Ok(LfsResult {
            success: result.success,
            message: if result.success {
                "LFS objects fetched successfully".to_string()
            } else {
                format!("LFS fetch failed: {}", result.stderr.trim())
            },
            affected_files: Vec::new(),
        })
    }

    /// Pull LFS objects (fetch + checkout)
    pub fn lfs_pull(&self, options: &LfsPullOptions) -> Result<LfsResult> {
        let mut args = vec!["lfs", "pull"];

        let remote_owned: String;
        if let Some(ref remote) = options.remote {
            remote_owned = remote.clone();
            args.push(&remote_owned);
        }

        let result = self.execute(&args)?;

        Ok(LfsResult {
            success: result.success,
            message: if result.success {
                "LFS objects pulled successfully".to_string()
            } else {
                format!("LFS pull failed: {}", result.stderr.trim())
            },
            affected_files: Vec::new(),
        })
    }

    /// Push LFS objects to remote
    pub fn lfs_push(&self, options: &LfsPushOptions) -> Result<LfsResult> {
        let mut args = vec!["lfs", "push"];

        if options.all {
            args.push("--all");
        }

        if options.dry_run {
            args.push("--dry-run");
        }

        let remote_owned: String;
        if let Some(ref remote) = options.remote {
            remote_owned = remote.clone();
            args.push(&remote_owned);
        } else {
            args.push("origin");
        }

        // Need to specify the branch
        args.push("HEAD");

        let result = self.execute(&args)?;

        Ok(LfsResult {
            success: result.success,
            message: if result.success {
                if options.dry_run {
                    "LFS push dry run completed".to_string()
                } else {
                    "LFS objects pushed successfully".to_string()
                }
            } else {
                format!("LFS push failed: {}", result.stderr.trim())
            },
            affected_files: Vec::new(),
        })
    }

    /// Migrate files to/from LFS
    pub fn lfs_migrate(&self, options: &LfsMigrateOptions) -> Result<LfsResult> {
        let mut args = vec!["lfs", "migrate"];

        match options.mode {
            LfsMigrateMode::Import => args.push("import"),
            LfsMigrateMode::Export => args.push("export"),
            LfsMigrateMode::Info => args.push("info"),
        }

        if options.everything {
            args.push("--everything");
        }

        // Build include patterns
        let include_patterns: Vec<String> = options
            .include
            .iter()
            .map(|p| format!("--include={p}"))
            .collect();
        for pattern in &include_patterns {
            args.push(pattern);
        }

        // Build exclude patterns
        let exclude_patterns: Vec<String> = options
            .exclude
            .iter()
            .map(|p| format!("--exclude={p}"))
            .collect();
        for pattern in &exclude_patterns {
            args.push(pattern);
        }

        // Size threshold
        let above_str: String;
        if let Some(above) = options.above {
            above_str = format!("--above={above}b");
            args.push(&above_str);
        }

        let result = self.execute(&args)?;

        Ok(LfsResult {
            success: result.success,
            message: if result.success {
                match options.mode {
                    LfsMigrateMode::Import => "Files migrated to LFS".to_string(),
                    LfsMigrateMode::Export => "Files migrated from LFS".to_string(),
                    LfsMigrateMode::Info => result.stdout.clone(),
                }
            } else {
                format!("LFS migrate failed: {}", result.stderr.trim())
            },
            affected_files: Vec::new(),
        })
    }

    /// Get LFS environment information
    pub fn lfs_env(&self) -> Result<LfsEnvironment> {
        let result = self.execute(&["lfs", "env"])?;

        if !result.success {
            return Err(AxisError::GitError(
                "Failed to get LFS environment".to_string(),
            ));
        }

        let (_, version) = Self::lfs_check_installed()?;

        let mut endpoint = None;
        let mut storage_path = None;
        let mut uses_ssh = false;

        for line in result.stdout.lines() {
            if line.contains("Endpoint=") {
                endpoint = line.split('=').nth(1).map(|s| s.trim().to_string());
                uses_ssh = line.contains("ssh://");
            }
            if line.contains("LocalMediaDir=") {
                storage_path = line.split('=').nth(1).map(|s| s.trim().to_string());
            }
        }

        Ok(LfsEnvironment {
            version: version.unwrap_or_default(),
            endpoint,
            storage_path,
            uses_ssh,
        })
    }

    /// Check if a file is an LFS pointer
    pub fn lfs_is_pointer(&self, path: &str) -> Result<bool> {
        let result = self.execute(&["lfs", "pointer", "--check", "--file", path])?;
        Ok(result.success)
    }

    /// Prune old LFS objects
    pub fn lfs_prune(&self, options: &LfsPruneOptions) -> Result<LfsPruneResult> {
        let mut args = vec!["lfs", "prune"];

        if options.dry_run {
            args.push("--dry-run");
        }

        if options.verify_remote {
            args.push("--verify-remote");
        }

        let result = self.execute(&args)?;

        // Parse output to extract counts
        let mut objects_pruned = 0;
        let mut space_reclaimed = 0u64;

        for line in result.stdout.lines() {
            // Parse lines like "prune: 5 local objects, 10.5 MB"
            if line.contains("local objects") {
                if let Some(count_str) = line.split_whitespace().nth(1) {
                    objects_pruned = count_str.parse().unwrap_or(0);
                }
                // Try to extract size
                if let Some(size_part) = line.split(',').nth(1) {
                    space_reclaimed = Self::parse_size(size_part.trim());
                }
            }
        }

        Ok(LfsPruneResult {
            success: result.success,
            message: if options.dry_run {
                format!(
                    "Would prune {objects_pruned} objects, reclaiming {} bytes",
                    space_reclaimed
                )
            } else if result.success {
                format!(
                    "Pruned {objects_pruned} objects, reclaimed {} bytes",
                    space_reclaimed
                )
            } else {
                format!("LFS prune failed: {}", result.stderr.trim())
            },
            objects_pruned,
            space_reclaimed,
        })
    }
}

impl From<Output> for GitCommandResult {
    fn from(output: Output) -> Self {
        GitCommandResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConflictVersion {
    Ours,
    Theirs,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::process::Command;
    use tempfile::TempDir;

    fn setup_test_repo() -> (TempDir, GitCliService) {
        let tmp = TempDir::new().expect("should create temp directory");

        // Initialize git repo using CLI
        Command::new("git")
            .args(["init"])
            .current_dir(tmp.path())
            .output()
            .expect("should initialize git repo");

        // Configure user for commits
        Command::new("git")
            .args(["config", "user.email", "test@example.com"])
            .current_dir(tmp.path())
            .output()
            .expect("should configure git user email");

        Command::new("git")
            .args(["config", "user.name", "Test User"])
            .current_dir(tmp.path())
            .output()
            .expect("should configure git user name");

        let service = GitCliService::new(tmp.path());
        (tmp, service)
    }

    fn create_initial_commit(tmp: &TempDir) {
        fs::write(tmp.path().join("README.md"), "# Test").expect("should write README.md");

        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .expect("should add files to staging");

        Command::new("git")
            .args(["commit", "-m", "Initial commit"])
            .current_dir(tmp.path())
            .output()
            .expect("should create initial commit");
    }

    fn create_branch(tmp: &TempDir, name: &str) {
        Command::new("git")
            .args(["branch", name])
            .current_dir(tmp.path())
            .output()
            .expect("should create branch");
    }

    fn checkout_branch(tmp: &TempDir, name: &str) {
        let output = Command::new("git")
            .args(["checkout", name])
            .current_dir(tmp.path())
            .output()
            .expect("should execute git checkout");
        assert!(
            output.status.success(),
            "checkout failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    fn get_default_branch(tmp: &TempDir) -> String {
        let output = Command::new("git")
            .args(["branch", "--show-current"])
            .current_dir(tmp.path())
            .output()
            .expect("should get current branch name");
        String::from_utf8_lossy(&output.stdout).trim().to_string()
    }

    fn add_commit(tmp: &TempDir, filename: &str, content: &str, message: &str) {
        fs::write(tmp.path().join(filename), content).expect("should write file");

        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .expect("should add files to staging");

        Command::new("git")
            .args(["commit", "-m", message])
            .current_dir(tmp.path())
            .output()
            .expect("should create commit");
    }

    #[test]
    fn test_merge_fast_forward() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Get the default branch name
        let default_branch = get_default_branch(&tmp);

        // Create and checkout feature branch
        create_branch(&tmp, "feature");
        checkout_branch(&tmp, "feature");
        add_commit(&tmp, "feature.txt", "feature content", "Add feature");

        // Go back to default branch and merge
        checkout_branch(&tmp, &default_branch);
        let result = service
            .merge("feature", None, false, false, false, false)
            .expect("should merge feature branch");

        assert!(result.success);
    }

    #[test]
    fn test_merge_no_ff() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Get the default branch name
        let default_branch = get_default_branch(&tmp);

        create_branch(&tmp, "feature");
        checkout_branch(&tmp, "feature");
        add_commit(&tmp, "feature.txt", "feature content", "Add feature");

        checkout_branch(&tmp, &default_branch);
        let result = service
            .merge(
                "feature",
                Some("Merge feature branch"),
                true,
                false,
                false,
                false,
            )
            .expect("should merge with no-ff");

        assert!(result.success);
    }

    #[test]
    fn test_cherry_pick() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Get the default branch name
        let default_branch = get_default_branch(&tmp);

        // Create a commit on a feature branch
        create_branch(&tmp, "feature");
        checkout_branch(&tmp, "feature");
        add_commit(&tmp, "feature.txt", "feature content", "Add feature");

        // Get the commit hash
        let output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(tmp.path())
            .output()
            .expect("should get HEAD commit hash");
        let commit_hash = String::from_utf8_lossy(&output.stdout).trim().to_string();

        // Go back to default branch and cherry-pick
        checkout_branch(&tmp, &default_branch);
        let result = service
            .cherry_pick(&commit_hash, false)
            .expect("should cherry-pick commit");

        assert!(
            result.success,
            "cherry-pick failed: stdout={}, stderr={}",
            result.stdout, result.stderr
        );
        assert!(tmp.path().join("feature.txt").exists());
    }

    #[test]
    fn test_rebase() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Get the default branch name
        let default_branch = get_default_branch(&tmp);

        // Create feature branch from initial commit
        create_branch(&tmp, "feature");

        // Add commit to default branch
        add_commit(&tmp, "main.txt", "main content", "Main commit");

        // Checkout feature and add commit
        checkout_branch(&tmp, "feature");
        add_commit(&tmp, "feature.txt", "feature content", "Feature commit");

        // Rebase feature onto default branch
        let result = service
            .rebase(&default_branch, false)
            .expect("should rebase onto default branch");

        assert!(
            result.success,
            "rebase failed: stdout={}, stderr={}",
            result.stdout, result.stderr
        );
    }

    #[test]
    fn test_is_merging() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Initially not merging
        assert!(!service.is_merging().expect("should check if merging"));
    }

    #[test]
    fn test_is_rebasing() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Initially not rebasing
        assert!(!service.is_rebasing().expect("should check if rebasing"));
    }

    #[test]
    fn test_get_operation_in_progress() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // No operation in progress
        let op = service
            .get_operation_in_progress()
            .expect("should get operation in progress");
        assert!(op.is_none());
    }

    #[test]
    fn test_reset_soft() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "file.txt", "content", "Second commit");

        let result = service
            .reset("HEAD~1", ResetMode::Soft)
            .expect("should reset soft");

        assert!(result.success);
        // File should still exist and be staged
        assert!(tmp.path().join("file.txt").exists());
    }

    #[test]
    fn test_reset_hard() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "file.txt", "content", "Second commit");

        let result = service
            .reset("HEAD~1", ResetMode::Hard)
            .expect("should reset hard");

        assert!(result.success);
        // File should be gone
        assert!(!tmp.path().join("file.txt").exists());
    }

    #[test]
    fn test_revert() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "file.txt", "content", "Add file");

        // Get current HEAD
        let output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(tmp.path())
            .output()
            .expect("should get HEAD commit hash");
        let commit_hash = String::from_utf8_lossy(&output.stdout).trim().to_string();

        let result = service
            .revert(&commit_hash, false)
            .expect("should revert commit");

        assert!(result.success);
        // File should be removed by revert
        assert!(!tmp.path().join("file.txt").exists());
    }

    // ==================== Stash Tests ====================

    #[test]
    fn test_stash_list_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let stashes = service.stash_list().expect("should list stashes");
        assert!(stashes.is_empty());
    }

    #[test]
    fn test_stash_save_and_list() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create an uncommitted change
        fs::write(tmp.path().join("uncommitted.txt"), "uncommitted content")
            .expect("should write uncommitted.txt");
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .expect("should add files to staging");

        // Stash the changes
        let _ = service
            .stash_save(&StashSaveOptions {
                message: Some("Test stash".to_string()),
                ..Default::default()
            })
            .expect("should save stash");

        // Verify stash exists
        let stashes = service.stash_list().expect("should list stashes");
        assert_eq!(stashes.len(), 1);
        assert!(stashes[0].message.contains("Test stash"));
    }

    #[test]
    fn test_stash_pop() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and stash a change
        fs::write(tmp.path().join("stash_test.txt"), "stash content")
            .expect("should write stash_test.txt");
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .expect("should add files to staging");

        service
            .stash_save(&StashSaveOptions::default())
            .expect("should save stash");

        // Verify file is gone
        assert!(!tmp.path().join("stash_test.txt").exists());

        // Pop the stash
        let _ = service
            .stash_pop(&StashApplyOptions::default())
            .expect("should pop stash");

        // Verify file is back
        assert!(tmp.path().join("stash_test.txt").exists());

        // Verify stash is gone
        let stashes = service.stash_list().expect("should list stashes after pop");
        assert!(stashes.is_empty());
    }

    #[test]
    fn test_stash_apply() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and stash a change
        fs::write(tmp.path().join("apply_test.txt"), "apply content")
            .expect("should write apply_test.txt");
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .expect("should add files to staging");

        service
            .stash_save(&StashSaveOptions::default())
            .expect("should save stash");

        // Apply the stash
        let _ = service
            .stash_apply(&StashApplyOptions::default())
            .expect("should apply stash");

        // Verify file is back
        assert!(tmp.path().join("apply_test.txt").exists());

        // Verify stash is still there (apply doesn't drop)
        let stashes = service
            .stash_list()
            .expect("should list stashes after apply");
        assert_eq!(stashes.len(), 1);
    }

    #[test]
    fn test_stash_drop() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and stash a change
        fs::write(tmp.path().join("drop_test.txt"), "drop content")
            .expect("should write drop_test.txt");
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .expect("should add files to staging");

        service
            .stash_save(&StashSaveOptions::default())
            .expect("should save stash");
        assert_eq!(service.stash_list().expect("should list stashes").len(), 1);

        // Drop the stash
        let _ = service.stash_drop(None).expect("should drop stash");

        // Verify stash is gone
        assert!(service
            .stash_list()
            .expect("should list stashes after drop")
            .is_empty());
    }

    #[test]
    fn test_stash_clear() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create multiple stashes
        for i in 0..3 {
            fs::write(tmp.path().join(format!("clear_test_{}.txt", i)), "content")
                .expect("should write file");
            Command::new("git")
                .args(["add", "."])
                .current_dir(tmp.path())
                .output()
                .expect("should add files to staging");
            service
                .stash_save(&StashSaveOptions::default())
                .expect("should save stash");
        }

        assert_eq!(service.stash_list().expect("should list stashes").len(), 3);

        // Clear all stashes
        let _ = service.stash_clear().expect("should clear all stashes");

        assert!(service
            .stash_list()
            .expect("should list stashes after clear")
            .is_empty());
    }

    // ==================== Submodule Tests ====================

    #[test]
    fn test_submodule_list_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let submodules = service.submodule_list().expect("should list submodules");
        assert!(submodules.is_empty());
    }

    #[test]
    fn test_submodule_init_update() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Initialize submodules (should succeed even with no submodules)
        let result = service.submodule_init(&[]).expect("should init submodules");
        assert!(result.success);

        // Update submodules (should succeed even with no submodules)
        let result = service
            .submodule_update(&UpdateSubmoduleOptions {
                init: true,
                recursive: true,
                ..Default::default()
            })
            .expect("should update submodules");
        assert!(result.success);
    }

    #[test]
    fn test_submodule_summary_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Should return empty string for repo with no submodules
        let summary = service
            .submodule_summary()
            .expect("should get submodule summary");
        assert!(summary.is_empty());
    }

    // ==================== Git-flow Tests ====================

    #[test]
    fn test_gitflow_not_initialized() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let is_initialized = service
            .gitflow_is_initialized()
            .expect("should check gitflow initialized");
        assert!(!is_initialized);

        let config = service.gitflow_config().expect("should get gitflow config");
        assert!(config.is_none());
    }

    #[test]
    fn test_gitflow_init() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let default_branch = get_default_branch(&tmp);

        let result = service
            .gitflow_init(&GitFlowInitOptions {
                master: Some(default_branch.clone()),
                develop: Some("develop".to_string()),
                ..Default::default()
            })
            .expect("should init gitflow");

        assert!(result.success, "gitflow init failed: {}", result.message);

        let is_initialized = service
            .gitflow_is_initialized()
            .expect("should check gitflow initialized");
        assert!(is_initialized);

        let config = service.gitflow_config().expect("should get gitflow config");
        assert!(config.is_some());
        let config = config.expect("config should be present");
        assert_eq!(config.master, default_branch);
        assert_eq!(config.develop, "develop");
    }

    #[test]
    fn test_gitflow_feature_start() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let default_branch = get_default_branch(&tmp);

        // Initialize git-flow first
        service
            .gitflow_init(&GitFlowInitOptions {
                master: Some(default_branch.clone()),
                develop: Some("develop".to_string()),
                ..Default::default()
            })
            .expect("should init gitflow");

        // Checkout develop branch
        checkout_branch(&tmp, "develop");

        // Start a feature
        let result = service
            .gitflow_start(GitFlowBranchType::Feature, "test-feature", None)
            .expect("should start feature");

        assert!(result.success, "feature start failed: {}", result.message);
        assert_eq!(result.branch, Some("feature/test-feature".to_string()));

        // Verify the feature is in the list
        let features = service
            .gitflow_list(GitFlowBranchType::Feature)
            .expect("should list features");
        assert!(features.contains(&"test-feature".to_string()));
    }

    #[test]
    fn test_gitflow_feature_list_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let default_branch = get_default_branch(&tmp);

        // Initialize git-flow
        service
            .gitflow_init(&GitFlowInitOptions {
                master: Some(default_branch),
                develop: Some("develop".to_string()),
                ..Default::default()
            })
            .expect("should init gitflow");

        let features = service
            .gitflow_list(GitFlowBranchType::Feature)
            .expect("should list features");
        assert!(features.is_empty());
    }

    // ==================== Grep Tests ====================

    #[test]
    fn test_grep_basic() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create a file with searchable content
        fs::write(
            tmp.path().join("search.txt"),
            "hello world\ntest line\nhello again",
        )
        .expect("should write search.txt");
        Command::new("git")
            .args(["add", "search.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should add search.txt");
        Command::new("git")
            .args(["commit", "-m", "Add search file"])
            .current_dir(tmp.path())
            .output()
            .expect("should commit search file");

        let result = service
            .grep(&GrepOptions {
                pattern: "hello".to_string(),
                show_line_numbers: true,
                ..Default::default()
            })
            .expect("should grep for pattern");

        assert_eq!(result.total_matches, 2);
        assert!(result
            .matches
            .iter()
            .any(|m| m.content.contains("hello world")));
        assert!(result
            .matches
            .iter()
            .any(|m| m.content.contains("hello again")));
    }

    #[test]
    fn test_grep_case_insensitive() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        fs::write(
            tmp.path().join("case.txt"),
            "Hello World\nHELLO CAPS\nhello lower",
        )
        .expect("should write case.txt");
        Command::new("git")
            .args(["add", "case.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should add case.txt");
        Command::new("git")
            .args(["commit", "-m", "Add case file"])
            .current_dir(tmp.path())
            .output()
            .expect("should commit case file");

        let result = service
            .grep(&GrepOptions {
                pattern: "hello".to_string(),
                ignore_case: true,
                show_line_numbers: true,
                ..Default::default()
            })
            .expect("should grep case insensitive");

        assert_eq!(result.total_matches, 3);
    }

    #[test]
    fn test_grep_no_matches() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let result = service
            .grep(&GrepOptions {
                pattern: "nonexistent_pattern_xyz".to_string(),
                ..Default::default()
            })
            .expect("should grep for nonexistent pattern");

        assert_eq!(result.total_matches, 0);
        assert!(result.matches.is_empty());
    }

    #[test]
    fn test_stage_hunk() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and commit a file first so we can get a proper diff
        fs::write(tmp.path().join("test.txt"), "line1\n").expect("should write test.txt");
        Command::new("git")
            .args(["add", "test.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should add test.txt");
        Command::new("git")
            .args(["commit", "-m", "Add test.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should commit test.txt");

        // Now modify the file to create a diff
        fs::write(tmp.path().join("test.txt"), "line1\nline2\nline3\n")
            .expect("should modify test.txt");

        // Get the actual diff from git
        let diff_output = Command::new("git")
            .args(["diff", "test.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should get diff output");
        let patch = String::from_utf8_lossy(&diff_output.stdout);

        // Stage the hunk using the real patch
        let result = service.stage_hunk(&patch);
        assert!(result.is_ok(), "Failed to stage hunk: {:?}", result);

        // Verify the file is staged
        let status = Command::new("git")
            .args(["diff", "--cached", "--name-only"])
            .current_dir(tmp.path())
            .output()
            .expect("should get cached diff");
        let staged_files = String::from_utf8_lossy(&status.stdout);
        assert!(staged_files.contains("test.txt"));
    }

    #[test]
    fn test_unstage_hunk() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and commit a file first so we can get a proper diff
        fs::write(tmp.path().join("test.txt"), "line1\n").expect("should write test.txt");
        Command::new("git")
            .args(["add", "test.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should add test.txt");
        Command::new("git")
            .args(["commit", "-m", "Add test.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should commit test.txt");

        // Modify and stage the file
        fs::write(tmp.path().join("test.txt"), "line1\nline2\nline3\n")
            .expect("should modify test.txt");
        Command::new("git")
            .args(["add", "test.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should stage modified test.txt");

        // Verify it's staged
        let status = Command::new("git")
            .args(["diff", "--cached", "--name-only"])
            .current_dir(tmp.path())
            .output()
            .expect("should get cached diff");
        assert!(String::from_utf8_lossy(&status.stdout).contains("test.txt"));

        // Get the staged diff from git
        let diff_output = Command::new("git")
            .args(["diff", "--cached", "test.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should get cached diff for test.txt");
        let patch = String::from_utf8_lossy(&diff_output.stdout);

        // Unstage the hunk using the real patch
        let result = service.unstage_hunk(&patch);
        assert!(result.is_ok(), "Failed to unstage hunk: {:?}", result);

        // Verify the file is no longer staged
        let status = Command::new("git")
            .args(["diff", "--cached", "--name-only"])
            .current_dir(tmp.path())
            .output()
            .expect("should get cached diff after unstage");
        let staged_files = String::from_utf8_lossy(&status.stdout);
        assert!(!staged_files.contains("test.txt") || staged_files.trim().is_empty());
    }

    #[test]
    fn test_stage_hunk_invalid_patch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Try to stage an invalid patch
        let invalid_patch = "this is not a valid patch";
        let result = service.stage_hunk(invalid_patch);

        assert!(result.is_err());
    }

    // ==================== Discard Hunk Tests ====================

    #[test]
    fn test_discard_hunk() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and commit a file first
        fs::write(tmp.path().join("discard.txt"), "original\n").expect("should write");
        Command::new("git")
            .args(["add", "discard.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should add");
        Command::new("git")
            .args(["commit", "-m", "Add discard.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should commit");

        // Modify the file
        fs::write(tmp.path().join("discard.txt"), "original\nmodified\n").expect("should modify");

        // Get the diff
        let diff_output = Command::new("git")
            .args(["diff", "discard.txt"])
            .current_dir(tmp.path())
            .output()
            .expect("should get diff");
        let patch = String::from_utf8_lossy(&diff_output.stdout);

        // Discard the changes
        let result = service.discard_hunk(&patch);
        assert!(result.is_ok(), "Failed to discard hunk: {:?}", result);

        // Verify the file is back to original
        let content = fs::read_to_string(tmp.path().join("discard.txt")).expect("should read file");
        assert_eq!(content, "original\n");
    }

    // ==================== Worktree Tests ====================

    #[test]
    fn test_worktree_list_initial() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let worktrees = service.worktree_list().expect("should list worktrees");
        // Main worktree is always present
        assert!(!worktrees.is_empty());
        assert!(!worktrees[0].path.is_empty());
    }

    #[test]
    fn test_worktree_add() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        create_branch(&tmp, "feature-worktree");

        let worktree_path = tmp.path().join("worktree-new");

        let result = service
            .worktree_add(&AddWorktreeOptions {
                path: worktree_path.to_string_lossy().to_string(),
                branch: Some("feature-worktree".to_string()),
                create_branch: false,
                ..Default::default()
            })
            .expect("should add worktree");

        assert!(result.success, "worktree add failed: {}", result.message);

        // Verify worktree exists
        let worktrees = service.worktree_list().expect("should list worktrees");
        assert_eq!(worktrees.len(), 2);
    }

    #[test]
    fn test_worktree_prune_dry_run() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let result = service
            .worktree_prune(true)
            .expect("should prune worktrees");
        assert!(result.success);
    }

    // ==================== Bisect Tests ====================

    #[test]
    fn test_is_bisecting_initially_false() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        assert!(!service.is_bisecting().expect("should check bisect state"));
    }

    #[test]
    fn test_bisect_start_and_reset() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create a few commits
        add_commit(&tmp, "file1.txt", "content1", "Commit 1");
        add_commit(&tmp, "file2.txt", "content2", "Commit 2");

        // Get commit hashes
        let output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(tmp.path())
            .output()
            .expect("should get HEAD hash");
        let bad = String::from_utf8_lossy(&output.stdout).trim().to_string();

        let output = Command::new("git")
            .args(["rev-parse", "HEAD~2"])
            .current_dir(tmp.path())
            .output()
            .expect("should get earlier hash");
        let good = String::from_utf8_lossy(&output.stdout).trim().to_string();

        // Start bisect
        let result = service
            .bisect_start(Some(&bad), &good)
            .expect("should start bisect");
        assert!(result.success, "bisect start failed: {}", result.stderr);

        assert!(service.is_bisecting().expect("should be bisecting"));

        // Get bisect state
        let state = service.get_bisect_state().expect("should get bisect state");
        assert!(state.is_active);

        // Reset bisect
        let result = service.bisect_reset(None).expect("should reset bisect");
        assert!(result.success);

        assert!(!service.is_bisecting().expect("should not be bisecting"));
    }

    #[test]
    fn test_bisect_log_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // When not bisecting, log returns an error or empty
        let _ = service.bisect_log();
    }

    // ==================== Tag Remote Tests ====================

    #[test]
    fn test_tag_push_no_remote() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create a tag
        Command::new("git")
            .args(["tag", "v1.0.0"])
            .current_dir(tmp.path())
            .output()
            .expect("should create tag");

        // Try to push without remote (should fail)
        let result = service.tag_push("v1.0.0", "origin");
        // Expect error since no remote exists
        assert!(result.is_err() || !result.expect("should get result").success);
    }

    // ==================== Archive Tests ====================

    #[test]
    fn test_archive_zip() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "archive.txt", "archive content", "Add file");

        let output_path = tmp.path().join("archive.zip");

        let result = service
            .archive("HEAD", "zip", &output_path, None)
            .expect("should create archive");

        assert!(!result.message.is_empty());
        assert!(output_path.exists());
    }

    #[test]
    fn test_archive_tar() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "archive.txt", "archive content", "Add file");

        let output_path = tmp.path().join("archive.tar");

        let result = service
            .archive("HEAD", "tar", &output_path, None)
            .expect("should create tar archive");

        assert!(!result.message.is_empty());
        assert!(output_path.exists());
    }

    #[test]
    fn test_archive_tar_gz() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "archive.txt", "archive content", "Add file");

        let output_path = tmp.path().join("archive.tar.gz");

        let result = service
            .archive("HEAD", "tar.gz", &output_path, None)
            .expect("should create tar.gz archive");

        assert!(!result.message.is_empty());
        assert!(output_path.exists());
    }

    #[test]
    fn test_archive_with_prefix() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let output_path = tmp.path().join("prefixed.zip");

        let result = service
            .archive("HEAD", "zip", &output_path, Some("myproject/"))
            .expect("should create archive with prefix");

        assert!(!result.message.is_empty());
    }

    // ==================== Format Patch Tests ====================

    #[test]
    fn test_format_patch() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "patch1.txt", "content1", "Patch commit 1");
        add_commit(&tmp, "patch2.txt", "content2", "Patch commit 2");

        let output_dir = tmp.path().join("patches");
        fs::create_dir_all(&output_dir).expect("should create output dir");

        let result = service
            .format_patch("HEAD~2..HEAD", &output_dir)
            .expect("should format patches");

        assert!(!result.message.is_empty());
        assert!(!result.patches.is_empty());
    }

    // ==================== Cherry-pick Abort/Continue Tests ====================

    #[test]
    fn test_cherry_pick_abort_no_op() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Abort when not cherry-picking should fail
        let result = service.cherry_pick_abort();
        assert!(result.is_err() || !result.expect("should get result").success);
    }

    #[test]
    fn test_is_cherry_picking_false() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        assert!(!service
            .is_cherry_picking()
            .expect("should check cherry-pick"));
    }

    #[test]
    fn test_is_reverting_false() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        assert!(!service.is_reverting().expect("should check reverting"));
    }

    // ==================== Conflict Resolution Tests ====================

    #[test]
    fn test_get_conflicted_files_none() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let conflicts = service
            .get_conflicted_files()
            .expect("should get conflicted files");
        assert!(conflicts.is_empty());
    }

    // ==================== Reset Mode Tests ====================

    #[test]
    fn test_reset_mixed() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "mixed.txt", "content", "Add mixed");

        let result = service
            .reset("HEAD~1", ResetMode::Mixed)
            .expect("should reset mixed");

        assert!(result.success);
        // File should still exist but be unstaged
        assert!(tmp.path().join("mixed.txt").exists());
    }

    // ==================== Merge Abort/Continue Tests ====================

    #[test]
    fn test_merge_abort_no_merge() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Abort when not merging should fail
        let result = service.merge_abort();
        assert!(result.is_err() || !result.expect("should get result").success);
    }

    #[test]
    fn test_merge_continue_no_merge() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Continue when not merging should fail
        let result = service.merge_continue();
        assert!(result.is_err() || !result.expect("should get result").success);
    }

    // ==================== Rebase Abort/Continue Tests ====================

    #[test]
    fn test_rebase_abort_no_rebase() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Abort when not rebasing should fail
        let result = service.rebase_abort();
        assert!(result.is_err() || !result.expect("should get result").success);
    }

    #[test]
    fn test_rebase_continue_no_rebase() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Continue when not rebasing should fail
        let result = service.rebase_continue();
        assert!(result.is_err() || !result.expect("should get result").success);
    }

    #[test]
    fn test_rebase_skip_no_rebase() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Skip when not rebasing should fail
        let result = service.rebase_skip();
        assert!(result.is_err() || !result.expect("should get result").success);
    }

    // ==================== Cherry-pick Range Tests ====================

    #[test]
    fn test_cherry_pick_range() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let default_branch = get_default_branch(&tmp);

        // Create a feature branch with commits
        create_branch(&tmp, "feature-range");
        checkout_branch(&tmp, "feature-range");
        add_commit(&tmp, "range1.txt", "content1", "Range commit 1");
        add_commit(&tmp, "range2.txt", "content2", "Range commit 2");

        // Get commit hashes
        let output = Command::new("git")
            .args(["rev-parse", "HEAD~1"])
            .current_dir(tmp.path())
            .output()
            .expect("should get hash");
        let start = String::from_utf8_lossy(&output.stdout).trim().to_string();

        let output = Command::new("git")
            .args(["rev-parse", "HEAD"])
            .current_dir(tmp.path())
            .output()
            .expect("should get HEAD hash");
        let end = String::from_utf8_lossy(&output.stdout).trim().to_string();

        // Go back to default branch
        checkout_branch(&tmp, &default_branch);

        let result = service
            .cherry_pick_range(&start, &end, false)
            .expect("should cherry-pick range");
        assert!(
            result.success,
            "cherry-pick range failed: {}",
            result.stderr
        );
    }

    // ==================== Stash Show Tests ====================

    #[test]
    fn test_stash_show() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and stash a change
        fs::write(tmp.path().join("show_test.txt"), "show content")
            .expect("should write show_test.txt");
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .expect("should add files to staging");

        service
            .stash_save(&StashSaveOptions::default())
            .expect("should save stash");

        // Show the stash
        let show = service.stash_show(None, false).expect("should show stash");
        assert!(!show.is_empty());
    }

    #[test]
    fn test_stash_show_stat_only() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        fs::write(tmp.path().join("stat_test.txt"), "stat content")
            .expect("should write stat_test.txt");
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .expect("should add files");

        service
            .stash_save(&StashSaveOptions::default())
            .expect("should save stash");

        let show = service
            .stash_show(None, true)
            .expect("should show stash stat");
        assert!(!show.is_empty());
    }

    // ==================== Git Environment Tests ====================

    #[test]
    fn test_get_git_environment() {
        let env = GitCliService::get_git_environment().expect("should get git environment");
        assert!(env.git_version.is_some());
        assert!(!env.git_version.expect("should have git version").is_empty());
    }

    #[test]
    fn test_lfs_check_installed() {
        let (installed, version) = GitCliService::lfs_check_installed().expect("should check LFS");
        // LFS might or might not be installed - just verify the function works
        if installed {
            assert!(version.is_some());
        }
    }

    // ==================== Operation Type Tests ====================

    #[test]
    fn test_operation_type_equality() {
        assert_eq!(OperationType::Merge, OperationType::Merge);
        assert_ne!(OperationType::Merge, OperationType::Rebase);
        assert_ne!(OperationType::CherryPick, OperationType::Revert);
    }

    // ==================== GitCommandResult Tests ====================

    #[test]
    fn test_git_command_result_from_output() {
        use std::process::ExitStatus;

        fn success_status() -> ExitStatus {
            #[cfg(unix)]
            {
                use std::os::unix::process::ExitStatusExt;
                ExitStatus::from_raw(0)
            }
            #[cfg(windows)]
            {
                use std::os::windows::process::ExitStatusExt;
                ExitStatus::from_raw(0)
            }
        }

        let output = Output {
            status: success_status(),
            stdout: b"success output".to_vec(),
            stderr: b"".to_vec(),
        };

        let result = GitCommandResult::from(output);
        assert!(result.success);
        assert_eq!(result.stdout, "success output");
        assert!(result.stderr.is_empty());
    }
}
