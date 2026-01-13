use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a stash entry
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StashEntry {
    /// Index of the stash (0 = most recent)
    pub index: usize,
    /// Full stash reference (e.g., "stash@{0}")
    pub stash_ref: String,
    /// Stash message
    pub message: String,
    /// Commit OID of the stash commit
    pub commit_oid: String,
    /// Short commit OID
    pub short_oid: String,
    /// Branch the stash was created on
    pub branch: Option<String>,
    /// Author of the stash
    pub author: String,
    /// Timestamp when the stash was created
    pub timestamp: DateTime<Utc>,
}

/// Options for creating a stash
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct StashSaveOptions {
    /// Message for the stash
    pub message: Option<String>,
    /// Include untracked files
    pub include_untracked: bool,
    /// Keep the staged changes in the index
    pub keep_index: bool,
    /// Include ignored files
    pub include_ignored: bool,
}

/// Options for applying/popping a stash
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct StashApplyOptions {
    /// Stash index to apply (default: 0)
    pub index: Option<usize>,
    /// Reinstate the staged changes
    pub reinstate_index: bool,
}

/// Result of a stash operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StashResult {
    pub success: bool,
    pub message: String,
    /// Number of files stashed/restored
    pub files_affected: usize,
    /// Conflicts if any when applying
    pub conflicts: Vec<String>,
}
