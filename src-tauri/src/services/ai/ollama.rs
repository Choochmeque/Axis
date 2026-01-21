use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::{AxisError, Result};
use crate::services::ai::prompt::build_prompt;
use crate::services::ai::provider::AiProviderTrait;

const DEFAULT_OLLAMA_URL: &str = "http://localhost:11434";

pub struct OllamaProvider {
    pub base_url: String,
}

impl Default for OllamaProvider {
    fn default() -> Self {
        Self {
            base_url: DEFAULT_OLLAMA_URL.to_string(),
        }
    }
}

#[derive(Serialize)]
struct OllamaRequest {
    model: String,
    messages: Vec<OllamaMessage>,
    stream: bool,
}

#[derive(Serialize)]
struct OllamaMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct OllamaResponse {
    message: OllamaMessageResponse,
}

#[derive(Deserialize)]
struct OllamaMessageResponse {
    content: String,
}

#[derive(Deserialize)]
pub struct OllamaModel {
    pub name: String,
}

#[derive(Deserialize)]
struct OllamaModelsResponse {
    models: Vec<OllamaModel>,
}

impl OllamaProvider {
    pub async fn list_models(base_url: Option<&str>) -> Result<Vec<String>> {
        let base_url = base_url.unwrap_or(DEFAULT_OLLAMA_URL);
        let url = format!("{base_url}/api/tags");

        let client = reqwest::Client::new();
        let response =
            client.get(&url).send().await.map_err(|e| {
                AxisError::AiServiceError(format!("Failed to connect to Ollama: {e}"))
            })?;

        if !response.status().is_success() {
            return Err(AxisError::AiServiceError(
                "Failed to list Ollama models".to_string(),
            ));
        }

        let response: OllamaModelsResponse = response
            .json()
            .await
            .map_err(|e| AxisError::AiServiceError(format!("Failed to parse response: {e}")))?;

        Ok(response.models.into_iter().map(|m| m.name).collect())
    }

    pub async fn test_connection(base_url: Option<&str>) -> Result<bool> {
        let base_url = base_url.unwrap_or(DEFAULT_OLLAMA_URL);
        let url = format!("{base_url}/api/tags");

        let client = reqwest::Client::new();
        let response = client.get(&url).send().await;

        Ok(response.is_ok() && response.map(|r| r.status().is_success()).unwrap_or(false))
    }
}

#[async_trait]
impl AiProviderTrait for OllamaProvider {
    async fn generate_commit_message(
        &self,
        diff: &str,
        _api_key: Option<&str>,
        model: Option<&str>,
        base_url: Option<&str>,
        conventional_commits: bool,
    ) -> Result<(String, String)> {
        let base_url = base_url.unwrap_or(&self.base_url);
        let model = model.unwrap_or(self.default_model()).to_string();
        let (system_prompt, user_prompt) = build_prompt(diff, conventional_commits);

        let request = OllamaRequest {
            model: model.clone(),
            messages: vec![
                OllamaMessage {
                    role: "system".to_string(),
                    content: system_prompt,
                },
                OllamaMessage {
                    role: "user".to_string(),
                    content: user_prompt,
                },
            ],
            stream: false,
        };

        let url = format!("{base_url}/api/chat");
        let client = reqwest::Client::new();
        let response = client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| AxisError::AiServiceError(format!("Failed to connect to Ollama: {e}")))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(AxisError::AiServiceError(format!(
                "Ollama API error ({status}): {error_text}"
            )));
        }

        let response: OllamaResponse = response
            .json()
            .await
            .map_err(|e| AxisError::AiServiceError(format!("Failed to parse response: {e}")))?;

        let message = response.message.content.trim().to_string();

        Ok((message, model))
    }

    fn default_model(&self) -> &'static str {
        "llama3.2"
    }

    fn name(&self) -> &'static str {
        "Ollama"
    }

    fn requires_api_key(&self) -> bool {
        false
    }
}
