use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::{Commit, FileDiff};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Branch {
    pub name: String,
    pub full_name: String,
    pub branch_type: BranchType,
    pub is_head: bool,
    pub upstream: Option<String>,
    pub ahead: Option<usize>,
    pub behind: Option<usize>,
    pub target_oid: String,
    pub last_commit_summary: String,
    pub last_commit_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum BranchType {
    Local,
    Remote,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct BranchFilter {
    pub include_local: bool,
    pub include_remote: bool,
}

impl BranchFilter {
    pub fn all() -> Self {
        BranchFilter {
            include_local: true,
            include_remote: true,
        }
    }

    pub fn local_only() -> Self {
        BranchFilter {
            include_local: true,
            include_remote: false,
        }
    }

    pub fn remote_only() -> Self {
        BranchFilter {
            include_local: false,
            include_remote: true,
        }
    }
}

/// Result of comparing two branches
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BranchCompareResult {
    /// The base reference (e.g., current branch name)
    pub base_ref: String,
    /// The compare reference (e.g., feature branch name)
    pub compare_ref: String,
    /// OID of the base branch tip
    pub base_oid: String,
    /// OID of the compare branch tip
    pub compare_oid: String,
    /// OID of the merge base (common ancestor), if found
    pub merge_base_oid: Option<String>,
    /// Commits in compare branch but not in base (ahead)
    pub ahead_commits: Vec<Commit>,
    /// Commits in base branch but not in compare (behind)
    pub behind_commits: Vec<Commit>,
    /// Aggregate file changes from merge_base to compare branch
    pub files: Vec<FileDiff>,
}
