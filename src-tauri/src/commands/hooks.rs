use crate::error::Result;
use crate::models::{GitHookType, HookDetails, HookInfo, HookTemplate};
use crate::state::AppState;
use tauri::State;

/// List all hooks with their status
#[tauri::command]
#[specta::specta]
pub async fn list_hooks(state: State<'_, AppState>) -> Result<Vec<HookInfo>> {
    Ok(state.get_git_service()?.with_hook(|hook| hook.list_hooks()))
}

/// Get hook details including content
#[tauri::command]
#[specta::specta]
pub async fn get_hook(state: State<'_, AppState>, hook_type: GitHookType) -> Result<HookDetails> {
    state
        .get_git_service()?
        .with_hook(|hook| hook.get_hook_details(hook_type))
}

/// Create a new hook
#[tauri::command]
#[specta::specta]
pub async fn create_hook(
    state: State<'_, AppState>,
    hook_type: GitHookType,
    content: String,
) -> Result<()> {
    state
        .get_git_service()?
        .with_hook(|hook| hook.create_hook(hook_type, &content))
}

/// Update an existing hook
#[tauri::command]
#[specta::specta]
pub async fn update_hook(
    state: State<'_, AppState>,
    hook_type: GitHookType,
    content: String,
) -> Result<()> {
    state
        .get_git_service()?
        .with_hook(|hook| hook.update_hook(hook_type, &content))
}

/// Delete a hook
#[tauri::command]
#[specta::specta]
pub async fn delete_hook(state: State<'_, AppState>, hook_type: GitHookType) -> Result<()> {
    state
        .get_git_service()?
        .with_hook(|hook| hook.delete_hook(hook_type))
}

/// Toggle hook enabled/disabled state
/// Returns the new enabled state
#[tauri::command]
#[specta::specta]
pub async fn toggle_hook(state: State<'_, AppState>, hook_type: GitHookType) -> Result<bool> {
    state
        .get_git_service()?
        .with_hook(|hook| hook.toggle_hook(hook_type))
}

/// Get available hook templates
#[tauri::command]
#[specta::specta]
pub async fn get_hook_templates(state: State<'_, AppState>) -> Result<Vec<HookTemplate>> {
    Ok(state
        .get_git_service()?
        .with_hook(|hook| hook.get_templates()))
}

/// Get templates for a specific hook type
#[tauri::command]
#[specta::specta]
pub async fn get_hook_templates_for_type(
    state: State<'_, AppState>,
    hook_type: GitHookType,
) -> Result<Vec<HookTemplate>> {
    Ok(state
        .get_git_service()?
        .with_hook(|hook| hook.get_templates_for_type(hook_type)))
}
