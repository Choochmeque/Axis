use serde::{Deserialize, Serialize};
use specta::Type;

/// Status of Git LFS in the repository
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsStatus {
    /// Whether git-lfs is installed on the system
    pub is_installed: bool,
    /// Version of git-lfs if installed
    pub version: Option<String>,
    /// Whether LFS is initialized in the repository
    pub is_initialized: bool,
    /// Number of tracked patterns
    pub tracked_patterns_count: usize,
    /// Number of LFS files in the repository
    pub lfs_files_count: usize,
}

/// A tracked LFS pattern
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsTrackedPattern {
    /// The pattern (e.g., "*.psd", "assets/*.png")
    pub pattern: String,
    /// Source file where the pattern is defined (usually .gitattributes)
    pub source_file: String,
}

/// Status of an LFS file
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum LfsFileStatus {
    /// File content is downloaded locally
    Downloaded,
    /// File is a pointer (content not downloaded)
    Pointer,
    /// File is not tracked by LFS
    NotLfs,
    /// Status unknown
    Unknown,
}

/// An LFS-tracked file
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsFile {
    /// Path to the file relative to repository root
    pub path: String,
    /// LFS object ID (SHA-256)
    pub oid: String,
    /// File size in bytes
    pub size: u64,
    /// Whether the file content is downloaded
    pub is_downloaded: bool,
    /// File status
    pub status: LfsFileStatus,
}

/// Options for LFS fetch operation
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsFetchOptions {
    /// Fetch LFS objects for all refs
    pub all: bool,
    /// Fetch only recent LFS objects
    pub recent: bool,
    /// Include objects for the specified remote
    pub remote: Option<String>,
    /// Specific refs to fetch (branches, tags)
    pub refs: Vec<String>,
}

/// Options for LFS pull operation
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsPullOptions {
    /// Remote to pull from
    pub remote: Option<String>,
}

/// Options for LFS push operation
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsPushOptions {
    /// Remote to push to
    pub remote: Option<String>,
    /// Push all local LFS objects
    pub all: bool,
    /// Dry run - don't actually push
    pub dry_run: bool,
}

/// Options for LFS migrate operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsMigrateOptions {
    /// Migration mode: import or export
    pub mode: LfsMigrateMode,
    /// File patterns to include
    pub include: Vec<String>,
    /// File patterns to exclude
    pub exclude: Vec<String>,
    /// Include all refs
    pub everything: bool,
    /// Specific refs to migrate
    pub refs: Vec<String>,
    /// Rewrite history (use with caution)
    pub above: Option<u64>,
}

/// LFS migration mode
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum LfsMigrateMode {
    /// Import files into LFS
    Import,
    /// Export files from LFS to regular Git
    Export,
    /// Show migration info without making changes
    Info,
}

/// Result of an LFS operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// Message describing the result
    pub message: String,
    /// Files affected by the operation
    pub affected_files: Vec<String>,
}

/// LFS environment information
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsEnvironment {
    /// LFS version
    pub version: String,
    /// Git LFS endpoint URL
    pub endpoint: Option<String>,
    /// Local LFS storage path
    pub storage_path: Option<String>,
    /// Whether SSH is used for transfers
    pub uses_ssh: bool,
}

/// Git environment information for settings display
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GitEnvironment {
    /// Git CLI version
    pub git_version: Option<String>,
    /// Path to Git executable
    pub git_path: Option<String>,
    /// libgit2 version used by the application
    pub libgit2_version: String,
    /// Whether Git LFS is installed
    pub lfs_installed: bool,
    /// Git LFS version if installed
    pub lfs_version: Option<String>,
}

/// Options for LFS prune operation
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsPruneOptions {
    /// Dry run - show what would be pruned
    pub dry_run: bool,
    /// Verify remote copies before pruning
    pub verify_remote: bool,
}

/// Result of LFS prune operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsPruneResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// Message describing the result
    pub message: String,
    /// Number of objects pruned
    pub objects_pruned: usize,
    /// Space reclaimed in bytes
    pub space_reclaimed: u64,
}
