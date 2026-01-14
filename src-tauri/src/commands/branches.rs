use crate::error::Result;
use crate::models::{Branch, BranchType, CheckoutOptions, CreateBranchOptions};
use crate::state::AppState;
use tauri::State;

/// Create a new branch
#[tauri::command]
#[specta::specta]
pub async fn create_branch(
    state: State<'_, AppState>,
    name: String,
    start_point: Option<String>,
    force: Option<bool>,
    track: Option<String>,
) -> Result<Branch> {
    let service = state.get_service()?;
    let options = CreateBranchOptions {
        start_point,
        force: force.unwrap_or(false),
        track,
    };
    service.create_branch(&name, &options)
}

/// Delete a branch
#[tauri::command]
#[specta::specta]
pub async fn delete_branch(
    state: State<'_, AppState>,
    name: String,
    force: Option<bool>,
) -> Result<()> {
    let service = state.get_service()?;
    service.delete_branch(&name, force.unwrap_or(false))
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
    let service = state.get_service()?;
    service.rename_branch(&old_name, &new_name, force.unwrap_or(false))
}

/// Checkout a branch
#[tauri::command]
#[specta::specta]
pub async fn checkout_branch(
    state: State<'_, AppState>,
    name: String,
    create: Option<bool>,
    force: Option<bool>,
    track: Option<String>,
) -> Result<()> {
    let service = state.get_service()?;
    let options = CheckoutOptions {
        create: create.unwrap_or(false),
        force: force.unwrap_or(false),
        track,
    };
    service.checkout_branch(&name, &options)
}

/// Checkout a remote branch locally
#[tauri::command]
#[specta::specta]
pub async fn checkout_remote_branch(
    state: State<'_, AppState>,
    remote_name: String,
    branch_name: String,
    local_name: Option<String>,
) -> Result<()> {
    let service = state.get_service()?;
    service.checkout_remote_branch(&remote_name, &branch_name, local_name.as_deref())
}

/// Get branch details
#[tauri::command]
#[specta::specta]
pub async fn get_branch(
    state: State<'_, AppState>,
    name: String,
    branch_type: BranchType,
) -> Result<Branch> {
    let service = state.get_service()?;
    service.get_branch(&name, branch_type)
}

/// Set the upstream branch for a local branch
#[tauri::command]
#[specta::specta]
pub async fn set_branch_upstream(
    state: State<'_, AppState>,
    branch_name: String,
    upstream: Option<String>,
) -> Result<()> {
    let service = state.get_service()?;
    service.set_branch_upstream(&branch_name, upstream.as_deref())
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
    let service = state.get_service()?;
    service.delete_remote_branch(&remote_name, &branch_name, force.unwrap_or(false))
}
