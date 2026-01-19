use crate::error::{AxisError, Result};
use crate::models::{AiProvider, DiffLineType, DiffOptions, GenerateCommitMessageResponse};
use crate::services::ai::{create_provider, get_secret_key, OllamaProvider};
use crate::state::AppState;
use tauri::State;

const MAX_DIFF_SIZE: usize = 100_000;

fn format_diff_for_ai(state: &State<'_, AppState>) -> Result<String> {
    let diffs = state
        .get_git_service()?
        .with_git2(|git2| git2.diff_staged(&DiffOptions::default()))?;

    let mut output = String::new();

    for file_diff in diffs {
        let path = file_diff
            .new_path
            .as_ref()
            .or(file_diff.old_path.as_ref())
            .map(|s| s.as_str())
            .unwrap_or("unknown");

        output.push_str(&format!("--- a/{}\n+++ b/{}\n", path, path));

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

#[tauri::command]
#[specta::specta]
pub async fn generate_commit_message(
    state: State<'_, AppState>,
) -> Result<GenerateCommitMessageResponse> {
    let settings = state.get_settings()?;

    if !settings.ai_enabled {
        return Err(AxisError::AiServiceError(
            "AI commit messages are disabled".to_string(),
        ));
    }

    let diff = format_diff_for_ai(&state)?;

    if diff.trim().is_empty() {
        return Err(AxisError::AiServiceError(
            "No staged changes to generate commit message from".to_string(),
        ));
    }

    let provider = create_provider(&settings.ai_provider);
    let secret_key = get_secret_key(&settings.ai_provider);

    let api_key = if provider.requires_api_key() {
        state.get_secret(&secret_key)?
    } else {
        None
    };

    let (message, model_used) = provider
        .generate_commit_message(
            &diff,
            api_key.as_deref(),
            settings.ai_model.as_deref(),
            settings.ai_ollama_url.as_deref(),
        )
        .await?;

    Ok(GenerateCommitMessageResponse {
        message,
        model_used,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn set_ai_api_key(
    state: State<'_, AppState>,
    provider: AiProvider,
    api_key: String,
) -> Result<()> {
    let secret_key = get_secret_key(&provider);
    state.set_secret(&secret_key, &api_key)
}

#[tauri::command]
#[specta::specta]
pub async fn has_ai_api_key(state: State<'_, AppState>, provider: AiProvider) -> Result<bool> {
    let secret_key = get_secret_key(&provider);
    state.has_secret(&secret_key)
}

#[tauri::command]
#[specta::specta]
pub async fn delete_ai_api_key(state: State<'_, AppState>, provider: AiProvider) -> Result<()> {
    let secret_key = get_secret_key(&provider);
    state.delete_secret(&secret_key)
}

#[tauri::command]
#[specta::specta]
pub async fn test_ai_connection(state: State<'_, AppState>, provider: AiProvider) -> Result<bool> {
    match provider {
        AiProvider::Ollama => {
            let settings = state.get_settings()?;
            OllamaProvider::test_connection(settings.ai_ollama_url.as_deref()).await
        }
        AiProvider::OpenAi | AiProvider::Anthropic => {
            let secret_key = get_secret_key(&provider);
            let has_key = state.has_secret(&secret_key)?;
            Ok(has_key)
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn list_ollama_models(
    state: State<'_, AppState>,
    ollama_url: Option<String>,
) -> Result<Vec<String>> {
    let url = ollama_url.or_else(|| state.get_settings().ok().and_then(|s| s.ai_ollama_url));
    OllamaProvider::list_models(url.as_deref()).await
}
