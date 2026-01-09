use serde::{Deserialize, Serialize};

/// Represents a complete diff for a file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileDiff {
    pub old_path: Option<String>,
    pub new_path: Option<String>,
    pub old_oid: Option<String>,
    pub new_oid: Option<String>,
    pub status: DiffStatus,
    pub binary: bool,
    pub hunks: Vec<DiffHunk>,
    /// Summary statistics
    pub additions: usize,
    pub deletions: usize,
}

/// The type of change for a file in a diff
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DiffStatus {
    Added,
    Deleted,
    Modified,
    Renamed,
    Copied,
    TypeChanged,
    Untracked,
    Conflicted,
}

/// A hunk within a diff (a contiguous block of changes)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffHunk {
    pub header: String,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

/// A single line within a diff hunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiffLine {
    pub line_type: DiffLineType,
    pub content: String,
    pub old_line_no: Option<u32>,
    pub new_line_no: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DiffLineType {
    Context,
    Addition,
    Deletion,
    Header,
    Binary,
}

/// Options for generating diffs
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DiffOptions {
    /// Number of context lines around changes
    pub context_lines: Option<u32>,
    /// Ignore whitespace changes
    pub ignore_whitespace: Option<bool>,
    /// Ignore whitespace at end of line
    pub ignore_whitespace_eol: Option<bool>,
}

/// Types of diffs we can generate
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DiffTarget {
    /// Diff between working directory and index (unstaged changes)
    WorkdirToIndex,
    /// Diff between index and HEAD (staged changes)
    IndexToHead,
    /// Diff between working directory and HEAD (all uncommitted changes)
    WorkdirToHead,
    /// Diff between two commits
    CommitToCommit { from: String, to: String },
    /// Diff for a single commit (commit vs its parent)
    Commit { oid: String },
}

/// Request for staging/unstaging hunks or lines
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatchRequest {
    pub file_path: String,
    pub hunks: Option<Vec<usize>>,  // Indices of hunks to stage/unstage
    pub lines: Option<Vec<LineRange>>,  // Specific line ranges
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineRange {
    pub hunk_index: usize,
    pub start_line: usize,
    pub end_line: usize,
}
