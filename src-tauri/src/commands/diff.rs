use crate::error::Result;
use crate::models::{DiffOptions, FileDiff};
use crate::services::Git2Service;
use crate::state::AppState;
use tauri::State;

/// Helper function to get the Git2Service for the current repository
fn get_service(state: &State<'_, AppState>) -> Result<Git2Service> {
    let path = state.ensure_repository_open()?;
    Git2Service::open(&path)
}

/// Get diff for unstaged changes (working directory vs index)
#[tauri::command]
pub async fn get_diff_workdir(
    state: State<'_, AppState>,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = get_service(&state)?;
    let opts = options.unwrap_or_default();
    service.diff_workdir(&opts)
}

/// Get diff for staged changes (index vs HEAD)
#[tauri::command]
pub async fn get_diff_staged(
    state: State<'_, AppState>,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = get_service(&state)?;
    let opts = options.unwrap_or_default();
    service.diff_staged(&opts)
}

/// Get diff for all uncommitted changes (working directory vs HEAD)
#[tauri::command]
pub async fn get_diff_head(
    state: State<'_, AppState>,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = get_service(&state)?;
    let opts = options.unwrap_or_default();
    service.diff_head(&opts)
}

/// Get diff for a specific commit (commit vs its parent)
#[tauri::command]
pub async fn get_diff_commit(
    state: State<'_, AppState>,
    oid: String,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = get_service(&state)?;
    let opts = options.unwrap_or_default();
    service.diff_commit(&oid, &opts)
}

/// Get diff between two commits
#[tauri::command]
pub async fn get_diff_commits(
    state: State<'_, AppState>,
    from_oid: String,
    to_oid: String,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = get_service(&state)?;
    let opts = options.unwrap_or_default();
    service.diff_commits(&from_oid, &to_oid, &opts)
}

/// Get diff for a single file (staged or unstaged)
#[tauri::command]
pub async fn get_file_diff(
    state: State<'_, AppState>,
    path: String,
    staged: bool,
    options: Option<DiffOptions>,
) -> Result<Option<FileDiff>> {
    let service = get_service(&state)?;
    let opts = options.unwrap_or_default();
    service.diff_file(&path, staged, &opts)
}
