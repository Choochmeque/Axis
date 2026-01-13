use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

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
