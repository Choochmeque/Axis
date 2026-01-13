use crate::error::Result;
use crate::models::{
    ApplyMailboxOptions, ApplyPatchOptions, ArchiveOptions, ArchiveResult, CreatePatchOptions,
    FormatPatchOptions, PatchResult,
};
use crate::services::GitCliService;
use crate::state::AppState;
use std::path::PathBuf;
use tauri::State;

/// Helper function to get the GitCliService for the current repository
fn get_cli_service(state: &State<'_, AppState>) -> Result<GitCliService> {
    let path = state.ensure_repository_open()?;
    Ok(GitCliService::new(&path))
}

// ==================== Archive Commands ====================

#[tauri::command]
#[specta::specta]
pub async fn create_archive(
    state: State<'_, AppState>,
    options: ArchiveOptions,
) -> Result<ArchiveResult> {
    let service = get_cli_service(&state)?;
    let output_path = PathBuf::from(&options.output_path);
    service.archive(
        &options.reference,
        &options.format,
        &output_path,
        options.prefix.as_deref(),
    )
}

// ==================== Patch Commands ====================

/// Create patches from a commit range using git format-patch
#[tauri::command]
#[specta::specta]
pub async fn format_patch(
    state: State<'_, AppState>,
    options: FormatPatchOptions,
) -> Result<PatchResult> {
    let service = get_cli_service(&state)?;
    let output_dir = PathBuf::from(&options.output_dir);
    service.format_patch(&options.range, &output_dir)
}

/// Create a patch from a specific commit or staged changes
#[tauri::command]
#[specta::specta]
pub async fn create_patch(
    state: State<'_, AppState>,
    options: CreatePatchOptions,
) -> Result<PatchResult> {
    let service = get_cli_service(&state)?;
    let output_dir = PathBuf::from(&options.output_dir);

    // Generate output filename
    let filename = if let Some(ref oid) = options.commit_oid {
        format!("{}.patch", &oid[..7.min(oid.len())])
    } else {
        "staged-changes.patch".to_string()
    };

    let output_path = output_dir.join(filename);
    service.create_patch_from_diff(options.commit_oid.as_deref(), &output_path)
}

/// Apply a patch file (git apply)
#[tauri::command]
#[specta::specta]
pub async fn apply_patch(
    state: State<'_, AppState>,
    options: ApplyPatchOptions,
) -> Result<PatchResult> {
    let service = get_cli_service(&state)?;
    let patch_path = PathBuf::from(&options.patch_path);
    service.apply_patch(&patch_path, options.check_only, options.three_way)
}

/// Apply patches using git am (creates commits)
#[tauri::command]
#[specta::specta]
pub async fn apply_mailbox(
    state: State<'_, AppState>,
    options: ApplyMailboxOptions,
) -> Result<PatchResult> {
    let service = get_cli_service(&state)?;
    let patch_paths: Vec<PathBuf> = options
        .patch_paths
        .iter()
        .map(|p| PathBuf::from(p))
        .collect();
    service.apply_mailbox(&patch_paths, options.three_way)
}

/// Abort an in-progress git am session
#[tauri::command]
#[specta::specta]
pub async fn am_abort(state: State<'_, AppState>) -> Result<PatchResult> {
    let service = get_cli_service(&state)?;
    service.am_abort()
}

/// Continue git am after resolving conflicts
#[tauri::command]
#[specta::specta]
pub async fn am_continue(state: State<'_, AppState>) -> Result<PatchResult> {
    let service = get_cli_service(&state)?;
    service.am_continue()
}

/// Skip the current patch in git am
#[tauri::command]
#[specta::specta]
pub async fn am_skip(state: State<'_, AppState>) -> Result<PatchResult> {
    let service = get_cli_service(&state)?;
    service.am_skip()
}
