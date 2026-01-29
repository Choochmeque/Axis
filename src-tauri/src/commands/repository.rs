use crate::error::{AxisError, Result};
use crate::events::{GitOperationType, ProgressStage};
use crate::models::{
    Branch, BranchFilter, Commit, LogOptions, RecentRepository, Repository, RepositoryStatus,
};
use crate::services::{Git2Service, ProgressContext};
use crate::state::AppState;
use std::path::PathBuf;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

#[tauri::command]
#[specta::specta]
pub async fn open_repository(state: State<'_, AppState>, path: String) -> Result<Repository> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(AxisError::InvalidRepositoryPath(path.display().to_string()));
    }

    // Use switch_active_repository to add to cache and set as active
    state.switch_active_repository(&path)?;

    // Get repo info from the cached service
    let handle = state.get_git_service()?;
    let repo_info = handle.with_git2(|git2| git2.get_repository_info()).await?;

    // Add to recent repositories
    state.add_recent_repository(&path, &repo_info.name)?;

    Ok(repo_info)
}

#[tauri::command]
#[specta::specta]
pub async fn init_repository(
    state: State<'_, AppState>,
    path: String,
    bare: bool,
) -> Result<Repository> {
    let path = PathBuf::from(&path);

    // Initialize the repository first (this creates a new Git2Service internally)
    let service = Git2Service::init(&path, bare)?;
    let repo_info = service.get_repository_info()?;

    // Now add to cache via switch_active_repository
    state.switch_active_repository(&path)?;

    // Add to recent repositories
    state.add_recent_repository(&path, &repo_info.name)?;

    Ok(repo_info)
}

#[tauri::command]
#[specta::specta]
pub async fn clone_repository(
    state: State<'_, AppState>,
    url: String,
    path: String,
) -> Result<Repository> {
    let path = PathBuf::from(&path);

    // Ensure target directory doesn't exist or is empty
    if path.exists()
        && path
            .read_dir()
            .map(|mut i| i.next().is_some())
            .unwrap_or(false)
    {
        return Err(AxisError::InvalidRepositoryPath(
            "Target directory is not empty".to_string(),
        ));
    }

    let app_handle = state.get_app_handle()?;
    let ctx = ProgressContext::new(app_handle, state.progress_registry());

    ctx.emit(GitOperationType::Clone, ProgressStage::Connecting, None);

    // Resolve global default SSH key for clone
    let settings = state.get_settings()?;
    let ssh_key = settings.default_ssh_key.clone();

    // Clone the repository first (this creates a new Git2Service internally)
    let result = Git2Service::clone(
        &url,
        &path,
        Some(ctx.make_receive_callback(GitOperationType::Clone)),
        ssh_key,
    );

    ctx.handle_result(&result, GitOperationType::Clone);

    let service = result?;
    let repo_info = service.get_repository_info()?;

    // Now add to cache via switch_active_repository
    state.switch_active_repository(&path)?;

    // Add to recent repositories
    state.add_recent_repository(&path, &repo_info.name)?;

    Ok(repo_info)
}

#[tauri::command]
#[specta::specta]
pub async fn close_repository(state: State<'_, AppState>) -> Result<()> {
    state.close_current_repository();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn switch_active_repository(
    state: State<'_, AppState>,
    path: String,
) -> Result<Repository> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(AxisError::InvalidRepositoryPath(path.display().to_string()));
    }

    state.switch_active_repository(&path)
}

#[tauri::command]
#[specta::specta]
pub async fn close_repository_path(state: State<'_, AppState>, path: String) -> Result<()> {
    let path = PathBuf::from(&path);
    state.close_repository(&path);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_repository_info(state: State<'_, AppState>) -> Result<Repository> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.get_repository_info())
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_repository_status(state: State<'_, AppState>) -> Result<RepositoryStatus> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.status())
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_commit_history(
    state: State<'_, AppState>,
    options: LogOptions,
) -> Result<Vec<Commit>> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.log(options))
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_branches(state: State<'_, AppState>, filter: BranchFilter) -> Result<Vec<Branch>> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.list_branches(filter))
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_commit(state: State<'_, AppState>, oid: String) -> Result<Commit> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.get_commit(&oid))
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_recent_repositories(state: State<'_, AppState>) -> Result<Vec<RecentRepository>> {
    state.get_recent_repositories()
}

#[tauri::command]
#[specta::specta]
pub async fn remove_recent_repository(state: State<'_, AppState>, path: String) -> Result<()> {
    let path = PathBuf::from(&path);
    state.remove_recent_repository(&path)
}

#[tauri::command]
#[specta::specta]
pub async fn show_in_folder(app_handle: AppHandle, path: String) -> Result<()> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(AxisError::FileNotFound(path.display().to_string()));
    }

    app_handle
        .opener()
        .reveal_item_in_dir(path)
        .map_err(|e| AxisError::Other(e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn open_url(app_handle: AppHandle, url: String) -> Result<()> {
    app_handle
        .opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| AxisError::Other(e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn open_terminal(path: String) -> Result<()> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(AxisError::FileNotFound(path.display().to_string()));
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-a", "Terminal", path.to_str().unwrap_or(".")])
            .spawn()
            .map_err(|e| AxisError::Other(e.to_string()))?;
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args([
                "/c",
                "start",
                "cmd",
                "/k",
                &format!("cd /d {}", path.display()),
            ])
            .spawn()
            .map_err(|e| AxisError::Other(e.to_string()))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try common terminal emulators
        let terminals = ["gnome-terminal", "konsole", "xterm", "x-terminal-emulator"];
        let mut launched = false;
        for term in terminals {
            if std::process::Command::new(term)
                .arg("--working-directory")
                .arg(&path)
                .spawn()
                .is_ok()
            {
                launched = true;
                break;
            }
        }
        if !launched {
            return Err(AxisError::Other("No terminal emulator found".to_string()));
        }
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn cancel_operation(state: State<'_, AppState>, operation_id: String) -> bool {
    state.progress_registry().cancel(&operation_id)
}
