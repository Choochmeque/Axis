use log::info;

use crate::error::{AxisError, Result};
use crate::models::{
    AiProvider, DiffLineType, DiffOptions, FileDiff, GenerateCommitMessageResponse,
    GeneratePrDescriptionResponse,
};
use crate::services::ai::{create_provider, get_secret_key, OllamaProvider};
use crate::state::AppState;
use tauri::State;

const MAX_DIFF_SIZE: usize = 100_000;

async fn format_diff_for_ai(state: &State<'_, AppState>) -> Result<String> {
    let diffs = state
        .get_git_service()?
        .read()
        .await
        .diff_staged(&DiffOptions::default())
        .await?;

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

    let diff = format_diff_for_ai(&state).await?;

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
            settings.conventional_commits_enabled,
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

const MAX_FILES_IN_SUMMARY: usize = 30;

fn format_diff_summary(files: &[FileDiff]) -> String {
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

#[tauri::command]
#[specta::specta]
pub async fn generate_pr_description(
    state: State<'_, AppState>,
    source_branch: String,
    target_branch: String,
    include_diff_summary: bool,
    available_labels: Vec<String>,
) -> Result<GeneratePrDescriptionResponse> {
    let settings = state.get_settings()?;

    if !settings.ai_enabled {
        return Err(AxisError::AiServiceError(
            "AI features are disabled".to_string(),
        ));
    }

    info!("Generating PR description for {source_branch} -> {target_branch}");

    // Use remote tracking refs so we only consider pushed commits
    let remote_source = format!("origin/{source_branch}");
    let remote_target = format!("origin/{target_branch}");

    let compare_result = state
        .get_git_service()?
        .read()
        .await
        .compare_branches(&remote_source, &remote_target)
        .await?;

    if compare_result.ahead_commits.is_empty() {
        return Err(AxisError::AiServiceError(
            "No commits between branches to generate PR description from".to_string(),
        ));
    }

    let commits: Vec<(String, String)> = compare_result
        .ahead_commits
        .iter()
        .map(|c| (c.short_oid.clone(), c.summary.clone()))
        .collect();

    let diff_summary = if include_diff_summary && !compare_result.files.is_empty() {
        Some(format_diff_summary(&compare_result.files))
    } else {
        None
    };

    let labels_ref = if available_labels.is_empty() {
        None
    } else {
        Some(available_labels.as_slice())
    };

    let provider = create_provider(&settings.ai_provider);
    let secret_key = get_secret_key(&settings.ai_provider);

    let api_key = if provider.requires_api_key() {
        state.get_secret(&secret_key)?
    } else {
        None
    };

    let (title, body, labels, model_used) = provider
        .generate_pr_description(
            &commits,
            diff_summary.as_deref(),
            labels_ref,
            api_key.as_deref(),
            settings.ai_model.as_deref(),
            settings.ai_ollama_url.as_deref(),
        )
        .await?;

    info!("Generated PR description with model: {model_used}");

    Ok(GeneratePrDescriptionResponse {
        title,
        body,
        labels,
        model_used,
    })
}
