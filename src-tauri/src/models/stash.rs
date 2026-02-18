use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a stash entry
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StashEntry {
    /// Index of the stash (0 = most recent)
    pub index: usize,
    /// Full stash reference (e.g., "stash@{0}")
    pub stash_ref: String,
    /// Stash message
    pub message: String,
    /// Commit OID of the stash commit
    pub commit_oid: String,
    /// Short commit OID
    pub short_oid: String,
    /// Branch the stash was created on
    pub branch: Option<String>,
    /// Author of the stash
    pub author: String,
    /// Timestamp when the stash was created
    pub timestamp: DateTime<Utc>,
}

/// Options for creating a stash
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct StashSaveOptions {
    /// Message for the stash
    pub message: Option<String>,
    /// Include untracked files
    pub include_untracked: bool,
    /// Keep the staged changes in the index
    pub keep_index: bool,
    /// Include ignored files
    pub include_ignored: bool,
}

/// Options for applying/popping a stash
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct StashApplyOptions {
    /// Stash index to apply (default: 0)
    pub index: Option<usize>,
    /// Reinstate the staged changes
    pub reinstate_index: bool,
}

/// Result of a stash operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct StashResult {
    /// Message describing the result of the operation
    pub message: String,
    /// Number of files stashed/restored
    pub files_affected: usize,
    /// Conflicts if any when applying
    pub conflicts: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== StashEntry Tests ====================

    #[test]
    fn test_stash_entry_creation() {
        let entry = StashEntry {
            index: 0,
            stash_ref: "stash@{0}".to_string(),
            message: "WIP on main: abc123 Some work".to_string(),
            commit_oid: "abc123def456".to_string(),
            short_oid: "abc123d".to_string(),
            branch: Some("main".to_string()),
            author: "John Doe".to_string(),
            timestamp: Utc::now(),
        };

        assert_eq!(entry.index, 0);
        assert_eq!(entry.stash_ref, "stash@{0}");
        assert_eq!(entry.branch, Some("main".to_string()));
        assert_eq!(entry.author, "John Doe");
    }

    #[test]
    fn test_stash_entry_without_branch() {
        let entry = StashEntry {
            index: 1,
            stash_ref: "stash@{1}".to_string(),
            message: "WIP".to_string(),
            commit_oid: "xyz789".to_string(),
            short_oid: "xyz789a".to_string(),
            branch: None,
            author: "Jane Doe".to_string(),
            timestamp: Utc::now(),
        };

        assert_eq!(entry.index, 1);
        assert!(entry.branch.is_none());
    }

    #[test]
    fn test_stash_entry_serialization() {
        let entry = StashEntry {
            index: 0,
            stash_ref: "stash@{0}".to_string(),
            message: "Test stash".to_string(),
            commit_oid: "aaa".to_string(),
            short_oid: "aaa".to_string(),
            branch: Some("feature".to_string()),
            author: "Test".to_string(),
            timestamp: DateTime::from_timestamp(1_700_000_000, 0)
                .expect("valid timestamp")
                .with_timezone(&Utc),
        };

        let json = serde_json::to_string(&entry).expect("should serialize");
        assert!(json.contains("\"index\":0"));
        assert!(json.contains("\"stashRef\":\"stash@{0}\""));
        assert!(json.contains("\"message\":\"Test stash\""));
        assert!(json.contains("\"branch\":\"feature\""));
    }

    // ==================== StashSaveOptions Tests ====================

    #[test]
    fn test_stash_save_options_default() {
        let opts = StashSaveOptions::default();
        assert!(opts.message.is_none());
        assert!(!opts.include_untracked);
        assert!(!opts.keep_index);
        assert!(!opts.include_ignored);
    }

    #[test]
    fn test_stash_save_options_custom() {
        let opts = StashSaveOptions {
            message: Some("My stash message".to_string()),
            include_untracked: true,
            keep_index: true,
            include_ignored: false,
        };

        assert_eq!(opts.message, Some("My stash message".to_string()));
        assert!(opts.include_untracked);
        assert!(opts.keep_index);
        assert!(!opts.include_ignored);
    }

    #[test]
    fn test_stash_save_options_serialization_roundtrip() {
        let opts = StashSaveOptions {
            message: Some("Work in progress".to_string()),
            include_untracked: true,
            keep_index: false,
            include_ignored: true,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        let deserialized: StashSaveOptions =
            serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(deserialized.message, opts.message);
        assert_eq!(deserialized.include_untracked, opts.include_untracked);
        assert_eq!(deserialized.keep_index, opts.keep_index);
        assert_eq!(deserialized.include_ignored, opts.include_ignored);
    }

    // ==================== StashApplyOptions Tests ====================

    #[test]
    fn test_stash_apply_options_default() {
        let opts = StashApplyOptions::default();
        assert!(opts.index.is_none());
        assert!(!opts.reinstate_index);
    }

    #[test]
    fn test_stash_apply_options_custom() {
        let opts = StashApplyOptions {
            index: Some(2),
            reinstate_index: true,
        };

        assert_eq!(opts.index, Some(2));
        assert!(opts.reinstate_index);
    }

    #[test]
    fn test_stash_apply_options_serialization() {
        let opts = StashApplyOptions {
            index: Some(1),
            reinstate_index: true,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"index\":1"));
        assert!(json.contains("\"reinstateIndex\":true"));
    }

    // ==================== StashResult Tests ====================

    #[test]
    fn test_stash_result_success() {
        let result = StashResult {
            message: "Stash created successfully".to_string(),
            files_affected: 5,
            conflicts: vec![],
        };

        assert_eq!(result.message, "Stash created successfully");
        assert_eq!(result.files_affected, 5);
        assert!(result.conflicts.is_empty());
    }

    #[test]
    fn test_stash_result_with_conflicts() {
        let result = StashResult {
            message: "Stash applied with conflicts".to_string(),
            files_affected: 3,
            conflicts: vec!["file1.rs".to_string(), "file2.rs".to_string()],
        };

        assert_eq!(result.files_affected, 3);
        assert_eq!(result.conflicts.len(), 2);
        assert!(result.conflicts.contains(&"file1.rs".to_string()));
    }

    #[test]
    fn test_stash_result_serialization() {
        let result = StashResult {
            message: "Applied".to_string(),
            files_affected: 2,
            conflicts: vec!["conflict.rs".to_string()],
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"message\":\"Applied\""));
        assert!(json.contains("\"filesAffected\":2"));
        assert!(json.contains("\"conflicts\":[\"conflict.rs\"]"));
    }
}
