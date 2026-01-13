use crate::error::Result;
use crate::models::{GpgKey, SigningConfig, SigningTestResult, SshKey};
use crate::services::SigningService;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_signing_config(state: State<'_, AppState>) -> Result<SigningConfig> {
    let path = state.ensure_repository_open()?;
    let service = SigningService::new(&path);
    service.get_config_from_git()
}

#[tauri::command]
#[specta::specta]
pub async fn list_gpg_keys(state: State<'_, AppState>) -> Result<Vec<GpgKey>> {
    let path = state.ensure_repository_open()?;
    let service = SigningService::new(&path);
    service.list_gpg_keys()
}

#[tauri::command]
#[specta::specta]
pub async fn list_ssh_keys(state: State<'_, AppState>) -> Result<Vec<SshKey>> {
    let path = state.ensure_repository_open()?;
    let service = SigningService::new(&path);
    service.list_ssh_keys()
}

#[tauri::command]
#[specta::specta]
pub async fn test_signing(
    state: State<'_, AppState>,
    config: SigningConfig,
) -> Result<SigningTestResult> {
    let path = state.ensure_repository_open()?;
    let service = SigningService::new(&path);
    Ok(service.test_signing(&config))
}

#[tauri::command]
#[specta::specta]
pub async fn is_signing_available(
    state: State<'_, AppState>,
    config: SigningConfig,
) -> Result<bool> {
    let path = state.ensure_repository_open()?;
    let service = SigningService::new(&path);
    service.is_signing_available(&config)
}
