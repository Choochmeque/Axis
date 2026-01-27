use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a single reflog entry
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReflogEntry {
    /// Index of the entry (0 = most recent)
    pub index: usize,
    /// Reference notation (e.g., "HEAD@{0}", "refs/heads/main@{1}")
    pub reflog_ref: String,
    /// The commit OID after this action
    pub new_oid: String,
    /// Short form of new_oid
    pub short_new_oid: String,
    /// The commit OID before this action (can be all zeros for initial commit)
    pub old_oid: String,
    /// Short form of old_oid
    pub short_old_oid: String,
    /// Action type parsed from message
    pub action: ReflogAction,
    /// Full reflog message
    pub message: String,
    /// Author/committer name
    pub committer_name: String,
    /// Author/committer email
    pub committer_email: String,
    /// Timestamp of the action
    pub timestamp: DateTime<Utc>,
}

/// Parsed reflog action type for categorization and UI display
#[derive(Debug, Clone, Serialize, Deserialize, Type, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub enum ReflogAction {
    Commit,
    CommitAmend,
    CommitInitial,
    Checkout,
    Merge,
    Rebase,
    Reset,
    CherryPick,
    Revert,
    Pull,
    Clone,
    Branch,
    Stash,
    Other(String),
}

/// Options for fetching reflog entries
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ReflogOptions {
    /// Reference to get reflog for (default: "HEAD")
    pub refname: Option<String>,
    /// Maximum number of entries to return
    pub limit: Option<usize>,
    /// Number of entries to skip (for pagination)
    pub skip: Option<usize>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== ReflogEntry Tests ====================

    #[test]
    fn test_reflog_entry_creation() {
        let entry = ReflogEntry {
            index: 0,
            reflog_ref: "HEAD@{0}".to_string(),
            new_oid: "abc123def456".to_string(),
            short_new_oid: "abc123d".to_string(),
            old_oid: "000000000000".to_string(),
            short_old_oid: "0000000".to_string(),
            action: ReflogAction::Commit,
            message: "commit: Initial commit".to_string(),
            committer_name: "John Doe".to_string(),
            committer_email: "john@example.com".to_string(),
            timestamp: Utc::now(),
        };

        assert_eq!(entry.index, 0);
        assert_eq!(entry.reflog_ref, "HEAD@{0}");
        assert_eq!(entry.action, ReflogAction::Commit);
    }

    #[test]
    fn test_reflog_entry_serialization() {
        let entry = ReflogEntry {
            index: 5,
            reflog_ref: "HEAD@{5}".to_string(),
            new_oid: "abc".to_string(),
            short_new_oid: "abc".to_string(),
            old_oid: "def".to_string(),
            short_old_oid: "def".to_string(),
            action: ReflogAction::Checkout,
            message: "checkout: moving to main".to_string(),
            committer_name: "Jane".to_string(),
            committer_email: "jane@example.com".to_string(),
            timestamp: DateTime::from_timestamp(1700000000, 0)
                .expect("valid timestamp")
                .with_timezone(&Utc),
        };

        let json = serde_json::to_string(&entry).expect("should serialize");
        assert!(json.contains("\"index\":5"));
        assert!(json.contains("\"reflogRef\":\"HEAD@{5}\""));
        assert!(json.contains("\"action\":\"Checkout\""));
    }

    // ==================== ReflogAction Tests ====================

    #[test]
    fn test_reflog_action_equality() {
        assert_eq!(ReflogAction::Commit, ReflogAction::Commit);
        assert_eq!(ReflogAction::Checkout, ReflogAction::Checkout);
        assert_ne!(ReflogAction::Commit, ReflogAction::Merge);
    }

    #[test]
    fn test_reflog_action_other() {
        let action = ReflogAction::Other("custom action".to_string());
        assert_eq!(action, ReflogAction::Other("custom action".to_string()));
        assert_ne!(action, ReflogAction::Other("different".to_string()));
    }

    #[test]
    fn test_reflog_action_serialization() {
        let commit = ReflogAction::Commit;
        let json = serde_json::to_string(&commit).expect("should serialize");
        assert_eq!(json, "\"Commit\"");

        let checkout = ReflogAction::Checkout;
        let json = serde_json::to_string(&checkout).expect("should serialize");
        assert_eq!(json, "\"Checkout\"");

        let merge = ReflogAction::Merge;
        let json = serde_json::to_string(&merge).expect("should serialize");
        assert_eq!(json, "\"Merge\"");

        let rebase = ReflogAction::Rebase;
        let json = serde_json::to_string(&rebase).expect("should serialize");
        assert_eq!(json, "\"Rebase\"");

        let reset = ReflogAction::Reset;
        let json = serde_json::to_string(&reset).expect("should serialize");
        assert_eq!(json, "\"Reset\"");
    }

    #[test]
    fn test_reflog_action_other_serialization() {
        let action = ReflogAction::Other("custom".to_string());
        let json = serde_json::to_string(&action).expect("should serialize");
        assert!(json.contains("\"Other\""));
        assert!(json.contains("custom"));
    }

    #[test]
    fn test_reflog_action_deserialization() {
        let action: ReflogAction = serde_json::from_str("\"Commit\"").expect("should deserialize");
        assert_eq!(action, ReflogAction::Commit);

        let action: ReflogAction =
            serde_json::from_str("\"CherryPick\"").expect("should deserialize");
        assert_eq!(action, ReflogAction::CherryPick);

        let action: ReflogAction = serde_json::from_str("\"Stash\"").expect("should deserialize");
        assert_eq!(action, ReflogAction::Stash);
    }

    #[test]
    fn test_reflog_action_all_variants() {
        let actions = vec![
            ReflogAction::Commit,
            ReflogAction::CommitAmend,
            ReflogAction::CommitInitial,
            ReflogAction::Checkout,
            ReflogAction::Merge,
            ReflogAction::Rebase,
            ReflogAction::Reset,
            ReflogAction::CherryPick,
            ReflogAction::Revert,
            ReflogAction::Pull,
            ReflogAction::Clone,
            ReflogAction::Branch,
            ReflogAction::Stash,
            ReflogAction::Other("test".to_string()),
        ];

        for action in actions {
            let json = serde_json::to_string(&action).expect("should serialize");
            assert!(!json.is_empty());
        }
    }

    // ==================== ReflogOptions Tests ====================

    #[test]
    fn test_reflog_options_default() {
        let opts = ReflogOptions::default();

        assert!(opts.refname.is_none());
        assert!(opts.limit.is_none());
        assert!(opts.skip.is_none());
    }

    #[test]
    fn test_reflog_options_with_refname() {
        let opts = ReflogOptions {
            refname: Some("refs/heads/main".to_string()),
            limit: None,
            skip: None,
        };

        assert_eq!(opts.refname, Some("refs/heads/main".to_string()));
    }

    #[test]
    fn test_reflog_options_with_pagination() {
        let opts = ReflogOptions {
            refname: Some("HEAD".to_string()),
            limit: Some(50),
            skip: Some(100),
        };

        assert_eq!(opts.limit, Some(50));
        assert_eq!(opts.skip, Some(100));
    }

    #[test]
    fn test_reflog_options_serialization() {
        let opts = ReflogOptions {
            refname: Some("HEAD".to_string()),
            limit: Some(10),
            skip: Some(5),
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"refname\":\"HEAD\""));
        assert!(json.contains("\"limit\":10"));
        assert!(json.contains("\"skip\":5"));
    }

    #[test]
    fn test_reflog_options_deserialization() {
        let json = r#"{"refname": "HEAD", "limit": 20, "skip": null}"#;
        let opts: ReflogOptions = serde_json::from_str(json).expect("should deserialize");

        assert_eq!(opts.refname, Some("HEAD".to_string()));
        assert_eq!(opts.limit, Some(20));
        assert!(opts.skip.is_none());
    }
}
