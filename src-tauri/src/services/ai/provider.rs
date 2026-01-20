use async_trait::async_trait;

use crate::error::Result;

#[async_trait]
pub trait AiProviderTrait: Send + Sync {
    async fn generate_commit_message(
        &self,
        diff: &str,
        api_key: Option<&str>,
        model: Option<&str>,
        base_url: Option<&str>,
        conventional_commits: bool,
    ) -> Result<(String, String)>;

    fn default_model(&self) -> &'static str;

    fn name(&self) -> &'static str;

    fn requires_api_key(&self) -> bool {
        true
    }
}
