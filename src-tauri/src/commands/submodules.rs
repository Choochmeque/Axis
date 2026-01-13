use crate::error::Result;
use crate::models::{
    AddSubmoduleOptions, Submodule, SubmoduleResult, SyncSubmoduleOptions, UpdateSubmoduleOptions,
};
use crate::services::GitCliService;
use crate::state::AppState;
use tauri::State;

/// Helper to get GitCliService from current repository
fn get_cli_service(state: &State<AppState>) -> Result<GitCliService> {
    let path = state.ensure_repository_open()?;
    Ok(GitCliService::new(&path))
}

// ==================== Submodule Commands ====================

/// List all submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_list(state: State<'_, AppState>) -> Result<Vec<Submodule>> {
    let cli = get_cli_service(&state)?;
    cli.submodule_list()
}

/// Add a new submodule
#[tauri::command]
#[specta::specta]
pub async fn submodule_add(
    state: State<'_, AppState>,
    options: AddSubmoduleOptions,
) -> Result<SubmoduleResult> {
    let cli = get_cli_service(&state)?;
    cli.submodule_add(&options)
}

/// Initialize submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_init(
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<SubmoduleResult> {
    let cli = get_cli_service(&state)?;
    cli.submodule_init(&paths)
}

/// Update submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_update(
    state: State<'_, AppState>,
    options: UpdateSubmoduleOptions,
) -> Result<SubmoduleResult> {
    let cli = get_cli_service(&state)?;
    cli.submodule_update(&options)
}

/// Sync submodule URLs from .gitmodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_sync(
    state: State<'_, AppState>,
    options: SyncSubmoduleOptions,
) -> Result<SubmoduleResult> {
    let cli = get_cli_service(&state)?;
    cli.submodule_sync(&options)
}

/// Deinitialize submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_deinit(
    state: State<'_, AppState>,
    paths: Vec<String>,
    force: bool,
) -> Result<SubmoduleResult> {
    let cli = get_cli_service(&state)?;
    cli.submodule_deinit(&paths, force)
}

/// Remove a submodule completely
#[tauri::command]
#[specta::specta]
pub async fn submodule_remove(state: State<'_, AppState>, path: String) -> Result<SubmoduleResult> {
    let cli = get_cli_service(&state)?;
    cli.submodule_remove(&path)
}

/// Get summary of submodule changes
#[tauri::command]
#[specta::specta]
pub async fn submodule_summary(state: State<'_, AppState>) -> Result<String> {
    let cli = get_cli_service(&state)?;
    cli.submodule_summary()
}
