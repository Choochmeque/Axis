use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::{Commit, FileDiff};

// Allow field name because `branch_type` is part of the API contract with the frontend.
// Renaming to `kind` would require coordinated frontend changes.
#[allow(clippy::struct_field_names)]
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

#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct BranchFilter {
    pub include_local: bool,
    pub include_remote: bool,
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
    /// Aggregate file changes from `merge_base` to compare branch
    pub files: Vec<FileDiff>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== BranchType Tests ====================

    #[test]
    fn test_branch_type_equality() {
        assert_eq!(BranchType::Local, BranchType::Local);
        assert_eq!(BranchType::Remote, BranchType::Remote);
        assert_ne!(BranchType::Local, BranchType::Remote);
    }

    #[test]
    fn test_branch_type_serialization() {
        let local = BranchType::Local;
        let json = serde_json::to_string(&local).expect("should serialize");
        assert_eq!(json, "\"Local\"");

        let remote = BranchType::Remote;
        let json = serde_json::to_string(&remote).expect("should serialize");
        assert_eq!(json, "\"Remote\"");
    }

    #[test]
    fn test_branch_type_deserialization() {
        let local: BranchType = serde_json::from_str("\"Local\"").expect("should deserialize");
        assert_eq!(local, BranchType::Local);

        let remote: BranchType = serde_json::from_str("\"Remote\"").expect("should deserialize");
        assert_eq!(remote, BranchType::Remote);
    }

    // ==================== BranchFilter Tests ====================

    #[test]
    fn test_branch_filter_default() {
        let filter = BranchFilter::default();
        assert!(!filter.include_local);
        assert!(!filter.include_remote);
    }

    #[test]
    fn test_branch_filter_custom() {
        let filter = BranchFilter {
            include_local: true,
            include_remote: false,
        };
        assert!(filter.include_local);
        assert!(!filter.include_remote);
    }

    // ==================== Branch Tests ====================

    #[test]
    fn test_branch_local() {
        let branch = Branch {
            name: "main".to_string(),
            full_name: "refs/heads/main".to_string(),
            branch_type: BranchType::Local,
            is_head: true,
            upstream: Some("origin/main".to_string()),
            ahead: Some(2),
            behind: Some(1),
            target_oid: "abc123".to_string(),
            last_commit_summary: "Latest commit".to_string(),
            last_commit_time: Utc::now(),
        };

        assert_eq!(branch.name, "main");
        assert_eq!(branch.branch_type, BranchType::Local);
        assert!(branch.is_head);
        assert_eq!(branch.upstream, Some("origin/main".to_string()));
        assert_eq!(branch.ahead, Some(2));
        assert_eq!(branch.behind, Some(1));
    }

    #[test]
    fn test_branch_remote() {
        let branch = Branch {
            name: "origin/main".to_string(),
            full_name: "refs/remotes/origin/main".to_string(),
            branch_type: BranchType::Remote,
            is_head: false,
            upstream: None,
            ahead: None,
            behind: None,
            target_oid: "def456".to_string(),
            last_commit_summary: "Remote commit".to_string(),
            last_commit_time: Utc::now(),
        };

        assert_eq!(branch.name, "origin/main");
        assert_eq!(branch.branch_type, BranchType::Remote);
        assert!(!branch.is_head);
        assert!(branch.upstream.is_none());
    }

    #[test]
    fn test_branch_serialization() {
        let branch = Branch {
            name: "feature".to_string(),
            full_name: "refs/heads/feature".to_string(),
            branch_type: BranchType::Local,
            is_head: false,
            upstream: None,
            ahead: None,
            behind: None,
            target_oid: "abc123".to_string(),
            last_commit_summary: "Add feature".to_string(),
            last_commit_time: DateTime::from_timestamp(1_700_000_000, 0)
                .expect("valid timestamp")
                .with_timezone(&Utc),
        };

        let json = serde_json::to_string(&branch).expect("should serialize");
        assert!(json.contains("\"name\":\"feature\""));
        assert!(json.contains("\"fullName\":\"refs/heads/feature\""));
        assert!(json.contains("\"branchType\":\"Local\""));
        assert!(json.contains("\"isHead\":false"));
        assert!(json.contains("\"targetOid\":\"abc123\""));
    }

    #[test]
    fn test_branch_deserialization() {
        let json = r#"{
            "name": "develop",
            "fullName": "refs/heads/develop",
            "branchType": "Local",
            "isHead": true,
            "upstream": "origin/develop",
            "ahead": 5,
            "behind": 0,
            "targetOid": "xyz789",
            "lastCommitSummary": "Update docs",
            "lastCommitTime": "2023-11-14T12:00:00Z"
        }"#;

        let branch: Branch = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(branch.name, "develop");
        assert_eq!(branch.full_name, "refs/heads/develop");
        assert_eq!(branch.branch_type, BranchType::Local);
        assert!(branch.is_head);
        assert_eq!(branch.upstream, Some("origin/develop".to_string()));
        assert_eq!(branch.ahead, Some(5));
        assert_eq!(branch.behind, Some(0));
    }

    // ==================== BranchCompareResult Tests ====================

    #[test]
    fn test_branch_compare_result_creation() {
        let result = BranchCompareResult {
            base_ref: "main".to_string(),
            compare_ref: "feature".to_string(),
            base_oid: "abc123".to_string(),
            compare_oid: "def456".to_string(),
            merge_base_oid: Some("xyz789".to_string()),
            ahead_commits: vec![],
            behind_commits: vec![],
            files: vec![],
        };

        assert_eq!(result.base_ref, "main");
        assert_eq!(result.compare_ref, "feature");
        assert_eq!(result.merge_base_oid, Some("xyz789".to_string()));
    }

    #[test]
    fn test_branch_compare_result_no_merge_base() {
        let result = BranchCompareResult {
            base_ref: "main".to_string(),
            compare_ref: "orphan".to_string(),
            base_oid: "abc123".to_string(),
            compare_oid: "def456".to_string(),
            merge_base_oid: None,
            ahead_commits: vec![],
            behind_commits: vec![],
            files: vec![],
        };

        assert!(result.merge_base_oid.is_none());
    }

    #[test]
    fn test_branch_compare_result_serialization() {
        let result = BranchCompareResult {
            base_ref: "main".to_string(),
            compare_ref: "feature".to_string(),
            base_oid: "aaa".to_string(),
            compare_oid: "bbb".to_string(),
            merge_base_oid: Some("ccc".to_string()),
            ahead_commits: vec![],
            behind_commits: vec![],
            files: vec![],
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"baseRef\":\"main\""));
        assert!(json.contains("\"compareRef\":\"feature\""));
        assert!(json.contains("\"baseOid\":\"aaa\""));
        assert!(json.contains("\"compareOid\":\"bbb\""));
        assert!(json.contains("\"mergeBaseOid\":\"ccc\""));
    }
}
