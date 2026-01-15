use crate::error::Result;
use crate::models::{FetchOptions, FetchResult, PullOptions, PushOptions, PushResult, Remote};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn list_remotes(state: State<'_, AppState>) -> Result<Vec<Remote>> {
    let service = state.get_service()?;
    service.list_remotes()
}

#[tauri::command]
#[specta::specta]
pub async fn get_remote(state: State<'_, AppState>, name: String) -> Result<Remote> {
    let service = state.get_service()?;
    service.get_remote(&name)
}

#[tauri::command]
#[specta::specta]
pub async fn add_remote(state: State<'_, AppState>, name: String, url: String) -> Result<Remote> {
    let service = state.get_service()?;
    service.add_remote(&name, &url)
}

#[tauri::command]
#[specta::specta]
pub async fn remove_remote(state: State<'_, AppState>, name: String) -> Result<()> {
    let service = state.get_service()?;
    service.remove_remote(&name)
}

#[tauri::command]
#[specta::specta]
pub async fn rename_remote(
    state: State<'_, AppState>,
    old_name: String,
    new_name: String,
) -> Result<Vec<String>> {
    let service = state.get_service()?;
    service.rename_remote(&old_name, &new_name)
}

#[tauri::command]
#[specta::specta]
pub async fn set_remote_url(state: State<'_, AppState>, name: String, url: String) -> Result<()> {
    let service = state.get_service()?;
    service.set_remote_url(&name, &url)
}

#[tauri::command]
#[specta::specta]
pub async fn set_remote_push_url(
    state: State<'_, AppState>,
    name: String,
    url: String,
) -> Result<()> {
    let service = state.get_service()?;
    service.set_remote_push_url(&name, &url)
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_remote(
    state: State<'_, AppState>,
    remote_name: String,
    prune: Option<bool>,
    tags: Option<bool>,
    depth: Option<u32>,
) -> Result<FetchResult> {
    let service = state.get_service()?;
    let options = FetchOptions {
        prune: prune.unwrap_or(false),
        tags: tags.unwrap_or(false),
        depth,
    };
    service.fetch(&remote_name, &options, None)
}

#[tauri::command]
#[specta::specta]
pub async fn push_remote(
    state: State<'_, AppState>,
    remote_name: String,
    refspecs: Vec<String>,
    options: Option<PushOptions>,
) -> Result<PushResult> {
    let service = state.get_service()?;
    service.push(&remote_name, &refspecs, &options.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn push_current_branch(
    state: State<'_, AppState>,
    remote_name: String,
    options: Option<PushOptions>,
) -> Result<PushResult> {
    let service = state.get_service()?;
    service.push_current_branch(&remote_name, &options.unwrap_or_default())
}

#[tauri::command]
#[specta::specta]
pub async fn pull_remote(
    state: State<'_, AppState>,
    remote_name: String,
    branch_name: String,
    rebase: Option<bool>,
    ff_only: Option<bool>,
) -> Result<()> {
    let service = state.get_service()?;
    let options = PullOptions {
        rebase: rebase.unwrap_or(false),
        ff_only: ff_only.unwrap_or(false),
    };
    service.pull(&remote_name, &branch_name, &options)
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_all(state: State<'_, AppState>) -> Result<Vec<FetchResult>> {
    let service = state.get_service()?;
    let remotes = service.list_remotes()?;
    let options = FetchOptions::default();

    let mut results = Vec::new();
    for remote in remotes {
        match service.fetch(&remote.name, &options, None) {
            Ok(result) => results.push(result),
            Err(e) => {
                // Log error but continue with other remotes
                log::error!("Failed to fetch from {}: {e}", remote.name);
            }
        }
    }

    Ok(results)
}
