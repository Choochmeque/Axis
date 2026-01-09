use crate::error::Result;
use crate::models::{BlameResult, GraphOptions, GraphResult, SearchOptions, SearchResult};
use crate::services::Git2Service;
use crate::state::AppState;
use tauri::State;

/// Helper function to get the Git2Service for the current repository
fn get_service(state: &State<'_, AppState>) -> Result<Git2Service> {
    let path = state.ensure_repository_open()?;
    Git2Service::open(&path)
}

/// Build commit graph with lane assignments for visualization
#[tauri::command]
pub async fn build_graph(
    state: State<'_, AppState>,
    options: Option<GraphOptions>,
) -> Result<GraphResult> {
    let service = get_service(&state)?;
    service.build_graph(options.unwrap_or_default())
}

/// Search commits by message, author, or hash
#[tauri::command]
pub async fn search_commits(
    state: State<'_, AppState>,
    options: SearchOptions,
) -> Result<SearchResult> {
    let service = get_service(&state)?;
    service.search_commits(options)
}

/// Get blame information for a file
#[tauri::command]
pub async fn blame_file(
    state: State<'_, AppState>,
    path: String,
    commit_oid: Option<String>,
) -> Result<BlameResult> {
    let service = get_service(&state)?;
    service.blame_file(&path, commit_oid.as_deref())
}

/// Get total commit count for pagination
#[tauri::command]
pub async fn get_commit_count(
    state: State<'_, AppState>,
    from_ref: Option<String>,
) -> Result<usize> {
    let service = get_service(&state)?;
    service.get_commit_count(from_ref.as_deref())
}
