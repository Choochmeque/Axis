use std::fs;

use tauri::State;

use crate::error::{AxisError, Result};
use crate::models::LfsCheckResult;
use crate::services::{HookProgressEmitter, SigningService};
use crate::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn stage_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .stage_file(&path)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn stage_files(state: State<'_, AppState>, paths: Vec<String>) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .stage_files(&paths)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn stage_all(state: State<'_, AppState>) -> Result<()> {
    state.get_git_service()?.write().await.stage_all().await
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .unstage_file(&path)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_files(state: State<'_, AppState>, paths: Vec<String>) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .unstage_files(&paths)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_all(state: State<'_, AppState>) -> Result<()> {
    state.get_git_service()?.write().await.unstage_all().await
}

#[tauri::command]
#[specta::specta]
pub async fn discard_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .discard_file(&path)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn discard_unstaged(state: State<'_, AppState>) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .discard_unstaged()
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn create_commit(
    state: State<'_, AppState>,
    message: String,
    author_name: Option<String>,
    author_email: Option<String>,
    sign: Option<bool>,
    bypass_hooks: Option<bool>,
) -> Result<String> {
    let path = state.ensure_repository_open()?;
    let settings = state.get_settings()?;
    let git_service = state.get_git_service()?;

    // Use explicit bypass_hooks param if provided, otherwise use settings
    let skip_hooks = bypass_hooks.unwrap_or(settings.bypass_hooks);

    let guard = git_service.write().await;
    let mut final_message = message.clone();

    if !skip_hooks {
        // 1. Run pre-commit hook with progress emitter
        let app_handle = state.get_app_handle()?;
        let emitter = HookProgressEmitter::new(app_handle, state.progress_registry());
        let result = guard.run_pre_commit(Some(&emitter)).await;

        if result.is_cancelled() {
            return Err(AxisError::Other("Hook cancelled by user".into()));
        }

        if !result.skipped && !result.success {
            return Err(result.to_error());
        }

        // 2. Run prepare-commit-msg hook
        let msg_file = path.join(".git/COMMIT_EDITMSG");
        fs::write(&msg_file, &message)?;

        let msg_file_clone = msg_file.clone();
        let result = guard
            .run_prepare_commit_msg(&msg_file_clone, None, None)
            .await;
        if !result.skipped && !result.success {
            return Err(result.to_error());
        }

        // Read potentially modified message
        if !result.skipped {
            final_message = fs::read_to_string(&msg_file)?;
        }

        // 3. Run commit-msg hook
        let msg_file_clone = msg_file.clone();
        let result = guard.run_commit_msg(&msg_file_clone).await;
        if !result.skipped && !result.success {
            return Err(result.to_error());
        }

        // Read potentially modified message again
        if !result.skipped {
            final_message = fs::read_to_string(&msg_file)?;
        }
    }

    // Use explicit sign param if provided, otherwise use settings
    let should_sign = sign.unwrap_or(settings.sign_commits);

    let signing_config = if should_sign {
        let signing_service = SigningService::new(&path);
        let mut config = signing_service.get_config_from_git()?;

        // Override with repo-specific signing config if present
        let (repo_format, repo_key) = guard.get_repo_signing_config().await?;
        if let Some(format) = repo_format {
            config.format = format;
        }
        if let Some(key) = repo_key {
            config.signing_key = Some(key);
        }

        Some(config)
    } else {
        None
    };

    // 4. Create the commit
    let oid = guard
        .create_commit(
            &final_message,
            author_name.as_deref(),
            author_email.as_deref(),
            signing_config.as_ref(),
        )
        .await?;

    // 5. Run post-commit hook (don't fail on error, just log)
    if !skip_hooks {
        let result = guard.run_post_commit().await;
        if !result.skipped && !result.success {
            log::warn!("post-commit hook failed: {}", result.stderr);
        }
    }

    Ok(oid)
}

#[tauri::command]
#[specta::specta]
pub async fn amend_commit(
    state: State<'_, AppState>,
    message: Option<String>,
    bypass_hooks: Option<bool>,
) -> Result<String> {
    let path = state.ensure_repository_open()?;
    let settings = state.get_settings()?;
    let git_service = state.get_git_service()?;

    // Use explicit bypass_hooks param if provided, otherwise use settings
    let skip_hooks = bypass_hooks.unwrap_or(settings.bypass_hooks);

    let guard = git_service.write().await;

    // Get old commit OID before amend for post-rewrite hook
    let old_oid = guard.get_head_oid_opt().await;

    let mut final_message = message.clone();

    if let (false, Some(msg)) = (skip_hooks, &final_message) {
        // Run commit-msg hook on the new message
        let msg_file = path.join(".git/COMMIT_EDITMSG");
        fs::write(&msg_file, msg)?;

        let msg_file_clone = msg_file.clone();
        let result = guard.run_commit_msg(&msg_file_clone).await;
        if !result.skipped && !result.success {
            return Err(result.to_error());
        }

        // Read potentially modified message
        if !result.skipped {
            final_message = Some(fs::read_to_string(&msg_file)?);
        }
    }

    // Amend the commit
    let new_oid = guard.amend_commit(final_message.as_deref()).await?;

    // Run post-rewrite hook
    if !skip_hooks {
        if let Some(old) = old_oid {
            let rewrites = format!("{old} {new_oid}\n");
            let result = guard.run_post_rewrite("amend", &rewrites).await;
            if !result.skipped && !result.success {
                log::warn!("post-rewrite hook failed: {}", result.stderr);
            }
        }
    }

    Ok(new_oid)
}

#[tauri::command]
#[specta::specta]
pub async fn get_user_signature(state: State<'_, AppState>) -> Result<(String, String)> {
    state
        .get_git_service()?
        .read()
        .await
        .get_user_signature()
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn stage_hunk(state: State<'_, AppState>, patch: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .stage_hunk(&patch)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_hunk(state: State<'_, AppState>, patch: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .unstage_hunk(&patch)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn discard_hunk(state: State<'_, AppState>, patch: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .discard_hunk(&patch)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn delete_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .delete_file(&path)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn check_files_for_lfs(
    state: State<'_, AppState>,
    paths: Vec<String>,
    threshold: u64,
) -> Result<LfsCheckResult> {
    let git_service = state.get_git_service()?;
    let guard = git_service.read().await;

    // Get LFS status using existing CLI service
    let lfs_status = guard.lfs_status().await?;
    let tracked_patterns = if lfs_status.is_installed {
        guard.lfs_list_tracked_patterns().await.unwrap_or_default()
    } else {
        vec![]
    };

    // Check files using git2 service
    let pattern_strings: Vec<String> = tracked_patterns.iter().map(|p| p.pattern.clone()).collect();
    let files = guard
        .check_files_for_lfs(&paths, threshold, &pattern_strings)
        .await?;

    Ok(LfsCheckResult {
        files,
        lfs_installed: lfs_status.is_installed,
        lfs_initialized: lfs_status.is_initialized,
    })
}
