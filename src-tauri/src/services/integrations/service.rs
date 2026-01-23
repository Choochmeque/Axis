use std::collections::HashMap;
use std::sync::Arc;

use tauri::AppHandle;
use tokio::sync::RwLock;

use crate::error::{AxisError, Result};
use crate::models::ProviderType;
use crate::storage::Database;

use super::github::{GitHubProvider, OAuthFlow};
use super::{get_provider_token_key, IntegrationProvider};

/// Central service for managing integration providers.
/// Handles OAuth flows, token storage, and provider lifecycle.
pub struct IntegrationService {
    database: Arc<Database>,
    providers: RwLock<HashMap<ProviderType, Arc<dyn IntegrationProvider>>>,
    oauth_flow: RwLock<Option<OAuthFlow>>,
}

impl IntegrationService {
    /// Create a new integration service
    pub fn new(database: Arc<Database>) -> Self {
        Self {
            database,
            providers: RwLock::new(HashMap::new()),
            oauth_flow: RwLock::new(None),
        }
    }

    /// Get or create a provider for the given type.
    /// Providers are lazily initialized and cached.
    pub async fn get_provider(
        &self,
        provider_type: ProviderType,
    ) -> Result<Arc<dyn IntegrationProvider>> {
        // Check cache first
        {
            let providers = self.providers.read().await;
            if let Some(provider) = providers.get(&provider_type) {
                return Ok(Arc::clone(provider));
            }
        }

        // Create and cache the provider
        let provider = self.create_provider(provider_type)?;

        let mut providers = self.providers.write().await;
        providers.insert(provider_type, Arc::clone(&provider));

        Ok(provider)
    }

    /// Start OAuth flow for a provider
    pub async fn start_oauth(
        &self,
        provider_type: ProviderType,
        app_handle: &AppHandle,
    ) -> Result<()> {
        match provider_type {
            ProviderType::GitHub => self.start_github_oauth(app_handle).await,
            _ => Err(AxisError::IntegrationError(format!(
                "{provider_type:?} OAuth not yet implemented"
            ))),
        }
    }

    /// Start GitHub OAuth flow (internal)
    async fn start_github_oauth(&self, app_handle: &AppHandle) -> Result<()> {
        let client_id = dotenvy_macro::dotenv!("GITHUB_CLIENT_ID");
        if client_id.is_empty() {
            return Err(AxisError::OAuthError(
                "GitHub client ID not configured".to_string(),
            ));
        }

        let oauth_flow = OAuthFlow::new(client_id.to_string());

        {
            let mut guard = self.oauth_flow.write().await;
            *guard = Some(oauth_flow);
        }

        let token = {
            let guard = self.oauth_flow.read().await;
            if let Some(flow) = guard.as_ref() {
                flow.start(app_handle).await?
            } else {
                return Err(AxisError::OAuthError(
                    "OAuth flow not initialized".to_string(),
                ));
            }
        };

        // Clear OAuth flow
        {
            let mut guard = self.oauth_flow.write().await;
            *guard = None;
        }

        // Store token
        let token_key = get_provider_token_key(ProviderType::GitHub);
        self.database.set_secret(&token_key, &token)?;

        // Clear cached provider so it gets recreated with the new token
        {
            let mut providers = self.providers.write().await;
            providers.remove(&ProviderType::GitHub);
        }

        log::info!("GitHub OAuth completed successfully");
        Ok(())
    }

    /// Cancel an in-progress OAuth flow
    pub async fn cancel_oauth(&self) {
        let guard = self.oauth_flow.read().await;
        if let Some(flow) = guard.as_ref() {
            flow.cancel().await;
            log::info!("OAuth flow cancelled");
        }
    }

    /// Disconnect a provider (remove token and clear cache)
    pub async fn disconnect(&self, provider_type: ProviderType) -> Result<()> {
        // Remove token from database
        let token_key = get_provider_token_key(provider_type);
        self.database.delete_secret(&token_key)?;

        // Remove from cache
        {
            let mut providers = self.providers.write().await;
            providers.remove(&provider_type);
        }

        log::info!("Disconnected provider: {provider_type:?}");
        Ok(())
    }

    /// Check if a provider is connected (has valid token)
    pub async fn is_connected(&self, provider_type: ProviderType) -> bool {
        match self.get_provider(provider_type).await {
            Ok(provider) => provider.is_connected().await,
            Err(_) => false,
        }
    }

    /// Create a provider instance
    fn create_provider(&self, provider_type: ProviderType) -> Result<Arc<dyn IntegrationProvider>> {
        match provider_type {
            ProviderType::GitHub => {
                let db = Arc::clone(&self.database);

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
                Ok(Arc::new(provider))
            }
            ProviderType::GitLab | ProviderType::Bitbucket | ProviderType::Gitea => {
                Err(AxisError::IntegrationError(format!(
                    "{provider_type:?} integration not yet implemented"
                )))
            }
        }
    }
}
