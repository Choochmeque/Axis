use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::{AxisError, Result};
use crate::services::ai::prompt::build_prompt;
use crate::services::ai::provider::AiProviderTrait;

pub struct OpenAiProvider;

#[derive(Serialize)]
struct OpenAiRequest {
    model: String,
    messages: Vec<OpenAiMessage>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Serialize)]
struct OpenAiMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OpenAiResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Deserialize)]
struct OpenAiChoice {
    message: OpenAiMessageResponse,
}

#[derive(Deserialize)]
struct OpenAiMessageResponse {
    content: String,
}

#[async_trait]
impl AiProviderTrait for OpenAiProvider {
    async fn generate_commit_message(
        &self,
        diff: &str,
        api_key: Option<&str>,
        model: Option<&str>,
        _base_url: Option<&str>,
    ) -> Result<(String, String)> {
        let api_key =
            api_key.ok_or_else(|| AxisError::ApiKeyNotConfigured("OpenAI".to_string()))?;

        let model = model.unwrap_or(self.default_model()).to_string();
        let (system_prompt, user_prompt) = build_prompt(diff);

        let request = OpenAiRequest {
            model: model.clone(),
            messages: vec![
                OpenAiMessage {
                    role: "system".to_string(),
                    content: system_prompt,
                },
                OpenAiMessage {
                    role: "user".to_string(),
                    content: user_prompt,
                },
            ],
            max_tokens: 500,
            temperature: 0.3,
        };

        let client = reqwest::Client::new();
        let response = client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {api_key}"))
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
                "OpenAI API error ({status}): {error_text}"
            )));
        }

        let response: OpenAiResponse = response
            .json()
            .await
            .map_err(|e| AxisError::AiServiceError(format!("Failed to parse response: {e}")))?;

        let message = response
            .choices
            .first()
            .map(|c| c.message.content.trim().to_string())
            .ok_or_else(|| AxisError::AiServiceError("No response from OpenAI".to_string()))?;

        Ok((message, model))
    }

    fn default_model(&self) -> &'static str {
        "gpt-4o-mini"
    }

    fn name(&self) -> &'static str {
        "OpenAI"
    }
}
