use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::{AxisError, Result};
use crate::services::ai::prompt::{build_pr_prompt, build_prompt, parse_pr_response};
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

    async fn generate_pr_description(
        &self,
        commits: &[(String, String)],
        diff_summary: Option<&str>,
        available_labels: Option<&[String]>,
        api_key: Option<&str>,
        model: Option<&str>,
        _base_url: Option<&str>,
    ) -> Result<(String, String, Vec<String>, String)> {
        let api_key =
            api_key.ok_or_else(|| AxisError::ApiKeyNotConfigured("Anthropic".to_string()))?;

        let model = model.unwrap_or(self.default_model()).to_string();
        let (system_prompt, user_prompt) = build_pr_prompt(commits, diff_summary, available_labels);

        let request = AnthropicRequest {
            model: model.clone(),
            max_tokens: 1000,
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

        let raw = response
            .content
            .first()
            .map(|c| c.text.trim().to_string())
            .ok_or_else(|| AxisError::AiServiceError("No response from Anthropic".to_string()))?;

        let (title, body, labels) = parse_pr_response(&raw);
        Ok((title, body, labels, model))
    }

    fn default_model(&self) -> &'static str {
        "claude-3-5-haiku-latest"
    }

    fn name(&self) -> &'static str {
        "Anthropic"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== AnthropicProvider Tests ====================

    #[test]
    fn test_anthropic_provider_name() {
        let provider = AnthropicProvider;
        assert_eq!(provider.name(), "Anthropic");
    }

    #[test]
    fn test_anthropic_provider_default_model() {
        let provider = AnthropicProvider;
        assert_eq!(provider.default_model(), "claude-3-5-haiku-latest");
    }

    // ==================== AnthropicRequest Serialization Tests ====================

    #[test]
    fn test_anthropic_request_serialization() {
        let request = AnthropicRequest {
            model: "claude-3-5-haiku-latest".to_string(),
            max_tokens: 500,
            system: "You are a helpful assistant.".to_string(),
            messages: vec![AnthropicMessage {
                role: "user".to_string(),
                content: "Hello".to_string(),
            }],
        };

        let json = serde_json::to_string(&request).expect("should serialize");
        assert!(json.contains("\"model\":\"claude-3-5-haiku-latest\""));
        assert!(json.contains("\"max_tokens\":500"));
        assert!(json.contains("\"system\":\"You are a helpful assistant.\""));
        assert!(json.contains("\"role\":\"user\""));
        assert!(json.contains("\"content\":\"Hello\""));
    }

    #[test]
    fn test_anthropic_message_serialization() {
        let message = AnthropicMessage {
            role: "user".to_string(),
            content: "Generate a commit message".to_string(),
        };

        let json = serde_json::to_string(&message).expect("should serialize");
        assert!(json.contains("\"role\":\"user\""));
        assert!(json.contains("\"content\":\"Generate a commit message\""));
    }

    // ==================== AnthropicResponse Deserialization Tests ====================

    #[test]
    fn test_anthropic_response_deserialization() {
        let json = r#"{
            "content": [
                {
                    "text": "feat: add new authentication flow"
                }
            ]
        }"#;

        let response: AnthropicResponse = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(response.content.len(), 1);
        assert_eq!(
            response.content[0].text,
            "feat: add new authentication flow"
        );
    }

    #[test]
    fn test_anthropic_response_empty_content() {
        let json = r#"{"content": []}"#;

        let response: AnthropicResponse = serde_json::from_str(json).expect("should deserialize");
        assert!(response.content.is_empty());
    }

    #[test]
    fn test_anthropic_content_deserialization() {
        let json = r#"{"text": "Some response text"}"#;

        let content: AnthropicContent = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(content.text, "Some response text");
    }

    // ==================== API Key Validation Tests ====================

    #[tokio::test]
    async fn test_generate_commit_message_no_api_key() {
        let provider = AnthropicProvider;
        let result = provider
            .generate_commit_message("diff content", None, None, None, false)
            .await;

        assert!(result.is_err());
        let err = result.expect_err("should be error");
        assert!(err.to_string().contains("API key not configured"));
        assert!(err.to_string().contains("Anthropic"));
    }

    #[tokio::test]
    async fn test_generate_pr_description_no_api_key() {
        let provider = AnthropicProvider;
        let commits = vec![("abc".to_string(), "test commit".to_string())];
        let result = provider
            .generate_pr_description(&commits, None, None, None, None, None)
            .await;

        assert!(result.is_err());
        let err = result.expect_err("should be error");
        assert!(err.to_string().contains("API key not configured"));
        assert!(err.to_string().contains("Anthropic"));
    }
}
