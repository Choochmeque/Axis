use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a Git submodule
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Submodule {
    /// Submodule name
    pub name: String,
    /// Path within the parent repository
    pub path: String,
    /// Remote URL
    pub url: Option<String>,
    /// Current HEAD commit of the submodule
    pub head_oid: Option<String>,
    /// Short HEAD OID
    pub short_oid: Option<String>,
    /// Expected commit from parent repo's index
    pub indexed_oid: Option<String>,
    /// Branch being tracked (if any)
    pub branch: Option<String>,
    /// Status of the submodule
    pub status: SubmoduleStatus,
}

/// Status of a submodule
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default, Type)]
#[serde(rename_all = "PascalCase")]
pub enum SubmoduleStatus {
    /// Submodule is up to date
    Current,
    /// Submodule has new commits
    Modified,
    /// Submodule is not initialized
    Uninitialized,
    /// Submodule is missing from disk
    Missing,
    /// Submodule has merge conflicts
    Conflict,
    /// Submodule workdir is dirty
    Dirty,
    /// Unknown status
    #[default]
    Unknown,
}

/// Options for adding a submodule
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AddSubmoduleOptions {
    /// URL of the repository to add
    pub url: String,
    /// Path where to add the submodule
    pub path: String,
    /// Branch to track (default: default branch of remote)
    pub branch: Option<String>,
    /// Custom name for the submodule (default: derived from path)
    pub name: Option<String>,
    /// Clone depth (shallow clone)
    pub depth: Option<u32>,
}

/// Options for updating submodules
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSubmoduleOptions {
    /// Specific submodule paths to update (empty = all)
    pub paths: Vec<String>,
    /// Initialize uninitialized submodules
    pub init: bool,
    /// Update recursively
    pub recursive: bool,
    /// Force update (discard local changes)
    pub force: bool,
    /// Fetch new commits from remote
    pub remote: bool,
    /// Rebase instead of merge when updating
    pub rebase: bool,
    /// Merge instead of checkout
    pub merge: bool,
}

/// Options for syncing submodules
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncSubmoduleOptions {
    /// Specific submodule paths to sync (empty = all)
    pub paths: Vec<String>,
    /// Sync recursively
    pub recursive: bool,
}

/// Result of a submodule operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SubmoduleResult {
    pub success: bool,
    pub message: String,
    /// Affected submodules
    pub submodules: Vec<String>,
}
