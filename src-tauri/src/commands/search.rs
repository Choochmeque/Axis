use crate::error::Result;
use crate::models::{GrepOptions, GrepResult};
use crate::services::GitCliService;
use crate::state::AppState;
use tauri::State;

/// Helper to get GitCliService from current repository
fn get_cli_service(state: &State<AppState>) -> Result<GitCliService> {
    let path = state.ensure_repository_open()?;
    Ok(GitCliService::new(&path))
}

// ==================== Search Commands ====================

/// Search for content in the repository working tree
#[tauri::command]
#[specta::specta]
pub async fn grep_content(state: State<'_, AppState>, options: GrepOptions) -> Result<GrepResult> {
    let cli = get_cli_service(&state)?;
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
    let cli = get_cli_service(&state)?;
    cli.grep_commit(&commit_oid, &options)
}
