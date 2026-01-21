use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::{AxisError, Result};
use crate::services::ai::prompt::build_prompt;
use crate::services::ai::provider::AiProviderTrait;

pub struct AnthropicProvider;

#[derive(Serialize)]
struct AnthropicRequest {
    model: String,
    max_tokens: u32,
    system: String,
    messages: Vec<AnthropicMessage>,
}

#[derive(Serialize)]
struct AnthropicMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    content: Vec<AnthropicContent>,
}

#[derive(Deserialize)]
struct AnthropicContent {
    text: String,
}

#[async_trait]
impl AiProviderTrait for AnthropicProvider {
    async fn generate_commit_message(
        &self,
        diff: &str,
        api_key: Option<&str>,
        model: Option<&str>,
        _base_url: Option<&str>,
        conventional_commits: bool,
    ) -> Result<(String, String)> {
        let api_key =
            api_key.ok_or_else(|| AxisError::ApiKeyNotConfigured("Anthropic".to_string()))?;

        let model = model.unwrap_or(self.default_model()).to_string();
        let (system_prompt, user_prompt) = build_prompt(diff, conventional_commits);

        let request = AnthropicRequest {
            model: model.clone(),
            max_tokens: 500,
            system: system_prompt,
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: user_prompt,
            }],
        };

        let client = reqwest::Client::new();
        let response = client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AxisError::AiServiceError(format!("Request failed: {e}")))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AxisError::AiServiceError(format!(
                "Anthropic API error ({status}): {error_text}"
            )));
        }

        let response: AnthropicResponse = response
            .json()
            .await
            .map_err(|e| AxisError::AiServiceError(format!("Failed to parse response: {e}")))?;

        let message = response
            .content
            .first()
            .map(|c| c.text.trim().to_string())
            .ok_or_else(|| AxisError::AiServiceError("No response from Anthropic".to_string()))?;

        Ok((message, model))
    }

    fn default_model(&self) -> &'static str {
        "claude-3-5-haiku-latest"
    }

    fn name(&self) -> &'static str {
        "Anthropic"
    }
}
