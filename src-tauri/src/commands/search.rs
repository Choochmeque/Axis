use crate::error::Result;
use crate::models::{GrepOptions, GrepResult};
use crate::state::AppState;
use tauri::State;

// ==================== Search Commands ====================

/// Search for content in the repository working tree
#[tauri::command]
#[specta::specta]
pub async fn grep_content(state: State<'_, AppState>, options: GrepOptions) -> Result<GrepResult> {
    state.get_git_service()?.read().await.grep(&options).await
}

/// Search for content in a specific commit
#[tauri::command]
#[specta::specta]
pub async fn grep_commit(
    state: State<'_, AppState>,
    commit_oid: String,
    options: GrepOptions,
) -> Result<GrepResult> {
    state
        .get_git_service()?
        .read()
        .await
        .grep_commit(&commit_oid, &options)
        .await
}
