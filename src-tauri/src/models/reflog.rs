use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a single reflog entry
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReflogEntry {
    /// Index of the entry (0 = most recent)
    pub index: usize,
    /// Reference notation (e.g., "HEAD@{0}", "refs/heads/main@{1}")
    pub reflog_ref: String,
    /// The commit OID after this action
    pub new_oid: String,
    /// Short form of new_oid
    pub short_new_oid: String,
    /// The commit OID before this action (can be all zeros for initial commit)
    pub old_oid: String,
    /// Short form of old_oid
    pub short_old_oid: String,
    /// Action type parsed from message
    pub action: ReflogAction,
    /// Full reflog message
    pub message: String,
    /// Author/committer name
    pub committer_name: String,
    /// Author/committer email
    pub committer_email: String,
    /// Timestamp of the action
    pub timestamp: DateTime<Utc>,
}

/// Parsed reflog action type for categorization and UI display
#[derive(Debug, Clone, Serialize, Deserialize, Type, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub enum ReflogAction {
    Commit,
    CommitAmend,
    CommitInitial,
    Checkout,
    Merge,
    Rebase,
    Reset,
    CherryPick,
    Revert,
    Pull,
    Clone,
    Branch,
    Stash,
    Other(String),
}

/// Options for fetching reflog entries
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReflogOptions {
    /// Reference to get reflog for (default: "HEAD")
    pub refname: Option<String>,
    /// Maximum number of entries to return
    pub limit: Option<usize>,
    /// Number of entries to skip (for pagination)
    pub skip: Option<usize>,
}
