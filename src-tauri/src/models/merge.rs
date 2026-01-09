use serde::{Deserialize, Serialize};

/// Options for merge operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct MergeOptions {
    /// The branch to merge into the current branch
    pub branch: String,
    /// Custom commit message (optional)
    pub message: Option<String>,
    /// If true, always create a merge commit (no fast-forward)
    pub no_ff: bool,
    /// If true, squash all commits into a single commit
    pub squash: bool,
    /// If true, only fast-forward (fail if not possible)
    pub ff_only: bool,
}

/// Result of a merge operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MergeResult {
    /// Whether the merge was successful
    pub success: bool,
    /// Type of merge that occurred
    pub merge_type: MergeType,
    /// New commit OID if a merge commit was created
    pub commit_oid: Option<String>,
    /// List of conflicted files if merge has conflicts
    pub conflicts: Vec<ConflictedFile>,
    /// Informational message
    pub message: String,
}

/// Type of merge that occurred
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum MergeType {
    /// Already up to date
    UpToDate,
    /// Fast-forward merge
    FastForward,
    /// Normal merge (with merge commit)
    Normal,
    /// Merge resulted in conflicts
    Conflicted,
}

/// Options for rebase operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RebaseOptions {
    /// The branch/commit to rebase onto
    pub onto: String,
    /// If true, use interactive rebase (requires editor)
    pub interactive: bool,
    /// If true, preserve merge commits
    pub preserve_merges: bool,
    /// Autosquash fixup commits
    pub autosquash: bool,
}

/// Result of a rebase operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RebaseResult {
    /// Whether the rebase was successful
    pub success: bool,
    /// Number of commits rebased
    pub commits_rebased: usize,
    /// Current commit being rebased (if in progress)
    pub current_commit: Option<String>,
    /// Total commits to rebase
    pub total_commits: Option<usize>,
    /// Conflicted files if rebase has conflicts
    pub conflicts: Vec<ConflictedFile>,
    /// Informational message
    pub message: String,
}

/// Options for cherry-pick operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CherryPickOptions {
    /// Commit(s) to cherry-pick
    pub commits: Vec<String>,
    /// If true, don't create commits (stage changes only)
    pub no_commit: bool,
    /// If true, allow empty commits
    pub allow_empty: bool,
}

impl Default for CherryPickOptions {
    fn default() -> Self {
        Self {
            commits: Vec::new(),
            no_commit: false,
            allow_empty: false,
        }
    }
}

/// Result of a cherry-pick operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CherryPickResult {
    /// Whether the cherry-pick was successful
    pub success: bool,
    /// New commit OIDs created
    pub commit_oids: Vec<String>,
    /// Conflicted files if cherry-pick has conflicts
    pub conflicts: Vec<ConflictedFile>,
    /// Informational message
    pub message: String,
}

/// Options for revert operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevertOptions {
    /// Commit(s) to revert
    pub commits: Vec<String>,
    /// If true, don't create commits (stage changes only)
    pub no_commit: bool,
}

impl Default for RevertOptions {
    fn default() -> Self {
        Self {
            commits: Vec::new(),
            no_commit: false,
        }
    }
}

/// Result of a revert operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RevertResult {
    /// Whether the revert was successful
    pub success: bool,
    /// New commit OIDs created
    pub commit_oids: Vec<String>,
    /// Conflicted files if revert has conflicts
    pub conflicts: Vec<ConflictedFile>,
    /// Informational message
    pub message: String,
}

/// Information about a conflicted file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictedFile {
    /// Path to the conflicted file
    pub path: String,
    /// Type of conflict
    pub conflict_type: ConflictType,
    /// Whether the file has been resolved
    pub is_resolved: bool,
}

/// Type of conflict
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum ConflictType {
    /// Content conflict (both sides modified)
    Content,
    /// File deleted on one side, modified on other
    DeleteModify,
    /// File added on both sides with different content
    AddAdd,
    /// File renamed differently on both sides
    RenameRename,
    /// File renamed and modified
    RenameModify,
    /// Binary file conflict
    Binary,
}

/// Three-way content for conflict resolution
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictContent {
    /// Path to the file
    pub path: String,
    /// Base (ancestor) content
    pub base: Option<String>,
    /// Ours (current branch) content
    pub ours: Option<String>,
    /// Theirs (incoming) content
    pub theirs: Option<String>,
    /// Current working tree content with conflict markers
    pub merged: String,
}

/// Which version to use when resolving a conflict
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ConflictResolution {
    /// Use our version
    Ours,
    /// Use their version
    Theirs,
    /// Use custom merged content
    Merged,
}

/// Operation currently in progress
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum OperationState {
    /// No operation in progress
    None,
    /// Merge in progress
    Merging {
        /// Branch being merged
        branch: Option<String>,
    },
    /// Rebase in progress
    Rebasing {
        /// Branch being rebased onto
        onto: Option<String>,
        /// Current step
        current: Option<usize>,
        /// Total steps
        total: Option<usize>,
    },
    /// Cherry-pick in progress
    CherryPicking {
        /// Commit being cherry-picked
        commit: Option<String>,
    },
    /// Revert in progress
    Reverting {
        /// Commit being reverted
        commit: Option<String>,
    },
}

impl Default for OperationState {
    fn default() -> Self {
        Self::None
    }
}

/// Reset mode for reset operations
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ResetMode {
    /// Keep changes staged
    Soft,
    /// Keep changes unstaged
    Mixed,
    /// Discard all changes
    Hard,
}

impl Default for ResetMode {
    fn default() -> Self {
        Self::Mixed
    }
}

/// Options for reset operations
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ResetOptions {
    /// Target commit/ref to reset to
    pub target: String,
    /// Reset mode (soft, mixed, hard)
    pub mode: ResetMode,
}
