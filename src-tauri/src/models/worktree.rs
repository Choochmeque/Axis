use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a Git worktree
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Worktree {
    /// Absolute path to the worktree directory
    pub path: String,
    /// Branch name (None if detached HEAD)
    pub branch: Option<String>,
    /// Current HEAD commit OID
    pub head_oid: String,
    /// Short HEAD OID (7 characters)
    pub short_oid: String,
    /// Whether this worktree is locked
    pub is_locked: bool,
    /// Lock reason (if locked)
    pub lock_reason: Option<String>,
    /// Whether this is the main worktree
    pub is_main: bool,
    /// Whether the worktree is prunable (directory missing)
    pub is_prunable: bool,
}

/// Options for adding a worktree
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct AddWorktreeOptions {
    /// Path where to create the worktree
    pub path: String,
    /// Branch to checkout (creates new branch if create_branch is true)
    pub branch: Option<String>,
    /// Create a new branch with this name
    pub create_branch: bool,
    /// Commit/branch to base new branch on (if create_branch is true)
    pub base: Option<String>,
    /// Force creation even if branch is checked out elsewhere
    pub force: bool,
    /// Create worktree in detached HEAD state
    pub detach: bool,
}

/// Options for removing a worktree
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct RemoveWorktreeOptions {
    /// Path of the worktree to remove
    pub path: String,
    /// Force removal even with uncommitted changes
    pub force: bool,
}

/// Result of a worktree operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// Message describing the result
    pub message: String,
    /// Path of the affected worktree
    pub path: Option<String>,
}
