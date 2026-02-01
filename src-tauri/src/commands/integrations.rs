use tauri::{AppHandle, State};

use crate::error::Result;
use crate::models::{
    CiRunsPage, CommitStatus, CreateIssueOptions, CreatePrOptions, DetectedProvider,
    IntegrationLabel, IntegrationRepoInfo, IntegrationStatus, Issue, IssueDetail, IssueState,
    IssuesPage, MergePrOptions, NotificationsPage, PrState, ProviderType, PullRequest,
    PullRequestDetail, PullRequestsPage,
};
use crate::services::detect_provider;
use crate::state::AppState;

// ============================================================================
// OAuth / Connection Commands
// ============================================================================

/// Start the OAuth flow for a provider
#[tauri::command]
#[specta::specta]
pub async fn integration_start_oauth(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    provider: ProviderType,
) -> Result<()> {
    let service = state.integration_service()?;
    service.start_oauth(provider, &app_handle).await
}

/// Cancel an in-progress OAuth flow
#[tauri::command]
#[specta::specta]
pub async fn integration_cancel_oauth(state: State<'_, AppState>) -> Result<()> {
    let service = state.integration_service()?;
    service.cancel_oauth().await;
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn integration_is_connected(
    state: State<'_, AppState>,
    provider: ProviderType,
) -> Result<bool> {
    let service = state.integration_service()?;
    Ok(service.is_connected(provider).await)
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_status(
    state: State<'_, AppState>,
    provider: ProviderType,
) -> Result<IntegrationStatus> {
    let service = state.integration_service()?;
    let provider_instance = service.get_provider(provider).await?;
    provider_instance.get_status().await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_disconnect(
    state: State<'_, AppState>,
    provider: ProviderType,
) -> Result<()> {
    let service = state.integration_service()?;
    service.disconnect(provider).await
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
        .with_git2(|git2| git2.list_remotes())
        .await?;

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
    detected: DetectedProvider,
) -> Result<IntegrationRepoInfo> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .get_repo_info(&detected.owner, &detected.repo)
        .await
}

// ============================================================================
// Pull Request Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_list_prs(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    pr_state: PrState,
    page: u32,
) -> Result<PullRequestsPage> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .list_pull_requests(&detected.owner, &detected.repo, pr_state, page)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_pr(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    number: u32,
) -> Result<PullRequestDetail> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .get_pull_request(&detected.owner, &detected.repo, number)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_create_pr(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    options: CreatePrOptions,
) -> Result<PullRequest> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .create_pull_request(&detected.owner, &detected.repo, options)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_merge_pr(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    number: u32,
    options: MergePrOptions,
) -> Result<()> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .merge_pull_request(&detected.owner, &detected.repo, number, options)
        .await
}

// ============================================================================
// Issue Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_list_issues(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    issue_state: IssueState,
    page: u32,
) -> Result<IssuesPage> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .list_issues(&detected.owner, &detected.repo, issue_state, page)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_issue(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    number: u32,
) -> Result<IssueDetail> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .get_issue(&detected.owner, &detected.repo, number)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_create_issue(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    options: CreateIssueOptions,
) -> Result<Issue> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .create_issue(&detected.owner, &detected.repo, options)
        .await
}

// ============================================================================
// Label Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_list_labels(
    state: State<'_, AppState>,
    detected: DetectedProvider,
) -> Result<Vec<IntegrationLabel>> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider.list_labels(&detected.owner, &detected.repo).await
}

// ============================================================================
// CI/CD Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_list_ci_runs(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    page: u32,
) -> Result<CiRunsPage> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .list_ci_runs(&detected.owner, &detected.repo, page)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_commit_status(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    sha: String,
) -> Result<CommitStatus> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .get_commit_status(&detected.owner, &detected.repo, &sha)
        .await
}

// ============================================================================
// Notification Commands
// ============================================================================

#[tauri::command]
#[specta::specta]
pub async fn integration_list_notifications(
    state: State<'_, AppState>,
    detected: DetectedProvider,
    all: bool,
    page: u32,
) -> Result<NotificationsPage> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .list_notifications(&detected.owner, &detected.repo, all, page)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_mark_notification_read(
    state: State<'_, AppState>,
    provider: ProviderType,
    thread_id: String,
) -> Result<()> {
    let service = state.integration_service()?;
    let provider_instance = service.get_provider(provider).await?;
    provider_instance.mark_notification_read(&thread_id).await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_mark_all_notifications_read(
    state: State<'_, AppState>,
    detected: DetectedProvider,
) -> Result<()> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .mark_all_notifications_read(&detected.owner, &detected.repo)
        .await
}

#[tauri::command]
#[specta::specta]
pub async fn integration_get_unread_count(
    state: State<'_, AppState>,
    detected: DetectedProvider,
) -> Result<u32> {
    let service = state.integration_service()?;
    let provider = service.get_provider(detected.provider).await?;
    provider
        .get_unread_count(&detected.owner, &detected.repo)
        .await
}
