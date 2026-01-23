mod cache;
pub mod github;
mod provider;
mod service;

pub use cache::TtlCache;
pub use provider::IntegrationProvider;
pub use service::IntegrationService;

use url::Url;

use crate::models::{DetectedProvider, ProviderType};

/// Parse a remote URL and detect the provider type
pub fn detect_provider(remote_url: &str) -> Option<DetectedProvider> {
    // Try to parse as URL
    if let Some(provider) = detect_from_url(remote_url) {
        return Some(provider);
    }

    // Try SSH format: git@github.com:owner/repo.git
    if let Some(provider) = detect_from_ssh(remote_url) {
        return Some(provider);
    }

    None
}

fn detect_from_url(url: &str) -> Option<DetectedProvider> {
    let url = Url::parse(url).ok()?;

    let host = url.host_str()?;
    let provider = detect_provider_from_host(host)?;

    // Extract owner/repo from path
    let path = url.path().trim_start_matches('/').trim_end_matches(".git");
    let parts: Vec<&str> = path.splitn(2, '/').collect();

    if parts.len() == 2 {
        Some(DetectedProvider {
            provider,
            owner: parts[0].to_string(),
            repo: parts[1].to_string(),
        })
    } else {
        None
    }
}

fn detect_from_ssh(url: &str) -> Option<DetectedProvider> {
    // Format: git@host:owner/repo.git
    if !url.starts_with("git@") {
        return None;
    }

    let without_prefix = url.strip_prefix("git@")?;
    let parts: Vec<&str> = without_prefix.splitn(2, ':').collect();

    if parts.len() != 2 {
        return None;
    }

    let host = parts[0];
    let path = parts[1].trim_end_matches(".git");

    let provider = detect_provider_from_host(host)?;
    let path_parts: Vec<&str> = path.splitn(2, '/').collect();

    if path_parts.len() == 2 {
        Some(DetectedProvider {
            provider,
            owner: path_parts[0].to_string(),
            repo: path_parts[1].to_string(),
        })
    } else {
        None
    }
}

fn detect_provider_from_host(host: &str) -> Option<ProviderType> {
    let host_lower = host.to_lowercase();

    if host_lower == "github.com" || host_lower.ends_with(".github.com") {
        Some(ProviderType::GitHub)
    } else if host_lower == "gitlab.com" || host_lower.ends_with(".gitlab.com") {
        Some(ProviderType::GitLab)
    } else if host_lower == "bitbucket.org" || host_lower.ends_with(".bitbucket.org") {
        Some(ProviderType::Bitbucket)
    } else if host_lower.contains("gitea") || host_lower.contains("forgejo") {
        // Common Gitea/Forgejo instances
        Some(ProviderType::Gitea)
    } else {
        // Could be a self-hosted instance
        // In the future, we could check for provider-specific API endpoints
        None
    }
}

/// Get the secret key for storing provider token
pub fn get_provider_token_key(provider: ProviderType) -> String {
    match provider {
        ProviderType::GitHub => "integration_github_token".to_string(),
        ProviderType::GitLab => "integration_gitlab_token".to_string(),
        ProviderType::Bitbucket => "integration_bitbucket_token".to_string(),
        ProviderType::Gitea => "integration_gitea_token".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_github_https() {
        let result = detect_provider("https://github.com/owner/repo.git");
        assert!(result.is_some());
        let detected = result.expect("Failed to detect provider");
        assert_eq!(detected.provider, ProviderType::GitHub);
        assert_eq!(detected.owner, "owner");
        assert_eq!(detected.repo, "repo");
    }

    #[test]
    fn test_detect_github_ssh() {
        let result = detect_provider("git@github.com:owner/repo.git");
        assert!(result.is_some());
        let detected = result.expect("Failed to detect provider");
        assert_eq!(detected.provider, ProviderType::GitHub);
        assert_eq!(detected.owner, "owner");
        assert_eq!(detected.repo, "repo");
    }

    #[test]
    fn test_detect_gitlab_https() {
        let result = detect_provider("https://gitlab.com/owner/repo.git");
        assert!(result.is_some());
        let detected = result.expect("Failed to detect provider");
        assert_eq!(detected.provider, ProviderType::GitLab);
        assert_eq!(detected.owner, "owner");
        assert_eq!(detected.repo, "repo");
    }

    #[test]
    fn test_detect_bitbucket_https() {
        let result = detect_provider("https://bitbucket.org/owner/repo.git");
        assert!(result.is_some());
        let detected = result.expect("Failed to detect provider");
        assert_eq!(detected.provider, ProviderType::Bitbucket);
        assert_eq!(detected.owner, "owner");
        assert_eq!(detected.repo, "repo");
    }

    #[test]
    fn test_detect_unknown_host() {
        let result = detect_provider("https://unknown.com/owner/repo.git");
        assert!(result.is_none());
    }
}
