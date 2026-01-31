use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumString};

#[derive(Debug, Clone, Serialize, Deserialize, Type, Default, PartialEq, Display, EnumString)]
#[serde(rename_all = "PascalCase")]
pub enum AiProvider {
    #[default]
    OpenAi,
    Anthropic,
    Ollama,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GenerateCommitMessageResponse {
    pub message: String,
    pub model_used: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GeneratePrDescriptionResponse {
    pub title: String,
    pub body: String,
    pub model_used: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    // ==================== AiProvider Tests ====================

    #[test]
    fn test_ai_provider_default() {
        let provider = AiProvider::default();
        assert_eq!(provider, AiProvider::OpenAi);
    }

    #[test]
    fn test_ai_provider_equality() {
        assert_eq!(AiProvider::OpenAi, AiProvider::OpenAi);
        assert_eq!(AiProvider::Anthropic, AiProvider::Anthropic);
        assert_eq!(AiProvider::Ollama, AiProvider::Ollama);
        assert_ne!(AiProvider::OpenAi, AiProvider::Anthropic);
    }

    #[test]
    fn test_ai_provider_display() {
        assert_eq!(AiProvider::OpenAi.to_string(), "OpenAi");
        assert_eq!(AiProvider::Anthropic.to_string(), "Anthropic");
        assert_eq!(AiProvider::Ollama.to_string(), "Ollama");
    }

    #[test]
    fn test_ai_provider_from_str() {
        assert_eq!(
            AiProvider::from_str("OpenAi").expect("should parse"),
            AiProvider::OpenAi
        );
        assert_eq!(
            AiProvider::from_str("Anthropic").expect("should parse"),
            AiProvider::Anthropic
        );
        assert_eq!(
            AiProvider::from_str("Ollama").expect("should parse"),
            AiProvider::Ollama
        );
    }

    #[test]
    fn test_ai_provider_from_str_invalid() {
        let result = AiProvider::from_str("InvalidProvider");
        assert!(result.is_err());
    }

    #[test]
    fn test_ai_provider_serialization() {
        let openai = AiProvider::OpenAi;
        let json = serde_json::to_string(&openai).expect("should serialize");
        assert_eq!(json, "\"OpenAi\"");

        let anthropic = AiProvider::Anthropic;
        let json = serde_json::to_string(&anthropic).expect("should serialize");
        assert_eq!(json, "\"Anthropic\"");

        let ollama = AiProvider::Ollama;
        let json = serde_json::to_string(&ollama).expect("should serialize");
        assert_eq!(json, "\"Ollama\"");
    }

    #[test]
    fn test_ai_provider_deserialization() {
        let openai: AiProvider = serde_json::from_str("\"OpenAi\"").expect("should deserialize");
        assert_eq!(openai, AiProvider::OpenAi);

        let anthropic: AiProvider =
            serde_json::from_str("\"Anthropic\"").expect("should deserialize");
        assert_eq!(anthropic, AiProvider::Anthropic);
    }

    // ==================== GenerateCommitMessageResponse Tests ====================

    #[test]
    fn test_generate_commit_message_response() {
        let response = GenerateCommitMessageResponse {
            message: "feat: add new authentication flow".to_string(),
            model_used: "gpt-4o-mini".to_string(),
        };

        assert!(response.message.starts_with("feat:"));
        assert_eq!(response.model_used, "gpt-4o-mini");
    }

    #[test]
    fn test_generate_commit_message_response_serialization() {
        let response = GenerateCommitMessageResponse {
            message: "fix: resolve bug".to_string(),
            model_used: "claude-3-haiku".to_string(),
        };

        let json = serde_json::to_string(&response).expect("should serialize");
        assert!(json.contains("\"message\":\"fix: resolve bug\""));
        assert!(json.contains("\"modelUsed\":\"claude-3-haiku\""));
    }

    #[test]
    fn test_generate_commit_message_response_deserialization() {
        let json = r#"{"message": "test commit", "modelUsed": "llama3.2"}"#;
        let response: GenerateCommitMessageResponse =
            serde_json::from_str(json).expect("should deserialize");

        assert_eq!(response.message, "test commit");
        assert_eq!(response.model_used, "llama3.2");
    }

    // ==================== GeneratePrDescriptionResponse Tests ====================

    #[test]
    fn test_generate_pr_description_response() {
        let response = GeneratePrDescriptionResponse {
            title: "Add authentication flow".to_string(),
            body: "## Summary\nAdds OAuth2 login".to_string(),
            model_used: "gpt-4o-mini".to_string(),
        };

        assert_eq!(response.title, "Add authentication flow");
        assert!(response.body.contains("Summary"));
        assert_eq!(response.model_used, "gpt-4o-mini");
    }

    #[test]
    fn test_generate_pr_description_response_serialization() {
        let response = GeneratePrDescriptionResponse {
            title: "Fix login bug".to_string(),
            body: "Resolves null pointer".to_string(),
            model_used: "claude-3-haiku".to_string(),
        };

        let json = serde_json::to_string(&response).expect("should serialize");
        assert!(json.contains("\"title\":\"Fix login bug\""));
        assert!(json.contains("\"body\":\"Resolves null pointer\""));
        assert!(json.contains("\"modelUsed\":\"claude-3-haiku\""));
    }

    #[test]
    fn test_generate_pr_description_response_deserialization() {
        let json = r#"{"title": "Add feature", "body": "Details here", "modelUsed": "llama3.2"}"#;
        let response: GeneratePrDescriptionResponse =
            serde_json::from_str(json).expect("should deserialize");

        assert_eq!(response.title, "Add feature");
        assert_eq!(response.body, "Details here");
        assert_eq!(response.model_used, "llama3.2");
    }
}
