use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::models::SigningFormat;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
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
    /// Signature info if the commit is signed
    pub signature: Option<CommitSignature>,
}

/// Information about a commit's cryptographic signature
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CommitSignature {
    /// The type of signature (GPG or SSH), None if unknown
    pub format: Option<SigningFormat>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Signature {
    pub name: String,
    pub email: String,
    pub timestamp: DateTime<Utc>,
}

impl Commit {
    pub fn from_git2_commit(commit: &git2::Commit, repo: &git2::Repository) -> Self {
        let author = commit.author();
        let committer = commit.committer();

        let signature = Self::extract_signature(repo, commit.id());

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
            signature,
        }
    }

    fn extract_signature(repo: &git2::Repository, oid: git2::Oid) -> Option<CommitSignature> {
        let (sig_buf, _signed_data) = repo.extract_signature(&oid, Some("gpgsig")).ok()?;
        let sig_str = std::str::from_utf8(&sig_buf).ok()?;

        let is_gpg = sig_str.contains("-----BEGIN PGP SIGNATURE-----");
        let is_ssh = sig_str.contains("-----BEGIN SSH SIGNATURE-----");

        let format = if is_gpg {
            Some(SigningFormat::Gpg)
        } else if is_ssh {
            Some(SigningFormat::Ssh)
        } else {
            None
        };

        Some(CommitSignature { format })
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

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum BranchFilterType {
    #[default]
    All,
    Current,
    Specific(String),
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum SortOrder {
    #[default]
    DateOrder,
    AncestorOrder,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
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

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== BranchFilterType Tests ====================

    #[test]
    fn test_branch_filter_type_default() {
        let filter = BranchFilterType::default();
        assert_eq!(filter, BranchFilterType::All);
    }

    #[test]
    fn test_branch_filter_type_variants() {
        let all = BranchFilterType::All;
        let current = BranchFilterType::Current;
        let specific = BranchFilterType::Specific("feature/test".to_string());

        assert_eq!(all, BranchFilterType::All);
        assert_eq!(current, BranchFilterType::Current);
        assert!(matches!(specific, BranchFilterType::Specific(_)));
    }

    #[test]
    fn test_branch_filter_type_equality() {
        assert_eq!(BranchFilterType::All, BranchFilterType::All);
        assert_eq!(BranchFilterType::Current, BranchFilterType::Current);
        assert_eq!(
            BranchFilterType::Specific("main".to_string()),
            BranchFilterType::Specific("main".to_string())
        );
        assert_ne!(BranchFilterType::All, BranchFilterType::Current);
        assert_ne!(
            BranchFilterType::Specific("main".to_string()),
            BranchFilterType::Specific("develop".to_string())
        );
    }

    #[test]
    fn test_branch_filter_type_serialization() {
        let all = BranchFilterType::All;
        let json = serde_json::to_string(&all).expect("should serialize");
        assert_eq!(json, "\"All\"");

        let current = BranchFilterType::Current;
        let json = serde_json::to_string(&current).expect("should serialize");
        assert_eq!(json, "\"Current\"");

        let specific = BranchFilterType::Specific("feature/test".to_string());
        let json = serde_json::to_string(&specific).expect("should serialize");
        assert!(json.contains("Specific"));
        assert!(json.contains("feature/test"));
    }

    #[test]
    fn test_branch_filter_type_deserialization() {
        let all: BranchFilterType = serde_json::from_str("\"All\"").expect("should deserialize");
        assert_eq!(all, BranchFilterType::All);

        let current: BranchFilterType =
            serde_json::from_str("\"Current\"").expect("should deserialize");
        assert_eq!(current, BranchFilterType::Current);
    }

    // ==================== SortOrder Tests ====================

    #[test]
    fn test_sort_order_default() {
        let order = SortOrder::default();
        assert_eq!(order, SortOrder::DateOrder);
    }

    #[test]
    fn test_sort_order_equality() {
        assert_eq!(SortOrder::DateOrder, SortOrder::DateOrder);
        assert_eq!(SortOrder::AncestorOrder, SortOrder::AncestorOrder);
        assert_ne!(SortOrder::DateOrder, SortOrder::AncestorOrder);
    }

    #[test]
    fn test_sort_order_serialization() {
        let date = SortOrder::DateOrder;
        let json = serde_json::to_string(&date).expect("should serialize");
        assert_eq!(json, "\"DateOrder\"");

        let ancestor = SortOrder::AncestorOrder;
        let json = serde_json::to_string(&ancestor).expect("should serialize");
        assert_eq!(json, "\"AncestorOrder\"");
    }

    // ==================== LogOptions Tests ====================

    #[test]
    fn test_log_options_default() {
        let opts = LogOptions::default();
        assert_eq!(opts.limit, Some(100));
        assert_eq!(opts.skip, None);
        assert_eq!(opts.from_ref, None);
        assert_eq!(opts.branch_filter, BranchFilterType::All);
        assert!(opts.include_remotes);
        assert_eq!(opts.sort_order, SortOrder::DateOrder);
    }

    #[test]
    fn test_log_options_custom() {
        let opts = LogOptions {
            limit: Some(50),
            skip: Some(10),
            from_ref: Some("develop".to_string()),
            branch_filter: BranchFilterType::Current,
            include_remotes: false,
            sort_order: SortOrder::AncestorOrder,
        };

        assert_eq!(opts.limit, Some(50));
        assert_eq!(opts.skip, Some(10));
        assert_eq!(opts.from_ref, Some("develop".to_string()));
        assert_eq!(opts.branch_filter, BranchFilterType::Current);
        assert!(!opts.include_remotes);
        assert_eq!(opts.sort_order, SortOrder::AncestorOrder);
    }

    #[test]
    fn test_log_options_serialization_roundtrip() {
        let opts = LogOptions {
            limit: Some(25),
            skip: Some(5),
            from_ref: Some("main".to_string()),
            branch_filter: BranchFilterType::Current,
            include_remotes: false,
            sort_order: SortOrder::AncestorOrder,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        let deserialized: LogOptions = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(deserialized.limit, opts.limit);
        assert_eq!(deserialized.skip, opts.skip);
        assert_eq!(deserialized.from_ref, opts.from_ref);
        assert_eq!(deserialized.branch_filter, opts.branch_filter);
        assert_eq!(deserialized.include_remotes, opts.include_remotes);
        assert_eq!(deserialized.sort_order, opts.sort_order);
    }

    #[test]
    fn test_log_options_deserialization_with_defaults() {
        // Test that missing fields use defaults
        let json = r#"{"limit": 50}"#;
        let opts: LogOptions = serde_json::from_str(json).expect("should deserialize");

        assert_eq!(opts.limit, Some(50));
        assert_eq!(opts.skip, None);
        assert_eq!(opts.branch_filter, BranchFilterType::default());
        assert!(opts.include_remotes); // default_include_remotes returns true
        assert_eq!(opts.sort_order, SortOrder::default());
    }

    // ==================== Signature Tests ====================

    #[test]
    fn test_signature_creation() {
        let sig = Signature {
            name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            timestamp: Utc::now(),
        };

        assert_eq!(sig.name, "John Doe");
        assert_eq!(sig.email, "john@example.com");
    }

    #[test]
    fn test_signature_serialization() {
        let sig = Signature {
            name: "Jane Doe".to_string(),
            email: "jane@example.com".to_string(),
            timestamp: DateTime::from_timestamp(1_700_000_000, 0)
                .expect("valid timestamp")
                .with_timezone(&Utc),
        };

        let json = serde_json::to_string(&sig).expect("should serialize");
        assert!(json.contains("Jane Doe"));
        assert!(json.contains("jane@example.com"));
    }

    // ==================== Commit Tests ====================

    #[test]
    fn test_commit_creation() {
        let commit = Commit {
            oid: "abc123def456".to_string(),
            short_oid: "abc123d".to_string(),
            message: "Initial commit\n\nThis is the body".to_string(),
            summary: "Initial commit".to_string(),
            author: Signature {
                name: "Author".to_string(),
                email: "author@example.com".to_string(),
                timestamp: Utc::now(),
            },
            committer: Signature {
                name: "Committer".to_string(),
                email: "committer@example.com".to_string(),
                timestamp: Utc::now(),
            },
            parent_oids: vec![],
            timestamp: Utc::now(),
            is_merge: false,
            signature: None,
        };

        assert_eq!(commit.oid, "abc123def456");
        assert_eq!(commit.short_oid, "abc123d");
        assert_eq!(commit.summary, "Initial commit");
        assert!(!commit.is_merge);
        assert!(commit.parent_oids.is_empty());
    }

    #[test]
    fn test_commit_with_parents() {
        let commit = Commit {
            oid: "merge123".to_string(),
            short_oid: "merge12".to_string(),
            message: "Merge branch 'feature'".to_string(),
            summary: "Merge branch 'feature'".to_string(),
            author: Signature {
                name: "Author".to_string(),
                email: "author@example.com".to_string(),
                timestamp: Utc::now(),
            },
            committer: Signature {
                name: "Committer".to_string(),
                email: "committer@example.com".to_string(),
                timestamp: Utc::now(),
            },
            parent_oids: vec!["parent1".to_string(), "parent2".to_string()],
            timestamp: Utc::now(),
            is_merge: true,
            signature: None,
        };

        assert!(commit.is_merge);
        assert_eq!(commit.parent_oids.len(), 2);
    }

    #[test]
    fn test_commit_serialization() {
        let commit = Commit {
            oid: "test123".to_string(),
            short_oid: "test123".to_string(),
            message: "Test commit".to_string(),
            summary: "Test commit".to_string(),
            author: Signature {
                name: "Test".to_string(),
                email: "test@example.com".to_string(),
                timestamp: DateTime::from_timestamp(1_700_000_000, 0)
                    .expect("valid timestamp")
                    .with_timezone(&Utc),
            },
            committer: Signature {
                name: "Test".to_string(),
                email: "test@example.com".to_string(),
                timestamp: DateTime::from_timestamp(1_700_000_000, 0)
                    .expect("valid timestamp")
                    .with_timezone(&Utc),
            },
            parent_oids: vec!["parent1".to_string()],
            timestamp: DateTime::from_timestamp(1_700_000_000, 0)
                .expect("valid timestamp")
                .with_timezone(&Utc),
            is_merge: false,
            signature: None,
        };

        let json = serde_json::to_string(&commit).expect("should serialize");
        assert!(json.contains("\"oid\":\"test123\""));
        assert!(json.contains("\"shortOid\":\"test123\""));
        assert!(json.contains("\"message\":\"Test commit\""));
        assert!(json.contains("\"isMerge\":false"));
    }
}
