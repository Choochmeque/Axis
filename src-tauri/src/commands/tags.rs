use crate::error::Result;
use crate::models::{CreateTagOptions, Tag, TagResult};
use crate::state::AppState;
use tauri::State;

// ==================== Tag Commands ====================

/// List all tags
#[tauri::command]
#[specta::specta]
pub async fn tag_list(state: State<'_, AppState>) -> Result<Vec<Tag>> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.tag_list(None))
}

/// Create a new tag
#[tauri::command]
#[specta::specta]
pub async fn tag_create(
    state: State<'_, AppState>,
    name: String,
    options: CreateTagOptions,
) -> Result<TagResult> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.tag_create(&name, &options))
}

/// Delete a local tag
#[tauri::command]
#[specta::specta]
pub async fn tag_delete(state: State<'_, AppState>, name: String) -> Result<TagResult> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.tag_delete(&name))
}

/// Push a tag to a remote
#[tauri::command]
#[specta::specta]
pub async fn tag_push(
    state: State<'_, AppState>,
    name: String,
    remote: String,
) -> Result<TagResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.tag_push(&name, &remote))
}

/// Push all tags to a remote
#[tauri::command]
#[specta::specta]
pub async fn tag_push_all(state: State<'_, AppState>, remote: String) -> Result<TagResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.tag_push_all(&remote))
}

/// Delete a remote tag
#[tauri::command]
#[specta::specta]
pub async fn tag_delete_remote(
    state: State<'_, AppState>,
    name: String,
    remote: String,
) -> Result<TagResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.tag_delete_remote(&name, &remote))
}
