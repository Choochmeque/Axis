use crate::error::Result;
use crate::models::{CreateTagOptions, Tag, TagResult};
use crate::services::{Git2Service, GitCliService};
use crate::state::AppState;
use tauri::State;

/// Helper to get Git2Service from current repository
fn get_git2_service(state: &State<AppState>) -> Result<Git2Service> {
    let path = state.ensure_repository_open()?;
    Git2Service::open(&path)
}

/// Helper to get GitCliService from current repository (for remote operations)
fn get_cli_service(state: &State<AppState>) -> Result<GitCliService> {
    let path = state.ensure_repository_open()?;
    Ok(GitCliService::new(&path))
}

// ==================== Tag Commands ====================

/// List all tags
#[tauri::command]
pub async fn tag_list(state: State<'_, AppState>) -> Result<Vec<Tag>> {
    let git2 = get_git2_service(&state)?;
    git2.tag_list()
}

/// Create a new tag
#[tauri::command]
pub async fn tag_create(
    state: State<'_, AppState>,
    name: String,
    options: CreateTagOptions,
) -> Result<TagResult> {
    let git2 = get_git2_service(&state)?;
    git2.tag_create(&name, &options)
}

/// Delete a local tag
#[tauri::command]
pub async fn tag_delete(state: State<'_, AppState>, name: String) -> Result<TagResult> {
    let git2 = get_git2_service(&state)?;
    git2.tag_delete(&name)
}

/// Push a tag to a remote
#[tauri::command]
pub async fn tag_push(
    state: State<'_, AppState>,
    name: String,
    remote: String,
) -> Result<TagResult> {
    let cli = get_cli_service(&state)?;
    cli.tag_push(&name, &remote)
}

/// Push all tags to a remote
#[tauri::command]
pub async fn tag_push_all(state: State<'_, AppState>, remote: String) -> Result<TagResult> {
    let cli = get_cli_service(&state)?;
    cli.tag_push_all(&remote)
}

/// Delete a remote tag
#[tauri::command]
pub async fn tag_delete_remote(
    state: State<'_, AppState>,
    name: String,
    remote: String,
) -> Result<TagResult> {
    let cli = get_cli_service(&state)?;
    cli.tag_delete_remote(&name, &remote)
}
