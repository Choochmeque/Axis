use crate::error::{AxisError, Result};
use crate::events::{GitOperationType, ProgressStage};
use crate::models::{
    Branch, BranchFilter, Commit, LogOptions, RecentRepository, Repository, RepositoryStatus,
    SshCredentials,
};
use crate::services::{GitService, ProgressContext};
use crate::state::AppState;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;
use url::Url;

fn validate_open_url(url: &str) -> Result<()> {
    let parsed = Url::parse(url).map_err(|_| AxisError::Other("Invalid URL".to_string()))?;
    match parsed.scheme() {
        "http" | "https" => Ok(()),
        scheme => Err(AxisError::Other(format!(
            "Unsupported URL scheme: {scheme}"
        ))),
    }
}

#[cfg(any(target_os = "windows", test))]
fn windows_terminal_command(path: &std::path::Path) -> Command {
    let mut command = Command::new("cmd");
    command.args(["/k"]).current_dir(path);
    command
}

#[tauri::command]
#[specta::specta]
pub async fn open_repository(state: State<'_, AppState>, path: String) -> Result<Repository> {
    let expanded_path = shellexpand::tilde(&path).to_string();
    let path = PathBuf::from(&expanded_path);

    if !path.exists() {
        return Err(AxisError::InvalidRepositoryPath(path.display().to_string()));
    }

    // Canonicalize path to ensure consistent storage (avoids duplicates from relative vs absolute paths)
    let path = path.canonicalize()?;

    // Use switch_active_repository to add to cache and set as active
    state.switch_active_repository(&path).await?;

    // Get repo info from the cached service
    let repo_info = state
        .get_git_service()?
        .read()
        .await
        .get_repository_info()
        .await?;

    // Add to recent repositories
    state.add_recent_repository(&path, &repo_info.name).await?;

    Ok(repo_info)
}

#[tauri::command]
#[specta::specta]
pub async fn init_repository(
    state: State<'_, AppState>,
    path: String,
    bare: bool,
) -> Result<Repository> {
    let expanded_path = shellexpand::tilde(&path).to_string();
    let path = PathBuf::from(&expanded_path);

    let app_handle = state.get_app_handle()?;
    let service = GitService::init(&path, bare, app_handle)?;
    let repo_info = service.git2().get_repository_info()?;

    // Canonicalize path after creation to ensure consistent storage
    let path = path.canonicalize()?;

    // Now add to cache via switch_active_repository
    state.switch_active_repository(&path).await?;

    // Add to recent repositories
    state.add_recent_repository(&path, &repo_info.name).await?;

    Ok(repo_info)
}

#[tauri::command]
#[specta::specta]
pub async fn clone_repository(
    state: State<'_, AppState>,
    url: String,
    path: String,
) -> Result<Repository> {
    let expanded_path = shellexpand::tilde(&path).to_string();
    let path = PathBuf::from(&expanded_path);

    // Ensure target directory doesn't exist or is empty
    if path.exists() && path.read_dir().is_ok_and(|mut i| i.next().is_some()) {
        return Err(AxisError::InvalidRepositoryPath(
            "Target directory is not empty".to_string(),
        ));
    }

    let app_handle = state.get_app_handle()?;
    let ctx = ProgressContext::new(app_handle.clone(), state.progress_registry());

    ctx.emit(GitOperationType::Clone, ProgressStage::Connecting, None);

    // Resolve global default SSH key for clone
    let settings = state.get_settings().await?;
    let ssh_creds = settings.default_ssh_key.clone().map(|key_path| {
        let passphrase = state.get_cached_ssh_passphrase(&key_path);
        SshCredentials {
            key_path,
            passphrase,
        }
    });

    let callback = ctx.make_receive_callback(GitOperationType::Clone);
    let result = GitService::clone(&url, &path, app_handle, Some(callback), ssh_creds).await;

    ctx.handle_result(&result, GitOperationType::Clone);

    let service = result?;
    let repo_info = service.git2().get_repository_info()?;

    // Canonicalize path after clone to ensure consistent storage
    let path = path.canonicalize()?;

    // Now add to cache via switch_active_repository
    state.switch_active_repository(&path).await?;

    // Add to recent repositories
    state.add_recent_repository(&path, &repo_info.name).await?;

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

    // Canonicalize path to ensure consistent cache lookups
    let path = path.canonicalize()?;

    state.switch_active_repository(&path).await
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
        .read()
        .await
        .get_repository_info()
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_repository_status(state: State<'_, AppState>) -> Result<RepositoryStatus> {
    state.get_git_service()?.read().await.status().await
}

#[tauri::command]
#[specta::specta]
pub async fn get_commit_history(
    state: State<'_, AppState>,
    options: LogOptions,
) -> Result<Vec<Commit>> {
    state.get_git_service()?.read().await.log(options).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_branches(state: State<'_, AppState>, filter: BranchFilter) -> Result<Vec<Branch>> {
    state
        .get_git_service()?
        .read()
        .await
        .list_branches(filter)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn get_commit(state: State<'_, AppState>, oid: String) -> Result<Commit> {
    state.get_git_service()?.read().await.get_commit(&oid).await
}

#[tauri::command]
#[specta::specta]
pub async fn get_recent_repositories(state: State<'_, AppState>) -> Result<Vec<RecentRepository>> {
    let rows = state.get_recent_repositories().await?;

    let handles: Vec<_> = rows
        .into_iter()
        .map(|row| tauri::async_runtime::spawn_blocking(move || RecentRepository::from_row(row)))
        .collect();

    let mut repos = Vec::with_capacity(handles.len());
    for handle in handles {
        let repo = handle
            .await
            .map_err(|e| AxisError::Other(format!("enrichment task failed: {e}")))?;
        repos.push(repo);
    }

    Ok(repos)
}

#[tauri::command]
#[specta::specta]
pub async fn remove_recent_repository(state: State<'_, AppState>, path: String) -> Result<()> {
    let path = PathBuf::from(&path);
    state.remove_recent_repository(&path).await
}

#[tauri::command]
#[specta::specta]
pub async fn pin_repository(state: State<'_, AppState>, path: String) -> Result<()> {
    let path = PathBuf::from(&path);
    state.pin_repository(&path).await
}

#[tauri::command]
#[specta::specta]
pub async fn unpin_repository(state: State<'_, AppState>, path: String) -> Result<()> {
    let path = PathBuf::from(&path);
    state.unpin_repository(&path).await
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
    validate_open_url(&url)?;
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
        Command::new("open")
            .args(["-a", "Terminal", path.to_str().unwrap_or(".")])
            .spawn()
            .map_err(|e| AxisError::Other(e.to_string()))?;
    }

    #[cfg(target_os = "windows")]
    {
        windows_terminal_command(&path)
            .spawn()
            .map_err(|e| AxisError::Other(e.to_string()))?;
    }

    #[cfg(target_os = "linux")]
    {
        // Try common terminal emulators
        let terminals = ["gnome-terminal", "konsole", "xterm", "x-terminal-emulator"];
        let mut launched = false;
        for term in terminals {
            if Command::new(term)
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
#[allow(clippy::needless_pass_by_value)] // Tauri State extractor requires owned type
pub fn cancel_operation(state: State<'_, AppState>, operation_id: String) -> bool {
    state.progress_registry().cancel(&operation_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_open_url_allows_http_and_https() {
        validate_open_url("https://github.com/example/repo").expect("https should be allowed");
        validate_open_url("http://localhost:1420/callback").expect("http should be allowed");
    }

    #[test]
    fn validate_open_url_rejects_non_web_schemes() {
        for url in [
            "file:///etc/passwd",
            "javascript:alert(1)",
            "mailto:user@example.com",
            "vscode://file/tmp/example",
        ] {
            let err = validate_open_url(url).expect_err("scheme should be rejected");
            assert!(err.to_string().contains("Unsupported URL scheme"));
        }
    }

    #[test]
    fn validate_open_url_rejects_invalid_urls() {
        let err = validate_open_url("not a url").expect_err("URL should be invalid");
        assert!(err.to_string().contains("Invalid URL"));
    }

    #[test]
    fn windows_terminal_command_uses_current_dir_without_path_interpolation() {
        let path = std::path::Path::new(r"C:\repo & calc");
        let command = windows_terminal_command(path);
        let args: Vec<_> = command
            .get_args()
            .map(|arg| arg.to_string_lossy().into_owned())
            .collect();

        assert_eq!(command.get_program(), "cmd");
        assert_eq!(args, ["/k"]);
        assert_eq!(command.get_current_dir(), Some(path));
        assert!(!args.iter().any(|arg| arg.contains("cd /d")));
        assert!(!args.iter().any(|arg| arg.contains('&')));
        assert!(!args.iter().any(|arg| arg.contains("repo")));
    }
}
