use crate::error::Result;
use crate::models::{
    ApplyMailboxOptions, ApplyPatchOptions, ArchiveOptions, ArchiveResult, CreatePatchOptions,
    FormatPatchOptions, PatchResult,
};
use crate::state::AppState;
use std::path::PathBuf;
use tauri::State;

// ==================== Archive Commands ====================

#[tauri::command]
#[specta::specta]
pub async fn create_archive(
    state: State<'_, AppState>,
    options: ArchiveOptions,
) -> Result<ArchiveResult> {
    let output_path = PathBuf::from(&options.output_path);
    state
        .get_git_service()?
        .read()
        .await
        .archive(
            &options.reference,
            &options.format,
            &output_path,
            options.prefix.as_deref(),
        )
        .await
}

// ==================== Patch Commands ====================

/// Create patches from a commit range using git format-patch
#[tauri::command]
#[specta::specta]
pub async fn format_patch(
    state: State<'_, AppState>,
    options: FormatPatchOptions,
) -> Result<PatchResult> {
    let output_dir = PathBuf::from(&options.output_dir);
    state
        .get_git_service()?
        .read()
        .await
        .format_patch(&options.range, &output_dir)
        .await
}

/// Create a patch from a specific commit or staged changes
#[tauri::command]
#[specta::specta]
pub async fn create_patch(
    state: State<'_, AppState>,
    options: CreatePatchOptions,
) -> Result<PatchResult> {
    let output_dir = PathBuf::from(&options.output_dir);

    // Generate output filename
    let filename = if let Some(ref oid) = options.commit_oid {
        format!("{}.patch", &oid[..7.min(oid.len())])
    } else {
        "staged-changes.patch".to_string()
    };

    let output_path = output_dir.join(filename);
    state
        .get_git_service()?
        .read()
        .await
        .create_patch_from_diff(options.commit_oid.as_deref(), &output_path)
        .await
}

/// Apply a patch file (git apply)
#[tauri::command]
#[specta::specta]
pub async fn apply_patch(
    state: State<'_, AppState>,
    options: ApplyPatchOptions,
) -> Result<PatchResult> {
    let patch_path = PathBuf::from(&options.patch_path);
    state
        .get_git_service()?
        .write()
        .await
        .apply_patch(&patch_path, options.check_only, options.three_way)
        .await
}

/// Apply patches using git am (creates commits)
#[tauri::command]
#[specta::specta]
pub async fn apply_mailbox(
    state: State<'_, AppState>,
    options: ApplyMailboxOptions,
) -> Result<PatchResult> {
    let patch_paths: Vec<PathBuf> = options.patch_paths.iter().map(PathBuf::from).collect();
    state
        .get_git_service()?
        .write()
        .await
        .apply_mailbox(&patch_paths, options.three_way)
        .await
}

/// Abort an in-progress git am session
#[tauri::command]
#[specta::specta]
pub async fn am_abort(state: State<'_, AppState>) -> Result<PatchResult> {
    state.get_git_service()?.write().await.am_abort().await
}

/// Continue git am after resolving conflicts
#[tauri::command]
#[specta::specta]
pub async fn am_continue(state: State<'_, AppState>) -> Result<PatchResult> {
    state.get_git_service()?.write().await.am_continue().await
}

/// Skip the current patch in git am
#[tauri::command]
#[specta::specta]
pub async fn am_skip(state: State<'_, AppState>) -> Result<PatchResult> {
    state.get_git_service()?.write().await.am_skip().await
}
