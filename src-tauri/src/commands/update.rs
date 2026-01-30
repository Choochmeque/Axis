use crate::error::{AxisError, Result};
use crate::events::UpdateDownloadProgressEvent;
use crate::models::UpdateInfo;
use crate::state::AppState;
use tauri::{AppHandle, State};
use tauri_plugin_updater::UpdaterExt;
use tauri_specta::Event;
use url::Url;

const DEFAULT_PUBKEY: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDlFQzBEREUyNTJGMTMxOEIKUldTTE1mRlM0dDNBbm5mMEMwZTFOazV6VmNWRitBNzU3K1NqcTZ2eDlyQnp1eXFQT2Y3UFEwK0IK";

fn get_update_endpoint() -> String {
    let channel = option_env!("AXIS_UPDATE_CHANNEL").unwrap_or("nightly");
    match channel {
        "stable" => {
            "https://github.com/Choochmeque/Axis/releases/latest/download/latest.json".to_string()
        }
        _ => {
            "https://github.com/Choochmeque/Axis/releases/download/nightly/latest.json".to_string()
        }
    }
}

fn get_update_pubkey() -> String {
    option_env!("TAURI_SIGNING_PUBLIC_KEY")
        .unwrap_or(DEFAULT_PUBKEY)
        .to_string()
}

#[tauri::command]
#[specta::specta]
pub async fn check_for_update(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<UpdateInfo>> {
    let endpoint = get_update_endpoint();
    let pubkey = get_update_pubkey();

    let endpoint_url = Url::parse(&endpoint)
        .map_err(|e| AxisError::Other(format!("Invalid update endpoint URL: {e}")))?;

    let update = app
        .updater_builder()
        .endpoints(vec![endpoint_url])
        .map_err(|e| AxisError::Other(format!("Failed to set update endpoints: {e}")))?
        .pubkey(pubkey)
        .build()
        .map_err(|e| AxisError::Other(format!("Failed to build updater: {e}")))?
        .check()
        .await
        .map_err(|e| AxisError::Other(format!("Failed to check for updates: {e}")))?;

    match update {
        Some(update) => {
            let info = UpdateInfo {
                version: update.version.clone(),
                date: update.date.map(|d| d.to_string()),
                body: update.body.clone(),
            };
            state.set_pending_update(update);
            Ok(Some(info))
        }
        None => Ok(None),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn download_and_install_update(app: AppHandle, state: State<'_, AppState>) -> Result<()> {
    let update = state
        .take_pending_update()
        .ok_or_else(|| AxisError::Other("No pending update available".to_string()))?;

    let app_handle = app.clone();

    update
        .download_and_install(
            move |chunk_length, content_length| {
                let event = UpdateDownloadProgressEvent {
                    downloaded: chunk_length as u64,
                    total: content_length,
                };
                if let Err(e) = event.emit(&app_handle) {
                    log::warn!("Failed to emit update progress event: {e}");
                }
            },
            || {
                log::info!("Update download finished");
            },
        )
        .await
        .map_err(|e| AxisError::Other(format!("Failed to download and install update: {e}")))?;

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn restart_app(app: AppHandle) -> Result<()> {
    app.restart();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_update_endpoint_default_is_nightly() {
        let endpoint = get_update_endpoint();
        // Default (no env var) should be nightly
        assert!(
            endpoint.contains("/nightly/"),
            "Default endpoint should be nightly"
        );
    }

    #[test]
    fn test_get_update_pubkey_default() {
        let pubkey = get_update_pubkey();
        assert!(!pubkey.is_empty(), "Default pubkey should not be empty");
        assert_eq!(pubkey, DEFAULT_PUBKEY);
    }

    #[test]
    fn test_default_pubkey_is_valid_base64() {
        use base64::Engine;
        let result = base64::engine::general_purpose::STANDARD.decode(DEFAULT_PUBKEY);
        assert!(result.is_ok(), "DEFAULT_PUBKEY should be valid base64");
    }
}
