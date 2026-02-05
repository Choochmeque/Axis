use crate::error::Result;
use crate::models::{
    Branch, BranchCompareResult, BranchType, CheckoutOptions, CreateBranchOptions,
};
use crate::state::AppState;
use tauri::State;

/// Create a new branch
#[tauri::command]
#[specta::specta]
pub async fn create_branch(
    state: State<'_, AppState>,
    name: String,
    options: CreateBranchOptions,
) -> Result<Branch> {
    state
        .get_git_service()?
        .write()
        .await
        .create_branch(&name, &options)
        .await
}

/// Delete a branch
#[tauri::command]
#[specta::specta]
pub async fn delete_branch(
    state: State<'_, AppState>,
    name: String,
    force: Option<bool>,
) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .delete_branch(&name, force.unwrap_or(false))
        .await
}

/// Rename a branch
#[tauri::command]
#[specta::specta]
pub async fn rename_branch(
    state: State<'_, AppState>,
    old_name: String,
    new_name: String,
    force: Option<bool>,
) -> Result<Branch> {
    state
        .get_git_service()?
        .write()
        .await
        .rename_branch(&old_name, &new_name, force.unwrap_or(false))
        .await
}

/// Checkout a branch
#[tauri::command]
#[specta::specta]
pub async fn checkout_branch(
    state: State<'_, AppState>,
    name: String,
    options: CheckoutOptions,
) -> Result<()> {
    let settings = state.get_settings()?;
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    // Get HEAD before checkout for post-checkout hook
    let prev_head = guard.get_head_oid().await;

    // Perform checkout
    guard.checkout_branch(&name, &options).await?;

    // Run post-checkout hook (informational, don't fail on error)
    if !settings.bypass_hooks {
        let new_head = guard.get_head_oid().await;
        let result = guard.run_post_checkout(&prev_head, &new_head, true).await;
        if !result.skipped && !result.success {
            log::warn!("post-checkout hook failed: {}", result.stderr);
        }
    }

    Ok(())
}

/// Checkout a remote branch locally
#[tauri::command]
#[specta::specta]
pub async fn checkout_remote_branch(
    state: State<'_, AppState>,
    remote_name: String,
    branch_name: String,
    local_name: Option<String>,
    force: bool,
) -> Result<()> {
    let settings = state.get_settings()?;
    let git_service = state.get_git_service()?;
    let guard = git_service.write().await;

    // Get HEAD before checkout for post-checkout hook
    let prev_head = guard.get_head_oid().await;

    // Perform checkout
    guard
        .checkout_remote_branch(&remote_name, &branch_name, local_name.as_deref(), force)
        .await?;

    // Run post-checkout hook (informational, don't fail on error)
    if !settings.bypass_hooks {
        let new_head = guard.get_head_oid().await;
        let result = guard.run_post_checkout(&prev_head, &new_head, true).await;
        if !result.skipped && !result.success {
            log::warn!("post-checkout hook failed: {}", result.stderr);
        }
    }

    Ok(())
}

/// Get branch details
#[tauri::command]
#[specta::specta]
pub async fn get_branch(
    state: State<'_, AppState>,
    name: String,
    branch_type: BranchType,
) -> Result<Branch> {
    state
        .get_git_service()?
        .read()
        .await
        .get_branch(&name, branch_type)
        .await
}

/// Set the upstream branch for a local branch
#[tauri::command]
#[specta::specta]
pub async fn set_branch_upstream(
    state: State<'_, AppState>,
    branch_name: String,
    upstream: Option<String>,
) -> Result<()> {
    state
        .get_git_service()?
        .write()
        .await
        .set_branch_upstream(&branch_name, upstream.as_deref())
        .await
}

/// Delete a remote branch
#[tauri::command]
#[specta::specta]
pub async fn delete_remote_branch(
    state: State<'_, AppState>,
    remote_name: String,
    branch_name: String,
    force: Option<bool>,
) -> Result<()> {
    let ssh_creds = state.resolve_ssh_credentials(&remote_name)?;
    state
        .get_git_service()?
        .write()
        .await
        .delete_remote_branch(
            &remote_name,
            &branch_name,
            force.unwrap_or(false),
            ssh_creds,
        )
        .await
}

/// Compare two branches to find commits ahead/behind and file differences
#[tauri::command]
#[specta::specta]
pub async fn compare_branches(
    state: State<'_, AppState>,
    base_ref: String,
    compare_ref: String,
) -> Result<BranchCompareResult> {
    state
        .get_git_service()?
        .read()
        .await
        .compare_branches(&base_ref, &compare_ref)
        .await
}
