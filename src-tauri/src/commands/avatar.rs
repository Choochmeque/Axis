use tauri::State;

use crate::commands::integrations::get_github_provider;
use crate::error::{AxisError, Result};
use crate::models::{
    AvatarResponse, AvatarSource, DetectedProvider, IntegrationCommit, ProviderType,
};
use crate::services::AvatarService;
use crate::services::{detect_provider, IntegrationProvider};
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
        if let Some(url) = get_integration_commit_avatar(&state, &sha).await {
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

/// Fetch commit from integration API to get author's avatar_url
async fn get_integration_commit_avatar(state: &State<'_, AppState>, sha: &str) -> Option<String> {
    // 1. Get remote URL from current repo
    let remotes = state
        .get_git_service()
        .ok()?
        .with_git2(|git2| git2.list_remotes())
        .ok()?;

    let remote_url = remotes
        .iter()
        .find(|r| r.name == "origin")
        .and_then(|r| r.url.clone())
        .or_else(|| remotes.first().and_then(|r| r.url.clone()))?;

    // 2. Detect provider from URL
    let detected = detect_provider(&remote_url)?;

    // 3. Fetch commit from provider API
    let commit = fetch_commit_from_provider(&detected, sha).await.ok()?;

    commit.author_avatar_url
}

/// Fetch commit using the appropriate provider
async fn fetch_commit_from_provider(
    detected: &DetectedProvider,
    sha: &str,
) -> Result<IntegrationCommit> {
    match detected.provider {
        ProviderType::GitHub => {
            let provider_lock = get_github_provider();
            let guard = provider_lock.read().await;
            if let Some(provider) = guard.as_ref() {
                provider
                    .get_commit(&detected.owner, &detected.repo, sha)
                    .await
            } else {
                Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
            }
        }
        _ => Err(AxisError::IntegrationError(format!(
            "Provider {} not supported for avatar fetching",
            detected.provider
        ))),
    }
}

/// Clear the avatar cache
#[tauri::command]
#[specta::specta]
pub async fn clear_avatar_cache(state: State<'_, AppState>) -> Result<()> {
    let avatar_service = state.avatar_service()?;
    avatar_service.clear_cache()
}
