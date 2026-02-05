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
    let opts = options.unwrap_or_default();
    let git_service = state.get_git_service()?;
    let guard = git_service.read().await;
    match target {
        DiffTarget::WorkdirToIndex => guard.diff_workdir(&opts).await,
        DiffTarget::IndexToHead => guard.diff_staged(&opts).await,
        DiffTarget::WorkdirToHead => guard.diff_head(&opts).await,
        DiffTarget::Commit { oid } => guard.diff_commit(&oid, &opts).await,
        DiffTarget::CommitToCommit { from, to } => guard.diff_commits(&from, &to, &opts).await,
    }
}

/// Get diff for a single file
#[tauri::command]
#[specta::specta]
pub async fn get_file_diff(
    state: State<'_, AppState>,
    path: String,
    staged: bool,
    options: Option<DiffOptions>,
) -> Result<Option<FileDiff>> {
    state
        .get_git_service()?
        .read()
        .await
        .diff_file(&path, staged, &options.unwrap_or_default())
        .await
}

/// Get file content at a specific commit (or working tree if no commit specified)
#[tauri::command]
pub async fn get_file_blob(
    state: State<'_, AppState>,
    path: String,
    commit_oid: Option<String>,
) -> Result<Response> {
    let data = state
        .get_git_service()?
        .read()
        .await
        .get_file_blob(&path, commit_oid.as_deref())
        .await?;
    Ok(Response::new(data))
}
