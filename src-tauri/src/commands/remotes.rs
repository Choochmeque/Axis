use crate::error::Result;
use crate::models::{FetchOptions, FetchResult, PullOptions, PushOptions, PushResult, Remote};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn list_remotes(state: State<'_, AppState>) -> Result<Vec<Remote>> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.list_remotes())
}

#[tauri::command]
#[specta::specta]
pub async fn get_remote(state: State<'_, AppState>, name: String) -> Result<Remote> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.get_remote(&name))
}

#[tauri::command]
#[specta::specta]
pub async fn add_remote(state: State<'_, AppState>, name: String, url: String) -> Result<Remote> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.add_remote(&name, &url))
}

#[tauri::command]
#[specta::specta]
pub async fn remove_remote(state: State<'_, AppState>, name: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.remove_remote(&name))
}

#[tauri::command]
#[specta::specta]
pub async fn rename_remote(
    state: State<'_, AppState>,
    old_name: String,
    new_name: String,
) -> Result<Vec<String>> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.rename_remote(&old_name, &new_name))
}

#[tauri::command]
#[specta::specta]
pub async fn set_remote_url(state: State<'_, AppState>, name: String, url: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.set_remote_url(&name, &url))
}

#[tauri::command]
#[specta::specta]
pub async fn set_remote_push_url(
    state: State<'_, AppState>,
    name: String,
    url: String,
) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.set_remote_push_url(&name, &url))
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
    let options = FetchOptions {
        prune: prune.unwrap_or(false),
        tags: tags.unwrap_or(false),
        depth,
    };
    state
        .get_git_service()?
        .with_git2(|git2| git2.fetch(&remote_name, &options, None))
}

#[tauri::command]
#[specta::specta]
pub async fn push_remote(
    state: State<'_, AppState>,
    remote_name: String,
    refspecs: Vec<String>,
    options: PushOptions,
) -> Result<PushResult> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.push(&remote_name, &refspecs, &options))
}

#[tauri::command]
#[specta::specta]
pub async fn push_current_branch(
    state: State<'_, AppState>,
    remote_name: String,
    options: PushOptions,
) -> Result<PushResult> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.push_current_branch(&remote_name, &options))
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
    let options = PullOptions {
        rebase: rebase.unwrap_or(false),
        ff_only: ff_only.unwrap_or(false),
    };
    state
        .get_git_service()?
        .with_git2(|git2| git2.pull(&remote_name, &branch_name, &options))
}

#[tauri::command]
#[specta::specta]
pub async fn fetch_all(state: State<'_, AppState>) -> Result<Vec<FetchResult>> {
    let handle = state.get_git_service()?;
    let guard = handle.lock();
    let git2 = guard.git2();

    let remotes = git2.list_remotes()?;
    let options = FetchOptions::default();

    let mut results = Vec::new();
    for remote in remotes {
        match git2.fetch(&remote.name, &options, None) {
            Ok(result) => results.push(result),
            Err(e) => {
                // Log error but continue with other remotes
                log::error!("Failed to fetch from {}: {e}", remote.name);
            }
        }
    }

    Ok(results)
}
