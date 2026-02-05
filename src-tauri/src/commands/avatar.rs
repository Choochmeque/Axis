use tauri::State;

use crate::error::Result;
use crate::models::{AvatarResponse, AvatarSource};
use crate::services::AvatarService;
use crate::state::AppState;

/// Get avatar for a commit author
/// If sha provided and integration connected, fetches avatar from provider API
#[tauri::command]
#[specta::specta]
pub async fn get_avatar(
    state: State<'_, AppState>,
    email: String,
    sha: Option<String>,
) -> Result<AvatarResponse> {
    let settings = state.get_settings()?;
    let cache_key = AvatarService::md5_hash(email.to_lowercase().trim());
    let avatar_service = state.avatar_service()?;

    // 1. Check integration cache
    if let Some(path) = avatar_service.get_cached(&AvatarSource::Integration, &cache_key) {
        return Ok(AvatarResponse {
            source: AvatarSource::Integration,
            path: Some(path),
        });
    }

    // 2. Check gravatar cache
    if let Some(path) = avatar_service.get_cached(&AvatarSource::Gravatar, &cache_key) {
        return Ok(AvatarResponse {
            source: AvatarSource::Gravatar,
            path: Some(path),
        });
    }

    // 3. Try integration API if sha provided
    if let Some(sha) = sha {
        if let Some(url) = state.get_integration_commit_avatar(&sha).await {
            if let Ok(path) = avatar_service
                .fetch_and_cache(&AvatarSource::Integration, &url, &cache_key)
                .await
            {
                return Ok(AvatarResponse {
                    source: AvatarSource::Integration,
                    path: Some(path),
                });
            }
        }
    }

    // 4. Fallback to Gravatar
    if settings.gravatar_enabled {
        let url = AvatarService::gravatar_url(&email, 200);
        if let Ok(path) = avatar_service
            .fetch_and_cache(&AvatarSource::Gravatar, &url, &cache_key)
            .await
        {
            return Ok(AvatarResponse {
                source: AvatarSource::Gravatar,
                path: Some(path),
            });
        }
    }

    // 5. Default
    Ok(AvatarResponse {
        source: AvatarSource::Default,
        path: None,
    })
}

/// Clear the avatar cache
#[tauri::command]
#[specta::specta]
pub async fn clear_avatar_cache(state: State<'_, AppState>) -> Result<()> {
    let avatar_service = state.avatar_service()?;
    avatar_service.clear_cache()
}
