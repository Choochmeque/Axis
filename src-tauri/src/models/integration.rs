use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

/// Supported integration providers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum ProviderType {
    GitHub,
    GitLab,
    Bitbucket,
    Gitea,
}

impl std::fmt::Display for ProviderType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProviderType::GitHub => write!(f, "GitHub"),
            ProviderType::GitLab => write!(f, "GitLab"),
            ProviderType::Bitbucket => write!(f, "Bitbucket"),
            ProviderType::Gitea => write!(f, "Gitea"),
        }
    }
}

/// Repository information from the integration provider
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationRepoInfo {
    pub provider: ProviderType,
    pub owner: String,
    pub name: String,
    pub full_name: String,
    pub description: Option<String>,
    pub stars: u32,
    pub forks: u32,
    pub open_issues_count: u32,
    pub is_private: bool,
    pub default_branch: String,
    pub url: String,
}

/// Pull request state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "lowercase")]
pub enum PrState {
    #[default]
    Open,
    Closed,
    Merged,
    All,
}

/// Pull request summary for list views
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PullRequest {
    pub provider: ProviderType,
    pub number: u32,
    pub title: String,
    pub state: PrState,
    pub author: IntegrationUser,
    pub source_branch: String,
    pub target_branch: String,
    pub draft: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub url: String,
}

/// Detailed pull request information
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestDetail {
    #[serde(flatten)]
    pub base: PullRequest,
    pub body: Option<String>,
    pub additions: u32,
    pub deletions: u32,
    pub changed_files: u32,
    pub commits_count: u32,
    pub comments_count: u32,
    pub mergeable: Option<bool>,
    pub labels: Vec<IntegrationLabel>,
    pub assignees: Vec<IntegrationUser>,
    pub reviewers: Vec<IntegrationUser>,
}

/// Options for creating a pull request
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreatePrOptions {
    pub title: String,
    pub body: Option<String>,
    pub source_branch: String,
    pub target_branch: String,
    pub draft: bool,
}

/// Options for merging a pull request
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MergePrOptions {
    pub merge_method: MergeMethod,
    pub commit_title: Option<String>,
    pub commit_message: Option<String>,
}

/// Merge method for pull requests
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "lowercase")]
pub enum MergeMethod {
    #[default]
    Merge,
    Squash,
    Rebase,
}

/// Issue state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "lowercase")]
pub enum IssueState {
    #[default]
    Open,
    Closed,
    All,
}

/// Issue summary for list views
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    pub provider: ProviderType,
    pub number: u32,
    pub title: String,
    pub state: IssueState,
    pub author: IntegrationUser,
    pub labels: Vec<IntegrationLabel>,
    pub comments_count: u32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub url: String,
}

/// Detailed issue information
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IssueDetail {
    #[serde(flatten)]
    pub base: Issue,
    pub body: Option<String>,
    pub assignees: Vec<IntegrationUser>,
    pub milestone: Option<String>,
}

/// Options for creating an issue
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateIssueOptions {
    pub title: String,
    pub body: Option<String>,
    pub labels: Vec<String>,
    pub assignees: Vec<String>,
}

/// CI/CD run status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum CIRunStatus {
    Queued,
    InProgress,
    Completed,
}

/// CI/CD run conclusion
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum CIConclusion {
    Success,
    Failure,
    Cancelled,
    Skipped,
    Neutral,
    TimedOut,
    ActionRequired,
}

/// CI/CD workflow run
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CIRun {
    pub provider: ProviderType,
    pub id: String,
    pub name: String,
    pub status: CIRunStatus,
    pub conclusion: Option<CIConclusion>,
    pub commit_sha: String,
    pub branch: Option<String>,
    pub event: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub url: String,
}

/// Paginated CI runs response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CiRunsPage {
    pub runs: Vec<CIRun>,
    pub total_count: u32,
    pub has_more: bool,
}

/// Paginated pull requests response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestsPage {
    pub items: Vec<PullRequest>,
    pub total_count: u32,
    pub has_more: bool,
}

/// Paginated issues response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IssuesPage {
    pub items: Vec<Issue>,
    pub total_count: u32,
    pub has_more: bool,
}

/// Paginated notifications response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct NotificationsPage {
    pub items: Vec<Notification>,
    pub has_more: bool,
}

/// Combined commit status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum CommitStatusState {
    Pending,
    Success,
    Failure,
    Error,
}

/// Commit status with all checks
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CommitStatus {
    pub state: CommitStatusState,
    pub checks: Vec<CIRun>,
    pub total_count: u32,
}

/// Notification reason
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
pub enum NotificationReason {
    Assigned,
    Author,
    Comment,
    Invitation,
    Manual,
    Mention,
    ReviewRequested,
    SecurityAlert,
    StateChange,
    Subscribed,
    TeamMention,
    CiActivity,
}

/// Notification subject type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "PascalCase")]
pub enum NotificationSubjectType {
    Issue,
    PullRequest,
    Release,
    Discussion,
    Commit,
    RepositoryVulnerabilityAlert,
    CheckSuite,
}

/// Notification from integration provider
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Notification {
    pub provider: ProviderType,
    pub id: String,
    pub reason: NotificationReason,
    pub unread: bool,
    pub subject_title: String,
    pub subject_type: NotificationSubjectType,
    pub subject_url: Option<String>,
    pub repository: String,
    pub updated_at: DateTime<Utc>,
    pub url: String,
}

/// User from integration provider
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationUser {
    pub login: String,
    pub avatar_url: String,
    pub url: String,
}

/// Label from integration provider
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationLabel {
    pub name: String,
    pub color: String,
    pub description: Option<String>,
}

/// Integration connection status
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationStatus {
    pub provider: ProviderType,
    pub connected: bool,
    pub username: Option<String>,
    pub avatar_url: Option<String>,
}

/// Detected provider from remote URL
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DetectedProvider {
    pub provider: ProviderType,
    pub owner: String,
    pub repo: String,
}
