use crate::error::{AxisError, Result};
use crate::models::{
    CherryPickOptions, CherryPickResult, ConflictContent, ConflictResolution, ConflictType,
    ConflictedFile, MergeOptions, MergeResult, MergeType, OperationState, RebaseOptions,
    RebaseResult, ResetMode, ResetOptions, RevertOptions, RevertResult,
};
use crate::services::GitCliService;
use crate::state::AppState;
use std::fs;
use std::path::PathBuf;
use tauri::State;

/// Helper to get GitCliService from current repository
fn get_cli_service(state: &State<AppState>) -> Result<GitCliService> {
    let path = state.ensure_repository_open()?;
    Ok(GitCliService::new(&path))
}

/// Helper to get the repository path
fn get_repo_path(state: &State<AppState>) -> Result<PathBuf> {
    state.ensure_repository_open()
}

// ==================== Merge Commands ====================

/// Merge a branch into the current branch
#[tauri::command]
pub async fn merge_branch(
    state: State<'_, AppState>,
    options: MergeOptions,
) -> Result<MergeResult> {
    let cli = get_cli_service(&state)?;

    // Check for ff_only case - use git2 for fast-forward detection
    if options.ff_only {
        // For now, just try the merge and let git handle ff_only semantics
    }

    let result = cli.merge(
        &options.branch,
        options.message.as_deref(),
        options.no_ff,
        options.squash,
    )?;

    if result.success {
        // Determine merge type from output
        let merge_type = if result.stdout.contains("Already up to date") {
            MergeType::UpToDate
        } else if result.stdout.contains("Fast-forward") {
            MergeType::FastForward
        } else {
            MergeType::Normal
        };

        Ok(MergeResult {
            success: true,
            merge_type,
            commit_oid: None, // Could parse from output
            conflicts: Vec::new(),
            message: result.stdout.trim().to_string(),
        })
    } else if result.stderr.contains("CONFLICT") || result.stderr.contains("Automatic merge failed") {
        // Merge has conflicts
        let conflicts = get_conflicted_files_internal(&cli)?;

        Ok(MergeResult {
            success: false,
            merge_type: MergeType::Conflicted,
            commit_oid: None,
            conflicts,
            message: "Merge conflicts detected. Please resolve conflicts and commit.".to_string(),
        })
    } else {
        Err(AxisError::Other(format!("Merge failed: {}", result.stderr.trim())))
    }
}

/// Abort an in-progress merge
#[tauri::command]
pub async fn merge_abort(state: State<'_, AppState>) -> Result<()> {
    let cli = get_cli_service(&state)?;
    cli.merge_abort()?;
    Ok(())
}

/// Continue a merge after resolving conflicts
#[tauri::command]
pub async fn merge_continue(state: State<'_, AppState>) -> Result<MergeResult> {
    let cli = get_cli_service(&state)?;
    let result = cli.merge_continue()?;

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
pub async fn rebase_branch(
    state: State<'_, AppState>,
    options: RebaseOptions,
) -> Result<RebaseResult> {
    let cli = get_cli_service(&state)?;

    let result = cli.rebase(&options.onto, options.interactive)?;

    if result.success {
        Ok(RebaseResult {
            success: true,
            commits_rebased: 0, // Would need to parse from output
            current_commit: None,
            total_commits: None,
            conflicts: Vec::new(),
            message: result.stdout.trim().to_string(),
        })
    } else if result.stderr.contains("CONFLICT") {
        let conflicts = get_conflicted_files_internal(&cli)?;

        Ok(RebaseResult {
            success: false,
            commits_rebased: 0,
            current_commit: None,
            total_commits: None,
            conflicts,
            message: "Rebase conflicts detected. Please resolve conflicts and continue.".to_string(),
        })
    } else {
        Err(AxisError::Other(format!("Rebase failed: {}", result.stderr.trim())))
    }
}

/// Abort an in-progress rebase
#[tauri::command]
pub async fn rebase_abort(state: State<'_, AppState>) -> Result<()> {
    let cli = get_cli_service(&state)?;
    cli.rebase_abort()?;
    Ok(())
}

/// Continue a rebase after resolving conflicts
#[tauri::command]
pub async fn rebase_continue(state: State<'_, AppState>) -> Result<RebaseResult> {
    let cli = get_cli_service(&state)?;
    let result = cli.rebase_continue()?;

    if result.success {
        Ok(RebaseResult {
            success: true,
            commits_rebased: 0,
            current_commit: None,
            total_commits: None,
            conflicts: Vec::new(),
            message: "Rebase continued successfully.".to_string(),
        })
    } else if result.stderr.contains("CONFLICT") {
        let conflicts = get_conflicted_files_internal(&cli)?;

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
pub async fn rebase_skip(state: State<'_, AppState>) -> Result<RebaseResult> {
    let cli = get_cli_service(&state)?;
    let result = cli.rebase_skip()?;

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

// ==================== Cherry-pick Commands ====================

/// Cherry-pick commits
#[tauri::command]
pub async fn cherry_pick(
    state: State<'_, AppState>,
    options: CherryPickOptions,
) -> Result<CherryPickResult> {
    let cli = get_cli_service(&state)?;

    let mut all_success = true;
    let mut all_conflicts = Vec::new();
    let mut commit_oids = Vec::new();

    for commit in &options.commits {
        let result = cli.cherry_pick(commit, options.no_commit)?;

        if !result.success {
            all_success = false;
            if result.stderr.contains("CONFLICT") {
                all_conflicts.extend(get_conflicted_files_internal(&cli)?);
                break; // Stop on first conflict
            } else {
                return Err(AxisError::Other(format!(
                    "Cherry-pick failed: {}",
                    result.stderr.trim()
                )));
            }
        }
    }

    Ok(CherryPickResult {
        success: all_success,
        commit_oids,
        conflicts: all_conflicts,
        message: if all_success {
            format!("Successfully cherry-picked {} commit(s).", options.commits.len())
        } else {
            "Cherry-pick has conflicts. Please resolve and continue.".to_string()
        },
    })
}

/// Abort an in-progress cherry-pick
#[tauri::command]
pub async fn cherry_pick_abort(state: State<'_, AppState>) -> Result<()> {
    let cli = get_cli_service(&state)?;
    cli.cherry_pick_abort()?;
    Ok(())
}

/// Continue cherry-pick after resolving conflicts
#[tauri::command]
pub async fn cherry_pick_continue(state: State<'_, AppState>) -> Result<CherryPickResult> {
    let cli = get_cli_service(&state)?;
    let result = cli.cherry_pick_continue()?;

    if result.success {
        Ok(CherryPickResult {
            success: true,
            commit_oids: Vec::new(),
            conflicts: Vec::new(),
            message: "Cherry-pick completed successfully.".to_string(),
        })
    } else if result.stderr.contains("CONFLICT") {
        let conflicts = get_conflicted_files_internal(&cli)?;

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

// ==================== Revert Commands ====================

/// Revert commits
#[tauri::command]
pub async fn revert_commits(
    state: State<'_, AppState>,
    options: RevertOptions,
) -> Result<RevertResult> {
    let cli = get_cli_service(&state)?;

    let mut all_success = true;
    let mut all_conflicts = Vec::new();

    for commit in &options.commits {
        let result = cli.revert(commit, options.no_commit)?;

        if !result.success {
            all_success = false;
            if result.stderr.contains("CONFLICT") {
                all_conflicts.extend(get_conflicted_files_internal(&cli)?);
                break;
            } else {
                return Err(AxisError::Other(format!(
                    "Revert failed: {}",
                    result.stderr.trim()
                )));
            }
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
pub async fn revert_abort(state: State<'_, AppState>) -> Result<()> {
    let cli = get_cli_service(&state)?;
    cli.revert_abort()?;
    Ok(())
}

/// Continue revert after resolving conflicts
#[tauri::command]
pub async fn revert_continue(state: State<'_, AppState>) -> Result<RevertResult> {
    let cli = get_cli_service(&state)?;
    let result = cli.revert_continue()?;

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
pub async fn get_conflicted_files(state: State<'_, AppState>) -> Result<Vec<ConflictedFile>> {
    let cli = get_cli_service(&state)?;
    get_conflicted_files_internal(&cli)
}

/// Get three-way content for a conflicted file
#[tauri::command]
pub async fn get_conflict_content(
    state: State<'_, AppState>,
    path: String,
) -> Result<ConflictContent> {
    let cli = get_cli_service(&state)?;
    let repo_path = get_repo_path(&state)?;

    let base = cli.get_conflict_base(&path).ok();
    let ours = cli.get_conflict_ours(&path).ok();
    let theirs = cli.get_conflict_theirs(&path).ok();

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
pub async fn resolve_conflict(
    state: State<'_, AppState>,
    path: String,
    resolution: ConflictResolution,
    custom_content: Option<String>,
) -> Result<()> {
    let cli = get_cli_service(&state)?;
    let repo_path = get_repo_path(&state)?;

    match resolution {
        ConflictResolution::Ours => {
            cli.resolve_with_version(&path, crate::services::ConflictVersion::Ours)?;
        }
        ConflictResolution::Theirs => {
            cli.resolve_with_version(&path, crate::services::ConflictVersion::Theirs)?;
        }
        ConflictResolution::Merged => {
            // Write the custom content
            if let Some(content) = custom_content {
                fs::write(repo_path.join(&path), content)?;
                cli.mark_resolved(&path)?;
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
pub async fn mark_conflict_resolved(state: State<'_, AppState>, path: String) -> Result<()> {
    let cli = get_cli_service(&state)?;
    cli.mark_resolved(&path)?;
    Ok(())
}

// ==================== Operation State Commands ====================

/// Get the current operation in progress
#[tauri::command]
pub async fn get_operation_state(state: State<'_, AppState>) -> Result<OperationState> {
    let cli = get_cli_service(&state)?;

    if cli.is_rebasing()? {
        Ok(OperationState::Rebasing {
            onto: None, // Would need to parse from rebase state files
            current: None,
            total: None,
        })
    } else if cli.is_merging()? {
        Ok(OperationState::Merging { branch: None })
    } else if cli.is_cherry_picking()? {
        Ok(OperationState::CherryPicking { commit: None })
    } else if cli.is_reverting()? {
        Ok(OperationState::Reverting { commit: None })
    } else {
        Ok(OperationState::None)
    }
}

// ==================== Reset Commands ====================

/// Reset the repository to a specific commit
#[tauri::command]
pub async fn reset_to_commit(state: State<'_, AppState>, options: ResetOptions) -> Result<()> {
    let cli = get_cli_service(&state)?;

    let mode = match options.mode {
        ResetMode::Soft => crate::services::ResetMode::Soft,
        ResetMode::Mixed => crate::services::ResetMode::Mixed,
        ResetMode::Hard => crate::services::ResetMode::Hard,
    };

    cli.reset(&options.target, mode)?;
    Ok(())
}

// ==================== Helper Functions ====================

fn get_conflicted_files_internal(cli: &GitCliService) -> Result<Vec<ConflictedFile>> {
    let files = cli.get_conflicted_files()?;

    Ok(files
        .into_iter()
        .map(|path| ConflictedFile {
            path,
            conflict_type: ConflictType::Content, // Default, would need more parsing
            is_resolved: false,
        })
        .collect())
}
