use crate::error::Result;
use crate::models::RepositorySettings;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_repository_settings(state: State<'_, AppState>) -> Result<RepositorySettings> {
    let handle = state.get_git_service()?;
    let guard = handle.lock();
    let git2 = guard.git2();

    let (user_name, user_email) = git2.get_repo_user_config()?;
    let (global_user_name, global_user_email) = git2.get_global_user_config()?;
    let remotes = git2.list_remotes()?;

    Ok(RepositorySettings {
        user_name,
        user_email,
        global_user_name,
        global_user_email,
        remotes,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn save_repository_user_config(
    state: State<'_, AppState>,
    user_name: Option<String>,
    user_email: Option<String>,
) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.set_repo_user_config(user_name.as_deref(), user_email.as_deref()))
}
