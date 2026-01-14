use crate::error::{AxisError, Result};
use crate::models::{
    Branch, BranchFilter, BranchFilterType, Commit, LogOptions, RecentRepository, Repository,
    RepositoryStatus, SortOrder,
};
use crate::services::Git2Service;
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

    let service = Git2Service::open(&path)?;
    let repo_info = service.get_repository_info()?;

    // Store the path in app state
    state.set_current_repository_path(path.clone());

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

    let service = Git2Service::init(&path, bare)?;
    let repo_info = service.get_repository_info()?;

    // Store the path in app state
    state.set_current_repository_path(path.clone());

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

    let service = Git2Service::clone(&url, &path)?;
    let repo_info = service.get_repository_info()?;

    // Store the path in app state
    state.set_current_repository_path(path.clone());

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
pub async fn get_repository_info(state: State<'_, AppState>) -> Result<Repository> {
    let service = state.get_service()?;
    service.get_repository_info()
}

#[tauri::command]
#[specta::specta]
pub async fn get_repository_status(state: State<'_, AppState>) -> Result<RepositoryStatus> {
    let service = state.get_service()?;
    service.status()
}

#[tauri::command]
#[specta::specta]
pub async fn get_commit_history(
    state: State<'_, AppState>,
    limit: Option<usize>,
    skip: Option<usize>,
    from_ref: Option<String>,
    branch_filter: Option<BranchFilterType>,
    include_remotes: Option<bool>,
    sort_order: Option<SortOrder>,
) -> Result<Vec<Commit>> {
    let service = state.get_service()?;
    let options = LogOptions {
        limit,
        skip,
        from_ref,
        branch_filter: branch_filter.unwrap_or_default(),
        include_remotes: include_remotes.unwrap_or(true),
        sort_order: sort_order.unwrap_or_default(),
    };
    service.log(options)
}

#[tauri::command]
#[specta::specta]
pub async fn get_branches(
    state: State<'_, AppState>,
    include_local: Option<bool>,
    include_remote: Option<bool>,
) -> Result<Vec<Branch>> {
    let service = state.get_service()?;
    let filter = BranchFilter {
        include_local: include_local.unwrap_or(true),
        include_remote: include_remote.unwrap_or(true),
    };
    service.list_branches(filter)
}

#[tauri::command]
#[specta::specta]
pub async fn get_commit(state: State<'_, AppState>, oid: String) -> Result<Commit> {
    let service = state.get_service()?;
    service.get_commit(&oid)
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
pub async fn start_file_watcher(state: State<'_, AppState>, app_handle: AppHandle) -> Result<()> {
    state.start_file_watcher(app_handle)
}

#[tauri::command]
#[specta::specta]
pub async fn stop_file_watcher(state: State<'_, AppState>) -> Result<()> {
    state.stop_file_watcher();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn is_file_watcher_active(state: State<'_, AppState>) -> Result<bool> {
    Ok(state.is_watching())
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
