use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Commit {
    pub oid: String,
    pub short_oid: String,
    pub message: String,
    pub summary: String,
    pub author: Signature,
    pub committer: Signature,
    pub parent_oids: Vec<String>,
    pub timestamp: DateTime<Utc>,
    pub is_merge: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Signature {
    pub name: String,
    pub email: String,
    pub timestamp: DateTime<Utc>,
}

impl Commit {
    pub fn from_git2_commit(commit: &git2::Commit) -> Self {
        let author = commit.author();
        let committer = commit.committer();

        Commit {
            oid: commit.id().to_string(),
            short_oid: commit.id().to_string()[..7].to_string(),
            message: commit.message().unwrap_or("").to_string(),
            summary: commit.summary().unwrap_or("").to_string(),
            author: Signature::from_git2_signature(&author),
            committer: Signature::from_git2_signature(&committer),
            parent_oids: commit.parent_ids().map(|id| id.to_string()).collect(),
            timestamp: DateTime::from_timestamp(commit.time().seconds(), 0)
                .unwrap_or_default()
                .with_timezone(&Utc),
            is_merge: commit.parent_count() > 1,
        }
    }
}

impl Signature {
    pub fn from_git2_signature(sig: &git2::Signature) -> Self {
        Signature {
            name: sig.name().unwrap_or("Unknown").to_string(),
            email: sig.email().unwrap_or("").to_string(),
            timestamp: DateTime::from_timestamp(sig.when().seconds(), 0)
                .unwrap_or_default()
                .with_timezone(&Utc),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BranchFilterType {
    #[default]
    All,
    Current,
    Specific(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SortOrder {
    #[default]
    DateOrder,
    AncestorOrder,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogOptions {
    pub limit: Option<usize>,
    pub skip: Option<usize>,
    pub from_ref: Option<String>,
    #[serde(default)]
    pub branch_filter: BranchFilterType,
    #[serde(default = "default_include_remotes")]
    pub include_remotes: bool,
    #[serde(default)]
    pub sort_order: SortOrder,
}

fn default_include_remotes() -> bool {
    true
}

impl Default for LogOptions {
    fn default() -> Self {
        LogOptions {
            limit: Some(100),
            skip: None,
            from_ref: None,
            branch_filter: BranchFilterType::All,
            include_remotes: true,
            sort_order: SortOrder::DateOrder,
        }
    }
}
