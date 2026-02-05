use log::info;

use crate::error::{AxisError, Result};
use crate::models::{
    AiProvider, DiffOptions, GenerateCommitMessageResponse, GeneratePrDescriptionResponse,
};
use crate::services::ai::{
    create_provider, format_diff_for_ai, format_diff_summary, get_secret_key, OllamaProvider,
};
use crate::state::AppState;
use tauri::State;

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

    let diffs = state
        .get_git_service()?
        .read()
        .await
        .diff_staged(&DiffOptions::default())
        .await?;

    let diff = format_diff_for_ai(&diffs)?;

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
