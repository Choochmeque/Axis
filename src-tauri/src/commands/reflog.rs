use crate::error::Result;
use crate::models::{ReflogEntry, ReflogOptions};
use crate::state::AppState;
use tauri::State;

// ==================== Reflog Commands ====================

/// List reflog entries for a reference
#[tauri::command]
#[specta::specta]
pub async fn reflog_list(
    state: State<'_, AppState>,
    options: ReflogOptions,
) -> Result<Vec<ReflogEntry>> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.get_reflog(&options))
        .await
}

/// Get list of available reflogs (references that have reflog)
#[tauri::command]
#[specta::specta]
pub async fn reflog_refs(state: State<'_, AppState>) -> Result<Vec<String>> {
    state
        .get_git_service()?
        .with_git2(|git2| git2.list_reflogs())
        .await
}

/// Get total count of reflog entries for a reference
#[tauri::command]
#[specta::specta]
pub async fn reflog_count(state: State<'_, AppState>, refname: String) -> Result<usize> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.get_reflog_count(&refname))
        .await
}

/// Checkout to a reflog entry (creates detached HEAD)
#[tauri::command]
#[specta::specta]
pub async fn reflog_checkout(state: State<'_, AppState>, reflog_ref: String) -> Result<()> {
    state
        .get_git_service()?
        .with_git2(move |git2| git2.checkout_reflog_entry(&reflog_ref))
        .await
}
