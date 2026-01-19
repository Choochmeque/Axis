use crate::error::Result;
use crate::models::AppSettings;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_settings(state: State<'_, AppState>) -> Result<AppSettings> {
    state.get_settings()
}

#[tauri::command]
#[specta::specta]
pub async fn save_settings(state: State<'_, AppState>, settings: AppSettings) -> Result<()> {
    // Get old settings to check if auto_fetch_interval changed
    let old_interval = state.get_settings().map(|s| s.auto_fetch_interval).ok();

    // Save the new settings
    state.save_settings(&settings)?;

    // Restart background fetch if interval changed
    if old_interval != Some(settings.auto_fetch_interval) {
        if let Err(e) = state.restart_background_fetch(settings.auto_fetch_interval) {
            log::warn!("Failed to restart background fetch: {e}");
        }
    }

    Ok(())
}
