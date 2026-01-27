mod anthropic;
mod ollama;
mod openai;
mod prompt;
mod provider;

pub use anthropic::AnthropicProvider;
pub use ollama::OllamaProvider;
pub use openai::OpenAiProvider;
pub use provider::AiProviderTrait;

use crate::models::AiProvider;

pub fn create_provider(provider: &AiProvider) -> Box<dyn AiProviderTrait> {
    match provider {
        AiProvider::OpenAi => Box::new(OpenAiProvider),
        AiProvider::Anthropic => Box::new(AnthropicProvider),
        AiProvider::Ollama => Box::new(OllamaProvider::default()),
    }
}

pub fn get_secret_key(provider: &AiProvider) -> String {
    match provider {
        AiProvider::OpenAi => "ai_api_key_openai".to_string(),
        AiProvider::Anthropic => "ai_api_key_anthropic".to_string(),
        AiProvider::Ollama => "ai_api_key_ollama".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== create_provider Tests ====================

    #[test]
    fn test_create_provider_openai() {
        let provider = create_provider(&AiProvider::OpenAi);
        assert_eq!(provider.name(), "OpenAI");
        assert_eq!(provider.default_model(), "gpt-4o-mini");
    }

    #[test]
    fn test_create_provider_anthropic() {
        let provider = create_provider(&AiProvider::Anthropic);
        assert_eq!(provider.name(), "Anthropic");
        assert!(provider.default_model().contains("claude"));
    }

    #[test]
    fn test_create_provider_ollama() {
        let provider = create_provider(&AiProvider::Ollama);
        assert_eq!(provider.name(), "Ollama");
    }

    // ==================== get_secret_key Tests ====================

    #[test]
    fn test_get_secret_key_openai() {
        let key = get_secret_key(&AiProvider::OpenAi);
        assert_eq!(key, "ai_api_key_openai");
    }

    #[test]
    fn test_get_secret_key_anthropic() {
        let key = get_secret_key(&AiProvider::Anthropic);
        assert_eq!(key, "ai_api_key_anthropic");
    }

    #[test]
    fn test_get_secret_key_ollama() {
        let key = get_secret_key(&AiProvider::Ollama);
        assert_eq!(key, "ai_api_key_ollama");
    }

    #[test]
    fn test_secret_keys_are_unique() {
        let openai_key = get_secret_key(&AiProvider::OpenAi);
        let anthropic_key = get_secret_key(&AiProvider::Anthropic);
        let ollama_key = get_secret_key(&AiProvider::Ollama);

        assert_ne!(openai_key, anthropic_key);
        assert_ne!(openai_key, ollama_key);
        assert_ne!(anthropic_key, ollama_key);
    }
}
