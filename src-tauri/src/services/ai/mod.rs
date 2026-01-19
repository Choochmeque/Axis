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
