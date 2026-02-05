use crate::error::Result;
use crate::models::{AddWorktreeOptions, RemoveWorktreeOptions, Worktree, WorktreeResult};
use crate::state::AppState;
use tauri::State;

// ==================== Worktree Commands ====================

/// List all worktrees
#[tauri::command]
#[specta::specta]
pub async fn worktree_list(state: State<'_, AppState>) -> Result<Vec<Worktree>> {
    state.get_git_service()?.read().await.worktree_list().await
}

/// Add a new worktree
#[tauri::command]
#[specta::specta]
pub async fn worktree_add(
    state: State<'_, AppState>,
    options: AddWorktreeOptions,
) -> Result<WorktreeResult> {
    state
        .get_git_service()?
        .write()
        .await
        .worktree_add(&options)
        .await
}

/// Remove a worktree
#[tauri::command]
#[specta::specta]
pub async fn worktree_remove(
    state: State<'_, AppState>,
    options: RemoveWorktreeOptions,
) -> Result<WorktreeResult> {
    state
        .get_git_service()?
        .write()
        .await
        .worktree_remove(&options)
        .await
}

/// Lock a worktree
#[tauri::command]
#[specta::specta]
pub async fn worktree_lock(
    state: State<'_, AppState>,
    path: String,
    reason: Option<String>,
) -> Result<WorktreeResult> {
    state
        .get_git_service()?
        .write()
        .await
        .worktree_lock(&path, reason.as_deref())
        .await
}

/// Unlock a worktree
#[tauri::command]
#[specta::specta]
pub async fn worktree_unlock(state: State<'_, AppState>, path: String) -> Result<WorktreeResult> {
    state
        .get_git_service()?
        .write()
        .await
        .worktree_unlock(&path)
        .await
}

/// Prune stale worktree references
#[tauri::command]
#[specta::specta]
pub async fn worktree_prune(state: State<'_, AppState>, dry_run: bool) -> Result<WorktreeResult> {
    state
        .get_git_service()?
        .write()
        .await
        .worktree_prune(dry_run)
        .await
}
