use async_trait::async_trait;

use crate::error::Result;
use crate::models::{
    CiRunsPage, CommitStatus, CreateIssueOptions, CreatePrOptions, IntegrationCommit,
    IntegrationLabel, IntegrationRepoInfo, IntegrationStatus, Issue, IssueDetail, IssueState,
    IssuesPage, MergePrOptions, NotificationsPage, PrState, ProviderType, PullRequest,
    PullRequestDetail, PullRequestsPage,
};

/// Trait for integration providers (GitHub, GitLab, Bitbucket, Gitea)
///
/// OAuth is handled by the IntegrationService, not by providers directly.
/// Providers receive tokens via their constructor and make API calls.
#[async_trait]
pub trait IntegrationProvider: Send + Sync {
    /// Returns the provider type
    fn provider_type(&self) -> ProviderType;

    /// Check if the provider is connected (has valid token)
    async fn is_connected(&self) -> bool;

    /// Get connection status with user info
    async fn get_status(&self) -> Result<IntegrationStatus>;

    /// Disconnect (remove token)
    async fn disconnect(&self) -> Result<()>;

    // Repository operations
    /// Get repository information
    async fn get_repo_info(&self, owner: &str, repo: &str) -> Result<IntegrationRepoInfo>;

    // Commit operations
    /// Get commit information (for avatar fetching)
    async fn get_commit(&self, owner: &str, repo: &str, sha: &str) -> Result<IntegrationCommit>;

    // Pull Request operations
    /// List pull requests with pagination
    async fn list_pull_requests(
        &self,
        owner: &str,
        repo: &str,
        state: PrState,
        page: u32,
    ) -> Result<PullRequestsPage>;

    /// Get pull request details
    async fn get_pull_request(
        &self,
        owner: &str,
        repo: &str,
        number: u32,
    ) -> Result<PullRequestDetail>;

    /// Create a pull request
    async fn create_pull_request(
        &self,
        owner: &str,
        repo: &str,
        options: CreatePrOptions,
    ) -> Result<PullRequest>;

    /// Merge a pull request
    async fn merge_pull_request(
        &self,
        owner: &str,
        repo: &str,
        number: u32,
        options: MergePrOptions,
    ) -> Result<()>;

    // Issue operations
    /// List issues with pagination
    async fn list_issues(
        &self,
        owner: &str,
        repo: &str,
        state: IssueState,
        page: u32,
    ) -> Result<IssuesPage>;

    /// Get issue details
    async fn get_issue(&self, owner: &str, repo: &str, number: u32) -> Result<IssueDetail>;

    /// Create an issue
    async fn create_issue(
        &self,
        owner: &str,
        repo: &str,
        options: CreateIssueOptions,
    ) -> Result<Issue>;

    // CI/CD operations
    /// List CI/CD workflow runs with pagination
    async fn list_ci_runs(&self, owner: &str, repo: &str, page: u32) -> Result<CiRunsPage>;

    /// Get commit status (combined check runs)
    async fn get_commit_status(&self, owner: &str, repo: &str, sha: &str) -> Result<CommitStatus>;

    // Notification operations
    /// List notifications with pagination
    async fn list_notifications(
        &self,
        owner: &str,
        repo: &str,
        all: bool,
        page: u32,
    ) -> Result<NotificationsPage>;

    /// Mark a notification as read
    async fn mark_notification_read(&self, thread_id: &str) -> Result<()>;

    /// Mark all notifications as read
    async fn mark_all_notifications_read(&self, owner: &str, repo: &str) -> Result<()>;

    /// Get unread notification count
    async fn get_unread_count(&self, owner: &str, repo: &str) -> Result<u32>;

    // Label operations
    /// List repository labels
    async fn list_labels(&self, owner: &str, repo: &str) -> Result<Vec<IntegrationLabel>>;
}
