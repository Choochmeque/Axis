mod oauth;

use async_trait::async_trait;
use chrono::{DateTime, Utc};
use http_body_util::BodyExt;
use octocrab::models::pulls::PullRequest as OctocrabPR;
use octocrab::models::Author;
use octocrab::models::IssueState as OctocrabIssueState;
use octocrab::params;
use octocrab::Octocrab;
use serde::de::DeserializeOwned;
use std::sync::{Arc, RwLock};
use std::time::Duration;

use crate::error::{AxisError, Result};
use crate::models::{
    CIConclusion, CIRun, CIRunStatus, CiRunsPage, CommitStatus, CommitStatusState,
    CreateIssueOptions, CreatePrOptions, IntegrationLabel, IntegrationRepoInfo, IntegrationStatus,
    IntegrationUser, Issue, IssueDetail, IssueState, IssuesPage, MergeMethod, MergePrOptions,
    Notification, NotificationReason, NotificationSubjectType, NotificationsPage, PrState,
    ProviderType, PullRequest, PullRequestDetail, PullRequestsPage,
};
use crate::services::integrations::{IntegrationProvider, TtlCache};

pub use oauth::OAuthFlow;

const GITHUB_TOKEN_KEY: &str = "integration_github_token";
const GITHUB_CLIENT_ID_KEY: &str = "integration_github_client_id";

// Cache TTL constants
const CACHE_TTL_SHORT: Duration = Duration::from_secs(30); // For frequently changing data (notifications)
const CACHE_TTL_MEDIUM: Duration = Duration::from_secs(60); // For PRs, issues, CI runs
const CACHE_TTL_LONG: Duration = Duration::from_secs(300); // For repo info

/// GitHub integration provider
pub struct GitHubProvider {
    client: RwLock<Option<Arc<Octocrab>>>,
    client_id: RwLock<Option<String>>,
    get_secret: Box<dyn Fn(&str) -> Result<Option<String>> + Send + Sync>,
    set_secret: Box<dyn Fn(&str, &str) -> Result<()> + Send + Sync>,
    delete_secret: Box<dyn Fn(&str) -> Result<()> + Send + Sync>,
    // Caches
    pr_cache: TtlCache<Vec<PullRequest>>,
    issue_cache: TtlCache<Vec<Issue>>,
    ci_cache: TtlCache<Vec<CIRun>>,
    notification_cache: TtlCache<Vec<Notification>>,
    repo_info_cache: TtlCache<IntegrationRepoInfo>,
}

impl GitHubProvider {
    pub fn new<G, S, D>(get_secret: G, set_secret: S, delete_secret: D) -> Self
    where
        G: Fn(&str) -> Result<Option<String>> + Send + Sync + 'static,
        S: Fn(&str, &str) -> Result<()> + Send + Sync + 'static,
        D: Fn(&str) -> Result<()> + Send + Sync + 'static,
    {
        let mut client = None;
        let mut stored_client_id = None;

        // Try to initialize client from stored token
        if let Ok(Some(token)) = get_secret(GITHUB_TOKEN_KEY) {
            if let Ok(c) = Octocrab::builder().personal_token(token).build() {
                client = Some(Arc::new(c));
            }
        }

        // Load client_id from secrets if available
        if let Ok(Some(id)) = get_secret(GITHUB_CLIENT_ID_KEY) {
            stored_client_id = Some(id);
        }

        Self {
            client: RwLock::new(client),
            client_id: RwLock::new(stored_client_id),
            get_secret: Box::new(get_secret),
            set_secret: Box::new(set_secret),
            delete_secret: Box::new(delete_secret),
            pr_cache: TtlCache::new(CACHE_TTL_MEDIUM),
            issue_cache: TtlCache::new(CACHE_TTL_MEDIUM),
            ci_cache: TtlCache::new(CACHE_TTL_MEDIUM),
            notification_cache: TtlCache::new(CACHE_TTL_SHORT),
            repo_info_cache: TtlCache::new(CACHE_TTL_LONG),
        }
    }

    /// Clear all caches (called after mutations or disconnect)
    pub fn clear_caches(&self) {
        self.pr_cache.clear();
        self.issue_cache.clear();
        self.ci_cache.clear();
        self.notification_cache.clear();
        self.repo_info_cache.clear();
    }

    /// Invalidate PR cache (called after create/merge)
    pub fn invalidate_pr_cache(&self, owner: &str, repo: &str) {
        // Invalidate all states for this repo
        for state in ["open", "closed", "merged", "all"] {
            self.pr_cache.remove(&format!("{owner}/{repo}/prs/{state}"));
        }
    }

    /// Invalidate issue cache (called after create)
    pub fn invalidate_issue_cache(&self, owner: &str, repo: &str) {
        for state in ["open", "closed", "all"] {
            self.issue_cache
                .remove(&format!("{owner}/{repo}/issues/{state}"));
        }
    }

    /// Set OAuth client ID (PKCE flow doesn't need client secret)
    pub fn set_client_id(&self, client_id: String) -> Result<()> {
        // Store in secrets
        (self.set_secret)(GITHUB_CLIENT_ID_KEY, &client_id)?;

        let mut guard = self
            .client_id
            .write()
            .map_err(|e| AxisError::Other(format!("Lock poisoned: {e}")))?;
        *guard = Some(client_id);
        Ok(())
    }

    /// Get the configured client ID
    pub fn get_client_id(&self) -> Result<Option<String>> {
        // Check memory first
        let guard = self
            .client_id
            .read()
            .map_err(|e| AxisError::Other(format!("Lock poisoned: {e}")))?;
        if guard.is_some() {
            return Ok(guard.clone());
        }
        drop(guard);

        // Use compile-time .env value
        let env_id = dotenvy_macro::dotenv!("GITHUB_CLIENT_ID");
        if !env_id.is_empty() {
            return Ok(Some(env_id.to_string()));
        }

        Ok(None)
    }

    /// Set access token and create client (called after OAuth flow completes)
    pub fn set_token(&self, token: String) -> Result<()> {
        // Store token in secrets
        (self.set_secret)(GITHUB_TOKEN_KEY, &token)?;

        // Create Octocrab client
        let client = Octocrab::builder()
            .personal_token(token)
            .build()
            .map_err(|e| AxisError::IntegrationError(format!("Failed to create client: {e}")))?;

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
            .map_err(|e| AxisError::IntegrationError(format!("Failed to read response body: {e}")))?
            .to_bytes();

        serde_json::from_slice(&body)
            .map_err(|e| AxisError::IntegrationError(format!("Failed to parse JSON: {e}")))
    }

    /// Convert Author to IntegrationUser
    fn convert_author(author: &Author) -> IntegrationUser {
        IntegrationUser {
            login: author.login.clone(),
            avatar_url: author.avatar_url.to_string(),
            url: author.html_url.to_string(),
        }
    }

    /// Convert optional boxed Author to IntegrationUser (for PR user which is Box<Author>)
    fn convert_optional_boxed_author(author: Option<&Box<Author>>) -> IntegrationUser {
        author
            .map(|a| Self::convert_author(a))
            .unwrap_or_else(|| IntegrationUser {
                login: "unknown".to_string(),
                avatar_url: String::new(),
                url: String::new(),
            })
    }

    /// Convert optional Author to IntegrationUser (for issue user which is Author directly)
    fn convert_optional_author(author: Option<&Author>) -> IntegrationUser {
        author
            .map(Self::convert_author)
            .unwrap_or_else(|| IntegrationUser {
                login: "unknown".to_string(),
                avatar_url: String::new(),
                url: String::new(),
            })
    }

    /// Convert octocrab PR to our model
    fn convert_pr(pr: &OctocrabPR, provider: ProviderType) -> PullRequest {
        PullRequest {
            provider,
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
            author: Self::convert_optional_boxed_author(pr.user.as_ref()),
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

#[async_trait]
impl IntegrationProvider for GitHubProvider {
    fn provider_type(&self) -> ProviderType {
        ProviderType::GitHub
    }

    fn get_oauth_url(&self, _state: &str) -> String {
        // Deprecated: Use OAuthFlow::start() instead which handles PKCE
        log::warn!("get_oauth_url is deprecated, use OAuthFlow::start() for PKCE support");
        String::new()
    }

    async fn exchange_code(&self, _code: &str) -> Result<String> {
        // Deprecated: Use OAuthFlow::start() instead which handles PKCE exchange
        log::error!("exchange_code is deprecated, use OAuthFlow::start() for PKCE support");
        Err(AxisError::OAuthError(
            "Use OAuthFlow::start() for OAuth with PKCE support".to_string(),
        ))
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

        let repository =
            client.repos(owner, repo).get().await.map_err(|e| {
                AxisError::IntegrationError(format!("Failed to get repo info: {e}"))
            })?;

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

    async fn list_pull_requests(
        &self,
        owner: &str,
        repo: &str,
        state: PrState,
        page: u32,
    ) -> Result<PullRequestsPage> {
        const PER_PAGE: u32 = 30;
        let client = self.get_client()?;

        let gh_state = match state {
            PrState::Open => "open",
            PrState::Closed | PrState::Merged => "closed",
            PrState::All => "all",
        };

        // Use REST API directly for pagination control
        let route =
            format!("/repos/{owner}/{repo}/pulls?state={gh_state}&per_page={PER_PAGE}&page={page}");
        let http_response = client
            ._get(&route)
            .await
            .map_err(|e| AxisError::IntegrationError(format!("Failed to list PRs: {e}")))?;

        // Get Link header for pagination info
        let link_header = http_response
            .headers()
            .get("link")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        let has_more = link_header.contains("rel=\"next\"");

        let response: Vec<serde_json::Value> = Self::parse_response(http_response).await?;

        let mut items: Vec<PullRequest> = response
            .iter()
            .map(|pr| {
                let pr_state = match pr["state"].as_str() {
                    Some("open") => PrState::Open,
                    Some("closed") => {
                        if pr["merged_at"].is_string() {
                            PrState::Merged
                        } else {
                            PrState::Closed
                        }
                    }
                    _ => PrState::Open,
                };

                PullRequest {
                    provider: ProviderType::GitHub,
                    number: pr["number"].as_u64().unwrap_or(0) as u32,
                    title: pr["title"].as_str().unwrap_or("").to_string(),
                    state: pr_state,
                    author: IntegrationUser {
                        login: pr["user"]["login"].as_str().unwrap_or("").to_string(),
                        avatar_url: pr["user"]["avatar_url"].as_str().unwrap_or("").to_string(),
                        url: pr["user"]["html_url"].as_str().unwrap_or("").to_string(),
                    },
                    source_branch: pr["head"]["ref"].as_str().unwrap_or("").to_string(),
                    target_branch: pr["base"]["ref"].as_str().unwrap_or("").to_string(),
                    draft: pr["draft"].as_bool().unwrap_or(false),
                    created_at: pr["created_at"]
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(Utc::now),
                    updated_at: pr["updated_at"]
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(Utc::now),
                    url: pr["html_url"].as_str().unwrap_or("").to_string(),
                }
            })
            .collect();

        // Filter merged if specifically requested
        if state == PrState::Merged {
            items.retain(|pr| pr.state == PrState::Merged);
        }

        // GitHub doesn't give us total count for PRs, estimate based on current page
        let total_count = if has_more {
            (page * PER_PAGE) + PER_PAGE
        } else {
            ((page - 1) * PER_PAGE) + items.len() as u32
        };

        Ok(PullRequestsPage {
            items,
            total_count,
            has_more,
        })
    }

    async fn get_pull_request(
        &self,
        owner: &str,
        repo: &str,
        number: u32,
    ) -> Result<PullRequestDetail> {
        let client = self.get_client()?;

        let pr = client
            .pulls(owner, repo)
            .get(number as u64)
            .await
            .map_err(|e| AxisError::IntegrationError(format!("Failed to get PR: {e}")))?;

        let base = Self::convert_pr(&pr, ProviderType::GitHub);

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
                .iter()
                .map(|l| IntegrationLabel {
                    name: l.name.clone(),
                    color: l.color.clone(),
                    description: l.description.clone(),
                })
                .collect(),
            assignees: pr
                .assignees
                .unwrap_or_default()
                .iter()
                .map(Self::convert_author)
                .collect(),
            reviewers: pr
                .requested_reviewers
                .unwrap_or_default()
                .iter()
                .map(Self::convert_author)
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
        let mut request = pulls_handler.create(&title, &source, &target);

        if let Some(body) = &options.body {
            request = request.body(body);
        }

        if options.draft {
            request = request.draft(true);
        }

        let pr = request
            .send()
            .await
            .map_err(|e| AxisError::IntegrationError(format!("Failed to create PR: {e}")))?;

        Ok(Self::convert_pr(&pr, ProviderType::GitHub))
    }

    async fn merge_pull_request(
        &self,
        owner: &str,
        repo: &str,
        number: u32,
        options: MergePrOptions,
    ) -> Result<()> {
        let client = self.get_client()?;

        let method = match options.merge_method {
            MergeMethod::Merge => "merge",
            MergeMethod::Squash => "squash",
            MergeMethod::Rebase => "rebase",
        };

        // Use the API directly for merge
        let route = format!("/repos/{owner}/{repo}/pulls/{number}/merge");
        let mut body = serde_json::json!({
            "merge_method": method,
        });

        if let Some(title) = options.commit_title {
            body["commit_title"] = serde_json::Value::String(title);
        }
        if let Some(message) = options.commit_message {
            body["commit_message"] = serde_json::Value::String(message);
        }

        let response = client
            ._put(route, Some(&body))
            .await
            .map_err(|e| AxisError::IntegrationError(format!("Failed to merge PR: {e}")))?;

        if !response.status().is_success() {
            return Err(AxisError::IntegrationError(format!(
                "Failed to merge PR: HTTP {}",
                response.status()
            )));
        }

        Ok(())
    }

    async fn list_issues(
        &self,
        owner: &str,
        repo: &str,
        state: IssueState,
        page: u32,
    ) -> Result<IssuesPage> {
        const PER_PAGE: u32 = 30;
        let client = self.get_client()?;

        let state_str = match state {
            IssueState::Open => "open",
            IssueState::Closed => "closed",
            IssueState::All => "all",
        };

        // Use REST API directly for pagination control
        let route = format!(
            "/repos/{owner}/{repo}/issues?state={state_str}&per_page={PER_PAGE}&page={page}"
        );
        let http_response = client
            ._get(&route)
            .await
            .map_err(|e| AxisError::IntegrationError(format!("Failed to list issues: {e}")))?;

        // Get Link header for pagination info
        let link_header = http_response
            .headers()
            .get("link")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        let has_more = link_header.contains("rel=\"next\"");

        let response: Vec<serde_json::Value> = Self::parse_response(http_response).await?;

        // Filter out PRs (GitHub returns PRs in issues endpoint)
        let items: Vec<Issue> = response
            .iter()
            .filter(|i| i.get("pull_request").is_none())
            .map(|i| {
                let issue_state = match i["state"].as_str() {
                    Some("open") => IssueState::Open,
                    Some("closed") => IssueState::Closed,
                    _ => IssueState::Open,
                };

                Issue {
                    provider: ProviderType::GitHub,
                    number: i["number"].as_u64().unwrap_or(0) as u32,
                    title: i["title"].as_str().unwrap_or("").to_string(),
                    state: issue_state,
                    author: IntegrationUser {
                        login: i["user"]["login"].as_str().unwrap_or("").to_string(),
                        avatar_url: i["user"]["avatar_url"].as_str().unwrap_or("").to_string(),
                        url: i["user"]["html_url"].as_str().unwrap_or("").to_string(),
                    },
                    labels: i["labels"]
                        .as_array()
                        .unwrap_or(&Vec::new())
                        .iter()
                        .map(|l| IntegrationLabel {
                            name: l["name"].as_str().unwrap_or("").to_string(),
                            color: l["color"].as_str().unwrap_or("").to_string(),
                            description: l["description"].as_str().map(String::from),
                        })
                        .collect(),
                    comments_count: i["comments"].as_u64().unwrap_or(0) as u32,
                    created_at: i["created_at"]
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(Utc::now),
                    updated_at: i["updated_at"]
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(Utc::now),
                    url: i["html_url"].as_str().unwrap_or("").to_string(),
                }
            })
            .collect();

        // GitHub doesn't give us total count for issues directly
        let total_count = if has_more {
            (page * PER_PAGE) + PER_PAGE
        } else {
            ((page - 1) * PER_PAGE) + items.len() as u32
        };

        Ok(IssuesPage {
            items,
            total_count,
            has_more,
        })
    }

    async fn get_issue(&self, owner: &str, repo: &str, number: u32) -> Result<IssueDetail> {
        let client = self.get_client()?;

        let issue = client
            .issues(owner, repo)
            .get(number as u64)
            .await
            .map_err(|e| AxisError::IntegrationError(format!("Failed to get issue: {e}")))?;

        let base = Issue {
            provider: ProviderType::GitHub,
            number: issue.number as u32,
            title: issue.title.clone(),
            state: match issue.state {
                OctocrabIssueState::Open => IssueState::Open,
                OctocrabIssueState::Closed => IssueState::Closed,
                _ => IssueState::Open,
            },
            author: Self::convert_author(&issue.user),
            labels: issue
                .labels
                .iter()
                .map(|l| IntegrationLabel {
                    name: l.name.clone(),
                    color: l.color.clone(),
                    description: l.description.clone(),
                })
                .collect(),
            comments_count: issue.comments as u32,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            url: issue.html_url.to_string(),
        };

        Ok(IssueDetail {
            base,
            body: issue.body,
            assignees: issue.assignees.iter().map(Self::convert_author).collect(),
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

        let title = options.title.clone();
        let issues_handler = client.issues(owner, repo);
        let mut request = issues_handler.create(&title);

        if let Some(body) = &options.body {
            request = request.body(body);
        }

        if !options.labels.is_empty() {
            request = request.labels(options.labels.clone());
        }

        if !options.assignees.is_empty() {
            request = request.assignees(options.assignees.clone());
        }

        let issue = request
            .send()
            .await
            .map_err(|e| AxisError::IntegrationError(format!("Failed to create issue: {e}")))?;

        Ok(Issue {
            provider: ProviderType::GitHub,
            number: issue.number as u32,
            title: issue.title.clone(),
            state: IssueState::Open,
            author: Self::convert_author(&issue.user),
            labels: issue
                .labels
                .iter()
                .map(|l| IntegrationLabel {
                    name: l.name.clone(),
                    color: l.color.clone(),
                    description: l.description.clone(),
                })
                .collect(),
            comments_count: 0,
            created_at: issue.created_at,
            updated_at: issue.updated_at,
            url: issue.html_url.to_string(),
        })
    }

    async fn list_ci_runs(&self, owner: &str, repo: &str, page: u32) -> Result<CiRunsPage> {
        const PER_PAGE: u32 = 30;
        let client = self.get_client()?;

        // Use the Actions API with pagination
        let route = format!("/repos/{owner}/{repo}/actions/runs?per_page={PER_PAGE}&page={page}");
        let http_response = client
            ._get(route)
            .await
            .map_err(|e| AxisError::IntegrationError(format!("Failed to list CI runs: {e}")))?;

        let response: serde_json::Value = Self::parse_response(http_response).await?;

        let total_count = response["total_count"].as_u64().unwrap_or(0) as u32;
        let runs: Vec<CIRun> = response["workflow_runs"]
            .as_array()
            .unwrap_or(&Vec::new())
            .iter()
            .map(|run| {
                let status = match run["status"].as_str() {
                    Some("queued") => CIRunStatus::Queued,
                    Some("in_progress") => CIRunStatus::InProgress,
                    _ => CIRunStatus::Completed,
                };

                let conclusion = run["conclusion"].as_str().map(|c| match c {
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
                    id: run["id"].as_u64().unwrap_or(0).to_string(),
                    name: run["name"].as_str().unwrap_or("").to_string(),
                    status,
                    conclusion,
                    commit_sha: run["head_sha"].as_str().unwrap_or("").to_string(),
                    branch: run["head_branch"].as_str().map(String::from),
                    event: run["event"].as_str().unwrap_or("").to_string(),
                    created_at: run["created_at"]
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(Utc::now),
                    updated_at: run["updated_at"]
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(Utc::now),
                    url: run["html_url"].as_str().unwrap_or("").to_string(),
                }
            })
            .collect();

        let has_more = (page * PER_PAGE) < total_count;

        Ok(CiRunsPage {
            runs,
            total_count,
            has_more,
        })
    }

    async fn get_commit_status(&self, owner: &str, repo: &str, sha: &str) -> Result<CommitStatus> {
        let client = self.get_client()?;

        // Get combined status
        let route = format!("/repos/{owner}/{repo}/commits/{sha}/status");
        let http_response = client._get(&route).await.map_err(|e| {
            AxisError::IntegrationError(format!("Failed to get commit status: {e}"))
        })?;

        let response: serde_json::Value = Self::parse_response(http_response).await?;

        let state = match response["state"].as_str() {
            Some("pending") => CommitStatusState::Pending,
            Some("success") => CommitStatusState::Success,
            Some("failure") => CommitStatusState::Failure,
            Some("error") => CommitStatusState::Error,
            _ => CommitStatusState::Pending,
        };

        // Also get check runs
        let checks_route = format!("/repos/{owner}/{repo}/commits/{sha}/check-runs");
        let checks_response: serde_json::Value = match client._get(&checks_route).await {
            Ok(resp) => Self::parse_response(resp)
                .await
                .unwrap_or_else(|_| serde_json::json!({"check_runs": []})),
            Err(_) => serde_json::json!({"check_runs": []}),
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

        Ok(CommitStatus {
            state,
            checks,
            total_count: response["total_count"].as_u64().unwrap_or(0) as u32,
        })
    }

    async fn list_notifications(&self, all: bool, page: u32) -> Result<NotificationsPage> {
        const PER_PAGE: u32 = 30;
        let client = self.get_client()?;

        let route = if all {
            format!("/notifications?all=true&per_page={PER_PAGE}&page={page}")
        } else {
            format!("/notifications?per_page={PER_PAGE}&page={page}")
        };

        let http_response = client._get(&route).await.map_err(|e| {
            AxisError::IntegrationError(format!("Failed to list notifications: {e}"))
        })?;

        // Get Link header for pagination info
        let link_header = http_response
            .headers()
            .get("link")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("");
        let has_more = link_header.contains("rel=\"next\"");

        let response: Vec<serde_json::Value> = Self::parse_response(http_response).await?;

        let items: Vec<Notification> = response
            .iter()
            .map(|n| {
                let reason = match n["reason"].as_str() {
                    Some("assign") => NotificationReason::Assigned,
                    Some("author") => NotificationReason::Author,
                    Some("comment") => NotificationReason::Comment,
                    Some("invitation") => NotificationReason::Invitation,
                    Some("manual") => NotificationReason::Manual,
                    Some("mention") => NotificationReason::Mention,
                    Some("review_requested") => NotificationReason::ReviewRequested,
                    Some("security_alert") => NotificationReason::SecurityAlert,
                    Some("state_change") => NotificationReason::StateChange,
                    Some("subscribed") => NotificationReason::Subscribed,
                    Some("team_mention") => NotificationReason::TeamMention,
                    Some("ci_activity") => NotificationReason::CiActivity,
                    _ => NotificationReason::Subscribed,
                };

                let subject_type = match n["subject"]["type"].as_str() {
                    Some("Issue") => NotificationSubjectType::Issue,
                    Some("PullRequest") => NotificationSubjectType::PullRequest,
                    Some("Release") => NotificationSubjectType::Release,
                    Some("Discussion") => NotificationSubjectType::Discussion,
                    Some("Commit") => NotificationSubjectType::Commit,
                    Some("RepositoryVulnerabilityAlert") => {
                        NotificationSubjectType::RepositoryVulnerabilityAlert
                    }
                    Some("CheckSuite") => NotificationSubjectType::CheckSuite,
                    _ => NotificationSubjectType::Issue,
                };

                Notification {
                    provider: ProviderType::GitHub,
                    id: n["id"].as_str().unwrap_or("").to_string(),
                    reason,
                    unread: n["unread"].as_bool().unwrap_or(false),
                    subject_title: n["subject"]["title"].as_str().unwrap_or("").to_string(),
                    subject_type,
                    subject_url: n["subject"]["url"].as_str().map(String::from),
                    repository: n["repository"]["full_name"]
                        .as_str()
                        .unwrap_or("")
                        .to_string(),
                    updated_at: n["updated_at"]
                        .as_str()
                        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(Utc::now),
                    url: n["url"].as_str().unwrap_or("").to_string(),
                }
            })
            .collect();

        Ok(NotificationsPage { items, has_more })
    }

    async fn mark_notification_read(&self, thread_id: &str) -> Result<()> {
        let client = self.get_client()?;

        let route = format!("/notifications/threads/{thread_id}");
        let response = client._patch(route, None::<&()>).await.map_err(|e| {
            AxisError::IntegrationError(format!("Failed to mark notification read: {e}"))
        })?;

        if !response.status().is_success() {
            return Err(AxisError::IntegrationError(format!(
                "Failed to mark notification read: HTTP {}",
                response.status()
            )));
        }

        Ok(())
    }

    async fn mark_all_notifications_read(&self) -> Result<()> {
        let client = self.get_client()?;

        let response = client
            ._put("/notifications", None::<&()>)
            .await
            .map_err(|e| {
                AxisError::IntegrationError(format!("Failed to mark all notifications read: {e}"))
            })?;

        if !response.status().is_success() {
            return Err(AxisError::IntegrationError(format!(
                "Failed to mark all notifications read: HTTP {}",
                response.status()
            )));
        }

        Ok(())
    }

    async fn get_unread_count(&self) -> Result<u32> {
        let page = self.list_notifications(false, 1).await?;
        Ok(page.items.len() as u32)
    }
}
