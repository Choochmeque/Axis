use crate::error::Result;
use crate::models::{FetchOptions, FetchResult, PullOptions, PushOptions, PushResult, Remote};
use crate::services::Git2Service;
use crate::state::AppState;
use tauri::State;

/// Helper function to get the Git2Service for the current repository
fn get_service(state: &State<'_, AppState>) -> Result<Git2Service> {
    let path = state.ensure_repository_open()?;
    Git2Service::open(&path)
}

#[tauri::command]
pub async fn list_remotes(state: State<'_, AppState>) -> Result<Vec<Remote>> {
    let service = get_service(&state)?;
    service.list_remotes()
}

#[tauri::command]
pub async fn get_remote(state: State<'_, AppState>, name: String) -> Result<Remote> {
    let service = get_service(&state)?;
    service.get_remote(&name)
}

#[tauri::command]
pub async fn add_remote(state: State<'_, AppState>, name: String, url: String) -> Result<Remote> {
    let service = get_service(&state)?;
    service.add_remote(&name, &url)
}

#[tauri::command]
pub async fn remove_remote(state: State<'_, AppState>, name: String) -> Result<()> {
    let service = get_service(&state)?;
    service.remove_remote(&name)
}

#[tauri::command]
pub async fn rename_remote(
    state: State<'_, AppState>,
    old_name: String,
    new_name: String,
) -> Result<Vec<String>> {
    let service = get_service(&state)?;
    service.rename_remote(&old_name, &new_name)
}

#[tauri::command]
pub async fn set_remote_url(state: State<'_, AppState>, name: String, url: String) -> Result<()> {
    let service = get_service(&state)?;
    service.set_remote_url(&name, &url)
}

#[tauri::command]
pub async fn set_remote_push_url(
    state: State<'_, AppState>,
    name: String,
    url: String,
) -> Result<()> {
    let service = get_service(&state)?;
    service.set_remote_push_url(&name, &url)
}

#[tauri::command]
pub async fn fetch_remote(
    state: State<'_, AppState>,
    remote_name: String,
    prune: Option<bool>,
    tags: Option<bool>,
    depth: Option<u32>,
) -> Result<FetchResult> {
    let service = get_service(&state)?;
    let options = FetchOptions {
        prune: prune.unwrap_or(false),
        tags: tags.unwrap_or(false),
        depth,
    };
    service.fetch(&remote_name, &options, None)
}

#[tauri::command]
pub async fn push_remote(
    state: State<'_, AppState>,
    remote_name: String,
    refspecs: Vec<String>,
    force: Option<bool>,
    set_upstream: Option<bool>,
    tags: Option<bool>,
) -> Result<PushResult> {
    let service = get_service(&state)?;
    let options = PushOptions {
        force: force.unwrap_or(false),
        set_upstream: set_upstream.unwrap_or(false),
        tags: tags.unwrap_or(false),
    };
    service.push(&remote_name, &refspecs, &options)
}

#[tauri::command]
pub async fn push_current_branch(
    state: State<'_, AppState>,
    remote_name: String,
    force: Option<bool>,
    set_upstream: Option<bool>,
) -> Result<PushResult> {
    let service = get_service(&state)?;
    let options = PushOptions {
        force: force.unwrap_or(false),
        set_upstream: set_upstream.unwrap_or(false),
        tags: false,
    };
    service.push_current_branch(&remote_name, &options)
}

#[tauri::command]
pub async fn pull_remote(
    state: State<'_, AppState>,
    remote_name: String,
    branch_name: String,
    rebase: Option<bool>,
    ff_only: Option<bool>,
) -> Result<()> {
    let service = get_service(&state)?;
    let options = PullOptions {
        rebase: rebase.unwrap_or(false),
        ff_only: ff_only.unwrap_or(false),
    };
    service.pull(&remote_name, &branch_name, &options)
}

#[tauri::command]
pub async fn fetch_all(state: State<'_, AppState>) -> Result<Vec<FetchResult>> {
    let service = get_service(&state)?;
    let remotes = service.list_remotes()?;
    let options = FetchOptions::default();

    let mut results = Vec::new();
    for remote in remotes {
        match service.fetch(&remote.name, &options, None) {
            Ok(result) => results.push(result),
            Err(e) => {
                // Log error but continue with other remotes
                eprintln!("Failed to fetch from {}: {}", remote.name, e);
            }
        }
    }

    Ok(results)
}
