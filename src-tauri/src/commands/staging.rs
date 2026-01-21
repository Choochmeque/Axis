use crate::error::Result;
use crate::services::SigningService;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn stage_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.stage_file(&path))
}

#[tauri::command]
#[specta::specta]
pub async fn stage_files(state: State<'_, AppState>, paths: Vec<String>) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.stage_files(&paths))
}

#[tauri::command]
#[specta::specta]
pub async fn stage_all(state: State<'_, AppState>) -> Result<()> {
    state.get_git_service()?.with_git2(|git2| git2.stage_all())
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.unstage_file(&path))
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_files(state: State<'_, AppState>, paths: Vec<String>) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.unstage_files(&paths))
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_all(state: State<'_, AppState>) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.unstage_all())
}

#[tauri::command]
#[specta::specta]
pub async fn discard_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.discard_file(&path))
}

#[tauri::command]
#[specta::specta]
pub async fn discard_all(state: State<'_, AppState>) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.discard_all())
}

#[tauri::command]
#[specta::specta]
pub async fn create_commit(
    state: State<'_, AppState>,
    message: String,
    author_name: Option<String>,
    author_email: Option<String>,
    sign: Option<bool>,
) -> Result<String> {
    let path = state.ensure_repository_open()?;
    let settings = state.get_settings()?;

    // Use explicit sign param if provided, otherwise use settings
    let should_sign = sign.unwrap_or(settings.sign_commits);

    let signing_config = if should_sign {
        let signing_service = SigningService::new(&path);
        Some(signing_service.get_config_from_git()?)
    } else {
        None
    };

    state.get_git_service()?.with_git2(|git2| {
        git2.create_commit(
            &message,
            author_name.as_deref(),
            author_email.as_deref(),
            signing_config.as_ref(),
        )
    })
}

#[tauri::command]
#[specta::specta]
pub async fn amend_commit(state: State<'_, AppState>, message: Option<String>) -> Result<String> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.amend_commit(message.as_deref()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_user_signature(state: State<'_, AppState>) -> Result<(String, String)> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.get_user_signature())
}

#[tauri::command]
#[specta::specta]
pub async fn stage_hunk(state: State<'_, AppState>, patch: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.stage_hunk(&patch))
}

#[tauri::command]
#[specta::specta]
pub async fn unstage_hunk(state: State<'_, AppState>, patch: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.unstage_hunk(&patch))
}

#[tauri::command]
#[specta::specta]
pub async fn discard_hunk(state: State<'_, AppState>, patch: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git_cli(|cli| cli.discard_hunk(&patch))
}

#[tauri::command]
#[specta::specta]
pub async fn delete_file(state: State<'_, AppState>, path: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.delete_file(&path))
}
