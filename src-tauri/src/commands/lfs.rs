use crate::error::Result;
use crate::models::{
    GitEnvironment, LfsEnvironment, LfsFetchOptions, LfsFile, LfsMigrateOptions, LfsPruneOptions,
    LfsPruneResult, LfsPullOptions, LfsPushOptions, LfsResult, LfsStatus, LfsTrackedPattern,
};
use crate::services::GitCliService;
use crate::state::AppState;
use tauri::State;

// ==================== LFS Commands ====================

/// Check if Git LFS is installed on the system
#[tauri::command]
#[specta::specta]
pub async fn lfs_check_installed() -> Result<(bool, Option<String>)> {
    GitCliService::lfs_check_installed()
}

/// Get Git environment information (versions, paths, LFS availability)
#[tauri::command]
#[specta::specta]
pub async fn get_git_environment() -> Result<GitEnvironment> {
    GitCliService::get_git_environment()
}

/// Get comprehensive LFS status for the current repository
#[tauri::command]
#[specta::specta]
pub async fn lfs_status(state: State<'_, AppState>) -> Result<LfsStatus> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_status())
}

/// Initialize LFS in the current repository
#[tauri::command]
#[specta::specta]
pub async fn lfs_install(state: State<'_, AppState>) -> Result<LfsResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_install())
}

/// Track a file pattern with LFS
#[tauri::command]
#[specta::specta]
pub async fn lfs_track(state: State<'_, AppState>, pattern: String) -> Result<LfsResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_track(&pattern))
}

/// Untrack a file pattern from LFS
#[tauri::command]
#[specta::specta]
pub async fn lfs_untrack(state: State<'_, AppState>, pattern: String) -> Result<LfsResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_untrack(&pattern))
}

/// List all tracked LFS patterns
#[tauri::command]
#[specta::specta]
pub async fn lfs_list_patterns(state: State<'_, AppState>) -> Result<Vec<LfsTrackedPattern>> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_list_tracked_patterns())
}

/// List all LFS files in the repository
#[tauri::command]
#[specta::specta]
pub async fn lfs_list_files(state: State<'_, AppState>) -> Result<Vec<LfsFile>> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_list_files())
}

/// Fetch LFS objects from remote
#[tauri::command]
#[specta::specta]
pub async fn lfs_fetch(state: State<'_, AppState>, options: LfsFetchOptions) -> Result<LfsResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_fetch(&options))
}

/// Pull LFS objects (fetch + checkout)
#[tauri::command]
#[specta::specta]
pub async fn lfs_pull(state: State<'_, AppState>, options: LfsPullOptions) -> Result<LfsResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_pull(&options))
}

/// Push LFS objects to remote
#[tauri::command]
#[specta::specta]
pub async fn lfs_push(state: State<'_, AppState>, options: LfsPushOptions) -> Result<LfsResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_push(&options))
}

/// Migrate files to/from LFS
#[tauri::command]
#[specta::specta]
pub async fn lfs_migrate(
    state: State<'_, AppState>,
    options: LfsMigrateOptions,
) -> Result<LfsResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_migrate(&options))
}

/// Get LFS environment information
#[tauri::command]
#[specta::specta]
pub async fn lfs_env(state: State<'_, AppState>) -> Result<LfsEnvironment> {
    state.get_git_service()?.with_git_cli(|cli| cli.lfs_env())
}

/// Check if a file is an LFS pointer
#[tauri::command]
#[specta::specta]
pub async fn lfs_is_pointer(state: State<'_, AppState>, path: String) -> Result<bool> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_is_pointer(&path))
}

/// Prune old LFS objects
#[tauri::command]
#[specta::specta]
pub async fn lfs_prune(
    state: State<'_, AppState>,
    options: LfsPruneOptions,
) -> Result<LfsPruneResult> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.lfs_prune(&options))
}
