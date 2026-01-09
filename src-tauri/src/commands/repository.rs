use crate::error::{AxisError, Result};
use crate::models::{Branch, BranchFilter, Commit, LogOptions, RecentRepository, Repository, RepositoryStatus};
use crate::services::Git2Service;
use crate::state::AppState;
use std::path::PathBuf;
use tauri::State;

/// Helper function to get the Git2Service for the current repository
fn get_service(state: &State<'_, AppState>) -> Result<Git2Service> {
    let path = state.ensure_repository_open()?;
    Git2Service::open(&path)
}

#[tauri::command]
pub async fn open_repository(
    state: State<'_, AppState>,
    path: String,
) -> Result<Repository> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(AxisError::InvalidRepositoryPath(path.display().to_string()));
    }

    let service = Git2Service::open(&path)?;
    let repo_info = service.get_repository_info()?;

    // Store the path in app state
    state.set_current_repository_path(path.clone());

    // Add to recent repositories
    state.add_recent_repository(&path, &repo_info.name)?;

    Ok(repo_info)
}

#[tauri::command]
pub async fn init_repository(
    state: State<'_, AppState>,
    path: String,
    bare: bool,
) -> Result<Repository> {
    let path = PathBuf::from(&path);

    let service = Git2Service::init(&path, bare)?;
    let repo_info = service.get_repository_info()?;

    // Store the path in app state
    state.set_current_repository_path(path.clone());

    // Add to recent repositories
    state.add_recent_repository(&path, &repo_info.name)?;

    Ok(repo_info)
}

#[tauri::command]
pub async fn close_repository(state: State<'_, AppState>) -> Result<()> {
    state.close_current_repository();
    Ok(())
}

#[tauri::command]
pub async fn get_repository_info(state: State<'_, AppState>) -> Result<Repository> {
    let service = get_service(&state)?;
    service.get_repository_info()
}

#[tauri::command]
pub async fn get_repository_status(state: State<'_, AppState>) -> Result<RepositoryStatus> {
    let service = get_service(&state)?;
    service.status()
}

#[tauri::command]
pub async fn get_commit_history(
    state: State<'_, AppState>,
    limit: Option<usize>,
    skip: Option<usize>,
    from_ref: Option<String>,
) -> Result<Vec<Commit>> {
    let service = get_service(&state)?;
    let options = LogOptions {
        limit,
        skip,
        from_ref,
    };
    service.log(options)
}

#[tauri::command]
pub async fn get_branches(
    state: State<'_, AppState>,
    include_local: Option<bool>,
    include_remote: Option<bool>,
) -> Result<Vec<Branch>> {
    let service = get_service(&state)?;
    let filter = BranchFilter {
        include_local: include_local.unwrap_or(true),
        include_remote: include_remote.unwrap_or(true),
    };
    service.list_branches(filter)
}

#[tauri::command]
pub async fn get_commit(
    state: State<'_, AppState>,
    oid: String,
) -> Result<Commit> {
    let service = get_service(&state)?;
    service.get_commit(&oid)
}

#[tauri::command]
pub async fn get_recent_repositories(
    state: State<'_, AppState>,
) -> Result<Vec<RecentRepository>> {
    state.get_recent_repositories()
}
