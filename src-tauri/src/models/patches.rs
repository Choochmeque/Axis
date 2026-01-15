use serde::{Deserialize, Serialize};
use specta::Type;

/// Result of an archive operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveResult {
    pub message: String,
    pub output_path: Option<String>,
    pub size_bytes: Option<u64>,
}

/// Options for creating an archive
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveOptions {
    /// The reference to archive (commit SHA, branch name, tag)
    pub reference: String,
    /// Archive format: zip, tar, tar.gz, tar.bz2
    pub format: String,
    /// Output file path
    pub output_path: String,
    /// Optional prefix for files in the archive
    pub prefix: Option<String>,
}

/// Result of a patch operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PatchResult {
    /// Message describing the result of the operation
    pub message: String,
    /// Paths to created or applied patch files
    pub patches: Vec<String>,
}

/// Options for creating patches
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreatePatchOptions {
    /// The commit SHA to create patch from (None = staged changes)
    pub commit_oid: Option<String>,
    /// Output directory for patch files
    pub output_dir: String,
}

/// Options for format-patch (creating patches from commit range)
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct FormatPatchOptions {
    /// Range specification (e.g., "HEAD~3", "main..feature", "abc123")
    pub range: String,
    /// Output directory for patch files
    pub output_dir: String,
}

/// Options for applying a patch
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ApplyPatchOptions {
    /// Path to the patch file
    pub patch_path: String,
    /// Only check if patch can be applied, don't actually apply
    pub check_only: bool,
    /// Use 3-way merge if patch doesn't apply cleanly
    pub three_way: bool,
}

/// Options for applying mailbox patches (git am)
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ApplyMailboxOptions {
    /// Paths to patch files
    pub patch_paths: Vec<String>,
    /// Use 3-way merge if patch doesn't apply cleanly
    pub three_way: bool,
}
