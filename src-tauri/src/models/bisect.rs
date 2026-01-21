use serde::{Deserialize, Serialize};
use specta::Type;

/// Options for starting a bisect session
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct BisectStartOptions {
    /// The known bad commit (defaults to HEAD if not specified)
    pub bad_commit: Option<String>,
    /// The known good commit
    pub good_commit: String,
}

/// Result of a bisect operation step
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BisectResult {
    /// Whether the operation was successful
    pub success: bool,
    /// Current bisect state
    pub state: BisectState,
    /// Informational message
    pub message: String,
}

/// Current state of the bisect session
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct BisectState {
    /// Whether bisect is in progress
    pub is_active: bool,
    /// Current commit being tested (if any)
    pub current_commit: Option<String>,
    /// Number of remaining steps (approximate)
    pub steps_remaining: Option<usize>,
    /// Total commits in range
    pub total_commits: Option<usize>,
    /// The bad commit
    pub bad_commit: Option<String>,
    /// The good commit(s)
    pub good_commits: Vec<String>,
    /// Skipped commits
    pub skipped_commits: Vec<String>,
    /// The first bad commit (when bisect completes)
    pub first_bad_commit: Option<String>,
}

/// Mark type for bisect marking operations
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum BisectMarkType {
    /// Mark commit as good
    Good,
    /// Mark commit as bad
    Bad,
    /// Skip this commit (cannot be tested)
    Skip,
}
