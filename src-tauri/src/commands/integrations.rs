use std::sync::Arc;

use tauri::{AppHandle, State};
use tokio::sync::RwLock;

use crate::error::{AxisError, Result};
use crate::models::{
    CiRunsPage, CommitStatus, CreateIssueOptions, CreatePrOptions, DetectedProvider,
    IntegrationRepoInfo, IntegrationStatus, Issue, IssueDetail, IssueState, IssuesPage,
    MergePrOptions, NotificationsPage, PrState, ProviderType, PullRequest, PullRequestDetail,
    PullRequestsPage,
};
use crate::services::integrations::github::OAuthFlow;
use crate::services::integrations::{detect_provider, GitHubProvider, IntegrationProvider};
use crate::state::AppState;

/// Global GitHub provider instance using tokio RwLock for async compatibility
static GITHUB_PROVIDER: std::sync::OnceLock<Arc<RwLock<Option<GitHubProvider>>>> =
    std::sync::OnceLock::new();

/// Global OAuth flow instance for cancellation support
static OAUTH_FLOW: std::sync::OnceLock<Arc<RwLock<Option<OAuthFlow>>>> = std::sync::OnceLock::new();

pub fn get_github_provider() -> &'static Arc<RwLock<Option<GitHubProvider>>> {
    GITHUB_PROVIDER.get_or_init(|| Arc::new(RwLock::new(None)))
}

fn get_oauth_flow() -> &'static Arc<RwLock<Option<OAuthFlow>>> {
    OAUTH_FLOW.get_or_init(|| Arc::new(RwLock::new(None)))
}

/// Initialize the GitHub provider with the app state
async fn ensure_github_provider(state: &State<'_, AppState>) -> Result<()> {
    let provider_lock = get_github_provider();
    let mut guard = provider_lock.write().await;

    if guard.is_none() {
        // Get database Arc which has 'static lifetime
        let db = state.database();

        // Create closures that capture the database Arc
        let get_secret = {
            let db = Arc::clone(&db);
            move |key: &str| -> Result<Option<String>> { db.get_secret(key) }
        };

        let set_secret = {
            let db = Arc::clone(&db);
            move |key: &str, value: &str| -> Result<()> { db.set_secret(key, value) }
        };

        let delete_secret = {
            let db = Arc::clone(&db);
            move |key: &str| -> Result<()> { db.delete_secret(key) }
        };

        let provider = GitHubProvider::new(get_secret, set_secret, delete_secret);
        *guard = Some(provider);
    }

    Ok(())
}

// ============================================================================
// OAuth / Connection Commands
// ============================================================================

/// Set the GitHub OAuth client ID
#[tauri::command]
#[specta::specta]
pub async fn integration_set_github_client_id(
    state: State<'_, AppState>,
    client_id: String,
) -> Result<()> {
    ensure_github_provider(&state).await?;

    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.set_client_id(client_id)
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

/// Start the GitHub OAuth flow with PKCE
#[tauri::command]
#[specta::specta]
pub async fn integration_start_oauth(
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<()> {
    ensure_github_provider(&state).await?;

    let client_id = {
        let provider_lock = get_github_provider();
        let guard = provider_lock.read().await;

        if let Some(provider) = guard.as_ref() {
            provider.get_client_id()?.ok_or_else(|| {
                AxisError::OAuthError("GitHub client ID not configured".to_string())
            })?
        } else {
            return Err(AxisError::IntegrationNotConnected("GitHub".to_string()));
        }
    };

    let oauth_flow = OAuthFlow::new(client_id);

    {
        let flow_lock = get_oauth_flow();
        let mut guard = flow_lock.write().await;
        *guard = Some(oauth_flow);
    }

    let token = {
        let flow_lock = get_oauth_flow();
        let guard = flow_lock.read().await;

        if let Some(flow) = guard.as_ref() {
            flow.start(&app_handle).await?
        } else {
            return Err(AxisError::OAuthError(
                "OAuth flow not initialized".to_string(),
            ));
        }
    };

    {
        let flow_lock = get_oauth_flow();
        let mut guard = flow_lock.write().await;
        *guard = None;
    }

    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.set_token(token)?;
        log::info!("GitHub OAuth completed successfully");
        Ok(())
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

/// Cancel an in-progress GitHub OAuth flow
#[tauri::command]
#[specta::specta]
pub async fn integration_cancel_oauth() -> Result<()> {
    let flow_lock = get_oauth_flow();
    let guard = flow_lock.read().await;

    if let Some(flow) = guard.as_ref() {
        flow.cancel().await;
        log::info!("GitHub OAuth cancelled by user");
    }

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn integration_is_connected(
    state: State<'_, AppState>,
    provider: ProviderType,
) -> Result<bool> {
    match provider {
        ProviderType::GitHub => {
            ensure_github_provider(&state).await?;
            let provider_lock = get_github_provider();
            let guard = provider_lock.read().await;

            if let Some(provider) = guard.as_ref() {
                Ok(provider.is_connected().await)
            } else {
                Ok(false)
            }
        }
        _ => Ok(false), // Other providers not implemented yet
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_status(
    state: State<'_, AppState>,
    provider: ProviderType,
) -> Result<IntegrationStatus> {
    match provider {
        ProviderType::GitHub => {
            ensure_github_provider(&state).await?;
            let provider_lock = get_github_provider();
            let guard = provider_lock.read().await;

            if let Some(provider) = guard.as_ref() {
                provider.get_status().await
            } else {
                Ok(IntegrationStatus {
                    provider: ProviderType::GitHub,
                    connected: false,
                    username: None,
                    avatar_url: None,
                })
            }
        }
        _ => Ok(IntegrationStatus {
            provider,
            connected: false,
            username: None,
            avatar_url: None,
        }),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_disconnect(
    state: State<'_, AppState>,
    provider: ProviderType,
) -> Result<()> {
    match provider {
        ProviderType::GitHub => {
            ensure_github_provider(&state).await?;
            let provider_lock = get_github_provider();
            let guard = provider_lock.read().await;

            if let Some(provider) = guard.as_ref() {
                provider.disconnect().await
            } else {
                Ok(())
            }
        }
        _ => Ok(()), // Other providers not implemented yet
    }
}

// ============================================================================
// Provider Detection Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_detect_provider(
    state: State<'_, AppState>,
) -> Result<Option<DetectedProvider>> {
    let remotes = state
        .get_git_service()?
        .with_git2(|git2| git2.list_remotes())?;

    // Try origin first, then any other remote
    let origin_url = remotes
        .iter()
        .find(|r| r.name == "origin")
        .and_then(|r| r.url.clone())
        .or_else(|| remotes.first().and_then(|r| r.url.clone()));

    if let Some(url) = origin_url {
        Ok(detect_provider(&url))
    } else {
        Ok(None)
    }
}

// ============================================================================
// Repository Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_get_repo_info(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
) -> Result<IntegrationRepoInfo> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.get_repo_info(&owner, &repo).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

// ============================================================================
// Pull Request Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_list_prs(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    pr_state: PrState,
    page: u32,
) -> Result<PullRequestsPage> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider
            .list_pull_requests(&owner, &repo, pr_state, page)
            .await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_pr(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u32,
) -> Result<PullRequestDetail> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.get_pull_request(&owner, &repo, number).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_create_pr(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    options: CreatePrOptions,
) -> Result<PullRequest> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.create_pull_request(&owner, &repo, options).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_merge_pr(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u32,
    options: MergePrOptions,
) -> Result<()> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider
            .merge_pull_request(&owner, &repo, number, options)
            .await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

// ============================================================================
// Issue Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_list_issues(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    issue_state: IssueState,
    page: u32,
) -> Result<IssuesPage> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.list_issues(&owner, &repo, issue_state, page).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_issue(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    number: u32,
) -> Result<IssueDetail> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.get_issue(&owner, &repo, number).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_create_issue(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    options: CreateIssueOptions,
) -> Result<Issue> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.create_issue(&owner, &repo, options).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

// ============================================================================
// CI/CD Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_list_ci_runs(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    page: u32,
) -> Result<CiRunsPage> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.list_ci_runs(&owner, &repo, page).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_commit_status(
    state: State<'_, AppState>,
    owner: String,
    repo: String,
    sha: String,
) -> Result<CommitStatus> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.get_commit_status(&owner, &repo, &sha).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

// ============================================================================
// Notification Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_list_notifications(
    state: State<'_, AppState>,
    all: bool,
    page: u32,
) -> Result<NotificationsPage> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.list_notifications(all, page).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_mark_notification_read(
    state: State<'_, AppState>,
    thread_id: String,
) -> Result<()> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.mark_notification_read(&thread_id).await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_mark_all_notifications_read(state: State<'_, AppState>) -> Result<()> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.mark_all_notifications_read().await
    } else {
        Err(AxisError::IntegrationNotConnected("GitHub".to_string()))
    }
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_unread_count(state: State<'_, AppState>) -> Result<u32> {
    ensure_github_provider(&state).await?;
    let provider_lock = get_github_provider();
    let guard = provider_lock.read().await;

    if let Some(provider) = guard.as_ref() {
        provider.get_unread_count().await
    } else {
        Ok(0)
    }
}
