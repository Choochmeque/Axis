use crate::error::Result;
use crate::models::RepositorySettings;
use crate::state::AppState;
use tauri::State;

#[tauri::command]
#[specta::specta]
pub async fn get_repository_settings(state: State<'_, AppState>) -> Result<RepositorySettings> {
    let git_service = state.get_git_service()?;
    let guard = git_service.read().await;

    let (user_name, user_email) = guard.git2(|git2| git2.get_repo_user_config()).await?;
    let (global_user_name, global_user_email) =
        guard.git2(|git2| git2.get_global_user_config()).await?;
    let remotes = guard.git2(|git2| git2.list_remotes()).await?;

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
        .write()
        .await
        .git2(move |git2| {
            git2.set_repo_user_config(user_name.as_deref(), user_email.as_deref())
        })
        .await
}
