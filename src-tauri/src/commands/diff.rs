use crate::error::Result;
use crate::models::{DiffOptions, DiffTarget, FileDiff};
use crate::state::AppState;
use tauri::ipc::Response;
use tauri::State;

/// Get diff based on the specified target
#[tauri::command]
#[specta::specta]
pub async fn get_diff(
    state: State<'_, AppState>,
    target: DiffTarget,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = state.get_service()?;
    let opts = options.unwrap_or_default();
    match target {
        DiffTarget::WorkdirToIndex => service.diff_workdir(&opts),
        DiffTarget::IndexToHead => service.diff_staged(&opts),
        DiffTarget::WorkdirToHead => service.diff_head(&opts),
        DiffTarget::Commit { oid } => service.diff_commit(&oid, &opts),
        DiffTarget::CommitToCommit { from, to } => service.diff_commits(&from, &to, &opts),
    }
}

/// Get diff for unstaged changes (working directory vs index)
#[tauri::command]
#[specta::specta]
pub async fn get_diff_workdir(
    state: State<'_, AppState>,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = state.get_service()?;
    let opts = options.unwrap_or_default();
    service.diff_workdir(&opts)
}

/// Get diff for staged changes (index vs HEAD)
#[tauri::command]
#[specta::specta]
pub async fn get_diff_staged(
    state: State<'_, AppState>,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = state.get_service()?;
    let opts = options.unwrap_or_default();
    service.diff_staged(&opts)
}

/// Get diff for all uncommitted changes (working directory vs HEAD)
#[tauri::command]
#[specta::specta]
pub async fn get_diff_head(
    state: State<'_, AppState>,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = state.get_service()?;
    let opts = options.unwrap_or_default();
    service.diff_head(&opts)
}

/// Get diff for a specific commit (commit vs its parent)
#[tauri::command]
#[specta::specta]
pub async fn get_diff_commit(
    state: State<'_, AppState>,
    oid: String,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = state.get_service()?;
    let opts = options.unwrap_or_default();
    service.diff_commit(&oid, &opts)
}

/// Get diff between two commits
#[tauri::command]
#[specta::specta]
pub async fn get_diff_commits(
    state: State<'_, AppState>,
    from_oid: String,
    to_oid: String,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let service = state.get_service()?;
    let opts = options.unwrap_or_default();
    service.diff_commits(&from_oid, &to_oid, &opts)
}

/// Get diff for a single file (staged or unstaged)
#[tauri::command]
#[specta::specta]
pub async fn get_file_diff(
    state: State<'_, AppState>,
    path: String,
    staged: bool,
    options: Option<DiffOptions>,
) -> Result<Option<FileDiff>> {
    let service = state.get_service()?;
    let opts = options.unwrap_or_default();
    service.diff_file(&path, staged, &opts)
}

/// Get blob content as raw bytes for a file at a specific commit
/// Returns ArrayBuffer to frontend for efficient binary transfer
/// If commit_oid is None, reads the file from the working directory
#[tauri::command]
pub async fn get_file_blob(
    state: State<'_, AppState>,
    path: String,
    commit_oid: Option<String>,
) -> Result<Response> {
    let service = state.get_service()?;
    let data = service.get_file_blob(&path, commit_oid.as_deref())?;
    Ok(Response::new(data))
}
