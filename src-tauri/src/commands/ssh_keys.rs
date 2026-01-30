use crate::error::Result;
use crate::models::{
    ExportSshKeyOptions, GenerateSshKeyOptions, ImportSshKeyOptions, RemoteSshKeyMapping,
    SshKeyFormat, SshKeyInfo,
};
use crate::services::SshKeyService;
use crate::state::AppState;
use tauri::State;

// ==================== SSH Key Management (system-level) ====================

#[tauri::command]
#[specta::specta]
pub async fn list_ssh_keys_info() -> Result<Vec<SshKeyInfo>> {
    SshKeyService::list_keys()
}

#[tauri::command]
#[specta::specta]
pub async fn generate_ssh_key(options: GenerateSshKeyOptions) -> Result<SshKeyInfo> {
    SshKeyService::generate_key(options)
}

#[tauri::command]
#[specta::specta]
pub async fn get_ssh_public_key(key_path: String) -> Result<String> {
    SshKeyService::get_public_key_content(&key_path)
}

#[tauri::command]
#[specta::specta]
pub async fn get_ssh_key_fingerprint(key_path: String) -> Result<String> {
    SshKeyService::get_fingerprint(&key_path)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_ssh_key(key_path: String) -> Result<()> {
    SshKeyService::delete_key(&key_path)
}

#[tauri::command]
#[specta::specta]
pub async fn import_ssh_key(options: ImportSshKeyOptions) -> Result<SshKeyInfo> {
    SshKeyService::import_key(options)
}

#[tauri::command]
#[specta::specta]
pub async fn export_ssh_key(options: ExportSshKeyOptions) -> Result<()> {
    SshKeyService::export_key(options)
}

// ==================== Per-Remote SSH Key Mapping ====================

#[tauri::command]
#[specta::specta]
pub async fn get_remote_ssh_key(
    state: State<'_, AppState>,
    remote_name: String,
) -> Result<Option<String>> {
    let repo_path = state.get_repo_path_string()?;
    state
        .database()
        .get_remote_ssh_key(&repo_path, &remote_name)
}

#[tauri::command]
#[specta::specta]
pub async fn set_remote_ssh_key(
    state: State<'_, AppState>,
    remote_name: String,
    ssh_key_path: String,
) -> Result<()> {
    let repo_path = state.get_repo_path_string()?;
    state
        .database()
        .set_remote_ssh_key(&repo_path, &remote_name, &ssh_key_path)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_remote_ssh_key(state: State<'_, AppState>, remote_name: String) -> Result<()> {
    let repo_path = state.get_repo_path_string()?;
    state
        .database()
        .delete_remote_ssh_key(&repo_path, &remote_name)
}

#[tauri::command]
#[specta::specta]
pub async fn list_remote_ssh_keys(state: State<'_, AppState>) -> Result<Vec<RemoteSshKeyMapping>> {
    let repo_path = state.get_repo_path_string()?;
    let mappings = state.database().list_remote_ssh_keys(&repo_path)?;
    Ok(mappings
        .into_iter()
        .map(|(remote_name, ssh_key_path)| RemoteSshKeyMapping {
            remote_name,
            ssh_key_path,
        })
        .collect())
}

// ==================== SSH Key Format & Passphrase ====================

#[tauri::command]
#[specta::specta]
pub async fn check_ssh_key_format(key_path: String) -> Result<SshKeyFormat> {
    SshKeyService::check_key_format(&key_path)
}

#[tauri::command]
#[specta::specta]
pub async fn cache_ssh_passphrase(
    state: State<'_, AppState>,
    key_path: String,
    passphrase: String,
) -> Result<()> {
    state.cache_ssh_passphrase(&key_path, passphrase);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn clear_ssh_passphrase(
    state: State<'_, AppState>,
    key_path: String,
) -> Result<()> {
    state.clear_cached_ssh_passphrase(&key_path);
    Ok(())
}
