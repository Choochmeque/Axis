use crate::error::Result;
use crate::models::{BlameResult, GraphOptions, GraphResult, SearchOptions, SearchResult};
use crate::state::AppState;
use tauri::State;

/// Build commit graph with lane assignments for visualization
#[tauri::command]
#[specta::specta]
pub async fn build_graph(
    state: State<'_, AppState>,
    options: Option<GraphOptions>,
) -> Result<GraphResult> {
    let service = state.get_service()?;
    service.build_graph(options.unwrap_or_default())
}

/// Search commits by message, author, or hash
#[tauri::command]
#[specta::specta]
pub async fn search_commits(
    state: State<'_, AppState>,
    options: SearchOptions,
) -> Result<SearchResult> {
    let service = state.get_service()?;
    service.search_commits(options)
}

/// Get blame information for a file
#[tauri::command]
#[specta::specta]
pub async fn blame_file(
    state: State<'_, AppState>,
    path: String,
    commit_oid: Option<String>,
) -> Result<BlameResult> {
    let service = state.get_service()?;
    service.blame_file(&path, commit_oid.as_deref())
}

/// Get total commit count for pagination
#[tauri::command]
#[specta::specta]
pub async fn get_commit_count(
    state: State<'_, AppState>,
    from_ref: Option<String>,
) -> Result<usize> {
    let service = state.get_service()?;
    service.get_commit_count(from_ref.as_deref())
}
