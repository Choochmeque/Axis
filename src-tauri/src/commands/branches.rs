use crate::error::Result;
use crate::models::{Branch, BranchType, CheckoutOptions, CreateBranchOptions};
use crate::services::Git2Service;
use crate::state::AppState;
use tauri::State;

/// Helper function to get the Git2Service for the current repository
fn get_service(state: &State<'_, AppState>) -> Result<Git2Service> {
    let path = state.ensure_repository_open()?;
    Git2Service::open(&path)
}

#[tauri::command]
pub async fn create_branch(
    state: State<'_, AppState>,
    name: String,
    start_point: Option<String>,
    force: Option<bool>,
    track: Option<String>,
) -> Result<Branch> {
    let service = get_service(&state)?;
    let options = CreateBranchOptions {
        start_point,
        force: force.unwrap_or(false),
        track,
    };
    service.create_branch(&name, &options)
}

#[tauri::command]
pub async fn delete_branch(
    state: State<'_, AppState>,
    name: String,
    force: Option<bool>,
) -> Result<()> {
    let service = get_service(&state)?;
    service.delete_branch(&name, force.unwrap_or(false))
}

#[tauri::command]
pub async fn rename_branch(
    state: State<'_, AppState>,
    old_name: String,
    new_name: String,
    force: Option<bool>,
) -> Result<Branch> {
    let service = get_service(&state)?;
    service.rename_branch(&old_name, &new_name, force.unwrap_or(false))
}

#[tauri::command]
pub async fn checkout_branch(
    state: State<'_, AppState>,
    name: String,
    create: Option<bool>,
    force: Option<bool>,
    track: Option<String>,
) -> Result<()> {
    let service = get_service(&state)?;
    let options = CheckoutOptions {
        create: create.unwrap_or(false),
        force: force.unwrap_or(false),
        track,
    };
    service.checkout_branch(&name, &options)
}

#[tauri::command]
pub async fn checkout_remote_branch(
    state: State<'_, AppState>,
    remote_name: String,
    branch_name: String,
    local_name: Option<String>,
) -> Result<()> {
    let service = get_service(&state)?;
    service.checkout_remote_branch(&remote_name, &branch_name, local_name.as_deref())
}

#[tauri::command]
pub async fn get_branch(
    state: State<'_, AppState>,
    name: String,
    branch_type: BranchType,
) -> Result<Branch> {
    let service = get_service(&state)?;
    service.get_branch(&name, branch_type)
}

#[tauri::command]
pub async fn set_branch_upstream(
    state: State<'_, AppState>,
    branch_name: String,
    upstream: Option<String>,
) -> Result<()> {
    let service = get_service(&state)?;
    service.set_branch_upstream(&branch_name, upstream.as_deref())
}

#[tauri::command]
pub async fn delete_remote_branch(
    state: State<'_, AppState>,
    remote_name: String,
    branch_name: String,
    force: Option<bool>,
) -> Result<()> {
    let service = get_service(&state)?;
    service.delete_remote_branch(&remote_name, &branch_name, force.unwrap_or(false))
}
