use crate::error::Result;
use crate::models::{
    GitFlowConfig, GitFlowInitOptions, GitFlowFinishOptions, GitFlowResult, GitFlowBranchType,
};
use crate::services::GitCliService;
use crate::state::AppState;
use tauri::State;

/// Helper to get GitCliService from current repository
fn get_cli_service(state: &State<AppState>) -> Result<GitCliService> {
    let path = state.ensure_repository_open()?;
    Ok(GitCliService::new(&path))
}

// ==================== Git-flow Commands ====================

/// Check if git-flow is initialized
#[tauri::command]
pub async fn gitflow_is_initialized(state: State<'_, AppState>) -> Result<bool> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_is_initialized()
}

/// Get git-flow configuration
#[tauri::command]
pub async fn gitflow_config(state: State<'_, AppState>) -> Result<Option<GitFlowConfig>> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_config()
}

/// Initialize git-flow
#[tauri::command]
pub async fn gitflow_init(
    state: State<'_, AppState>,
    options: GitFlowInitOptions,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_init(&options)
}

/// Start a feature branch
#[tauri::command]
pub async fn gitflow_feature_start(
    state: State<'_, AppState>,
    name: String,
    base: Option<String>,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_start(GitFlowBranchType::Feature, &name, base.as_deref())
}

/// Finish a feature branch
#[tauri::command]
pub async fn gitflow_feature_finish(
    state: State<'_, AppState>,
    name: String,
    options: GitFlowFinishOptions,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_finish(GitFlowBranchType::Feature, &name, &options)
}

/// Publish a feature branch
#[tauri::command]
pub async fn gitflow_feature_publish(
    state: State<'_, AppState>,
    name: String,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_publish(GitFlowBranchType::Feature, &name)
}

/// List feature branches
#[tauri::command]
pub async fn gitflow_feature_list(state: State<'_, AppState>) -> Result<Vec<String>> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_list(GitFlowBranchType::Feature)
}

/// Start a release branch
#[tauri::command]
pub async fn gitflow_release_start(
    state: State<'_, AppState>,
    name: String,
    base: Option<String>,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_start(GitFlowBranchType::Release, &name, base.as_deref())
}

/// Finish a release branch
#[tauri::command]
pub async fn gitflow_release_finish(
    state: State<'_, AppState>,
    name: String,
    options: GitFlowFinishOptions,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_finish(GitFlowBranchType::Release, &name, &options)
}

/// Publish a release branch
#[tauri::command]
pub async fn gitflow_release_publish(
    state: State<'_, AppState>,
    name: String,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_publish(GitFlowBranchType::Release, &name)
}

/// List release branches
#[tauri::command]
pub async fn gitflow_release_list(state: State<'_, AppState>) -> Result<Vec<String>> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_list(GitFlowBranchType::Release)
}

/// Start a hotfix branch
#[tauri::command]
pub async fn gitflow_hotfix_start(
    state: State<'_, AppState>,
    name: String,
    base: Option<String>,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_start(GitFlowBranchType::Hotfix, &name, base.as_deref())
}

/// Finish a hotfix branch
#[tauri::command]
pub async fn gitflow_hotfix_finish(
    state: State<'_, AppState>,
    name: String,
    options: GitFlowFinishOptions,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_finish(GitFlowBranchType::Hotfix, &name, &options)
}

/// Publish a hotfix branch
#[tauri::command]
pub async fn gitflow_hotfix_publish(
    state: State<'_, AppState>,
    name: String,
) -> Result<GitFlowResult> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_publish(GitFlowBranchType::Hotfix, &name)
}

/// List hotfix branches
#[tauri::command]
pub async fn gitflow_hotfix_list(state: State<'_, AppState>) -> Result<Vec<String>> {
    let cli = get_cli_service(&state)?;
    cli.gitflow_list(GitFlowBranchType::Hotfix)
}
