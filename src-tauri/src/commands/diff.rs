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
    state
        .get_git_service()?
        .read()
        .await
        .git2(move |git2| match target {
            DiffTarget::WorkdirToIndex => git2.diff_workdir(&opts),
            DiffTarget::IndexToHead => git2.diff_staged(&opts),
            DiffTarget::WorkdirToHead => git2.diff_head(&opts),
            DiffTarget::Commit { oid } => git2.diff_commit(&oid, &opts),
            DiffTarget::CommitToCommit { from, to } => git2.diff_commits(&from, &to, &opts),
        })
        .await
}

/// Get diff for unstaged changes (working directory vs index)
#[tauri::command]
#[specta::specta]
pub async fn get_diff_workdir(
    state: State<'_, AppState>,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let opts = options.unwrap_or_default();
    state
        .get_git_service()?
        .read()
        .await
        .git2(move |git2| git2.diff_workdir(&opts))
        .await
}

/// Get diff for staged changes (index vs HEAD)
#[tauri::command]
#[specta::specta]
pub async fn get_diff_staged(
    state: State<'_, AppState>,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let opts = options.unwrap_or_default();
    state
        .get_git_service()?
        .read()
        .await
        .git2(move |git2| git2.diff_staged(&opts))
        .await
}

/// Get diff for all uncommitted changes (working directory vs HEAD)
#[tauri::command]
#[specta::specta]
pub async fn get_diff_head(
    state: State<'_, AppState>,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let opts = options.unwrap_or_default();
    state
        .get_git_service()?
        .read()
        .await
        .git2(move |git2| git2.diff_head(&opts))
        .await
}

/// Get diff for a specific commit (commit vs its parent)
#[tauri::command]
#[specta::specta]
pub async fn get_diff_commit(
    state: State<'_, AppState>,
    oid: String,
    options: Option<DiffOptions>,
) -> Result<Vec<FileDiff>> {
    let opts = options.unwrap_or_default();
    state
        .get_git_service()?
        .read()
        .await
        .git2(move |git2| git2.diff_commit(&oid, &opts))
        .await
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
    let opts = options.unwrap_or_default();
    state
        .get_git_service()?
        .read()
        .await
        .git2(move |git2| git2.diff_commits(&from_oid, &to_oid, &opts))
        .await
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
    let opts = options.unwrap_or_default();
    state
        .get_git_service()?
        .read()
        .await
        .git2(move |git2| git2.diff_file(&path, staged, &opts))
        .await
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
    let data = state
        .get_git_service()?
        .read()
        .await
        .git2(move |git2| git2.get_file_blob(&path, commit_oid.as_deref()))
        .await?;
    Ok(Response::new(data))
}
