use async_trait::async_trait;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

use crate::error::{AxisError, Result};
use crate::services::ai::prompt::{build_pr_prompt, build_prompt, parse_pr_response};
use crate::services::ai::provider::AiProviderTrait;

pub struct OpenAiProvider;

#[derive(Serialize)]
struct OpenAiRequest {
    model: String,
    messages: Vec<OpenAiMessage>,
    #[serde(rename = "max_completion_tokens")]
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

fn is_reasoning_model(model: &str) -> bool {
    model.starts_with("o1") || model.starts_with("o3") || model.starts_with("gpt-5")
}

/// Regex to match canonical chat models only.
/// Matches: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-3.5-turbo, o1, o1-mini, o3, o3-mini, gpt-5, gpt-5-mini
/// Excludes: dated versions, preview, instruct, 16k, realtime, etc.
static CANONICAL_MODEL_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(gpt-4o(-mini)?|gpt-4\.1(-mini|-nano)?|gpt-3\.5-turbo|o1(-mini)?|o3(-mini)?|gpt-5(-mini|-chat-latest)?)$")
        .expect("invalid regex")
});

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

#[derive(Deserialize)]
struct OpenAiModelsResponse {
    data: Vec<OpenAiModel>,
}

#[derive(Deserialize)]
struct OpenAiModel {
    id: String,
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

        let temperature = if is_reasoning_model(&model) {
            None
        } else {
            Some(0.3)
        };

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
            temperature,
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
        available_labels: Option<&[String]>,
        api_key: Option<&str>,
        model: Option<&str>,
        _base_url: Option<&str>,
    ) -> Result<(String, String, Vec<String>, String)> {
        let api_key =
            api_key.ok_or_else(|| AxisError::ApiKeyNotConfigured("OpenAI".to_string()))?;

        let model = model.unwrap_or(self.default_model()).to_string();
        let (system_prompt, user_prompt) = build_pr_prompt(commits, diff_summary, available_labels);

        let temperature = if is_reasoning_model(&model) {
            None
        } else {
            Some(0.3)
        };

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
            temperature,
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

        let (title, body, labels) = parse_pr_response(&raw);
        Ok((title, body, labels, model))
    }

    async fn list_models(
        &self,
        api_key: Option<&str>,
        _base_url: Option<&str>,
    ) -> Result<Vec<String>> {
        let api_key =
            api_key.ok_or_else(|| AxisError::ApiKeyNotConfigured("OpenAI".to_string()))?;

        let client = reqwest::Client::new();
        let response = client
            .get("https://api.openai.com/v1/models")
            .header("Authorization", format!("Bearer {api_key}"))
            .send()
            .await
            .map_err(|e| {
                AxisError::AiServiceError(format!("Failed to fetch OpenAI models: {e}"))
            })?;

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

        let response: OpenAiModelsResponse = response
            .json()
            .await
            .map_err(|e| AxisError::AiServiceError(format!("Failed to parse response: {e}")))?;

        let mut models: Vec<String> = response
            .data
            .into_iter()
            .map(|m| m.id)
            .filter(|id| CANONICAL_MODEL_REGEX.is_match(id))
            .collect();

        models.sort();
        Ok(models)
    }

    fn default_model(&self) -> &'static str {
        "gpt-4o-mini"
    }

    #[cfg(test)]
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
            temperature: Some(0.3),
        };

        let json = serde_json::to_string(&request).expect("should serialize");
        assert!(json.contains("\"model\":\"gpt-4o-mini\""));
        assert!(json.contains("\"role\":\"system\""));
        assert!(json.contains("\"role\":\"user\""));
        assert!(json.contains("\"max_completion_tokens\":500"));
        assert!(json.contains("\"temperature\":0.3"));
    }

    #[test]
    fn test_openai_request_serialization_reasoning_model() {
        let request = OpenAiRequest {
            model: "o3-mini".to_string(),
            messages: vec![],
            max_tokens: 500,
            temperature: None,
        };

        let json = serde_json::to_string(&request).expect("should serialize");
        assert!(json.contains("\"model\":\"o3-mini\""));
        assert!(!json.contains("temperature"));
    }

    #[test]
    fn test_is_reasoning_model() {
        assert!(is_reasoning_model("o1-preview"));
        assert!(is_reasoning_model("o1-mini"));
        assert!(is_reasoning_model("o3-mini"));
        assert!(is_reasoning_model("gpt-5-mini"));
        assert!(is_reasoning_model("gpt-5"));
        assert!(!is_reasoning_model("gpt-4o"));
        assert!(!is_reasoning_model("gpt-4o-mini"));
        assert!(!is_reasoning_model("gpt-3.5-turbo"));
    }

    #[test]
    fn test_canonical_model_regex() {
        // Should match canonical models
        assert!(CANONICAL_MODEL_REGEX.is_match("gpt-4o"));
        assert!(CANONICAL_MODEL_REGEX.is_match("gpt-4o-mini"));
        assert!(CANONICAL_MODEL_REGEX.is_match("gpt-4.1"));
        assert!(CANONICAL_MODEL_REGEX.is_match("gpt-4.1-mini"));
        assert!(CANONICAL_MODEL_REGEX.is_match("gpt-4.1-nano"));
        assert!(CANONICAL_MODEL_REGEX.is_match("gpt-3.5-turbo"));
        assert!(CANONICAL_MODEL_REGEX.is_match("o1"));
        assert!(CANONICAL_MODEL_REGEX.is_match("o1-mini"));
        assert!(CANONICAL_MODEL_REGEX.is_match("o3"));
        assert!(CANONICAL_MODEL_REGEX.is_match("o3-mini"));
        assert!(CANONICAL_MODEL_REGEX.is_match("gpt-5"));
        assert!(CANONICAL_MODEL_REGEX.is_match("gpt-5-mini"));
        assert!(CANONICAL_MODEL_REGEX.is_match("gpt-5-chat-latest"));

        // Should NOT match dated/legacy/variant models
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-4"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-4-turbo"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-4-turbo-preview"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-4-1106-preview"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-4o-2024-08-06"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-4.1-2025-04-14"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-3.5-turbo-16k"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-3.5-turbo-instruct"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-3.5-turbo-instruct-0914"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("o1-preview"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-4o-realtime"));
        assert!(!CANONICAL_MODEL_REGEX.is_match("gpt-4o-transcribe"));
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
            .generate_pr_description(&commits, None, None, None, None, None)
            .await;

        assert!(result.is_err());
        let err = result.expect_err("should be error");
        assert!(err.to_string().contains("API key not configured"));
    }
}
