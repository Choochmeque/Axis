use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a complete diff for a file
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
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
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiffHunk {
    pub header: String,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

/// A single line within a diff hunk
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiffLine {
    pub line_type: DiffLineType,
    pub content: String,
    pub old_line_no: Option<u32>,
    pub new_line_no: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum DiffLineType {
    Context,
    Addition,
    Deletion,
    Header,
    Binary,
}

/// Options for generating diffs
#[derive(Debug, Clone, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiffOptions {
    /// Number of context lines around changes
    pub context_lines: Option<u32>,
    /// Ignore whitespace changes
    pub ignore_whitespace: Option<bool>,
    /// Ignore whitespace at end of line
    pub ignore_whitespace_eol: Option<bool>,
}

/// Types of diffs we can generate
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "PascalCase")]
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

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== DiffStatus Tests ====================

    #[test]
    fn test_diff_status_equality() {
        assert_eq!(DiffStatus::Added, DiffStatus::Added);
        assert_eq!(DiffStatus::Deleted, DiffStatus::Deleted);
        assert_eq!(DiffStatus::Modified, DiffStatus::Modified);
        assert_eq!(DiffStatus::Renamed, DiffStatus::Renamed);
        assert_eq!(DiffStatus::Copied, DiffStatus::Copied);
        assert_eq!(DiffStatus::TypeChanged, DiffStatus::TypeChanged);
        assert_eq!(DiffStatus::Untracked, DiffStatus::Untracked);
        assert_eq!(DiffStatus::Conflicted, DiffStatus::Conflicted);
        assert_ne!(DiffStatus::Added, DiffStatus::Deleted);
    }

    #[test]
    fn test_diff_status_serialization() {
        let added = DiffStatus::Added;
        let json = serde_json::to_string(&added).expect("should serialize");
        assert_eq!(json, "\"Added\"");

        let deleted = DiffStatus::Deleted;
        let json = serde_json::to_string(&deleted).expect("should serialize");
        assert_eq!(json, "\"Deleted\"");

        let modified = DiffStatus::Modified;
        let json = serde_json::to_string(&modified).expect("should serialize");
        assert_eq!(json, "\"Modified\"");

        let renamed = DiffStatus::Renamed;
        let json = serde_json::to_string(&renamed).expect("should serialize");
        assert_eq!(json, "\"Renamed\"");
    }

    #[test]
    fn test_diff_status_deserialization() {
        let added: DiffStatus = serde_json::from_str("\"Added\"").expect("should deserialize");
        assert_eq!(added, DiffStatus::Added);

        let conflicted: DiffStatus =
            serde_json::from_str("\"Conflicted\"").expect("should deserialize");
        assert_eq!(conflicted, DiffStatus::Conflicted);
    }

    // ==================== DiffLineType Tests ====================

    #[test]
    fn test_diff_line_type_equality() {
        assert_eq!(DiffLineType::Context, DiffLineType::Context);
        assert_eq!(DiffLineType::Addition, DiffLineType::Addition);
        assert_eq!(DiffLineType::Deletion, DiffLineType::Deletion);
        assert_eq!(DiffLineType::Header, DiffLineType::Header);
        assert_eq!(DiffLineType::Binary, DiffLineType::Binary);
        assert_ne!(DiffLineType::Addition, DiffLineType::Deletion);
    }

    #[test]
    fn test_diff_line_type_serialization() {
        let context = DiffLineType::Context;
        let json = serde_json::to_string(&context).expect("should serialize");
        assert_eq!(json, "\"Context\"");

        let addition = DiffLineType::Addition;
        let json = serde_json::to_string(&addition).expect("should serialize");
        assert_eq!(json, "\"Addition\"");

        let deletion = DiffLineType::Deletion;
        let json = serde_json::to_string(&deletion).expect("should serialize");
        assert_eq!(json, "\"Deletion\"");
    }

    // ==================== DiffOptions Tests ====================

    #[test]
    fn test_diff_options_default() {
        let opts = DiffOptions::default();
        assert_eq!(opts.context_lines, None);
        assert_eq!(opts.ignore_whitespace, None);
        assert_eq!(opts.ignore_whitespace_eol, None);
    }

    #[test]
    fn test_diff_options_custom() {
        let opts = DiffOptions {
            context_lines: Some(5),
            ignore_whitespace: Some(true),
            ignore_whitespace_eol: Some(false),
        };

        assert_eq!(opts.context_lines, Some(5));
        assert_eq!(opts.ignore_whitespace, Some(true));
        assert_eq!(opts.ignore_whitespace_eol, Some(false));
    }

    #[test]
    fn test_diff_options_serialization_roundtrip() {
        let opts = DiffOptions {
            context_lines: Some(10),
            ignore_whitespace: Some(true),
            ignore_whitespace_eol: Some(true),
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        let deserialized: DiffOptions = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(deserialized.context_lines, Some(10));
        assert_eq!(deserialized.ignore_whitespace, Some(true));
        assert_eq!(deserialized.ignore_whitespace_eol, Some(true));
    }

    // ==================== DiffTarget Tests ====================

    #[test]
    fn test_diff_target_workdir_to_index() {
        let target = DiffTarget::WorkdirToIndex;
        let json = serde_json::to_string(&target).expect("should serialize");
        assert_eq!(json, "\"WorkdirToIndex\"");
    }

    #[test]
    fn test_diff_target_index_to_head() {
        let target = DiffTarget::IndexToHead;
        let json = serde_json::to_string(&target).expect("should serialize");
        assert_eq!(json, "\"IndexToHead\"");
    }

    #[test]
    fn test_diff_target_workdir_to_head() {
        let target = DiffTarget::WorkdirToHead;
        let json = serde_json::to_string(&target).expect("should serialize");
        assert_eq!(json, "\"WorkdirToHead\"");
    }

    #[test]
    fn test_diff_target_commit_to_commit() {
        let target = DiffTarget::CommitToCommit {
            from: "abc123".to_string(),
            to: "def456".to_string(),
        };
        let json = serde_json::to_string(&target).expect("should serialize");
        assert!(json.contains("CommitToCommit"));
        assert!(json.contains("abc123"));
        assert!(json.contains("def456"));
    }

    #[test]
    fn test_diff_target_commit() {
        let target = DiffTarget::Commit {
            oid: "xyz789".to_string(),
        };
        let json = serde_json::to_string(&target).expect("should serialize");
        assert!(json.contains("Commit"));
        assert!(json.contains("xyz789"));
    }

    // ==================== DiffLine Tests ====================

    #[test]
    fn test_diff_line_context() {
        let line = DiffLine {
            line_type: DiffLineType::Context,
            content: "    let x = 5;".to_string(),
            old_line_no: Some(10),
            new_line_no: Some(10),
        };

        assert_eq!(line.line_type, DiffLineType::Context);
        assert_eq!(line.old_line_no, Some(10));
        assert_eq!(line.new_line_no, Some(10));
    }

    #[test]
    fn test_diff_line_addition() {
        let line = DiffLine {
            line_type: DiffLineType::Addition,
            content: "+    let y = 10;".to_string(),
            old_line_no: None,
            new_line_no: Some(11),
        };

        assert_eq!(line.line_type, DiffLineType::Addition);
        assert!(line.old_line_no.is_none());
        assert_eq!(line.new_line_no, Some(11));
    }

    #[test]
    fn test_diff_line_deletion() {
        let line = DiffLine {
            line_type: DiffLineType::Deletion,
            content: "-    let z = 15;".to_string(),
            old_line_no: Some(12),
            new_line_no: None,
        };

        assert_eq!(line.line_type, DiffLineType::Deletion);
        assert_eq!(line.old_line_no, Some(12));
        assert!(line.new_line_no.is_none());
    }

    #[test]
    fn test_diff_line_serialization() {
        let line = DiffLine {
            line_type: DiffLineType::Addition,
            content: "new content".to_string(),
            old_line_no: None,
            new_line_no: Some(5),
        };

        let json = serde_json::to_string(&line).expect("should serialize");
        assert!(json.contains("\"lineType\":\"Addition\""));
        assert!(json.contains("\"content\":\"new content\""));
        assert!(json.contains("\"newLineNo\":5"));
    }

    // ==================== DiffHunk Tests ====================

    #[test]
    fn test_diff_hunk_creation() {
        let hunk = DiffHunk {
            header: "@@ -10,5 +10,7 @@".to_string(),
            old_start: 10,
            old_lines: 5,
            new_start: 10,
            new_lines: 7,
            lines: vec![
                DiffLine {
                    line_type: DiffLineType::Context,
                    content: " context".to_string(),
                    old_line_no: Some(10),
                    new_line_no: Some(10),
                },
                DiffLine {
                    line_type: DiffLineType::Addition,
                    content: "+added".to_string(),
                    old_line_no: None,
                    new_line_no: Some(11),
                },
            ],
        };

        assert_eq!(hunk.old_start, 10);
        assert_eq!(hunk.old_lines, 5);
        assert_eq!(hunk.new_start, 10);
        assert_eq!(hunk.new_lines, 7);
        assert_eq!(hunk.lines.len(), 2);
    }

    #[test]
    fn test_diff_hunk_serialization() {
        let hunk = DiffHunk {
            header: "@@ -1,3 +1,4 @@".to_string(),
            old_start: 1,
            old_lines: 3,
            new_start: 1,
            new_lines: 4,
            lines: vec![],
        };

        let json = serde_json::to_string(&hunk).expect("should serialize");
        assert!(json.contains("\"oldStart\":1"));
        assert!(json.contains("\"oldLines\":3"));
        assert!(json.contains("\"newStart\":1"));
        assert!(json.contains("\"newLines\":4"));
    }

    // ==================== FileDiff Tests ====================

    #[test]
    fn test_file_diff_added() {
        let diff = FileDiff {
            old_path: None,
            new_path: Some("new_file.rs".to_string()),
            old_oid: None,
            new_oid: Some("abc123".to_string()),
            status: DiffStatus::Added,
            binary: false,
            hunks: vec![],
            additions: 10,
            deletions: 0,
        };

        assert!(diff.old_path.is_none());
        assert_eq!(diff.new_path, Some("new_file.rs".to_string()));
        assert_eq!(diff.status, DiffStatus::Added);
        assert!(!diff.binary);
        assert_eq!(diff.additions, 10);
        assert_eq!(diff.deletions, 0);
    }

    #[test]
    fn test_file_diff_modified() {
        let diff = FileDiff {
            old_path: Some("file.rs".to_string()),
            new_path: Some("file.rs".to_string()),
            old_oid: Some("aaa".to_string()),
            new_oid: Some("bbb".to_string()),
            status: DiffStatus::Modified,
            binary: false,
            hunks: vec![],
            additions: 5,
            deletions: 3,
        };

        assert_eq!(diff.old_path, diff.new_path);
        assert_eq!(diff.status, DiffStatus::Modified);
        assert_eq!(diff.additions, 5);
        assert_eq!(diff.deletions, 3);
    }

    #[test]
    fn test_file_diff_renamed() {
        let diff = FileDiff {
            old_path: Some("old_name.rs".to_string()),
            new_path: Some("new_name.rs".to_string()),
            old_oid: Some("same".to_string()),
            new_oid: Some("same".to_string()),
            status: DiffStatus::Renamed,
            binary: false,
            hunks: vec![],
            additions: 0,
            deletions: 0,
        };

        assert_ne!(diff.old_path, diff.new_path);
        assert_eq!(diff.status, DiffStatus::Renamed);
    }

    #[test]
    fn test_file_diff_binary() {
        let diff = FileDiff {
            old_path: Some("image.png".to_string()),
            new_path: Some("image.png".to_string()),
            old_oid: Some("old".to_string()),
            new_oid: Some("new".to_string()),
            status: DiffStatus::Modified,
            binary: true,
            hunks: vec![],
            additions: 0,
            deletions: 0,
        };

        assert!(diff.binary);
        assert!(diff.hunks.is_empty());
    }

    #[test]
    fn test_file_diff_serialization() {
        let diff = FileDiff {
            old_path: Some("test.rs".to_string()),
            new_path: Some("test.rs".to_string()),
            old_oid: Some("aaa".to_string()),
            new_oid: Some("bbb".to_string()),
            status: DiffStatus::Modified,
            binary: false,
            hunks: vec![],
            additions: 10,
            deletions: 5,
        };

        let json = serde_json::to_string(&diff).expect("should serialize");
        assert!(json.contains("\"oldPath\":\"test.rs\""));
        assert!(json.contains("\"newPath\":\"test.rs\""));
        assert!(json.contains("\"status\":\"Modified\""));
        assert!(json.contains("\"binary\":false"));
        assert!(json.contains("\"additions\":10"));
        assert!(json.contains("\"deletions\":5"));
    }
}
