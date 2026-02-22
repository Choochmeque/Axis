use crate::error::{AxisError, Result};
use crate::models::{
    CherryPickOptions, CherryPickResult, ConflictContent, ConflictResolution, ConflictedFile,
    InteractiveRebaseEntry, InteractiveRebaseOptions, InteractiveRebasePreview, MergeOptions,
    MergeResult, MergeType, OperationState, RebaseAction, RebaseOptions, RebasePreview,
    RebaseProgress, RebaseResult, ResetOptions, RevertOptions, RevertResult,
};
use crate::services::HookProgressEmitter;
use crate::state::AppState;
use std::fs;
use tauri::State;

// ==================== Merge Commands ====================

/// Merge a branch into the current branch
#[tauri::command]
#[specta::specta]
pub async fn merge_branch(
    state: State<'_, AppState>,
    options: MergeOptions,
) -> Result<MergeResult> {
    let settings = state.get_settings()?;
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    let result = guard
        .merge(
            &options.branch,
            options.message.as_deref(),
            options.no_ff,
            options.squash,
            options.ff_only,
            options.no_commit,
        )
        .await?;

    let merge_result = if result.success {
        // Determine merge type from output
        let merge_type = if result.stdout.contains("Already up to date") {
            MergeType::UpToDate
        } else if result.stdout.contains("Fast-forward") {
            MergeType::FastForward
        } else {
            MergeType::Normal
        };

        MergeResult {
            success: true,
            merge_type,
            commit_oid: None,
            conflicts: Vec::new(),
            message: result.stdout.trim().to_string(),
        }
    } else if result.stdout.contains("CONFLICT") || result.stderr.contains("Automatic merge failed")
    {
        // Merge has conflicts
        let conflicts = guard.get_conflicted_files_enriched().await?;

        MergeResult {
            success: false,
            merge_type: MergeType::Conflicted,
            commit_oid: None,
            conflicts,
            message: "Merge conflicts detected. Please resolve conflicts and commit.".to_string(),
        }
    } else {
        return Err(AxisError::Other(format!(
            "Merge failed: {}",
            result.stderr.trim()
        )));
    };

    // Run post-merge hook if merge was successful (informational, don't fail)
    if merge_result.success && !settings.bypass_hooks {
        let app_handle = state.get_app_handle()?;
        let emitter = HookProgressEmitter::new(app_handle, state.progress_registry());
        let is_squash = options.squash;
        let hook_result = guard.run_post_merge(is_squash, Some(&emitter)).await;
        if !hook_result.skipped && !hook_result.success {
            log::warn!("post-merge hook failed: {}", hook_result.stderr);
        }
    }

    Ok(merge_result)
}

/// Abort an in-progress merge
#[tauri::command]
#[specta::specta]
pub async fn merge_abort(state: State<'_, AppState>) -> Result<()> {
    state.get_git_service()?.write().await.merge_abort().await?;
    Ok(())
}

/// Continue a merge after resolving conflicts
#[tauri::command]
#[specta::specta]
pub async fn merge_continue(state: State<'_, AppState>) -> Result<MergeResult> {
    let result = state
        .get_git_service()?
        .write()
        .await
        .merge_continue()
        .await?;

    Ok(MergeResult {
        success: result.success,
        merge_type: MergeType::Normal,
        commit_oid: None,
        conflicts: Vec::new(),
        message: if result.success {
            "Merge completed successfully.".to_string()
        } else {
            result.stderr.trim().to_string()
        },
    })
}

// ==================== Rebase Commands ====================

/// Start a rebase onto a target branch
#[tauri::command]
#[specta::specta]
pub async fn rebase_branch(
    state: State<'_, AppState>,
    options: RebaseOptions,
    bypass_hooks: Option<bool>,
) -> Result<RebaseResult> {
    let settings = state.get_settings()?;
    let git_service = state.get_git_service()?;

    // Use explicit bypass_hooks param if provided, otherwise use settings
    let skip_hooks = bypass_hooks.unwrap_or(settings.bypass_hooks);

    let guard = git_service.write().await;

    // Get current branch name for pre-rebase hook
    let current_branch = guard.get_current_branch().await;

    // Run pre-rebase hook (can abort)
    if !skip_hooks {
        let app_handle = state.get_app_handle()?;
        let emitter = HookProgressEmitter::new(app_handle, state.progress_registry());
        let hook_result = guard
            .run_pre_rebase(&options.onto, current_branch.as_deref(), Some(&emitter))
            .await;

        if hook_result.is_cancelled() {
            return Err(AxisError::Other("Hook cancelled by user".into()));
        }

        if !hook_result.skipped && !hook_result.success {
            let output = if hook_result.stderr.is_empty() {
                &hook_result.stdout
            } else {
                &hook_result.stderr
            };
            return Err(AxisError::Other(format!(
                "Hook 'pre-rebase' failed:\n{}",
                output.trim()
            )));
        }
    }

    let result = guard.rebase(&options.onto, options.interactive).await?;

    if result.success {
        Ok(RebaseResult {
            success: true,
            commits_rebased: 0,
            current_commit: None,
            total_commits: None,
            conflicts: Vec::new(),
            message: result.stdout.trim().to_string(),
        })
    } else if result.stdout.contains("CONFLICT") {
        let conflicts = guard.get_conflicted_files_enriched().await?;

        Ok(RebaseResult {
            success: false,
            commits_rebased: 0,
            current_commit: None,
            total_commits: None,
            conflicts,
            message: "Rebase conflicts detected. Please resolve conflicts and continue."
                .to_string(),
        })
    } else {
        Err(AxisError::Other(format!(
            "Rebase failed: {}",
            result.stderr.trim()
        )))
    }
}

/// Abort an in-progress rebase
#[tauri::command]
#[specta::specta]
pub async fn rebase_abort(state: State<'_, AppState>) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .rebase_abort()
        .await?;
    Ok(())
}

/// Continue a rebase after resolving conflicts
#[tauri::command]
#[specta::specta]
pub async fn rebase_continue(state: State<'_, AppState>) -> Result<RebaseResult> {
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    let result = guard.rebase_continue().await?;

    if result.success {
        Ok(RebaseResult {
            success: true,
            commits_rebased: 0,
            current_commit: None,
            total_commits: None,
            conflicts: Vec::new(),
            message: "Rebase continued successfully.".to_string(),
        })
    } else if result.stdout.contains("CONFLICT") {
        let conflicts = guard.get_conflicted_files_enriched().await?;

        Ok(RebaseResult {
            success: false,
            commits_rebased: 0,
            current_commit: None,
            total_commits: None,
            conflicts,
            message: "More conflicts detected. Please resolve and continue.".to_string(),
        })
    } else {
        Err(AxisError::Other(format!(
            "Rebase continue failed: {}",
            result.stderr.trim()
        )))
    }
}

/// Skip the current commit during rebase
#[tauri::command]
#[specta::specta]
pub async fn rebase_skip(state: State<'_, AppState>) -> Result<RebaseResult> {
    let result = state.get_git_service()?.write().await.rebase_skip().await?;

    Ok(RebaseResult {
        success: result.success,
        commits_rebased: 0,
        current_commit: None,
        total_commits: None,
        conflicts: Vec::new(),
        message: if result.success {
            "Commit skipped.".to_string()
        } else {
            result.stderr.trim().to_string()
        },
    })
}

/// Get preview information for a rebase operation
#[tauri::command]
#[specta::specta]
pub async fn get_rebase_preview(state: State<'_, AppState>, onto: String) -> Result<RebasePreview> {
    state
        .get_git_service()?
        .read()
        .await
        .get_rebase_preview(&onto)
        .await
}

/// Get interactive rebase preview with entries prepared for editing
#[tauri::command]
#[specta::specta]
pub async fn get_interactive_rebase_preview(
    state: State<'_, AppState>,
    onto: String,
) -> Result<InteractiveRebasePreview> {
    let git_service = state.get_git_service()?;
    let guard = git_service.read().await;
    let preview = guard.get_rebase_preview(&onto).await?;

    // Convert commits to interactive entries with default 'pick' action
    let entries: Vec<InteractiveRebaseEntry> = preview
        .commits_to_rebase
        .iter()
        .enumerate()
        .map(|(i, commit)| InteractiveRebaseEntry {
            action: RebaseAction::Pick,
            short_oid: commit.short_oid.clone(),
            oid: commit.oid.clone(),
            summary: commit.summary.clone(),
            original_index: i,
        })
        .collect();

    Ok(InteractiveRebasePreview { preview, entries })
}

/// Start an interactive rebase with pre-configured actions
#[tauri::command]
#[specta::specta]
pub async fn interactive_rebase(
    state: State<'_, AppState>,
    options: InteractiveRebaseOptions,
    bypass_hooks: Option<bool>,
) -> Result<RebaseResult> {
    let settings = state.get_settings()?;
    let git_service = state.get_git_service()?;
    let skip_hooks = bypass_hooks.unwrap_or(settings.bypass_hooks);

    let guard = git_service.write().await;

    // Get current branch for pre-rebase hook
    let current_branch = guard.get_current_branch().await;

    // Run pre-rebase hook
    if !skip_hooks {
        let app_handle = state.get_app_handle()?;
        let emitter = HookProgressEmitter::new(app_handle, state.progress_registry());
        let hook_result = guard
            .run_pre_rebase(&options.onto, current_branch.as_deref(), Some(&emitter))
            .await;

        if hook_result.is_cancelled() {
            return Err(AxisError::Other("Hook cancelled by user".into()));
        }

        if !hook_result.skipped && !hook_result.success {
            let output = if hook_result.stderr.is_empty() {
                &hook_result.stdout
            } else {
                &hook_result.stderr
            };
            return Err(AxisError::Other(format!(
                "Hook 'pre-rebase' failed:\n{}",
                output.trim()
            )));
        }
    }

    // Count non-dropped commits
    let commits_count = options
        .entries
        .iter()
        .filter(|e| e.action != RebaseAction::Drop)
        .count();

    // Execute interactive rebase
    let result = guard
        .interactive_rebase(&options.onto, &options.entries, options.autosquash)
        .await?;

    if result.success {
        Ok(RebaseResult {
            success: true,
            commits_rebased: commits_count,
            current_commit: None,
            total_commits: Some(options.entries.len()),
            conflicts: Vec::new(),
            message: result.stdout.trim().to_string(),
        })
    } else if result.stdout.contains("CONFLICT") {
        let conflicts = guard.get_conflicted_files_enriched().await?;

        Ok(RebaseResult {
            success: false,
            commits_rebased: 0,
            current_commit: None,
            total_commits: Some(options.entries.len()),
            conflicts,
            message: "Rebase conflicts detected. Please resolve conflicts and continue."
                .to_string(),
        })
    } else {
        Err(AxisError::Other(format!(
            "Interactive rebase failed: {}",
            result.stderr.trim()
        )))
    }
}

/// Get detailed rebase progress
#[tauri::command]
#[specta::specta]
pub async fn get_rebase_progress(state: State<'_, AppState>) -> Result<Option<RebaseProgress>> {
    state.get_git_service()?.read().await.get_rebase_progress()
}

/// Continue rebase with a new commit message (for Reword action)
#[tauri::command]
#[specta::specta]
pub async fn rebase_continue_with_message(
    state: State<'_, AppState>,
    message: String,
) -> Result<RebaseResult> {
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    let result = guard.rebase_continue_with_message(&message).await?;

    if result.success {
        Ok(RebaseResult {
            success: true,
            commits_rebased: 0,
            current_commit: None,
            total_commits: None,
            conflicts: Vec::new(),
            message: "Rebase continued successfully.".to_string(),
        })
    } else if result.stdout.contains("CONFLICT") || result.stderr.contains("CONFLICT") {
        let conflicts = guard.get_conflicted_files_enriched().await?;

        Ok(RebaseResult {
            success: false,
            commits_rebased: 0,
            current_commit: None,
            total_commits: None,
            conflicts,
            message: "Conflicts detected. Please resolve and continue.".to_string(),
        })
    } else {
        Err(AxisError::Other(format!(
            "Rebase continue failed: {}",
            result.stderr.trim()
        )))
    }
}

// ==================== Cherry-pick Commands ====================

/// Cherry-pick commits
#[tauri::command]
#[specta::specta]
pub async fn cherry_pick(
    state: State<'_, AppState>,
    options: CherryPickOptions,
) -> Result<CherryPickResult> {
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    let mut all_success = true;
    let mut all_conflicts = Vec::new();
    let commit_oids = Vec::new();

    for commit in &options.commits {
        let result = guard.cherry_pick(commit, options.no_commit).await?;

        if !result.success {
            all_success = false;
            if result.stdout.contains("CONFLICT") {
                all_conflicts.extend(guard.get_conflicted_files_enriched().await?);
                break; // Stop on first conflict
            }
            return Err(AxisError::Other(format!(
                "Cherry-pick failed: {}",
                result.stderr.trim()
            )));
        }
    }

    Ok(CherryPickResult {
        success: all_success,
        commit_oids,
        conflicts: all_conflicts,
        message: if all_success {
            format!(
                "Successfully cherry-picked {} commit(s).",
                options.commits.len()
            )
        } else {
            "Cherry-pick has conflicts. Please resolve and continue.".to_string()
        },
    })
}

/// Abort an in-progress cherry-pick
#[tauri::command]
#[specta::specta]
pub async fn cherry_pick_abort(state: State<'_, AppState>) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .cherry_pick_abort()
        .await?;
    Ok(())
}

/// Continue cherry-pick after resolving conflicts
#[tauri::command]
#[specta::specta]
pub async fn cherry_pick_continue(state: State<'_, AppState>) -> Result<CherryPickResult> {
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    let result = guard.cherry_pick_continue().await?;

    if result.success {
        Ok(CherryPickResult {
            success: true,
            commit_oids: Vec::new(),
            conflicts: Vec::new(),
            message: "Cherry-pick completed successfully.".to_string(),
        })
    } else if result.stdout.contains("CONFLICT") {
        let conflicts = guard.get_conflicted_files_enriched().await?;

        Ok(CherryPickResult {
            success: false,
            commit_oids: Vec::new(),
            conflicts,
            message: "More conflicts detected. Please resolve and continue.".to_string(),
        })
    } else {
        Err(AxisError::Other(format!(
            "Cherry-pick continue failed: {}",
            result.stderr.trim()
        )))
    }
}

/// Skip the current commit during cherry-pick
#[tauri::command]
#[specta::specta]
pub async fn cherry_pick_skip(state: State<'_, AppState>) -> Result<CherryPickResult> {
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    let result = guard.cherry_pick_skip().await?;

    if result.success {
        Ok(CherryPickResult {
            success: true,
            commit_oids: Vec::new(),
            conflicts: Vec::new(),
            message: "Commit skipped.".to_string(),
        })
    } else if result.stdout.contains("CONFLICT") {
        let conflicts = guard.get_conflicted_files_enriched().await?;

        Ok(CherryPickResult {
            success: false,
            commit_oids: Vec::new(),
            conflicts,
            message: "More conflicts detected. Please resolve and continue.".to_string(),
        })
    } else {
        Err(AxisError::Other(format!(
            "Cherry-pick skip failed: {}",
            result.stderr.trim()
        )))
    }
}

// ==================== Revert Commands ====================

/// Revert commits
#[tauri::command]
#[specta::specta]
pub async fn revert_commits(
    state: State<'_, AppState>,
    options: RevertOptions,
) -> Result<RevertResult> {
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    let mut all_success = true;
    let mut all_conflicts = Vec::new();

    for commit in &options.commits {
        let result = guard.revert(commit, options.no_commit).await?;

        if !result.success {
            all_success = false;
            if result.stdout.contains("CONFLICT") {
                all_conflicts.extend(guard.get_conflicted_files_enriched().await?);
                break;
            }
            return Err(AxisError::Other(format!(
                "Revert failed: {}",
                result.stderr.trim()
            )));
        }
    }

    Ok(RevertResult {
        success: all_success,
        commit_oids: Vec::new(),
        conflicts: all_conflicts,
        message: if all_success {
            format!("Successfully reverted {} commit(s).", options.commits.len())
        } else {
            "Revert has conflicts. Please resolve and continue.".to_string()
        },
    })
}

/// Abort an in-progress revert
#[tauri::command]
#[specta::specta]
pub async fn revert_abort(state: State<'_, AppState>) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .revert_abort()
        .await?;
    Ok(())
}

/// Continue revert after resolving conflicts
#[tauri::command]
#[specta::specta]
pub async fn revert_continue(state: State<'_, AppState>) -> Result<RevertResult> {
    let result = state
        .get_git_service()?
        .write()
        .await
        .revert_continue()
        .await?;

    Ok(RevertResult {
        success: result.success,
        commit_oids: Vec::new(),
        conflicts: Vec::new(),
        message: if result.success {
            "Revert completed successfully.".to_string()
        } else {
            result.stderr.trim().to_string()
        },
    })
}

// ==================== Conflict Resolution Commands ====================

/// Get list of conflicted files
#[tauri::command]
#[specta::specta]
pub async fn get_conflicted_files(state: State<'_, AppState>) -> Result<Vec<ConflictedFile>> {
    let git_service = state.get_git_service()?;
    let guard = git_service.read().await;
    guard.get_conflicted_files_enriched().await
}

/// Get three-way content for a conflicted file
#[tauri::command]
#[specta::specta]
pub async fn get_conflict_content(
    state: State<'_, AppState>,
    path: String,
) -> Result<ConflictContent> {
    let repo_path = state.ensure_repository_open()?;
    let git_service = state.get_git_service()?;
    let guard = git_service.read().await;

    let base = guard.get_conflict_base(&path).await.ok();
    let ours = guard.get_conflict_ours(&path).await.ok();
    let theirs = guard.get_conflict_theirs(&path).await.ok();

    // Read current working tree content
    let merged = fs::read_to_string(repo_path.join(&path))?;

    Ok(ConflictContent {
        path,
        base,
        ours,
        theirs,
        merged,
    })
}

/// Resolve a conflict by choosing a version
#[tauri::command]
#[specta::specta]
pub async fn resolve_conflict(
    state: State<'_, AppState>,
    path: String,
    resolution: ConflictResolution,
    custom_content: Option<String>,
) -> Result<()> {
    let repo_path = state.ensure_repository_open()?;
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    match resolution {
        ConflictResolution::Ours => {
            guard
                .resolve_with_version(&path, crate::services::ConflictVersion::Ours)
                .await?;
        }
        ConflictResolution::Theirs => {
            guard
                .resolve_with_version(&path, crate::services::ConflictVersion::Theirs)
                .await?;
        }
        ConflictResolution::Merged => {
            // Write the custom content
            if let Some(content) = custom_content {
                fs::write(repo_path.join(&path), content)?;
                guard.mark_resolved(&path).await?;
            } else {
                return Err(AxisError::Other(
                    "Custom content required for merged resolution".to_string(),
                ));
            }
        }
    }

    Ok(())
}

/// Mark a file as resolved
#[tauri::command]
#[specta::specta]
pub async fn mark_conflict_resolved(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .mark_resolved(&path)
        .await?;
    Ok(())
}

/// Mark a file as unresolved (restore conflict markers)
#[tauri::command]
#[specta::specta]
pub async fn mark_conflict_unresolved(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .mark_unresolved(&path)
        .await?;
    Ok(())
}

// ==================== Operation State Commands ====================

/// Get the current operation in progress
#[tauri::command]
#[specta::specta]
pub async fn get_operation_state(state: State<'_, AppState>) -> Result<OperationState> {
    let git_service = state.get_git_service()?;
    let guard = git_service.read().await;

    if guard.is_rebasing()? {
        let progress = guard.get_rebase_progress()?;
        match progress {
            Some(p) => Ok(OperationState::Rebasing {
                onto: p.onto,
                current: Some(p.current_step),
                total: Some(p.total_steps),
                paused_action: p.paused_action,
                head_name: p.head_name,
            }),
            None => Ok(OperationState::Rebasing {
                onto: None,
                current: None,
                total: None,
                paused_action: None,
                head_name: None,
            }),
        }
    } else if guard.is_merging()? {
        Ok(OperationState::Merging { branch: None })
    } else if guard.is_cherry_picking()? {
        Ok(OperationState::CherryPicking { commit: None })
    } else if guard.is_reverting()? {
        Ok(OperationState::Reverting { commit: None })
    } else if guard.is_bisecting()? {
        let bisect_state = guard.get_bisect_state().await?;
        Ok(OperationState::Bisecting {
            current_commit: bisect_state.current_commit,
            steps_remaining: bisect_state.steps_remaining,
        })
    } else {
        Ok(OperationState::None)
    }
}

// ==================== Reset Commands ====================

/// Reset the repository to a specific commit
#[tauri::command]
#[specta::specta]
pub async fn reset_to_commit(state: State<'_, AppState>, options: ResetOptions) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .reset(&options.target, options.mode)
        .await?;
    Ok(())
}
