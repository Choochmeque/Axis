use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;
use strum::Display;

/// Supported integration providers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Type, Display)]
#[serde(rename_all = "PascalCase")]
pub enum ProviderType {
    GitHub,
    GitLab,
    Bitbucket,
    Gitea,
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
#[serde(rename_all = "PascalCase")]
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
    pub labels: Vec<String>,
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
#[serde(rename_all = "PascalCase")]
pub enum MergeMethod {
    #[default]
    Merge,
    Squash,
    Rebase,
}

/// Issue state
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, Default)]
#[serde(rename_all = "PascalCase")]
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
#[serde(rename_all = "PascalCase")]
pub enum CIRunStatus {
    Queued,
    InProgress,
    Completed,
}

/// CI/CD run conclusion
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "PascalCase")]
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
    pub has_more: bool,
}

/// Paginated pull requests response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestsPage {
    pub items: Vec<PullRequest>,
    pub has_more: bool,
}

/// Paginated issues response
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IssuesPage {
    pub items: Vec<Issue>,
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
#[serde(rename_all = "PascalCase")]
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
#[serde(rename_all = "PascalCase")]
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

impl Default for IntegrationUser {
    fn default() -> Self {
        Self {
            login: "unknown".to_string(),
            avatar_url: String::new(),
            url: String::new(),
        }
    }
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

/// Commit information from integration provider (for avatar fetching)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationCommit {
    pub sha: String,
    pub author_avatar_url: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== ProviderType Tests ====================

    #[test]
    fn test_provider_type_display() {
        assert_eq!(ProviderType::GitHub.to_string(), "GitHub");
        assert_eq!(ProviderType::GitLab.to_string(), "GitLab");
        assert_eq!(ProviderType::Bitbucket.to_string(), "Bitbucket");
        assert_eq!(ProviderType::Gitea.to_string(), "Gitea");
    }

    #[test]
    fn test_provider_type_equality() {
        assert_eq!(ProviderType::GitHub, ProviderType::GitHub);
        assert_ne!(ProviderType::GitHub, ProviderType::GitLab);
    }

    #[test]
    fn test_provider_type_serialization() {
        let github = ProviderType::GitHub;
        let json = serde_json::to_string(&github).expect("should serialize");
        assert_eq!(json, "\"GitHub\"");
    }

    // ==================== PrState Tests ====================

    #[test]
    fn test_pr_state_default() {
        let state = PrState::default();
        assert_eq!(state, PrState::Open);
    }

    #[test]
    fn test_pr_state_serialization() {
        assert_eq!(
            serde_json::to_string(&PrState::Open).expect("serialize"),
            "\"Open\""
        );
        assert_eq!(
            serde_json::to_string(&PrState::Closed).expect("serialize"),
            "\"Closed\""
        );
        assert_eq!(
            serde_json::to_string(&PrState::Merged).expect("serialize"),
            "\"Merged\""
        );
    }

    // ==================== IssueState Tests ====================

    #[test]
    fn test_issue_state_default() {
        let state = IssueState::default();
        assert_eq!(state, IssueState::Open);
    }

    #[test]
    fn test_issue_state_serialization() {
        assert_eq!(
            serde_json::to_string(&IssueState::Open).expect("serialize"),
            "\"Open\""
        );
        assert_eq!(
            serde_json::to_string(&IssueState::Closed).expect("serialize"),
            "\"Closed\""
        );
    }

    // ==================== MergeMethod Tests ====================

    #[test]
    fn test_merge_method_default() {
        let method = MergeMethod::default();
        assert_eq!(method, MergeMethod::Merge);
    }

    #[test]
    fn test_merge_method_serialization() {
        assert_eq!(
            serde_json::to_string(&MergeMethod::Merge).expect("serialize"),
            "\"Merge\""
        );
        assert_eq!(
            serde_json::to_string(&MergeMethod::Squash).expect("serialize"),
            "\"Squash\""
        );
        assert_eq!(
            serde_json::to_string(&MergeMethod::Rebase).expect("serialize"),
            "\"Rebase\""
        );
    }

    // ==================== IntegrationUser Tests ====================

    #[test]
    fn test_integration_user_default() {
        let user = IntegrationUser::default();
        assert_eq!(user.login, "unknown");
        assert!(user.avatar_url.is_empty());
        assert!(user.url.is_empty());
    }

    #[test]
    fn test_integration_user_custom() {
        let user = IntegrationUser {
            login: "octocat".to_string(),
            avatar_url: "https://avatars.githubusercontent.com/u/583231".to_string(),
            url: "https://github.com/octocat".to_string(),
        };

        assert_eq!(user.login, "octocat");
        assert!(user.avatar_url.contains("github"));
    }

    // ==================== IntegrationLabel Tests ====================

    #[test]
    fn test_integration_label() {
        let label = IntegrationLabel {
            name: "bug".to_string(),
            color: "d73a4a".to_string(),
            description: Some("Something isn't working".to_string()),
        };

        assert_eq!(label.name, "bug");
        assert_eq!(label.color, "d73a4a");
    }

    #[test]
    fn test_integration_label_no_description() {
        let label = IntegrationLabel {
            name: "enhancement".to_string(),
            color: "a2eeef".to_string(),
            description: None,
        };

        assert!(label.description.is_none());
    }

    // ==================== CIRunStatus Tests ====================

    #[test]
    fn test_ci_run_status_serialization() {
        assert_eq!(
            serde_json::to_string(&CIRunStatus::Queued).expect("serialize"),
            "\"Queued\""
        );
        assert_eq!(
            serde_json::to_string(&CIRunStatus::InProgress).expect("serialize"),
            "\"InProgress\""
        );
        assert_eq!(
            serde_json::to_string(&CIRunStatus::Completed).expect("serialize"),
            "\"Completed\""
        );
    }

    // ==================== CIConclusion Tests ====================

    #[test]
    fn test_ci_conclusion_serialization() {
        assert_eq!(
            serde_json::to_string(&CIConclusion::Success).expect("serialize"),
            "\"Success\""
        );
        assert_eq!(
            serde_json::to_string(&CIConclusion::Failure).expect("serialize"),
            "\"Failure\""
        );
        assert_eq!(
            serde_json::to_string(&CIConclusion::Cancelled).expect("serialize"),
            "\"Cancelled\""
        );
    }

    // ==================== CommitStatusState Tests ====================

    #[test]
    fn test_commit_status_state_serialization() {
        assert_eq!(
            serde_json::to_string(&CommitStatusState::Pending).expect("serialize"),
            "\"Pending\""
        );
        assert_eq!(
            serde_json::to_string(&CommitStatusState::Success).expect("serialize"),
            "\"Success\""
        );
        assert_eq!(
            serde_json::to_string(&CommitStatusState::Failure).expect("serialize"),
            "\"Failure\""
        );
    }

    // ==================== NotificationReason Tests ====================

    #[test]
    fn test_notification_reason_serialization() {
        assert_eq!(
            serde_json::to_string(&NotificationReason::Mention).expect("serialize"),
            "\"Mention\""
        );
        assert_eq!(
            serde_json::to_string(&NotificationReason::ReviewRequested).expect("serialize"),
            "\"ReviewRequested\""
        );
    }

    // ==================== NotificationSubjectType Tests ====================

    #[test]
    fn test_notification_subject_type_serialization() {
        assert_eq!(
            serde_json::to_string(&NotificationSubjectType::Issue).expect("serialize"),
            "\"Issue\""
        );
        assert_eq!(
            serde_json::to_string(&NotificationSubjectType::PullRequest).expect("serialize"),
            "\"PullRequest\""
        );
    }

    // ==================== IntegrationStatus Tests ====================

    #[test]
    fn test_integration_status_connected() {
        let status = IntegrationStatus {
            provider: ProviderType::GitHub,
            connected: true,
            username: Some("octocat".to_string()),
            avatar_url: Some("https://example.com/avatar.png".to_string()),
        };

        assert!(status.connected);
        assert_eq!(status.username, Some("octocat".to_string()));
    }

    #[test]
    fn test_integration_status_disconnected() {
        let status = IntegrationStatus {
            provider: ProviderType::GitLab,
            connected: false,
            username: None,
            avatar_url: None,
        };

        assert!(!status.connected);
        assert!(status.username.is_none());
    }

    // ==================== DetectedProvider Tests ====================

    #[test]
    fn test_detected_provider() {
        let detected = DetectedProvider {
            provider: ProviderType::GitHub,
            owner: "rust-lang".to_string(),
            repo: "rust".to_string(),
        };

        assert_eq!(detected.provider, ProviderType::GitHub);
        assert_eq!(detected.owner, "rust-lang");
        assert_eq!(detected.repo, "rust");
    }

    // ==================== IntegrationCommit Tests ====================

    #[test]
    fn test_integration_commit_with_avatar() {
        let commit = IntegrationCommit {
            sha: "abc123def456".to_string(),
            author_avatar_url: Some("https://example.com/avatar.png".to_string()),
        };

        assert_eq!(commit.sha, "abc123def456");
        assert!(commit.author_avatar_url.is_some());
    }

    #[test]
    fn test_integration_commit_no_avatar() {
        let commit = IntegrationCommit {
            sha: "xyz789".to_string(),
            author_avatar_url: None,
        };

        assert!(commit.author_avatar_url.is_none());
    }

    // ==================== Page Types Tests ====================

    #[test]
    fn test_ci_runs_page_empty() {
        let page = CiRunsPage {
            runs: vec![],
            has_more: false,
        };

        assert!(page.runs.is_empty());
        assert!(!page.has_more);
    }

    #[test]
    fn test_pull_requests_page() {
        let page = PullRequestsPage {
            items: vec![],
            has_more: true,
        };

        assert!(page.has_more);
    }

    #[test]
    fn test_issues_page() {
        let page = IssuesPage {
            items: vec![],
            has_more: false,
        };

        assert!(!page.has_more);
    }

    #[test]
    fn test_notifications_page() {
        let page = NotificationsPage {
            items: vec![],
            has_more: true,
        };

        assert!(page.has_more);
    }

    // ==================== CreatePrOptions Tests ====================

    #[test]
    fn test_create_pr_options() {
        let opts = CreatePrOptions {
            title: "Add new feature".to_string(),
            body: Some("This PR adds a new feature".to_string()),
            source_branch: "feature/new-feature".to_string(),
            target_branch: "main".to_string(),
            draft: false,
            labels: vec!["enhancement".to_string()],
        };

        assert_eq!(opts.title, "Add new feature");
        assert!(!opts.draft);
        assert_eq!(opts.labels.len(), 1);
    }

    #[test]
    fn test_create_pr_options_draft() {
        let opts = CreatePrOptions {
            title: "WIP: Work in progress".to_string(),
            body: None,
            source_branch: "wip-branch".to_string(),
            target_branch: "develop".to_string(),
            draft: true,
            labels: vec![],
        };

        assert!(opts.draft);
        assert!(opts.body.is_none());
        assert!(opts.labels.is_empty());
    }

    #[test]
    fn test_create_pr_options_with_labels() {
        let opts = CreatePrOptions {
            title: "Fix bug".to_string(),
            body: Some("Fixes #123".to_string()),
            source_branch: "fix/bug-123".to_string(),
            target_branch: "main".to_string(),
            draft: false,
            labels: vec!["bug".to_string(), "priority:high".to_string()],
        };

        assert_eq!(opts.labels.len(), 2);
        assert_eq!(opts.labels[0], "bug");
        assert_eq!(opts.labels[1], "priority:high");
    }

    // ==================== MergePrOptions Tests ====================

    #[test]
    fn test_merge_pr_options_default_merge() {
        let opts = MergePrOptions {
            merge_method: MergeMethod::Merge,
            commit_title: None,
            commit_message: None,
        };

        assert_eq!(opts.merge_method, MergeMethod::Merge);
    }

    #[test]
    fn test_merge_pr_options_squash() {
        let opts = MergePrOptions {
            merge_method: MergeMethod::Squash,
            commit_title: Some("feat: Add feature (#123)".to_string()),
            commit_message: Some("Combined commit message".to_string()),
        };

        assert_eq!(opts.merge_method, MergeMethod::Squash);
        assert!(opts.commit_title.is_some());
    }

    // ==================== CreateIssueOptions Tests ====================

    #[test]
    fn test_create_issue_options() {
        let opts = CreateIssueOptions {
            title: "Bug: Something is broken".to_string(),
            body: Some("Steps to reproduce...".to_string()),
            labels: vec!["bug".to_string(), "priority:high".to_string()],
            assignees: vec!["developer".to_string()],
        };

        assert_eq!(opts.labels.len(), 2);
        assert_eq!(opts.assignees.len(), 1);
    }

    #[test]
    fn test_create_issue_options_minimal() {
        let opts = CreateIssueOptions {
            title: "Simple issue".to_string(),
            body: None,
            labels: vec![],
            assignees: vec![],
        };

        assert!(opts.labels.is_empty());
        assert!(opts.body.is_none());
    }
}
