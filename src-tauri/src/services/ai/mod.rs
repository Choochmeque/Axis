mod anthropic;
mod ollama;
mod openai;
mod prompt;
mod provider;

pub use anthropic::AnthropicProvider;
pub use ollama::OllamaProvider;
pub use openai::OpenAiProvider;
pub use provider::AiProviderTrait;

use crate::error::AxisError;
use crate::models::{AiProvider, DiffLineType, FileDiff};

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

const MAX_DIFF_SIZE: usize = 100_000;
const MAX_FILES_IN_SUMMARY: usize = 30;

/// Format file diffs as a unified diff string suitable for AI consumption.
pub fn format_diff_for_ai(diffs: &[FileDiff]) -> crate::error::Result<String> {
    let mut output = String::new();

    for file_diff in diffs {
        let path = file_diff
            .new_path
            .as_ref()
            .or(file_diff.old_path.as_ref())
            .map(|s| s.as_str())
            .unwrap_or("unknown");

        output.push_str(&format!("--- a/{path}\n+++ b/{path}\n"));

        for hunk in &file_diff.hunks {
            output.push_str(&hunk.header);
            if !hunk.header.ends_with('\n') {
                output.push('\n');
            }

            for line in &hunk.lines {
                let prefix = match line.line_type {
                    DiffLineType::Addition => "+",
                    DiffLineType::Deletion => "-",
                    DiffLineType::Context => " ",
                    DiffLineType::Header | DiffLineType::Binary => "",
                };
                output.push_str(prefix);
                output.push_str(&line.content);
                if !line.content.ends_with('\n') {
                    output.push('\n');
                }
            }
        }
        output.push('\n');
    }

    if output.len() > MAX_DIFF_SIZE {
        return Err(AxisError::DiffTooLarge(output.len()));
    }

    Ok(output)
}

/// Format a summary of changed files for AI context.
pub fn format_diff_summary(files: &[FileDiff]) -> String {
    let mut summary = String::new();
    for file in files.iter().take(MAX_FILES_IN_SUMMARY) {
        let path = file
            .new_path
            .as_ref()
            .or(file.old_path.as_ref())
            .map(|s| s.as_str())
            .unwrap_or("unknown");
        summary.push_str(&format!("- {:?}: {path}\n", file.status));
    }
    if files.len() > MAX_FILES_IN_SUMMARY {
        summary.push_str(&format!(
            "... and {} more files\n",
            files.len() - MAX_FILES_IN_SUMMARY
        ));
    }
    summary
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
