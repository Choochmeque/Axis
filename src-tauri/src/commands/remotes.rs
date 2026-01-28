use crate::error::{AxisError, Result};
use crate::events::{GitOperationType, ProgressStage};
use crate::models::{FetchOptions, FetchResult, PullOptions, PushOptions, PushResult, Remote};
use crate::services::ProgressContext;
use crate::state::{AppState, GitServiceHandle};
use tauri::State;

/// Build the refs stdin string for the pre-push hook
/// Format: <local ref> <local sha> <remote ref> <remote sha>\n per ref
fn build_push_refs_stdin(
    git_service: &GitServiceHandle,
    remote_name: &str,
    refspecs: &[String],
) -> String {
    let mut refs_lines = Vec::new();

    for refspec in refspecs {
        // Parse refspec (e.g., "refs/heads/main:refs/heads/main" or just "main")
        let (local_ref, remote_ref) = if refspec.contains(':') {
            let parts: Vec<&str> = refspec.split(':').collect();
            (parts[0].to_string(), parts[1].to_string())
        } else {
            // Simple branch name
            let full_ref = format!("refs/heads/{refspec}");
            (full_ref.clone(), full_ref)
        };

        // Get local SHA
        let local_sha = git_service
            .with_git2(|git2| {
                git2.repo().ok().and_then(|repo| {
                    repo.revparse_single(&local_ref)
                        .ok()
                        .map(|obj| obj.id().to_string())
                })
            })
            .unwrap_or_else(|| "0".repeat(40));

        // Get remote SHA (what the remote currently has)
        let remote_sha = git_service
            .with_git2(|git2| {
                let remote_ref_name = format!(
                    "refs/remotes/{remote_name}/{}",
                    refspec
                        .split(':')
                        .next()
                        .unwrap_or(refspec)
                        .replace("refs/heads/", "")
                );
                git2.repo().ok().and_then(|repo| {
                    repo.revparse_single(&remote_ref_name)
                        .ok()
                        .map(|obj| obj.id().to_string())
                })
            })
            .unwrap_or_else(|| "0".repeat(40));

        refs_lines.push(format!("{local_ref} {local_sha} {remote_ref} {remote_sha}"));
    }

    refs_lines.join("\n") + "\n"
}

#[tauri::command]
#[specta::specta]
pub async fn list_remotes(state: State<'_, AppState>) -> Result<Vec<Remote>> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.list_remotes())
}

#[tauri::command]
#[specta::specta]
pub async fn get_remote(state: State<'_, AppState>, name: String) -> Result<Remote> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.get_remote(&name))
}

#[tauri::command]
#[specta::specta]
pub async fn add_remote(state: State<'_, AppState>, name: String, url: String) -> Result<Remote> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.add_remote(&name, &url))
}

#[tauri::command]
#[specta::specta]
pub async fn remove_remote(state: State<'_, AppState>, name: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.remove_remote(&name))
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
        .with_git2(|git2| git2.rename_remote(&old_name, &new_name))
}

#[tauri::command]
#[specta::specta]
pub async fn set_remote_url(state: State<'_, AppState>, name: String, url: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.set_remote_url(&name, &url))
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
        .with_git2(|git2| git2.set_remote_push_url(&name, &url))
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_remote(
    state: State<'_, AppState>,
    remote_name: String,
    options: FetchOptions,
) -> Result<FetchResult> {
    let app_handle = state.get_app_handle()?;
    let git_service = state.get_git_service()?;
    let ctx = ProgressContext::new(app_handle, state.progress_registry());

    ctx.emit(GitOperationType::Fetch, ProgressStage::Connecting, None);

    let result = tauri::async_runtime::spawn_blocking(move || {
        let result = git_service.with_git2(|git2| {
            git2.fetch(
                &remote_name,
                &options,
                None,
                Some(ctx.make_receive_callback(GitOperationType::Fetch)),
            )
        });

        ctx.handle_result(&result, GitOperationType::Fetch);

        result
    })
    .await
    .map_err(|e| AxisError::Other(format!("Failed to fetch remote: {e}")))?;

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

    // Use explicit bypass_hooks param if provided, otherwise use settings
    let skip_hooks = bypass_hooks.unwrap_or(settings.bypass_hooks);

    // Run pre-push hook (can abort)
    if !skip_hooks {
        // Get remote URL for the hook
        let remote_url = git_service
            .with_git2(|git2| git2.get_remote(&remote_name).ok().map(|r| r.url.clone()))
            .flatten()
            .unwrap_or_default();

        let refs_stdin = build_push_refs_stdin(&git_service, &remote_name, &refspecs);

        let hook_result =
            git_service.with_hook(|hook| hook.run_pre_push(&remote_name, &remote_url, &refs_stdin));

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

    let result = git_service.with_git2(|git2| {
        git2.push(
            &remote_name,
            &refspecs,
            &options,
            Some(ctx.make_send_callback(GitOperationType::Push)),
        )
    });

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

    // Use explicit bypass_hooks param if provided, otherwise use settings
    let skip_hooks = bypass_hooks.unwrap_or(settings.bypass_hooks);

    // Run pre-push hook (can abort)
    if !skip_hooks {
        // Get current branch name
        let current_branch = git_service.with_git2(|git2| git2.get_current_branch());

        if let Some(branch) = &current_branch {
            // Get remote URL for the hook
            let remote_url = git_service
                .with_git2(|git2| git2.get_remote(&remote_name).ok().map(|r| r.url.clone()))
                .flatten()
                .unwrap_or_default();

            let refspecs = vec![branch.clone()];
            let refs_stdin = build_push_refs_stdin(&git_service, &remote_name, &refspecs);

            let hook_result = git_service
                .with_hook(|hook| hook.run_pre_push(&remote_name, &remote_url, &refs_stdin));

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

    let result = git_service.with_git2(|git2| {
        git2.push_current_branch(
            &remote_name,
            &options,
            Some(ctx.make_send_callback(GitOperationType::Push)),
        )
    });

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
    let ctx = ProgressContext::new(app_handle, state.progress_registry());

    ctx.emit(GitOperationType::Pull, ProgressStage::Connecting, None);

    let result = state.get_git_service()?.with_git2(|git2| {
        git2.pull(
            &remote_name,
            &branch_name,
            &options,
            Some(ctx.make_receive_callback(GitOperationType::Pull)),
        )
    });

    ctx.handle_result(&result, GitOperationType::Pull);

    result
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_all(state: State<'_, AppState>) -> Result<Vec<FetchResult>> {
    let app_handle = state.get_app_handle()?;
    let handle = state.get_git_service()?;
    let guard = handle.lock();
    let git2 = guard.git2();

    let remotes = git2.list_remotes()?;
    let options = FetchOptions::default();

    let mut results = Vec::new();
    for remote in remotes {
        let ctx = ProgressContext::new(app_handle.clone(), state.progress_registry());
        ctx.emit(GitOperationType::Fetch, ProgressStage::Connecting, None);

        match git2.fetch(
            &remote.name,
            &options,
            None,
            Some(ctx.make_receive_callback(GitOperationType::Fetch)),
        ) {
            Ok(result) => {
                ctx.emit_complete(GitOperationType::Fetch);
                results.push(result);
            }
            Err(e) => {
                ctx.emit_failed(GitOperationType::Fetch, &e.to_string());
                log::error!("Failed to fetch from {}: {e}", remote.name);
            }
        }
    }

    Ok(results)
}
