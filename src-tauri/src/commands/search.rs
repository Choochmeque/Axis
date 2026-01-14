use crate::error::Result;
use crate::models::{GrepOptions, GrepResult};
use crate::state::AppState;
use tauri::State;

// ==================== Search Commands ====================

/// Search for content in the repository working tree
#[tauri::command]
#[specta::specta]
pub async fn grep_content(state: State<'_, AppState>, options: GrepOptions) -> Result<GrepResult> {
    let cli = state.get_cli_service()?;
    cli.grep(&options)
}

/// Search for content in a specific commit
#[tauri::command]
#[specta::specta]
pub async fn grep_commit(
    state: State<'_, AppState>,
    commit_oid: String,
    options: GrepOptions,
) -> Result<GrepResult> {
    let cli = state.get_cli_service()?;
    cli.grep_commit(&commit_oid, &options)
}
