use crate::error::Result;
use crate::services::Git2Service;
use crate::state::AppState;
use tauri::State;

/// Helper function to get the Git2Service for the current repository
fn get_service(state: &State<'_, AppState>) -> Result<Git2Service> {
    let path = state.ensure_repository_open()?;
    Git2Service::open(&path)
}

#[tauri::command]
pub async fn stage_file(
    state: State<'_, AppState>,
    path: String,
) -> Result<()> {
    let service = get_service(&state)?;
    service.stage_file(&path)
}

#[tauri::command]
pub async fn stage_files(
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<()> {
    let service = get_service(&state)?;
    service.stage_files(&paths)
}

#[tauri::command]
pub async fn stage_all(
    state: State<'_, AppState>,
) -> Result<()> {
    let service = get_service(&state)?;
    service.stage_all()
}

#[tauri::command]
pub async fn unstage_file(
    state: State<'_, AppState>,
    path: String,
) -> Result<()> {
    let service = get_service(&state)?;
    service.unstage_file(&path)
}

#[tauri::command]
pub async fn unstage_files(
    state: State<'_, AppState>,
    paths: Vec<String>,
) -> Result<()> {
    let service = get_service(&state)?;
    service.unstage_files(&paths)
}

#[tauri::command]
pub async fn unstage_all(
    state: State<'_, AppState>,
) -> Result<()> {
    let service = get_service(&state)?;
    service.unstage_all()
}

#[tauri::command]
pub async fn discard_file(
    state: State<'_, AppState>,
    path: String,
) -> Result<()> {
    let service = get_service(&state)?;
    service.discard_file(&path)
}

#[tauri::command]
pub async fn discard_all(
    state: State<'_, AppState>,
) -> Result<()> {
    let service = get_service(&state)?;
    service.discard_all()
}

#[tauri::command]
pub async fn create_commit(
    state: State<'_, AppState>,
    message: String,
    author_name: Option<String>,
    author_email: Option<String>,
) -> Result<String> {
    let service = get_service(&state)?;
    service.create_commit(
        &message,
        author_name.as_deref(),
        author_email.as_deref(),
    )
}

#[tauri::command]
pub async fn amend_commit(
    state: State<'_, AppState>,
    message: Option<String>,
) -> Result<String> {
    let service = get_service(&state)?;
    service.amend_commit(message.as_deref())
}
