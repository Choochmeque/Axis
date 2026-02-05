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
    state.get_git_service()?.read().await.submodule_list().await
}

/// Add a new submodule
#[tauri::command]
#[specta::specta]
pub async fn submodule_add(
    state: State<'_, AppState>,
    options: AddSubmoduleOptions,
) -> Result<SubmoduleResult> {
    state
        .get_git_service()?
        .write()
        .await
        .submodule_add(&options)
        .await
}

/// Initialize submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_init(
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<SubmoduleResult> {
    state
        .get_git_service()?
        .write()
        .await
        .submodule_init(&paths)
        .await
}

/// Update submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_update(
    state: State<'_, AppState>,
    options: UpdateSubmoduleOptions,
) -> Result<SubmoduleResult> {
    state
        .get_git_service()?
        .write()
        .await
        .submodule_update(&options)
        .await
}

/// Sync submodule URLs from .gitmodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_sync(
    state: State<'_, AppState>,
    options: SyncSubmoduleOptions,
) -> Result<SubmoduleResult> {
    state
        .get_git_service()?
        .write()
        .await
        .submodule_sync(&options)
        .await
}

/// Deinitialize submodules
#[tauri::command]
#[specta::specta]
pub async fn submodule_deinit(
    state: State<'_, AppState>,
    paths: Vec<String>,
    force: bool,
) -> Result<SubmoduleResult> {
    state
        .get_git_service()?
        .write()
        .await
        .submodule_deinit(&paths, force)
        .await
}

/// Remove a submodule completely
#[tauri::command]
#[specta::specta]
pub async fn submodule_remove(state: State<'_, AppState>, path: String) -> Result<SubmoduleResult> {
    state
        .get_git_service()?
        .write()
        .await
        .submodule_remove(&path)
        .await
}

/// Get summary of submodule changes
#[tauri::command]
#[specta::specta]
pub async fn submodule_summary(state: State<'_, AppState>) -> Result<String> {
    state
        .get_git_service()?
        .read()
        .await
        .submodule_summary()
        .await
}
