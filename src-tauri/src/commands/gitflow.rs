use crate::error::Result;
use crate::models::{
    GitFlowBranchType, GitFlowConfig, GitFlowFinishOptions, GitFlowInitOptions, GitFlowResult,
};
use crate::state::AppState;
use tauri::State;

// ==================== Git-flow Commands ====================

/// Check if git-flow is initialized
#[tauri::command]
#[specta::specta]
pub async fn gitflow_is_initialized(state: State<'_, AppState>) -> Result<bool> {
    state
        .get_git_service()?
        .read()
        .await
        .gitflow_is_initialized()
        .await
}

/// Get git-flow configuration
#[tauri::command]
#[specta::specta]
pub async fn gitflow_config(state: State<'_, AppState>) -> Result<Option<GitFlowConfig>> {
    state.get_git_service()?.read().await.gitflow_config().await
}

/// Initialize git-flow
#[tauri::command]
#[specta::specta]
pub async fn gitflow_init(
    state: State<'_, AppState>,
    options: GitFlowInitOptions,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_init(&options)
        .await
}

/// Start a feature branch
#[tauri::command]
#[specta::specta]
pub async fn gitflow_feature_start(
    state: State<'_, AppState>,
    name: String,
    base: Option<String>,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_start(GitFlowBranchType::Feature, &name, base.as_deref())
        .await
}

/// Finish a feature branch
#[tauri::command]
#[specta::specta]
pub async fn gitflow_feature_finish(
    state: State<'_, AppState>,
    name: String,
    options: GitFlowFinishOptions,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_finish(GitFlowBranchType::Feature, &name, &options)
        .await
}

/// Publish a feature branch
#[tauri::command]
#[specta::specta]
pub async fn gitflow_feature_publish(
    state: State<'_, AppState>,
    name: String,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_publish(GitFlowBranchType::Feature, &name)
        .await
}

/// List feature branches
#[tauri::command]
#[specta::specta]
pub async fn gitflow_feature_list(state: State<'_, AppState>) -> Result<Vec<String>> {
    state
        .get_git_service()?
        .read()
        .await
        .gitflow_list(GitFlowBranchType::Feature)
        .await
}

/// Start a release branch
#[tauri::command]
#[specta::specta]
pub async fn gitflow_release_start(
    state: State<'_, AppState>,
    name: String,
    base: Option<String>,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_start(GitFlowBranchType::Release, &name, base.as_deref())
        .await
}

/// Finish a release branch
#[tauri::command]
#[specta::specta]
pub async fn gitflow_release_finish(
    state: State<'_, AppState>,
    name: String,
    options: GitFlowFinishOptions,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_finish(GitFlowBranchType::Release, &name, &options)
        .await
}

/// Publish a release branch
#[tauri::command]
#[specta::specta]
pub async fn gitflow_release_publish(
    state: State<'_, AppState>,
    name: String,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_publish(GitFlowBranchType::Release, &name)
        .await
}

/// List release branches
#[tauri::command]
#[specta::specta]
pub async fn gitflow_release_list(state: State<'_, AppState>) -> Result<Vec<String>> {
    state
        .get_git_service()?
        .read()
        .await
        .gitflow_list(GitFlowBranchType::Release)
        .await
}

/// Start a hotfix branch
#[tauri::command]
#[specta::specta]
pub async fn gitflow_hotfix_start(
    state: State<'_, AppState>,
    name: String,
    base: Option<String>,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_start(GitFlowBranchType::Hotfix, &name, base.as_deref())
        .await
}

/// Finish a hotfix branch
#[tauri::command]
#[specta::specta]
pub async fn gitflow_hotfix_finish(
    state: State<'_, AppState>,
    name: String,
    options: GitFlowFinishOptions,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_finish(GitFlowBranchType::Hotfix, &name, &options)
        .await
}

/// Publish a hotfix branch
#[tauri::command]
#[specta::specta]
pub async fn gitflow_hotfix_publish(
    state: State<'_, AppState>,
    name: String,
) -> Result<GitFlowResult> {
    state
        .get_git_service()?
        .write()
        .await
        .gitflow_publish(GitFlowBranchType::Hotfix, &name)
        .await
}

/// List hotfix branches
#[tauri::command]
#[specta::specta]
pub async fn gitflow_hotfix_list(state: State<'_, AppState>) -> Result<Vec<String>> {
    state
        .get_git_service()?
        .read()
        .await
        .gitflow_list(GitFlowBranchType::Hotfix)
        .await
}
