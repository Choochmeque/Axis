use crate::error::Result;
use crate::models::{StashApplyOptions, StashEntry, StashResult, StashSaveOptions};
use crate::services::GitCliService;
use crate::state::AppState;
use tauri::State;

/// Helper to get GitCliService from current repository
fn get_cli_service(state: &State<AppState>) -> Result<GitCliService> {
    let path = state.ensure_repository_open()?;
    Ok(GitCliService::new(&path))
}

// ==================== Stash Commands ====================

/// List all stash entries
#[tauri::command]
pub async fn stash_list(state: State<'_, AppState>) -> Result<Vec<StashEntry>> {
    let cli = get_cli_service(&state)?;
    cli.stash_list()
}

/// Create a new stash
#[tauri::command]
pub async fn stash_save(
    state: State<'_, AppState>,
    options: StashSaveOptions,
) -> Result<StashResult> {
    let cli = get_cli_service(&state)?;
    cli.stash_save(&options)
}

/// Apply a stash (keep it in the stash list)
#[tauri::command]
pub async fn stash_apply(
    state: State<'_, AppState>,
    options: StashApplyOptions,
) -> Result<StashResult> {
    let cli = get_cli_service(&state)?;
    cli.stash_apply(&options)
}

/// Pop a stash (apply and remove from stash list)
#[tauri::command]
pub async fn stash_pop(
    state: State<'_, AppState>,
    options: StashApplyOptions,
) -> Result<StashResult> {
    let cli = get_cli_service(&state)?;
    cli.stash_pop(&options)
}

/// Drop a stash entry
#[tauri::command]
pub async fn stash_drop(state: State<'_, AppState>, index: Option<usize>) -> Result<StashResult> {
    let cli = get_cli_service(&state)?;
    cli.stash_drop(index)
}

/// Clear all stashes
#[tauri::command]
pub async fn stash_clear(state: State<'_, AppState>) -> Result<StashResult> {
    let cli = get_cli_service(&state)?;
    cli.stash_clear()
}

/// Show the diff of a stash
#[tauri::command]
pub async fn stash_show(
    state: State<'_, AppState>,
    index: Option<usize>,
    stat_only: bool,
) -> Result<String> {
    let cli = get_cli_service(&state)?;
    cli.stash_show(index, stat_only)
}

/// Create a branch from a stash
#[tauri::command]
pub async fn stash_branch(
    state: State<'_, AppState>,
    branch_name: String,
    index: Option<usize>,
) -> Result<StashResult> {
    let cli = get_cli_service(&state)?;
    cli.stash_branch(&branch_name, index)
}
