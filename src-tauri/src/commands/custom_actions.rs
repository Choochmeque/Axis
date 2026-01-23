use crate::error::Result;
use crate::models::{ActionContext, ActionExecutionResult, ActionVariables, CustomAction};
use crate::services::CustomActionsService;
use crate::state::AppState;
use tauri::{Manager, State};

/// List all global actions
#[tauri::command]
#[specta::specta]
pub async fn list_global_actions(app_handle: tauri::AppHandle) -> Result<Vec<CustomAction>> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AxisError::Other(format!("Failed to get app data dir: {e}")))?;

    CustomActionsService::read_global_actions(&app_data_dir)
}

/// Save a global action (create or update)
#[tauri::command]
#[specta::specta]
pub async fn save_global_action(app_handle: tauri::AppHandle, action: CustomAction) -> Result<()> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AxisError::Other(format!("Failed to get app data dir: {e}")))?;

    CustomActionsService::save_global_action(&app_data_dir, action)
}

/// Delete a global action
#[tauri::command]
#[specta::specta]
pub async fn delete_global_action(app_handle: tauri::AppHandle, action_id: String) -> Result<()> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AxisError::Other(format!("Failed to get app data dir: {e}")))?;

    CustomActionsService::delete_global_action(&app_data_dir, &action_id)
}

/// List all repository-specific actions
#[tauri::command]
#[specta::specta]
pub async fn list_repo_actions(state: State<'_, AppState>) -> Result<Vec<CustomAction>> {
    let repo_path = state.ensure_repository_open()?;
    CustomActionsService::read_repo_actions(&repo_path)
}

/// Save a repository-specific action (create or update)
#[tauri::command]
#[specta::specta]
pub async fn save_repo_action(state: State<'_, AppState>, action: CustomAction) -> Result<()> {
    let repo_path = state.ensure_repository_open()?;
    CustomActionsService::save_repo_action(&repo_path, action)
}

/// Delete a repository-specific action
#[tauri::command]
#[specta::specta]
pub async fn delete_repo_action(state: State<'_, AppState>, action_id: String) -> Result<()> {
    let repo_path = state.ensure_repository_open()?;
    CustomActionsService::delete_repo_action(&repo_path, &action_id)
}

/// Get all actions for a specific context (merged global + repo)
#[tauri::command]
#[specta::specta]
pub async fn get_actions_for_context(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    context: ActionContext,
) -> Result<Vec<CustomAction>> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AxisError::Other(format!("Failed to get app data dir: {e}")))?;

    let global_actions = CustomActionsService::read_global_actions(&app_data_dir)?;

    let repo_actions = if let Ok(repo_path) = state.ensure_repository_open() {
        CustomActionsService::read_repo_actions(&repo_path)?
    } else {
        Vec::new()
    };

    let merged = CustomActionsService::merge_actions(global_actions, repo_actions);
    let filtered = CustomActionsService::filter_by_context(&merged, context);

    Ok(filtered)
}

/// Get all actions (merged global + repo, unfiltered)
#[tauri::command]
#[specta::specta]
pub async fn get_all_actions(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<CustomAction>> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AxisError::Other(format!("Failed to get app data dir: {e}")))?;

    let global_actions = CustomActionsService::read_global_actions(&app_data_dir)?;

    let repo_actions = if let Ok(repo_path) = state.ensure_repository_open() {
        CustomActionsService::read_repo_actions(&repo_path)?
    } else {
        Vec::new()
    };

    Ok(CustomActionsService::merge_actions(
        global_actions,
        repo_actions,
    ))
}

/// Execute a custom action
#[tauri::command]
#[specta::specta]
pub async fn execute_custom_action(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    action_id: String,
    variables: ActionVariables,
) -> Result<ActionExecutionResult> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::AxisError::Other(format!("Failed to get app data dir: {e}")))?;

    // Find the action
    let global_actions = CustomActionsService::read_global_actions(&app_data_dir)?;
    let repo_actions = if let Ok(repo_path) = state.ensure_repository_open() {
        CustomActionsService::read_repo_actions(&repo_path)?
    } else {
        Vec::new()
    };

    let all_actions = CustomActionsService::merge_actions(global_actions, repo_actions);

    let action = all_actions
        .into_iter()
        .find(|a| a.id == action_id)
        .ok_or_else(|| crate::error::AxisError::Other(format!("Action not found: {action_id}")))?;

    CustomActionsService::execute(&action, &variables).await
}
