use crate::error::{AxisError, Result};
use crate::events::{GitOperationType, ProgressStage};
use crate::models::{FetchOptions, FetchResult, PullOptions, PushOptions, PushResult, Remote};
use crate::services::ProgressContext;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn list_remotes(state: State<'_, AppState>) -> Result<Vec<Remote>> {
    state.get_git_service()?.read().await.list_remotes().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_remote(state: State<'_, AppState>, name: String) -> Result<Remote> {
    state
        .get_git_service()?
        .read()
        .await
        .get_remote(&name)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn add_remote(state: State<'_, AppState>, name: String, url: String) -> Result<Remote> {
    state
        .get_git_service()?
        .write()
        .await
        .add_remote(&name, &url)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn remove_remote(state: State<'_, AppState>, name: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .remove_remote(&name)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn rename_remote(
    state: State<'_, AppState>,
    old_name: String,
    new_name: String,
) -> Result<Vec<String>> {
    state
        .get_git_service()?
        .write()
        .await
        .rename_remote(&old_name, &new_name)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn set_remote_url(state: State<'_, AppState>, name: String, url: String) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .set_remote_url(&name, &url)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn set_remote_push_url(
    state: State<'_, AppState>,
    name: String,
    url: String,
) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .set_remote_push_url(&name, &url)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_remote(
    state: State<'_, AppState>,
    remote_name: String,
    options: FetchOptions,
) -> Result<FetchResult> {
    let app_handle = state.get_app_handle()?;
    let ssh_creds = state.resolve_ssh_credentials(&remote_name)?;
    let ctx = ProgressContext::new(app_handle, state.progress_registry());

    ctx.emit(GitOperationType::Fetch, ProgressStage::Connecting, None);

    let cb = ctx.make_receive_callback(GitOperationType::Fetch);
    let result = state
        .get_git_service()?
        .write()
        .await
        .fetch(&remote_name, &options, None, Some(cb), ssh_creds)
        .await;

    ctx.handle_result(&result, GitOperationType::Fetch);

    result
}

#[tauri::command]
#[specta::specta]
pub async fn push_remote(
    state: State<'_, AppState>,
    remote_name: String,
    refspecs: Vec<String>,
    options: PushOptions,
    bypass_hooks: Option<bool>,
) -> Result<PushResult> {
    let settings = state.get_settings()?;
    let git_service = state.get_git_service()?;
    let ssh_creds = state.resolve_ssh_credentials(&remote_name)?;

    // Use explicit bypass_hooks param if provided, otherwise use settings
    let skip_hooks = bypass_hooks.unwrap_or(settings.bypass_hooks);

    // Run pre-push hook (can abort)
    if !skip_hooks {
        // Get remote URL for the hook
        let remote_url = git_service
            .read()
            .await
            .get_remote(&remote_name)
            .await
            .ok()
            .map(|r| r.url.clone())
            .flatten()
            .unwrap_or_default();

        let refs_stdin = git_service
            .read()
            .await
            .build_push_refs_stdin(&remote_name, &refspecs)
            .await;

        let hook_result = git_service
            .write()
            .await
            .run_pre_push(&remote_name, &remote_url, &refs_stdin)
            .await;

        if !hook_result.skipped && !hook_result.success {
            let output = if !hook_result.stderr.is_empty() {
                &hook_result.stderr
            } else {
                &hook_result.stdout
            };
            return Err(AxisError::Other(format!(
                "Hook 'pre-push' failed:\n{}",
                output.trim()
            )));
        }
    }

    let app_handle = state.get_app_handle()?;
    let ctx = ProgressContext::new(app_handle, state.progress_registry());

    ctx.emit(GitOperationType::Push, ProgressStage::Connecting, None);

    let cb = ctx.make_send_callback(GitOperationType::Push);
    let result = git_service
        .write()
        .await
        .push(&remote_name, &refspecs, &options, Some(cb), ssh_creds)
        .await;

    ctx.handle_result(&result, GitOperationType::Push);

    result
}

#[tauri::command]
#[specta::specta]
pub async fn push_current_branch(
    state: State<'_, AppState>,
    remote_name: String,
    options: PushOptions,
    bypass_hooks: Option<bool>,
) -> Result<PushResult> {
    let settings = state.get_settings()?;
    let git_service = state.get_git_service()?;
    let ssh_creds = state.resolve_ssh_credentials(&remote_name)?;

    // Use explicit bypass_hooks param if provided, otherwise use settings
    let skip_hooks = bypass_hooks.unwrap_or(settings.bypass_hooks);

    // Run pre-push hook (can abort)
    if !skip_hooks {
        // Get current branch name
        let current_branch = git_service.read().await.get_current_branch().await;

        if let Some(branch) = &current_branch {
            // Get remote URL for the hook
            let remote_url = git_service
                .read()
                .await
                .get_remote(&remote_name)
                .await
                .ok()
                .map(|r| r.url.clone())
                .flatten()
                .unwrap_or_default();

            let refspecs = vec![branch.clone()];
            let refs_stdin = git_service
                .read()
                .await
                .build_push_refs_stdin(&remote_name, &refspecs)
                .await;

            let hook_result = git_service
                .write()
                .await
                .run_pre_push(&remote_name, &remote_url, &refs_stdin)
                .await;

            if !hook_result.skipped && !hook_result.success {
                let output = if !hook_result.stderr.is_empty() {
                    &hook_result.stderr
                } else {
                    &hook_result.stdout
                };
                return Err(AxisError::Other(format!(
                    "Hook 'pre-push' failed:\n{}",
                    output.trim()
                )));
            }
        }
    }

    let app_handle = state.get_app_handle()?;
    let ctx = ProgressContext::new(app_handle, state.progress_registry());

    ctx.emit(GitOperationType::Push, ProgressStage::Connecting, None);

    let cb = ctx.make_send_callback(GitOperationType::Push);
    let result = git_service
        .write()
        .await
        .push_current_branch(&remote_name, &options, Some(cb), ssh_creds)
        .await;

    ctx.handle_result(&result, GitOperationType::Push);

    result
}

#[tauri::command]
#[specta::specta]
pub async fn pull_remote(
    state: State<'_, AppState>,
    remote_name: String,
    branch_name: String,
    options: PullOptions,
) -> Result<()> {
    let app_handle = state.get_app_handle()?;
    let ssh_creds = state.resolve_ssh_credentials(&remote_name)?;
    let ctx = ProgressContext::new(app_handle, state.progress_registry());

    ctx.emit(GitOperationType::Pull, ProgressStage::Connecting, None);

    let cb = ctx.make_receive_callback(GitOperationType::Pull);
    let result = state
        .get_git_service()?
        .write()
        .await
        .pull(&remote_name, &branch_name, &options, Some(cb), ssh_creds)
        .await;

    ctx.handle_result(&result, GitOperationType::Pull);

    result
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_all(state: State<'_, AppState>) -> Result<Vec<FetchResult>> {
    let app_handle = state.get_app_handle()?;
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    let remotes = guard.list_remotes().await?;
    let options = FetchOptions::default();

    let mut results = Vec::new();
    let mut errors = Vec::new();
    for remote in remotes {
        let ssh_creds = state.resolve_ssh_credentials(&remote.name)?;
        let ctx = ProgressContext::new(app_handle.clone(), state.progress_registry());
        ctx.emit(GitOperationType::Fetch, ProgressStage::Connecting, None);

        let cb = ctx.make_receive_callback(GitOperationType::Fetch);
        let result = guard
            .fetch(&remote.name, &options, None, Some(cb), ssh_creds)
            .await;

        match result {
            Ok(fetch_result) => {
                results.push(fetch_result);
            }
            Err(e) => {
                log::error!("Failed to fetch from {}: {e}", remote.name);
                errors.push(format!("{}: {e}", remote.name));
            }
        }
    }

    if results.is_empty() && !errors.is_empty() {
        return Err(AxisError::Other(format!(
            "Failed to fetch:\n{}",
            errors.join("\n")
        )));
    }

    Ok(results)
}
