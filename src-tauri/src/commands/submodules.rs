use crate::error::Result;
use crate::models::{
    AddSubmoduleOptions, Submodule, SubmoduleResult, SyncSubmoduleOptions, UpdateSubmoduleOptions,
};
use crate::state::AppState;
use tauri::State;

// ==================== Submodule Commands ====================

/// List all submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_list(state: State<'_, AppState>) -> Result<Vec<Submodule>> {
    let cli = state.get_cli_service()?;
    cli.submodule_list()
}

/// Add a new submodule
#[tauri::command]
#[specta::specta]
pub async fn submodule_add(
    state: State<'_, AppState>,
    options: AddSubmoduleOptions,
) -> Result<SubmoduleResult> {
    let cli = state.get_cli_service()?;
    cli.submodule_add(&options)
}

/// Initialize submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_init(
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<SubmoduleResult> {
    let cli = state.get_cli_service()?;
    cli.submodule_init(&paths)
}

/// Update submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_update(
    state: State<'_, AppState>,
    options: UpdateSubmoduleOptions,
) -> Result<SubmoduleResult> {
    let cli = state.get_cli_service()?;
    cli.submodule_update(&options)
}

/// Sync submodule URLs from .gitmodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_sync(
    state: State<'_, AppState>,
    options: SyncSubmoduleOptions,
) -> Result<SubmoduleResult> {
    let cli = state.get_cli_service()?;
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
    let cli = state.get_cli_service()?;
    cli.submodule_deinit(&paths, force)
}

/// Remove a submodule completely
#[tauri::command]
#[specta::specta]
pub async fn submodule_remove(state: State<'_, AppState>, path: String) -> Result<SubmoduleResult> {
    let cli = state.get_cli_service()?;
    cli.submodule_remove(&path)
}

/// Get summary of submodule changes
#[tauri::command]
#[specta::specta]
pub async fn submodule_summary(state: State<'_, AppState>) -> Result<String> {
    let cli = state.get_cli_service()?;
    cli.submodule_summary()
}
