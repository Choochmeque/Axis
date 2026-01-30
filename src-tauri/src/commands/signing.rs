use crate::error::Result;
use crate::models::{
    GpgKey, SignatureVerification, SigningConfig, SigningFormat, SigningTestResult, SshKey,
};
use crate::services::{SignatureVerificationCache, SigningService};
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

#[tauri::command]
#[specta::specta]
pub async fn verify_commit_signature(
    state: State<'_, AppState>,
    oid: String,
    format: SigningFormat,
) -> Result<SignatureVerification> {
    let repo_path = state.ensure_repository_open()?;
    let cache = state.signature_verification_cache();

    // Check cache first
    let cache_key = SignatureVerificationCache::build_key(&repo_path, &oid);
    if let Some(cached) = cache.get(&cache_key) {
        log::debug!("Signature verification cache hit for {oid}");
        return Ok(cached);
    }

    // Verify via git2 service (runs on blocking thread)
    let result = state
        .get_git_service()?
        .with_git2(move |git2| git2.verify_commit_signature(&oid, &format))
        .await?;

    // Cache the result
    cache.set(cache_key, result.clone());

    Ok(result)
}
