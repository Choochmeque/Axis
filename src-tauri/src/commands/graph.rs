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
    state
        .get_git_service()?
        .with_git2(|git2| git2.build_graph(options.unwrap_or_default()))
}

/// Search commits by message, author, or hash
#[tauri::command]
#[specta::specta]
pub async fn search_commits(
    state: State<'_, AppState>,
    options: SearchOptions,
) -> Result<SearchResult> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.search_commits(options))
}

/// Get blame information for a file
#[tauri::command]
#[specta::specta]
pub async fn blame_file(
    state: State<'_, AppState>,
    path: String,
    commit_oid: Option<String>,
) -> Result<BlameResult> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.blame_file(&path, commit_oid.as_deref()))
}

/// Get total commit count for pagination
#[tauri::command]
#[specta::specta]
pub async fn get_commit_count(
    state: State<'_, AppState>,
    from_ref: Option<String>,
) -> Result<usize> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.get_commit_count(from_ref.as_deref()))
}
