mod oauth;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use http_body_util::BodyExt;
use octocrab::models::IssueState as OctocrabIssueState;
use octocrab::params;
use octocrab::Octocrab;
use serde::de::DeserializeOwned;
use std::sync::{Arc, RwLock};
use std::time::Duration;

use crate::error::{AxisError, Result};
use crate::models::{
    CIConclusion, CIRun, CIRunStatus, CiRunsPage, CommitStatus, CommitStatusState,
    CreateIssueOptions, CreatePrOptions, IntegrationCommit, IntegrationLabel, IntegrationRepoInfo,
    IntegrationStatus, IntegrationUser, Issue, IssueDetail, IssueState, IssuesPage, MergeMethod,
    MergePrOptions, Notification, NotificationReason, NotificationSubjectType, NotificationsPage,
    PrState, ProviderType, PullRequest, PullRequestDetail, PullRequestsPage,
};
use crate::services::integrations::{IntegrationProvider, TtlCache};

pub use oauth::OAuthFlow;

const GITHUB_TOKEN_KEY: &str = "integration_github_token";

// Cache TTL constants
const CACHE_TTL_SHORT: Duration = Duration::from_secs(30); // For frequently changing data (notifications)
const CACHE_TTL_MEDIUM: Duration = Duration::from_secs(60); // For PRs, issues, CI runs
const CACHE_TTL_LONG: Duration = Duration::from_secs(300); // For repo info

impl From<PrState> for params::State {
    fn from(state: PrState) -> Self {
        match state {
            PrState::Open => params::State::Open,
            PrState::Closed | PrState::Merged => params::State::Closed,
            PrState::All => params::State::All,
        }
    }
}

impl From<IssueState> for params::State {
    fn from(state: IssueState) -> Self {
        match state {
            IssueState::Open => params::State::Open,
            IssueState::Closed => params::State::Closed,
            IssueState::All => params::State::All,
        }
    }
}

impl From<MergeMethod> for params::pulls::MergeMethod {
    fn from(method: MergeMethod) -> Self {
        match method {
            MergeMethod::Merge => params::pulls::MergeMethod::Merge,
            MergeMethod::Squash => params::pulls::MergeMethod::Squash,
            MergeMethod::Rebase => params::pulls::MergeMethod::Rebase,
        }
    }
}

impl From<octocrab::models::Author> for IntegrationUser {
    fn from(author: octocrab::models::Author) -> Self {
        IntegrationUser {
            login: author.login,
            avatar_url: author.avatar_url.to_string(),
            url: author.html_url.to_string(),
        }
    }
}

impl From<octocrab::models::Label> for IntegrationLabel {
    fn from(label: octocrab::models::Label) -> Self {
        IntegrationLabel {
            name: label.name,
            color: label.color,
            description: label.description,
        }
    }
}

impl From<octocrab::models::pulls::PullRequest> for PullRequest {
    fn from(pr: octocrab::models::pulls::PullRequest) -> Self {
        PullRequest {
            provider: ProviderType::GitHub,
            number: pr.number as u32,
            title: pr.title.clone().unwrap_or_default(),
            state: match pr.state.as_ref() {
                Some(OctocrabIssueState::Open) => PrState::Open,
                Some(OctocrabIssueState::Closed) => {
                    if pr.merged_at.is_some() {
                        PrState::Merged
                    } else {
                        PrState::Closed
                    }
                }
                _ => PrState::Open,
            },
            author: pr.user.map(|a| (*a).into()).unwrap_or_default(),
            source_branch: pr.head.ref_field.clone(),
            target_branch: pr.base.ref_field.clone(),
            draft: pr.draft.unwrap_or(false),
            created_at: pr.created_at.unwrap_or_else(Utc::now),
            updated_at: pr.updated_at.unwrap_or_else(Utc::now),
            url: pr
                .html_url
                .as_ref()
                .map(|u| u.to_string())
                .unwrap_or_default(),
        }
    }
}

impl From<octocrab::models::issues::Issue> for Issue {
    fn from(issue: octocrab::models::issues::Issue) -> Self {
        Issue {
            provider: ProviderType::GitHub,
            number: issue.number as u32,
            title: issue.title.clone(),
            state: match issue.state {
                OctocrabIssueState::Open => IssueState::Open,
                OctocrabIssueState::Closed => IssueState::Closed,
                _ => IssueState::Open,
            },
            author: issue.user.into(),
            labels: issue
                .labels
                .into_iter()
                .map(Into::into)
                .collect(),
            comments_count: issue.comments,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            url: issue.html_url.to_string(),
        }
    }
}

impl From<octocrab::models::activity::Notification> for Notification {
    fn from(notification: octocrab::models::activity::Notification) -> Self {
        Notification {
            provider: ProviderType::GitHub,
            id: notification.id.to_string(),
            unread: notification.unread,
            reason: match notification.reason.as_str() {
                "assign" => NotificationReason::Assigned,
                "author" => NotificationReason::Author,
                "comment" => NotificationReason::Comment,
                "invitation" => NotificationReason::Invitation,
                "manual" => NotificationReason::Manual,
                "mention" => NotificationReason::Mention,
                "review_requested" => NotificationReason::ReviewRequested,
                "security_alert" => NotificationReason::SecurityAlert,
                "state_change" => NotificationReason::StateChange,
                "subscribed" => NotificationReason::Subscribed,
                "team_mention" => NotificationReason::TeamMention,
                "ci_activity" => NotificationReason::CiActivity,
                _ => NotificationReason::Subscribed,
            },
            subject_type: match notification.subject.r#type.as_str() {
                "Issue" => NotificationSubjectType::Issue,
                "PullRequest" => NotificationSubjectType::PullRequest,
                "Release" => NotificationSubjectType::Release,
                "Discussion" => NotificationSubjectType::Discussion,
                "Commit" => NotificationSubjectType::Commit,
                "RepositoryVulnerabilityAlert" => {
                    NotificationSubjectType::RepositoryVulnerabilityAlert
                }
                "CheckSuite" => NotificationSubjectType::CheckSuite,
                _ => NotificationSubjectType::Issue,
            },
            subject_title: notification.subject.title,
            subject_url: notification.subject.url.map(|u| u.to_string()),
            repository: notification.repository.full_name.unwrap_or_default(),
            updated_at: notification.updated_at,
            url: notification.url.to_string(),
        }
    }
}

impl From<octocrab::models::workflows::Run> for CIRun {
    fn from(run: octocrab::models::workflows::Run) -> Self {
        CIRun {
            provider: ProviderType::GitHub,
            id: run.id.to_string(),
            name: run.name,
            status: match run.status.as_str() {
                "queued" => CIRunStatus::Queued,
                "in_progress" => CIRunStatus::InProgress,
                "completed" => CIRunStatus::Completed,
                _ => CIRunStatus::Queued,
            },
            conclusion: match run.conclusion.as_deref() {
                Some("success") => Some(CIConclusion::Success),
                Some("failure") => Some(CIConclusion::Failure),
                Some("neutral") => Some(CIConclusion::Neutral),
                Some("cancelled") => Some(CIConclusion::Cancelled),
                Some("timed_out") => Some(CIConclusion::TimedOut),
                Some("action_required") => Some(CIConclusion::ActionRequired),
                _ => None,
            },
            commit_sha: run.head_sha,
            branch: Some(run.head_branch),
            event: run.event,
            created_at: run.created_at,
            updated_at: run.updated_at,
            url: run.html_url.to_string(),
        }
    }
}

impl From<octocrab::Page<octocrab::models::pulls::PullRequest>> for PullRequestsPage {
    fn from(page: octocrab::Page<octocrab::models::pulls::PullRequest>) -> Self {
        let items = page.items.into_iter().map(|pr| pr.into()).collect();

        PullRequestsPage {
            items,
            has_more: page.next.is_some(),
        }
    }
}

impl From<octocrab::Page<octocrab::models::issues::Issue>> for IssuesPage {
    fn from(page: octocrab::Page<octocrab::models::issues::Issue>) -> Self {
        // Filter out PRs - GitHub's issues API returns both issues and PRs
        let items = page
            .items
            .into_iter()
            .filter(|issue| issue.pull_request.is_none())
            .map(|issue| issue.into())
            .collect();

        IssuesPage {
            items,
            has_more: page.next.is_some(),
        }
    }
}

impl From<octocrab::Page<octocrab::models::activity::Notification>> for NotificationsPage {
    fn from(page: octocrab::Page<octocrab::models::activity::Notification>) -> Self {
        let items = page
            .items
            .into_iter()
            .map(|notification| notification.into())
            .collect();

        NotificationsPage {
            items,
            has_more: page.next.is_some(),
        }
    }
}

impl From<octocrab::Page<octocrab::models::workflows::Run>> for CiRunsPage {
    fn from(page: octocrab::Page<octocrab::models::workflows::Run>) -> Self {
        let items = page.items.into_iter().map(|run| run.into()).collect();

        CiRunsPage {
            runs: items,
            has_more: page.next.is_some(),
        }
    }
}

impl From<octocrab::Error> for AxisError {
    fn from(err: octocrab::Error) -> Self {
        AxisError::IntegrationError(format!("GitHub API error: {err:?}"))
    }
}

/// GitHub integration provider
pub struct GitHubProvider {
    client: RwLock<Option<Arc<Octocrab>>>,
    get_secret: Box<dyn Fn(&str) -> Result<Option<String>> + Send + Sync>,
    set_secret: Box<dyn Fn(&str, &str) -> Result<()> + Send + Sync>,
    delete_secret: Box<dyn Fn(&str) -> Result<()> + Send + Sync>,
    // Caches
    pr_cache: TtlCache<PullRequestsPage>,
    issue_cache: TtlCache<IssuesPage>,
    ci_cache: TtlCache<CiRunsPage>,
    notification_cache: TtlCache<NotificationsPage>,
    repo_info_cache: TtlCache<IntegrationRepoInfo>,
    commit_cache: TtlCache<IntegrationCommit>,
    commit_status_cache: TtlCache<CommitStatus>,
}

impl GitHubProvider {
    pub fn new<G, S, D>(get_secret: G, set_secret: S, delete_secret: D) -> Self
    where
        G: Fn(&str) -> Result<Option<String>> + Send + Sync + 'static,
        S: Fn(&str, &str) -> Result<()> + Send + Sync + 'static,
        D: Fn(&str) -> Result<()> + Send + Sync + 'static,
    {
        let mut client = None;

        // Try to initialize client from stored token
        if let Ok(Some(token)) = get_secret(GITHUB_TOKEN_KEY) {
            if let Ok(c) = Octocrab::builder().personal_token(token).build() {
                client = Some(Arc::new(c));
            }
        }

        Self {
            client: RwLock::new(client),
            get_secret: Box::new(get_secret),
            set_secret: Box::new(set_secret),
            delete_secret: Box::new(delete_secret),
            pr_cache: TtlCache::new(CACHE_TTL_MEDIUM),
            issue_cache: TtlCache::new(CACHE_TTL_MEDIUM),
            ci_cache: TtlCache::new(CACHE_TTL_MEDIUM),
            notification_cache: TtlCache::new(CACHE_TTL_SHORT),
            repo_info_cache: TtlCache::new(CACHE_TTL_LONG),
            commit_cache: TtlCache::new(CACHE_TTL_LONG),
            commit_status_cache: TtlCache::new(CACHE_TTL_SHORT),
        }
    }

    /// Clear all caches (called after mutations or disconnect)
    pub fn clear_caches(&self) {
        self.pr_cache.clear();
        self.issue_cache.clear();
        self.ci_cache.clear();
        self.notification_cache.clear();
        self.repo_info_cache.clear();
        self.commit_cache.clear();
        self.commit_status_cache.clear();
    }

    /// Invalidate PR cache (called after create/merge)
    pub fn invalidate_pr_cache(&self, owner: &str, repo: &str) {
        self.pr_cache
            .remove_by_prefix(&format!("{owner}/{repo}/prs/"));
    }

    /// Invalidate issue cache (called after create)
    pub fn invalidate_issue_cache(&self, owner: &str, repo: &str) {
        self.issue_cache
            .remove_by_prefix(&format!("{owner}/{repo}/issues/"));
    }

    /// Invalidate notification cache (called after mark as read)
    pub fn invalidate_notification_cache(&self, owner: &str, repo: &str) {
        self.notification_cache
            .remove_by_prefix(&format!("{owner}/{repo}/notifications/"));
    }

    /// Invalidate commit status cache (called after actions that trigger CI)
    pub fn invalidate_commit_status_cache(&self, owner: &str, repo: &str) {
        self.commit_status_cache
            .remove_by_prefix(&format!("{owner}/{repo}/status/"));
    }

    /// Set access token and create client (called after OAuth flow completes)
    pub fn set_token(&self, token: String) -> Result<()> {
        // Store token in secrets
        (self.set_secret)(GITHUB_TOKEN_KEY, &token)?;

        // Create Octocrab client
        let client = Octocrab::builder()
            .personal_token(token)
            .build()
            .map_err(|e| AxisError::IntegrationError(format!("Failed to create client: {e:?}")))?;

        self.set_client(Arc::new(client))?;
        Ok(())
    }

    fn get_client(&self) -> Result<Arc<Octocrab>> {
        let guard = self
            .client
            .read()
            .map_err(|e| AxisError::Other(format!("Lock poisoned: {e}")))?;
        guard
            .clone()
            .ok_or_else(|| AxisError::IntegrationNotConnected("GitHub".to_string()))
    }

    fn set_client(&self, client: Arc<Octocrab>) -> Result<()> {
        let mut guard = self
            .client
            .write()
            .map_err(|e| AxisError::Other(format!("Lock poisoned: {e}")))?;
        *guard = Some(client);
        Ok(())
    }

    fn clear_client(&self) -> Result<()> {
        let mut guard = self
            .client
            .write()
            .map_err(|e| AxisError::Other(format!("Lock poisoned: {e}")))?;
        *guard = None;
        Ok(())
    }

    /// Parse JSON from octocrab response body
    async fn parse_response<T: DeserializeOwned>(
        response: http::Response<
            http_body_util::combinators::BoxBody<bytes::Bytes, octocrab::Error>,
        >,
    ) -> Result<T> {
        let body = response
            .into_body()
            .collect()
            .await
            .map_err(|e| {
                AxisError::IntegrationError(format!("Failed to read response body: {e:?}"))
            })?
            .to_bytes();

        serde_json::from_slice(&body)
            .map_err(|e| AxisError::IntegrationError(format!("Failed to parse JSON: {e:?}")))
    }
}

#[async_trait]
impl IntegrationProvider for GitHubProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::GitHub
    }

    async fn is_connected(&self) -> bool {
        let client = match self.get_client() {
            Ok(c) => c,
            Err(_) => return false,
        };

        // Verify token is still valid by making a simple API call
        client.current().user().await.is_ok()
    }

    async fn get_status(&self) -> Result<IntegrationStatus> {
        let client = match self.get_client() {
            Ok(c) => c,
            Err(_) => {
                return Ok(IntegrationStatus {
                    provider: ProviderType::GitHub,
                    connected: false,
                    username: None,
                    avatar_url: None,
                });
            }
        };

        match client.current().user().await {
            Ok(user) => Ok(IntegrationStatus {
                provider: ProviderType::GitHub,
                connected: true,
                username: Some(user.login),
                avatar_url: Some(user.avatar_url.to_string()),
            }),
            Err(_) => Ok(IntegrationStatus {
                provider: ProviderType::GitHub,
                connected: false,
                username: None,
                avatar_url: None,
            }),
        }
    }

    async fn disconnect(&self) -> Result<()> {
        (self.delete_secret)(GITHUB_TOKEN_KEY)?;
        self.clear_client()?;
        self.clear_caches();
        Ok(())
    }

    async fn get_repo_info(&self, owner: &str, repo: &str) -> Result<IntegrationRepoInfo> {
        let cache_key = format!("{owner}/{repo}/info");

        // Check cache first
        if let Some(cached) = self.repo_info_cache.get(&cache_key) {
            return Ok(cached);
        }

        let client = self.get_client()?;

        let repository = client.repos(owner, repo).get().await?;

        let info = IntegrationRepoInfo {
            provider: ProviderType::GitHub,
            owner: repository
                .owner
                .as_ref()
                .map(|o| o.login.clone())
                .unwrap_or_default(),
            name: repository.name,
            full_name: repository.full_name.unwrap_or_default(),
            description: repository.description,
            stars: repository.stargazers_count.unwrap_or(0) as u32,
            forks: repository.forks_count.unwrap_or(0) as u32,
            open_issues_count: repository.open_issues_count.unwrap_or(0) as u32,
            is_private: repository.private.unwrap_or(false),
            default_branch: repository
                .default_branch
                .unwrap_or_else(|| "main".to_string()),
            url: repository
                .html_url
                .map(|u| u.to_string())
                .unwrap_or_default(),
        };

        // Store in cache
        self.repo_info_cache.set(cache_key, info.clone());

        Ok(info)
    }

    async fn get_commit(&self, owner: &str, repo: &str, sha: &str) -> Result<IntegrationCommit> {
        let cache_key = format!("{owner}/{repo}/commit/{sha}");

        if let Some(cached) = self.commit_cache.get(&cache_key) {
            return Ok(cached);
        }

        let client = self.get_client()?;

        let commit = client.commits(owner, repo).get(sha).await?;

        let result = IntegrationCommit {
            sha: commit.sha,
            author_avatar_url: commit.author.map(|a| a.avatar_url.to_string()),
        };

        self.commit_cache.set(cache_key, result.clone());

        Ok(result)
    }

    async fn list_pull_requests(
        &self,
        owner: &str,
        repo: &str,
        state: PrState,
        page: u32,
    ) -> Result<PullRequestsPage> {
        let cache_key = format!("{owner}/{repo}/prs/{state:?}/{page}");

        if let Some(cached) = self.pr_cache.get(&cache_key) {
            return Ok(cached);
        }

        let client = self.get_client()?;

        let result = client
            .pulls(owner, repo)
            .list()
            .state(state.into())
            .per_page(30)
            .page(page)
            .send()
            .await?;

        let page_result: PullRequestsPage = result.into();
        self.pr_cache.set(cache_key, page_result.clone());

        Ok(page_result)
    }

    async fn get_pull_request(
        &self,
        owner: &str,
        repo: &str,
        number: u32,
    ) -> Result<PullRequestDetail> {
        let client = self.get_client()?;

        let pr = client.pulls(owner, repo).get(number as u64).await?;

        let base: PullRequest = pr.clone().into();

        Ok(PullRequestDetail {
            base,
            body: pr.body,
            additions: pr.additions.unwrap_or(0) as u32,
            deletions: pr.deletions.unwrap_or(0) as u32,
            changed_files: pr.changed_files.unwrap_or(0) as u32,
            commits_count: pr.commits.unwrap_or(0) as u32,
            comments_count: pr.comments.unwrap_or(0) as u32,
            mergeable: pr.mergeable,
            labels: pr
                .labels
                .unwrap_or_default()
                .into_iter()
                .map(Into::into)
                .collect(),
            assignees: pr
                .assignees
                .unwrap_or_default()
                .into_iter()
                .map(Into::into)
                .collect(),
            reviewers: pr
                .requested_reviewers
                .unwrap_or_default()
                .into_iter()
                .map(Into::into)
                .collect(),
        })
    }

    async fn create_pull_request(
        &self,
        owner: &str,
        repo: &str,
        options: CreatePrOptions,
    ) -> Result<PullRequest> {
        let client = self.get_client()?;

        let title = options.title.clone();
        let source = options.source_branch.clone();
        let target = options.target_branch.clone();

        let pulls_handler = client.pulls(owner, repo);
        let mut request = pulls_handler
            .create(&title, &source, &target)
            .draft(options.draft);

        if let Some(body) = &options.body {
            request = request.body(body);
        }

        let pr = request.send().await?;

        self.invalidate_pr_cache(owner, repo);
        self.invalidate_commit_status_cache(owner, repo);

        Ok(pr.into())
    }

    async fn merge_pull_request(
        &self,
        owner: &str,
        repo: &str,
        number: u32,
        options: MergePrOptions,
    ) -> Result<()> {
        let client = self.get_client()?;

        let pulls_handler = client.pulls(owner, repo);
        let mut request = pulls_handler
            .merge(number as u64)
            .method(options.merge_method);

        if let Some(title) = options.commit_title {
            request = request.title(title);
        }

        if let Some(message) = options.commit_message {
            request = request.message(message);
        }

        request.send().await?;

        self.invalidate_pr_cache(owner, repo);
        self.invalidate_commit_status_cache(owner, repo);

        Ok(())
    }

    async fn list_issues(
        &self,
        owner: &str,
        repo: &str,
        state: IssueState,
        page: u32,
    ) -> Result<IssuesPage> {
        let cache_key = format!("{owner}/{repo}/issues/{state:?}/{page}");

        if let Some(cached) = self.issue_cache.get(&cache_key) {
            return Ok(cached);
        }

        let client = self.get_client()?;

        let result = client
            .issues(owner, repo)
            .list()
            .state(state.into())
            .per_page(30)
            .page(page)
            .send()
            .await?;

        let page_result: IssuesPage = result.into();
        self.issue_cache.set(cache_key, page_result.clone());

        Ok(page_result)
    }

    async fn get_issue(&self, owner: &str, repo: &str, number: u32) -> Result<IssueDetail> {
        let client = self.get_client()?;

        let issue = client.issues(owner, repo).get(number as u64).await?;

        let base: Issue = issue.clone().into();

        Ok(IssueDetail {
            base,
            body: issue.body,
            assignees: issue.assignees.into_iter().map(Into::into).collect(),
            milestone: issue.milestone.map(|m| m.title),
        })
    }

    async fn create_issue(
        &self,
        owner: &str,
        repo: &str,
        options: CreateIssueOptions,
    ) -> Result<Issue> {
        let client = self.get_client()?;

        let issues_handler = client.issues(owner, repo);
        let mut request = issues_handler.create(&options.title);

        if let Some(body) = &options.body {
            request = request.body(body);
        }

        if !options.labels.is_empty() {
            request = request.labels(options.labels.clone());
        }

        if !options.assignees.is_empty() {
            request = request.assignees(options.assignees.clone());
        }

        let issue = request.send().await?;

        self.invalidate_issue_cache(owner, repo);

        Ok(issue.into())
    }

    async fn list_ci_runs(&self, owner: &str, repo: &str, page: u32) -> Result<CiRunsPage> {
        let cache_key = format!("{owner}/{repo}/ci/{page}");

        if let Some(cached) = self.ci_cache.get(&cache_key) {
            return Ok(cached);
        }

        let client = self.get_client()?;

        let result = client
            .workflows(owner, repo)
            .list_all_runs()
            .page(page)
            .per_page(30)
            .send()
            .await?;

        let page_result: CiRunsPage = result.into();
        self.ci_cache.set(cache_key, page_result.clone());

        Ok(page_result)
    }

    async fn get_commit_status(&self, owner: &str, repo: &str, sha: &str) -> Result<CommitStatus> {
        let cache_key = format!("{owner}/{repo}/status/{sha}");

        if let Some(cached) = self.commit_status_cache.get(&cache_key) {
            return Ok(cached);
        }

        let client = self.get_client()?;

        // NOTE: Using raw API calls here because:
        // 1. octocrab's Reference enum only supports Branch/Tag, not SHA
        // 2. octocrab's CheckRun model is missing the `status` field (only has `conclusion`)
        //    GitHub API returns status: queued | in_progress | completed, which we need

        // Get combined status
        let route = format!("/repos/{owner}/{repo}/commits/{sha}/status");
        let http_response = client._get(&route).await.map_err(|e| {
            AxisError::IntegrationError(format!("Failed to get commit status: {e:?}"))
        })?;

        let response: serde_json::Value = Self::parse_response(http_response).await?;

        let state = match response["state"].as_str() {
            Some("pending") => CommitStatusState::Pending,
            Some("success") => CommitStatusState::Success,
            Some("failure") => CommitStatusState::Failure,
            Some("error") => CommitStatusState::Error,
            _ => CommitStatusState::Pending,
        };

        // Get check runs (separate from commit statuses)
        let checks_route = format!("/repos/{owner}/{repo}/commits/{sha}/check-runs");
        let checks_response: serde_json::Value = match client._get(&checks_route).await {
            Ok(resp) => Self::parse_response(resp).await.unwrap_or_else(|e| {
                log::warn!("Failed to parse check runs response: {e:?}");
                serde_json::json!({"check_runs": []})
            }),
            Err(e) => {
                log::warn!("Failed to fetch check runs: {e:?}");
                serde_json::json!({"check_runs": []})
            }
        };

        let checks: Vec<CIRun> = checks_response["check_runs"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .map(|check| {
                let status = match check["status"].as_str() {
                    Some("queued") => CIRunStatus::Queued,
                    Some("in_progress") => CIRunStatus::InProgress,
                    _ => CIRunStatus::Completed,
                };

                let conclusion = check["conclusion"].as_str().map(|c| match c {
                    "success" => CIConclusion::Success,
                    "failure" => CIConclusion::Failure,
                    "cancelled" => CIConclusion::Cancelled,
                    "skipped" => CIConclusion::Skipped,
                    "neutral" => CIConclusion::Neutral,
                    "timed_out" => CIConclusion::TimedOut,
                    "action_required" => CIConclusion::ActionRequired,
                    _ => CIConclusion::Neutral,
                });

                CIRun {
                    provider: ProviderType::GitHub,
                    id: check["id"].as_u64().unwrap_or(0).to_string(),
                    name: check["name"].as_str().unwrap_or("").to_string(),
                    status,
                    conclusion,
                    commit_sha: sha.to_string(),
                    branch: None,
                    event: "check_run".to_string(),
                    created_at: check["started_at"]
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(Utc::now),
                    updated_at: check["completed_at"]
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(Utc::now),
                    url: check["html_url"].as_str().unwrap_or("").to_string(),
                }
            })
            .collect();

        let result = CommitStatus {
            state,
            checks,
            total_count: response["total_count"].as_u64().unwrap_or(0) as u32,
        };

        self.commit_status_cache.set(cache_key, result.clone());

        Ok(result)
    }

    async fn list_notifications(
        &self,
        owner: &str,
        repo: &str,
        all: bool,
        page: u32,
    ) -> Result<NotificationsPage> {
        let cache_key = format!("{owner}/{repo}/notifications/{all}/{page}");

        if let Some(cached) = self.notification_cache.get(&cache_key) {
            return Ok(cached);
        }

        let client = self.get_client()?;

        let result = client
            .activity()
            .notifications()
            .list_for_repo(owner, repo)
            .all(all)
            .per_page(30)
            .page(page.try_into().unwrap_or(255))
            .send()
            .await?;

        let page_result: NotificationsPage = result.into();
        self.notification_cache.set(cache_key, page_result.clone());

        Ok(page_result)
    }

    async fn mark_notification_read(&self, thread_id: &str) -> Result<()> {
        let client = self.get_client()?;

        let id: u64 = thread_id
            .parse()
            .map_err(|e| AxisError::IntegrationError(format!("Invalid thread ID format: {e:?}")))?;
        client
            .activity()
            .notifications()
            .mark_as_read(id.into())
            .await?;

        // Clear all notification cache since we don't know which repo this belongs to
        self.notification_cache.clear();

        Ok(())
    }

    async fn mark_all_notifications_read(&self, owner: &str, repo: &str) -> Result<()> {
        let client = self.get_client()?;

        client
            .activity()
            .notifications()
            .mark_repo_as_read(owner, repo, None)
            .await?;

        self.invalidate_notification_cache(owner, repo);

        Ok(())
    }

    async fn get_unread_count(&self, owner: &str, repo: &str) -> Result<u32> {
        let page = self.list_notifications(owner, repo, false, 1).await?;
        Ok(page.items.len() as u32)
    }
}
