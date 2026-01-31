use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::{AxisError, Result};
use crate::services::ai::prompt::{build_pr_prompt, build_prompt, parse_pr_response};
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
        conventional_commits: bool,
    ) -> Result<(String, String)> {
        let api_key =
            api_key.ok_or_else(|| AxisError::ApiKeyNotConfigured("OpenAI".to_string()))?;

        let model = model.unwrap_or(self.default_model()).to_string();
        let (system_prompt, user_prompt) = build_prompt(diff, conventional_commits);

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

    async fn generate_pr_description(
        &self,
        commits: &[(String, String)],
        diff_summary: Option<&str>,
        api_key: Option<&str>,
        model: Option<&str>,
        _base_url: Option<&str>,
    ) -> Result<(String, String, String)> {
        let api_key =
            api_key.ok_or_else(|| AxisError::ApiKeyNotConfigured("OpenAI".to_string()))?;

        let model = model.unwrap_or(self.default_model()).to_string();
        let (system_prompt, user_prompt) = build_pr_prompt(commits, diff_summary);

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
            max_tokens: 1000,
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

        let raw = response
            .choices
            .first()
            .map(|c| c.message.content.trim().to_string())
            .ok_or_else(|| AxisError::AiServiceError("No response from OpenAI".to_string()))?;

        let (title, body) = parse_pr_response(&raw);
        Ok((title, body, model))
    }

    fn default_model(&self) -> &'static str {
        "gpt-4o-mini"
    }

    fn name(&self) -> &'static str {
        "OpenAI"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== OpenAiProvider Tests ====================

    #[test]
    fn test_openai_provider_name() {
        let provider = OpenAiProvider;
        assert_eq!(provider.name(), "OpenAI");
    }

    #[test]
    fn test_openai_provider_default_model() {
        let provider = OpenAiProvider;
        assert_eq!(provider.default_model(), "gpt-4o-mini");
    }

    // ==================== OpenAiRequest Serialization Tests ====================

    #[test]
    fn test_openai_request_serialization() {
        let request = OpenAiRequest {
            model: "gpt-4o-mini".to_string(),
            messages: vec![
                OpenAiMessage {
                    role: "system".to_string(),
                    content: "You are a helpful assistant.".to_string(),
                },
                OpenAiMessage {
                    role: "user".to_string(),
                    content: "Hello".to_string(),
                },
            ],
            max_tokens: 500,
            temperature: 0.3,
        };

        let json = serde_json::to_string(&request).expect("should serialize");
        assert!(json.contains("\"model\":\"gpt-4o-mini\""));
        assert!(json.contains("\"role\":\"system\""));
        assert!(json.contains("\"role\":\"user\""));
        assert!(json.contains("\"max_tokens\":500"));
        assert!(json.contains("\"temperature\":0.3"));
    }

    #[test]
    fn test_openai_message_serialization() {
        let message = OpenAiMessage {
            role: "assistant".to_string(),
            content: "How can I help you?".to_string(),
        };

        let json = serde_json::to_string(&message).expect("should serialize");
        assert!(json.contains("\"role\":\"assistant\""));
        assert!(json.contains("\"content\":\"How can I help you?\""));
    }

    // ==================== OpenAiResponse Deserialization Tests ====================

    #[test]
    fn test_openai_response_deserialization() {
        let json = r#"{
            "choices": [
                {
                    "message": {
                        "content": "fix: resolve authentication bug"
                    }
                }
            ]
        }"#;

        let response: OpenAiResponse = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(response.choices.len(), 1);
        assert_eq!(
            response.choices[0].message.content,
            "fix: resolve authentication bug"
        );
    }

    #[test]
    fn test_openai_response_empty_choices() {
        let json = r#"{"choices": []}"#;

        let response: OpenAiResponse = serde_json::from_str(json).expect("should deserialize");
        assert!(response.choices.is_empty());
    }

    #[test]
    fn test_openai_response_multiple_choices() {
        let json = r#"{
            "choices": [
                {"message": {"content": "Option 1"}},
                {"message": {"content": "Option 2"}}
            ]
        }"#;

        let response: OpenAiResponse = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(response.choices.len(), 2);
    }

    // ==================== API Key Validation Tests ====================

    #[tokio::test]
    async fn test_generate_commit_message_no_api_key() {
        let provider = OpenAiProvider;
        let result = provider
            .generate_commit_message("diff content", None, None, None, false)
            .await;

        assert!(result.is_err());
        let err = result.expect_err("should be error");
        assert!(err.to_string().contains("API key not configured"));
    }

    #[tokio::test]
    async fn test_generate_pr_description_no_api_key() {
        let provider = OpenAiProvider;
        let commits = vec![("abc".to_string(), "test commit".to_string())];
        let result = provider
            .generate_pr_description(&commits, None, None, None, None)
            .await;

        assert!(result.is_err());
        let err = result.expect_err("should be error");
        assert!(err.to_string().contains("API key not configured"));
    }
}
