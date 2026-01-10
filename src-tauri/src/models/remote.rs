use serde::{Deserialize, Serialize};

/// Represents a Git remote
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Remote {
    pub name: String,
    pub url: Option<String>,
    pub push_url: Option<String>,
    pub fetch_refspecs: Vec<String>,
    pub push_refspecs: Vec<String>,
}

/// Progress information for fetch operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FetchProgress {
    pub total_objects: usize,
    pub indexed_objects: usize,
    pub received_objects: usize,
    pub local_objects: usize,
    pub total_deltas: usize,
    pub indexed_deltas: usize,
    pub received_bytes: usize,
}

/// Progress information for push operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PushProgress {
    pub current: usize,
    pub total: usize,
    pub bytes: usize,
}

/// Result of a fetch operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchResult {
    pub remote: String,
    pub updated_refs: Vec<UpdatedRef>,
    pub stats: FetchProgress,
}

/// An updated reference from fetch/push
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatedRef {
    pub ref_name: String,
    pub old_oid: Option<String>,
    pub new_oid: Option<String>,
    pub status: RefUpdateStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RefUpdateStatus {
    FastForward,
    Forced,
    New,
    Deleted,
    Rejected,
    UpToDate,
}

/// Result of a push operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushResult {
    pub remote: String,
    pub pushed_refs: Vec<PushedRef>,
}

/// A pushed reference result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushedRef {
    pub ref_name: String,
    pub status: PushStatus,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PushStatus {
    Ok,
    Rejected,
    UpToDate,
    RemoteRejected,
}

/// Options for checkout operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CheckoutOptions {
    /// Create a new branch if it doesn't exist
    pub create: bool,
    /// Force checkout, discarding local changes
    pub force: bool,
    /// Track the remote branch when creating
    pub track: Option<String>,
}

/// Options for branch creation
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CreateBranchOptions {
    /// The starting point (commit/branch/tag). If None, uses HEAD.
    pub start_point: Option<String>,
    /// Force creation even if branch exists
    pub force: bool,
    /// Set up tracking for an upstream branch
    pub track: Option<String>,
}

/// Options for branch deletion
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DeleteBranchOptions {
    /// Force deletion even if not fully merged
    pub force: bool,
    /// Delete the remote tracking branch as well
    pub delete_remote: bool,
}

/// Options for fetch operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FetchOptions {
    /// Prune remote tracking branches that no longer exist
    pub prune: bool,
    /// Fetch tags
    pub tags: bool,
    /// Depth for shallow fetch (None for full fetch)
    pub depth: Option<u32>,
}

/// Options for push operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PushOptions {
    /// Force push
    pub force: bool,
    /// Set upstream tracking
    pub set_upstream: bool,
    /// Push tags
    pub tags: bool,
}

/// Options for pull operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PullOptions {
    /// Rebase instead of merge
    pub rebase: bool,
    /// Fast-forward only
    pub ff_only: bool,
}
