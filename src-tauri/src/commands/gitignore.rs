use crate::error::Result;
use crate::models::{IgnoreOptions, IgnoreResult};
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn add_to_gitignore(
    state: State<'_, AppState>,
    pattern: String,
    gitignore_path: String,
) -> Result<IgnoreResult> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.add_to_gitignore(&pattern, &gitignore_path))
}

#[tauri::command]
#[specta::specta]
pub async fn add_to_global_gitignore(
    state: State<'_, AppState>,
    pattern: String,
) -> Result<IgnoreResult> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.add_to_global_gitignore(&pattern))
}

#[tauri::command]
#[specta::specta]
pub async fn get_ignore_options(
    state: State<'_, AppState>,
    file_path: String,
) -> Result<IgnoreOptions> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.get_ignore_options(&file_path))
}
