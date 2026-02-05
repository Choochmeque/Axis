use crate::error::Result;
use crate::models::{StashApplyOptions, StashEntry, StashResult, StashSaveOptions};
use crate::state::AppState;
use tauri::State;

// ==================== Stash Commands ====================

/// List all stash entries
#[tauri::command]
#[specta::specta]
pub async fn stash_list(state: State<'_, AppState>) -> Result<Vec<StashEntry>> {
    state.get_git_service()?.read().await.stash_list().await
}

/// Create a new stash
#[tauri::command]
#[specta::specta]
pub async fn stash_save(
    state: State<'_, AppState>,
    options: StashSaveOptions,
) -> Result<StashResult> {
    state
        .get_git_service()?
        .write()
        .await
        .stash_save(&options)
        .await
}

/// Apply a stash (keep it in the stash list)
#[tauri::command]
#[specta::specta]
pub async fn stash_apply(
    state: State<'_, AppState>,
    options: StashApplyOptions,
) -> Result<StashResult> {
    state
        .get_git_service()?
        .write()
        .await
        .stash_apply(&options)
        .await
}

/// Pop a stash (apply and remove from stash list)
#[tauri::command]
#[specta::specta]
pub async fn stash_pop(
    state: State<'_, AppState>,
    options: StashApplyOptions,
) -> Result<StashResult> {
    state
        .get_git_service()?
        .write()
        .await
        .stash_pop(&options)
        .await
}

/// Drop a stash entry
#[tauri::command]
#[specta::specta]
pub async fn stash_drop(state: State<'_, AppState>, index: Option<usize>) -> Result<StashResult> {
    state
        .get_git_service()?
        .write()
        .await
        .stash_drop(index)
        .await
}

/// Clear all stashes
#[tauri::command]
#[specta::specta]
pub async fn stash_clear(state: State<'_, AppState>) -> Result<StashResult> {
    state.get_git_service()?.write().await.stash_clear().await
}

/// Show the diff of a stash
#[tauri::command]
#[specta::specta]
pub async fn stash_show(
    state: State<'_, AppState>,
    index: Option<usize>,
    stat_only: bool,
) -> Result<String> {
    state
        .get_git_service()?
        .read()
        .await
        .stash_show(index, stat_only)
        .await
}

/// Create a branch from a stash
#[tauri::command]
#[specta::specta]
pub async fn stash_branch(
    state: State<'_, AppState>,
    branch_name: String,
    index: Option<usize>,
) -> Result<StashResult> {
    state
        .get_git_service()?
        .write()
        .await
        .stash_branch(&branch_name, index)
        .await
}
