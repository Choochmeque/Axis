use crate::error::{AxisError, Result};
use crate::models::HookResult;
use crate::services::SigningService;
use crate::state::AppState;
use std::fs;
use tauri::State;

/// Create an error from a failed hook result
fn hook_error(result: &HookResult) -> AxisError {
    let output = if !result.stderr.is_empty() {
        result.stderr.clone()
    } else if !result.stdout.is_empty() {
        result.stdout.clone()
    } else {
        format!(
            "Hook {} failed with exit code {}",
            result.hook_type, result.exit_code
        )
    };
    AxisError::Other(format!(
        "Hook '{}' failed:\n{}",
        result.hook_type,
        output.trim()
    ))
}

#[tauri::command]
#[specta::specta]
pub async fn stage_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.stage_file(&path))
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn stage_files(state: State<'_, AppState>, paths: Vec<String>) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.stage_files(&paths))
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn stage_all(state: State<'_, AppState>) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.stage_all())
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.unstage_file(&path))
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_files(state: State<'_, AppState>, paths: Vec<String>) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.unstage_files(&paths))
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_all(state: State<'_, AppState>) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.unstage_all())
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn discard_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.discard_file(&path))
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn discard_unstaged(state: State<'_, AppState>) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.discard_unstaged())
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

    let mut final_message = message.clone();

    if !skip_hooks {
        // 1. Run pre-commit hook
        let result = git_service.with_hook(|hook| hook.run_pre_commit());
        if !result.skipped && !result.success {
            return Err(hook_error(&result));
        }

        // 2. Run prepare-commit-msg hook
        let msg_file = path.join(".git/COMMIT_EDITMSG");
        fs::write(&msg_file, &message)?;

        let msg_file_clone = msg_file.clone();
        let result =
            git_service.with_hook(|hook| hook.run_prepare_commit_msg(&msg_file_clone, None, None));
        if !result.skipped && !result.success {
            return Err(hook_error(&result));
        }

        // Read potentially modified message
        if !result.skipped {
            final_message = fs::read_to_string(&msg_file)?;
        }

        // 3. Run commit-msg hook
        let msg_file_clone = msg_file.clone();
        let result = git_service.with_hook(|hook| hook.run_commit_msg(&msg_file_clone));
        if !result.skipped && !result.success {
            return Err(hook_error(&result));
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
        Some(signing_service.get_config_from_git()?)
    } else {
        None
    };

    // 4. Create the commit
    let oid = git_service
        .with_git2(move |git2| {
            git2.create_commit(
                &final_message,
                author_name.as_deref(),
                author_email.as_deref(),
                signing_config.as_ref(),
            )
        })
        .await?;

    // 5. Run post-commit hook (don't fail on error, just log)
    if !skip_hooks {
        let result = git_service.with_hook(|hook| hook.run_post_commit());
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

    // Get old commit OID before amend for post-rewrite hook
    let old_oid = git_service.with_git2(|git2| git2.get_head_oid_opt()).await;

    let mut final_message = message.clone();

    if let (false, Some(msg)) = (skip_hooks, &final_message) {
        // Run commit-msg hook on the new message
        let msg_file = path.join(".git/COMMIT_EDITMSG");
        fs::write(&msg_file, msg)?;

        let msg_file_clone = msg_file.clone();
        let result = git_service.with_hook(|hook| hook.run_commit_msg(&msg_file_clone));
        if !result.skipped && !result.success {
            return Err(hook_error(&result));
        }

        // Read potentially modified message
        if !result.skipped {
            final_message = Some(fs::read_to_string(&msg_file)?);
        }
    }

    // Amend the commit
    let new_oid = git_service
        .with_git2(move |git2| git2.amend_commit(final_message.as_deref()))
        .await?;

    // Run post-rewrite hook
    if !skip_hooks {
        if let Some(old) = old_oid {
            let rewrites = format!("{old} {new_oid}\n");
            let result = git_service.with_hook(|hook| hook.run_post_rewrite("amend", &rewrites));
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
        .with_git2(|git2| git2.get_user_signature())
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn stage_hunk(state: State<'_, AppState>, patch: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.stage_hunk(&patch))
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_hunk(state: State<'_, AppState>, patch: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.unstage_hunk(&patch))
}

#[tauri::command]
#[specta::specta]
pub async fn discard_hunk(state: State<'_, AppState>, patch: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.discard_hunk(&patch))
}

#[tauri::command]
#[specta::specta]
pub async fn delete_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.delete_file(&path))
        .await
}
