use crate::error::{AxisError, Result};
use crate::models::{
    StashEntry, StashSaveOptions, StashApplyOptions, StashResult,
    Tag, TagSignature, CreateTagOptions, TagResult,
    Submodule, SubmoduleStatus, AddSubmoduleOptions, UpdateSubmoduleOptions,
    SyncSubmoduleOptions, SubmoduleResult,
};
use chrono::{DateTime, Utc};
use std::path::Path;
use std::process::{Command, Output};

/// Service for Git operations that require the system Git CLI.
/// Used for operations that libgit2 doesn't support well:
/// - Interactive rebase
/// - Complex merge strategies
/// - Cherry-pick with various options
/// - Revert operations
pub struct GitCliService {
    repo_path: std::path::PathBuf,
}

#[derive(Debug)]
pub struct GitCommandResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

impl GitCliService {
    pub fn new(repo_path: &Path) -> Self {
        GitCliService {
            repo_path: repo_path.to_path_buf(),
        }
    }

    /// Execute a git command and return the result
    fn execute(&self, args: &[&str]) -> Result<GitCommandResult> {
        let output = Command::new("git")
            .args(args)
            .current_dir(&self.repo_path)
            .output()
            .map_err(|e| AxisError::IoError(e))?;

        Ok(GitCommandResult::from(output))
    }

    /// Execute a git command, returning an error if it fails
    fn execute_checked(&self, args: &[&str]) -> Result<GitCommandResult> {
        let result = self.execute(args)?;
        if !result.success {
            return Err(AxisError::Other(format!(
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
    ) -> Result<GitCommandResult> {
        let mut args = vec!["merge"];

        if no_ff {
            args.push("--no-ff");
        }

        if squash {
            args.push("--squash");
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
            // For interactive rebase in a GUI app, we'd need to handle this differently
            // For now, we'll use the non-interactive approach or prepare the todo file
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
        let range = format!("{}..{}", from, to);
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
            Err(AxisError::Other(format!(
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
            Err(AxisError::Other(format!(
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
            Err(AxisError::Other(format!(
                "Could not get theirs version: {}",
                result.stderr
            )))
        }
    }

    /// Choose a specific version for a conflicted file
    pub fn resolve_with_version(&self, path: &str, version: ConflictVersion) -> Result<GitCommandResult> {
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
        } else {
            Ok(None)
        }
    }

    /// Get list of conflicted files
    pub fn get_conflicted_files(&self) -> Result<Vec<String>> {
        let result = self.execute(&["diff", "--name-only", "--diff-filter=U"])?;
        if result.success {
            Ok(result
                .stdout
                .lines()
                .map(|s| s.to_string())
                .collect())
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
            "stash", "list",
            "--format=%gd|%H|%s|%an|%ad",
            "--date=iso-strict"
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
                    message.split(" on ").nth(1)
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
                success: true,
                message: "Stash created successfully".to_string(),
                files_affected,
                conflicts: Vec::new(),
            })
        } else if result.stderr.contains("No local changes to save") {
            Ok(StashResult {
                success: true,
                message: "No changes to stash".to_string(),
                files_affected: 0,
                conflicts: Vec::new(),
            })
        } else {
            Ok(StashResult {
                success: false,
                message: result.stderr.trim().to_string(),
                files_affected: 0,
                conflicts: Vec::new(),
            })
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

        if result.success {
            Ok(StashResult {
                success: true,
                message: "Stash applied successfully".to_string(),
                files_affected: 0,
                conflicts: Vec::new(),
            })
        } else if result.stderr.contains("conflict") || result.stderr.contains("CONFLICT") {
            // Get conflicted files
            let conflicts = self.get_conflicted_files()?;
            Ok(StashResult {
                success: false,
                message: "Stash applied with conflicts".to_string(),
                files_affected: 0,
                conflicts,
            })
        } else {
            Ok(StashResult {
                success: false,
                message: result.stderr.trim().to_string(),
                files_affected: 0,
                conflicts: Vec::new(),
            })
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

        if result.success {
            Ok(StashResult {
                success: true,
                message: "Stash popped successfully".to_string(),
                files_affected: 0,
                conflicts: Vec::new(),
            })
        } else if result.stderr.contains("conflict") || result.stderr.contains("CONFLICT") {
            let conflicts = self.get_conflicted_files()?;
            Ok(StashResult {
                success: false,
                message: "Stash applied with conflicts (not dropped)".to_string(),
                files_affected: 0,
                conflicts,
            })
        } else {
            Ok(StashResult {
                success: false,
                message: result.stderr.trim().to_string(),
                files_affected: 0,
                conflicts: Vec::new(),
            })
        }
    }

    /// Drop a stash entry
    pub fn stash_drop(&self, index: Option<usize>) -> Result<StashResult> {
        let stash_ref = format!("stash@{{{}}}", index.unwrap_or(0));
        let result = self.execute(&["stash", "drop", &stash_ref])?;

        Ok(StashResult {
            success: result.success,
            message: if result.success {
                "Stash dropped successfully".to_string()
            } else {
                result.stderr.trim().to_string()
            },
            files_affected: 0,
            conflicts: Vec::new(),
        })
    }

    /// Clear all stashes
    pub fn stash_clear(&self) -> Result<StashResult> {
        let result = self.execute(&["stash", "clear"])?;

        Ok(StashResult {
            success: result.success,
            message: if result.success {
                "All stashes cleared".to_string()
            } else {
                result.stderr.trim().to_string()
            },
            files_affected: 0,
            conflicts: Vec::new(),
        })
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
            Err(AxisError::Other(result.stderr))
        }
    }

    /// Create a branch from a stash
    pub fn stash_branch(&self, branch_name: &str, index: Option<usize>) -> Result<StashResult> {
        let stash_ref = format!("stash@{{{}}}", index.unwrap_or(0));
        let result = self.execute(&["stash", "branch", branch_name, &stash_ref])?;

        Ok(StashResult {
            success: result.success,
            message: if result.success {
                format!("Created branch '{}' from stash", branch_name)
            } else {
                result.stderr.trim().to_string()
            },
            files_affected: 0,
            conflicts: Vec::new(),
        })
    }

    // ==================== Tag Operations ====================

    /// List all tags
    pub fn tag_list(&self) -> Result<Vec<Tag>> {
        // Get tag info with format
        let result = self.execute(&[
            "tag", "-l",
            "--format=%(refname:short)|%(objectname)|%(*objectname)|%(objecttype)|%(subject)|%(taggername)|%(taggeremail)|%(taggerdate:iso-strict)"
        ])?;

        if !result.success {
            return Err(AxisError::Other(result.stderr));
        }

        let mut tags = Vec::new();
        for line in result.stdout.lines() {
            if line.is_empty() {
                continue;
            }

            let parts: Vec<&str> = line.splitn(8, '|').collect();
            if parts.len() >= 4 {
                let name = parts[0].to_string();
                let tag_oid = parts[1].to_string();
                let target_oid = parts[2]; // For annotated tags, this is the target commit
                let object_type = parts[3];
                let is_annotated = object_type == "tag";

                // For annotated tags, use the dereferenced target; for lightweight, use the tag oid
                let actual_target = if is_annotated && !target_oid.is_empty() {
                    target_oid.to_string()
                } else {
                    tag_oid.clone()
                };

                let message = parts.get(4).map(|s| s.to_string());

                let tagger = if is_annotated && parts.len() >= 8 {
                    let tagger_name = parts.get(5).unwrap_or(&"").to_string();
                    let tagger_email = parts.get(6).unwrap_or(&"")
                        .trim_start_matches('<')
                        .trim_end_matches('>')
                        .to_string();
                    let tagger_date = parts.get(7).unwrap_or(&"");

                    if !tagger_name.is_empty() {
                        let timestamp = DateTime::parse_from_rfc3339(tagger_date)
                            .map(|dt| dt.with_timezone(&Utc))
                            .unwrap_or_else(|_| Utc::now());

                        Some(TagSignature {
                            name: tagger_name,
                            email: tagger_email,
                            timestamp,
                        })
                    } else {
                        None
                    }
                } else {
                    None
                };

                tags.push(Tag {
                    name: name.clone(),
                    full_name: format!("refs/tags/{}", name),
                    target_oid: actual_target.clone(),
                    short_oid: actual_target.chars().take(7).collect(),
                    is_annotated,
                    message: if is_annotated { message } else { None },
                    tagger,
                    target_summary: None,
                    target_time: None,
                });
            }
        }

        // Sort by name (can be customized based on ListTagsOptions)
        tags.sort_by(|a, b| a.name.cmp(&b.name));

        Ok(tags)
    }

    /// Create a new tag
    pub fn tag_create(&self, name: &str, options: &CreateTagOptions) -> Result<TagResult> {
        let mut args = vec!["tag"];

        if options.annotated {
            args.push("-a");
        }

        if options.force {
            args.push("-f");
        }

        args.push(name);

        if let Some(ref target) = options.target {
            args.push(target);
        }

        if let Some(ref msg) = options.message {
            args.push("-m");
            args.push(msg);
        }

        let result = self.execute(&args)?;

        if result.success {
            // Get the created tag info
            let tags = self.tag_list()?;
            let created_tag = tags.into_iter().find(|t| t.name == name);

            Ok(TagResult {
                success: true,
                message: format!("Tag '{}' created successfully", name),
                tag: created_tag,
            })
        } else {
            Ok(TagResult {
                success: false,
                message: result.stderr.trim().to_string(),
                tag: None,
            })
        }
    }

    /// Delete a tag
    pub fn tag_delete(&self, name: &str) -> Result<TagResult> {
        let result = self.execute(&["tag", "-d", name])?;

        Ok(TagResult {
            success: result.success,
            message: if result.success {
                format!("Tag '{}' deleted successfully", name)
            } else {
                result.stderr.trim().to_string()
            },
            tag: None,
        })
    }

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
            return Err(AxisError::Other(result.stderr));
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
            let rest = if status_char == ' ' || status_char == '+' || status_char == '-' || status_char == 'U' {
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
                        Some(branch_part[1..branch_part.len()-1].to_string())
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
                    head_oid: if head_oid.is_empty() { None } else { Some(head_oid.clone()) },
                    short_oid: if head_oid.is_empty() { None } else { Some(head_oid.chars().take(7).collect()) },
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
}

impl From<Output> for GitCommandResult {
    fn from(output: Output) -> Self {
        GitCommandResult {
            success: output.status.success(),
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
            exit_code: output.status.code().unwrap_or(-1),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConflictVersion {
    Ours,
    Theirs,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OperationType {
    Merge,
    Rebase,
    CherryPick,
    Revert,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ResetMode {
    Soft,
    Mixed,
    Hard,
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    use std::fs;
    use std::process::Command;

    fn setup_test_repo() -> (TempDir, GitCliService) {
        let tmp = TempDir::new().unwrap();

        // Initialize git repo using CLI
        Command::new("git")
            .args(["init"])
            .current_dir(tmp.path())
            .output()
            .unwrap();

        // Configure user for commits
        Command::new("git")
            .args(["config", "user.email", "test@example.com"])
            .current_dir(tmp.path())
            .output()
            .unwrap();

        Command::new("git")
            .args(["config", "user.name", "Test User"])
            .current_dir(tmp.path())
            .output()
            .unwrap();

        let service = GitCliService::new(tmp.path());
        (tmp, service)
    }

    fn create_initial_commit(tmp: &TempDir) {
        fs::write(tmp.path().join("README.md"), "# Test").unwrap();

        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .unwrap();

        Command::new("git")
            .args(["commit", "-m", "Initial commit"])
            .current_dir(tmp.path())
            .output()
            .unwrap();
    }

    fn create_branch(tmp: &TempDir, name: &str) {
        Command::new("git")
            .args(["branch", name])
            .current_dir(tmp.path())
            .output()
            .unwrap();
    }

    fn checkout_branch(tmp: &TempDir, name: &str) {
        let output = Command::new("git")
            .args(["checkout", name])
            .current_dir(tmp.path())
            .output()
            .unwrap();
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
            .unwrap();
        String::from_utf8_lossy(&output.stdout).trim().to_string()
    }

    fn add_commit(tmp: &TempDir, filename: &str, content: &str, message: &str) {
        fs::write(tmp.path().join(filename), content).unwrap();

        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .unwrap();

        Command::new("git")
            .args(["commit", "-m", message])
            .current_dir(tmp.path())
            .output()
            .unwrap();
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
        let result = service.merge("feature", None, false, false).unwrap();

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
        let result = service.merge("feature", Some("Merge feature branch"), true, false).unwrap();

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
            .unwrap();
        let commit_hash = String::from_utf8_lossy(&output.stdout).trim().to_string();

        // Go back to default branch and cherry-pick
        checkout_branch(&tmp, &default_branch);
        let result = service.cherry_pick(&commit_hash, false).unwrap();

        assert!(
            result.success,
            "cherry-pick failed: stdout={}, stderr={}",
            result.stdout,
            result.stderr
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
        let result = service.rebase(&default_branch, false).unwrap();

        assert!(
            result.success,
            "rebase failed: stdout={}, stderr={}",
            result.stdout,
            result.stderr
        );
    }

    #[test]
    fn test_is_merging() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Initially not merging
        assert!(!service.is_merging().unwrap());
    }

    #[test]
    fn test_is_rebasing() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Initially not rebasing
        assert!(!service.is_rebasing().unwrap());
    }

    #[test]
    fn test_get_operation_in_progress() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // No operation in progress
        let op = service.get_operation_in_progress().unwrap();
        assert!(op.is_none());
    }

    #[test]
    fn test_reset_soft() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "file.txt", "content", "Second commit");

        let result = service.reset("HEAD~1", ResetMode::Soft).unwrap();

        assert!(result.success);
        // File should still exist and be staged
        assert!(tmp.path().join("file.txt").exists());
    }

    #[test]
    fn test_reset_hard() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "file.txt", "content", "Second commit");

        let result = service.reset("HEAD~1", ResetMode::Hard).unwrap();

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
            .unwrap();
        let commit_hash = String::from_utf8_lossy(&output.stdout).trim().to_string();

        let result = service.revert(&commit_hash, false).unwrap();

        assert!(result.success);
        // File should be removed by revert
        assert!(!tmp.path().join("file.txt").exists());
    }

    // ==================== Stash Tests ====================

    #[test]
    fn test_stash_list_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let stashes = service.stash_list().unwrap();
        assert!(stashes.is_empty());
    }

    #[test]
    fn test_stash_save_and_list() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create an uncommitted change
        fs::write(tmp.path().join("uncommitted.txt"), "uncommitted content").unwrap();
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .unwrap();

        // Stash the changes
        let result = service.stash_save(&StashSaveOptions {
            message: Some("Test stash".to_string()),
            ..Default::default()
        }).unwrap();

        assert!(result.success);

        // Verify stash exists
        let stashes = service.stash_list().unwrap();
        assert_eq!(stashes.len(), 1);
        assert!(stashes[0].message.contains("Test stash"));
    }

    #[test]
    fn test_stash_pop() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and stash a change
        fs::write(tmp.path().join("stash_test.txt"), "stash content").unwrap();
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .unwrap();

        service.stash_save(&StashSaveOptions::default()).unwrap();

        // Verify file is gone
        assert!(!tmp.path().join("stash_test.txt").exists());

        // Pop the stash
        let result = service.stash_pop(&StashApplyOptions::default()).unwrap();
        assert!(result.success);

        // Verify file is back
        assert!(tmp.path().join("stash_test.txt").exists());

        // Verify stash is gone
        let stashes = service.stash_list().unwrap();
        assert!(stashes.is_empty());
    }

    #[test]
    fn test_stash_apply() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and stash a change
        fs::write(tmp.path().join("apply_test.txt"), "apply content").unwrap();
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .unwrap();

        service.stash_save(&StashSaveOptions::default()).unwrap();

        // Apply the stash
        let result = service.stash_apply(&StashApplyOptions::default()).unwrap();
        assert!(result.success);

        // Verify file is back
        assert!(tmp.path().join("apply_test.txt").exists());

        // Verify stash is still there (apply doesn't drop)
        let stashes = service.stash_list().unwrap();
        assert_eq!(stashes.len(), 1);
    }

    #[test]
    fn test_stash_drop() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create and stash a change
        fs::write(tmp.path().join("drop_test.txt"), "drop content").unwrap();
        Command::new("git")
            .args(["add", "."])
            .current_dir(tmp.path())
            .output()
            .unwrap();

        service.stash_save(&StashSaveOptions::default()).unwrap();
        assert_eq!(service.stash_list().unwrap().len(), 1);

        // Drop the stash
        let result = service.stash_drop(None).unwrap();
        assert!(result.success);

        // Verify stash is gone
        assert!(service.stash_list().unwrap().is_empty());
    }

    #[test]
    fn test_stash_clear() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create multiple stashes
        for i in 0..3 {
            fs::write(tmp.path().join(format!("clear_test_{}.txt", i)), "content").unwrap();
            Command::new("git")
                .args(["add", "."])
                .current_dir(tmp.path())
                .output()
                .unwrap();
            service.stash_save(&StashSaveOptions::default()).unwrap();
        }

        assert_eq!(service.stash_list().unwrap().len(), 3);

        // Clear all stashes
        let result = service.stash_clear().unwrap();
        assert!(result.success);

        assert!(service.stash_list().unwrap().is_empty());
    }

    // ==================== Tag Tests ====================

    #[test]
    fn test_tag_list_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let tags = service.tag_list().unwrap();
        assert!(tags.is_empty());
    }

    #[test]
    fn test_tag_create_lightweight() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let result = service.tag_create("v1.0.0", &CreateTagOptions::default()).unwrap();
        assert!(result.success);

        let tags = service.tag_list().unwrap();
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "v1.0.0");
        assert!(!tags[0].is_annotated);
    }

    #[test]
    fn test_tag_create_annotated() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let result = service.tag_create("v2.0.0", &CreateTagOptions {
            annotated: true,
            message: Some("Release version 2.0.0".to_string()),
            ..Default::default()
        }).unwrap();

        assert!(result.success);

        let tags = service.tag_list().unwrap();
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].name, "v2.0.0");
        assert!(tags[0].is_annotated);
    }

    #[test]
    fn test_tag_delete() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Create a tag
        service.tag_create("v1.0.0", &CreateTagOptions::default()).unwrap();
        assert_eq!(service.tag_list().unwrap().len(), 1);

        // Delete the tag
        let result = service.tag_delete("v1.0.0").unwrap();
        assert!(result.success);

        assert!(service.tag_list().unwrap().is_empty());
    }

    #[test]
    fn test_tag_on_specific_commit() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);
        add_commit(&tmp, "file1.txt", "content1", "Commit 1");
        add_commit(&tmp, "file2.txt", "content2", "Commit 2");

        // Get the first commit (HEAD~1)
        let output = Command::new("git")
            .args(["rev-parse", "HEAD~1"])
            .current_dir(tmp.path())
            .output()
            .unwrap();
        let first_commit = String::from_utf8_lossy(&output.stdout).trim().to_string();

        // Tag the first commit
        let result = service.tag_create("v0.1.0", &CreateTagOptions {
            target: Some(first_commit.clone()),
            ..Default::default()
        }).unwrap();

        assert!(result.success);

        let tags = service.tag_list().unwrap();
        assert_eq!(tags.len(), 1);
        assert!(tags[0].target_oid.starts_with(&first_commit[..7]));
    }

    // ==================== Submodule Tests ====================

    #[test]
    fn test_submodule_list_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        let submodules = service.submodule_list().unwrap();
        assert!(submodules.is_empty());
    }

    #[test]
    fn test_submodule_init_update() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Initialize submodules (should succeed even with no submodules)
        let result = service.submodule_init(&[]).unwrap();
        assert!(result.success);

        // Update submodules (should succeed even with no submodules)
        let result = service.submodule_update(&UpdateSubmoduleOptions {
            init: true,
            recursive: true,
            ..Default::default()
        }).unwrap();
        assert!(result.success);
    }

    #[test]
    fn test_submodule_summary_empty() {
        let (tmp, service) = setup_test_repo();
        create_initial_commit(&tmp);

        // Should return empty string for repo with no submodules
        let summary = service.submodule_summary().unwrap();
        assert!(summary.is_empty());
    }
}
