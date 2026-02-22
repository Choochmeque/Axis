use serde::{Deserialize, Serialize};
use specta::Type;

/// Sort order for remote listing
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum RemoteSortOrder {
    #[default]
    Alphabetical,
    AlphabeticalDesc,
}

/// Options for listing remotes
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ListRemoteOptions {
    /// Sort order (defaults to Alphabetical)
    #[serde(default)]
    pub sort: RemoteSortOrder,
    /// Maximum number of remotes to return
    pub limit: Option<usize>,
}

/// Represents a Git remote
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Remote {
    pub name: String,
    pub url: Option<String>,
    pub push_url: Option<String>,
    pub fetch_refspecs: Vec<String>,
    pub push_refspecs: Vec<String>,
}

/// Progress information for fetch operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct FetchProgress {
    pub total_objects: usize,
    pub indexed_objects: usize,
    pub received_objects: usize,
    pub local_objects: usize,
    pub total_deltas: usize,
    pub indexed_deltas: usize,
    pub received_bytes: usize,
}

/// Result of a fetch operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FetchResult {
    pub remote: String,
    pub updated_refs: Vec<UpdatedRef>,
    pub stats: FetchProgress,
}

/// An updated reference from fetch/push
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdatedRef {
    pub ref_name: String,
    pub old_oid: Option<String>,
    pub new_oid: Option<String>,
    pub status: RefUpdateStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "PascalCase")]
pub enum RefUpdateStatus {
    FastForward,
    Forced,
    New,
    Deleted,
    Rejected,
    UpToDate,
}

/// Result of a push operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PushResult {
    pub remote: String,
    pub pushed_refs: Vec<PushedRef>,
}

/// A pushed reference result
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PushedRef {
    pub ref_name: String,
    pub status: PushStatus,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "PascalCase")]
pub enum PushStatus {
    Ok,
    Rejected,
    UpToDate,
    RemoteRejected,
}

/// Options for checkout operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct CheckoutOptions {
    /// Create a new branch if it doesn't exist
    pub create: bool,
    /// Force checkout, discarding local changes
    pub force: bool,
    /// Track the remote branch when creating
    pub track: Option<String>,
}

/// Options for branch creation
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateBranchOptions {
    /// The starting point (commit/branch/tag). If None, uses HEAD.
    pub start_point: Option<String>,
    /// Force creation even if branch exists
    pub force: bool,
    /// Set up tracking for an upstream branch
    pub track: Option<String>,
}

/// Options for branch deletion
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct DeleteBranchOptions {
    /// Force deletion even if not fully merged
    pub force: bool,
    /// Delete the remote tracking branch as well
    pub delete_remote: bool,
}

/// Options for fetch operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct FetchOptions {
    /// Prune remote tracking branches that no longer exist
    pub prune: bool,
    /// Fetch tags
    pub tags: bool,
    /// Depth for shallow fetch (None for full fetch)
    pub depth: Option<u32>,
}

/// Options for push operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct PushOptions {
    /// Force push
    pub force: bool,
    /// Set upstream tracking
    pub set_upstream: bool,
    /// Push tags
    pub tags: bool,
}

/// Options for pull operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct PullOptions {
    /// Rebase instead of merge
    pub rebase: bool,
    /// Fast-forward only
    pub ff_only: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== Remote Tests ====================

    #[test]
    fn test_remote_creation() {
        let remote = Remote {
            name: "origin".to_string(),
            url: Some("https://github.com/user/repo.git".to_string()),
            push_url: None,
            fetch_refspecs: vec!["+refs/heads/*:refs/remotes/origin/*".to_string()],
            push_refspecs: vec![],
        };

        assert_eq!(remote.name, "origin");
        assert!(remote.url.is_some());
        assert!(remote.push_url.is_none());
        assert_eq!(remote.fetch_refspecs.len(), 1);
    }

    #[test]
    fn test_remote_with_push_url() {
        let remote = Remote {
            name: "origin".to_string(),
            url: Some("https://github.com/user/repo.git".to_string()),
            push_url: Some("git@github.com:user/repo.git".to_string()),
            fetch_refspecs: vec![],
            push_refspecs: vec![],
        };

        assert!(remote.push_url.is_some());
        assert_ne!(remote.url, remote.push_url);
    }

    #[test]
    fn test_remote_serialization() {
        let remote = Remote {
            name: "upstream".to_string(),
            url: Some("https://example.com/repo.git".to_string()),
            push_url: None,
            fetch_refspecs: vec!["ref1".to_string()],
            push_refspecs: vec!["ref2".to_string()],
        };

        let json = serde_json::to_string(&remote).expect("should serialize");
        assert!(json.contains("\"name\":\"upstream\""));
        assert!(json.contains("\"fetchRefspecs\":[\"ref1\"]"));
        assert!(json.contains("\"pushRefspecs\":[\"ref2\"]"));
    }

    // ==================== FetchProgress Tests ====================

    #[test]
    fn test_fetch_progress_default() {
        let progress = FetchProgress::default();
        assert_eq!(progress.total_objects, 0);
        assert_eq!(progress.indexed_objects, 0);
        assert_eq!(progress.received_objects, 0);
        assert_eq!(progress.local_objects, 0);
        assert_eq!(progress.total_deltas, 0);
        assert_eq!(progress.indexed_deltas, 0);
        assert_eq!(progress.received_bytes, 0);
    }

    #[test]
    fn test_fetch_progress_in_progress() {
        let progress = FetchProgress {
            total_objects: 100,
            indexed_objects: 50,
            received_objects: 75,
            local_objects: 10,
            total_deltas: 20,
            indexed_deltas: 15,
            received_bytes: 1024,
        };

        assert_eq!(progress.total_objects, 100);
        assert_eq!(progress.received_objects, 75);
        assert_eq!(progress.received_bytes, 1024);
    }

    // ==================== RefUpdateStatus Tests ====================

    #[test]
    fn test_ref_update_status_serialization() {
        let ff = RefUpdateStatus::FastForward;
        let json = serde_json::to_string(&ff).expect("should serialize");
        assert_eq!(json, "\"FastForward\"");

        let forced = RefUpdateStatus::Forced;
        let json = serde_json::to_string(&forced).expect("should serialize");
        assert_eq!(json, "\"Forced\"");

        let new = RefUpdateStatus::New;
        let json = serde_json::to_string(&new).expect("should serialize");
        assert_eq!(json, "\"New\"");

        let deleted = RefUpdateStatus::Deleted;
        let json = serde_json::to_string(&deleted).expect("should serialize");
        assert_eq!(json, "\"Deleted\"");
    }

    // ==================== PushStatus Tests ====================

    #[test]
    fn test_push_status_serialization() {
        let ok = PushStatus::Ok;
        let json = serde_json::to_string(&ok).expect("should serialize");
        assert_eq!(json, "\"Ok\"");

        let rejected = PushStatus::Rejected;
        let json = serde_json::to_string(&rejected).expect("should serialize");
        assert_eq!(json, "\"Rejected\"");

        let up_to_date = PushStatus::UpToDate;
        let json = serde_json::to_string(&up_to_date).expect("should serialize");
        assert_eq!(json, "\"UpToDate\"");
    }

    // ==================== UpdatedRef Tests ====================

    #[test]
    fn test_updated_ref_fast_forward() {
        let updated = UpdatedRef {
            ref_name: "refs/heads/main".to_string(),
            old_oid: Some("abc123".to_string()),
            new_oid: Some("def456".to_string()),
            status: RefUpdateStatus::FastForward,
        };

        assert_eq!(updated.ref_name, "refs/heads/main");
        assert!(updated.old_oid.is_some());
        assert!(updated.new_oid.is_some());
    }

    #[test]
    fn test_updated_ref_new_branch() {
        let updated = UpdatedRef {
            ref_name: "refs/heads/feature".to_string(),
            old_oid: None,
            new_oid: Some("xyz789".to_string()),
            status: RefUpdateStatus::New,
        };

        assert!(updated.old_oid.is_none());
        assert!(updated.new_oid.is_some());
    }

    // ==================== FetchResult Tests ====================

    #[test]
    fn test_fetch_result_creation() {
        let result = FetchResult {
            remote: "origin".to_string(),
            updated_refs: vec![UpdatedRef {
                ref_name: "refs/remotes/origin/main".to_string(),
                old_oid: Some("old".to_string()),
                new_oid: Some("new".to_string()),
                status: RefUpdateStatus::FastForward,
            }],
            stats: FetchProgress::default(),
        };

        assert_eq!(result.remote, "origin");
        assert_eq!(result.updated_refs.len(), 1);
    }

    // ==================== PushedRef Tests ====================

    #[test]
    fn test_pushed_ref_ok() {
        let pushed = PushedRef {
            ref_name: "refs/heads/main".to_string(),
            status: PushStatus::Ok,
            message: None,
        };

        assert!(matches!(pushed.status, PushStatus::Ok));
        assert!(pushed.message.is_none());
    }

    #[test]
    fn test_pushed_ref_rejected() {
        let pushed = PushedRef {
            ref_name: "refs/heads/main".to_string(),
            status: PushStatus::Rejected,
            message: Some("non-fast-forward".to_string()),
        };

        assert!(matches!(pushed.status, PushStatus::Rejected));
        assert!(pushed.message.is_some());
    }

    // ==================== PushResult Tests ====================

    #[test]
    fn test_push_result_creation() {
        let result = PushResult {
            remote: "origin".to_string(),
            pushed_refs: vec![PushedRef {
                ref_name: "refs/heads/main".to_string(),
                status: PushStatus::Ok,
                message: None,
            }],
        };

        assert_eq!(result.remote, "origin");
        assert_eq!(result.pushed_refs.len(), 1);
    }

    // ==================== CheckoutOptions Tests ====================

    #[test]
    fn test_checkout_options_default() {
        let opts = CheckoutOptions::default();
        assert!(!opts.create);
        assert!(!opts.force);
        assert!(opts.track.is_none());
    }

    #[test]
    fn test_checkout_options_create_branch() {
        let opts = CheckoutOptions {
            create: true,
            force: false,
            track: Some("origin/feature".to_string()),
        };

        assert!(opts.create);
        assert!(!opts.force);
        assert_eq!(opts.track, Some("origin/feature".to_string()));
    }

    // ==================== CreateBranchOptions Tests ====================

    #[test]
    fn test_create_branch_options_default() {
        let opts = CreateBranchOptions::default();
        assert!(opts.start_point.is_none());
        assert!(!opts.force);
        assert!(opts.track.is_none());
    }

    #[test]
    fn test_create_branch_options_from_commit() {
        let opts = CreateBranchOptions {
            start_point: Some("abc123".to_string()),
            force: false,
            track: None,
        };

        assert_eq!(opts.start_point, Some("abc123".to_string()));
    }

    // ==================== DeleteBranchOptions Tests ====================

    #[test]
    fn test_delete_branch_options_default() {
        let opts = DeleteBranchOptions::default();
        assert!(!opts.force);
        assert!(!opts.delete_remote);
    }

    #[test]
    fn test_delete_branch_options_force() {
        let opts = DeleteBranchOptions {
            force: true,
            delete_remote: true,
        };

        assert!(opts.force);
        assert!(opts.delete_remote);
    }

    // ==================== FetchOptions Tests ====================

    #[test]
    fn test_fetch_options_default() {
        let opts = FetchOptions::default();
        assert!(!opts.prune);
        assert!(!opts.tags);
        assert!(opts.depth.is_none());
    }

    #[test]
    fn test_fetch_options_custom() {
        let opts = FetchOptions {
            prune: true,
            tags: true,
            depth: Some(1),
        };

        assert!(opts.prune);
        assert!(opts.tags);
        assert_eq!(opts.depth, Some(1));
    }

    // ==================== PushOptions Tests ====================

    #[test]
    fn test_push_options_default() {
        let opts = PushOptions::default();
        assert!(!opts.force);
        assert!(!opts.set_upstream);
        assert!(!opts.tags);
    }

    #[test]
    fn test_push_options_force_with_upstream() {
        let opts = PushOptions {
            force: true,
            set_upstream: true,
            tags: false,
        };

        assert!(opts.force);
        assert!(opts.set_upstream);
    }

    // ==================== PullOptions Tests ====================

    #[test]
    fn test_pull_options_default() {
        let opts = PullOptions::default();
        assert!(!opts.rebase);
        assert!(!opts.ff_only);
    }

    #[test]
    fn test_pull_options_rebase() {
        let opts = PullOptions {
            rebase: true,
            ff_only: false,
        };

        assert!(opts.rebase);
        assert!(!opts.ff_only);
    }

    #[test]
    fn test_pull_options_ff_only() {
        let opts = PullOptions {
            rebase: false,
            ff_only: true,
        };

        assert!(!opts.rebase);
        assert!(opts.ff_only);
    }

    // ==================== RemoteSortOrder Tests ====================

    #[test]
    fn test_remote_sort_order_default() {
        let sort = RemoteSortOrder::default();
        assert_eq!(sort, RemoteSortOrder::Alphabetical);
    }

    #[test]
    fn test_remote_sort_order_equality() {
        assert_eq!(RemoteSortOrder::Alphabetical, RemoteSortOrder::Alphabetical);
        assert_eq!(
            RemoteSortOrder::AlphabeticalDesc,
            RemoteSortOrder::AlphabeticalDesc
        );
        assert_ne!(
            RemoteSortOrder::Alphabetical,
            RemoteSortOrder::AlphabeticalDesc
        );
    }

    #[test]
    fn test_remote_sort_order_serialization() {
        let alphabetical = RemoteSortOrder::Alphabetical;
        let json = serde_json::to_string(&alphabetical).expect("should serialize");
        assert_eq!(json, "\"Alphabetical\"");

        let desc = RemoteSortOrder::AlphabeticalDesc;
        let json = serde_json::to_string(&desc).expect("should serialize");
        assert_eq!(json, "\"AlphabeticalDesc\"");
    }

    #[test]
    fn test_remote_sort_order_deserialization() {
        let sort: RemoteSortOrder =
            serde_json::from_str("\"Alphabetical\"").expect("should deserialize");
        assert_eq!(sort, RemoteSortOrder::Alphabetical);

        let sort: RemoteSortOrder =
            serde_json::from_str("\"AlphabeticalDesc\"").expect("should deserialize");
        assert_eq!(sort, RemoteSortOrder::AlphabeticalDesc);
    }

    // ==================== ListRemoteOptions Tests ====================

    #[test]
    fn test_list_remote_options_default() {
        let options = ListRemoteOptions::default();
        assert_eq!(options.sort, RemoteSortOrder::Alphabetical);
        assert!(options.limit.is_none());
    }

    #[test]
    fn test_list_remote_options_custom() {
        let options = ListRemoteOptions {
            sort: RemoteSortOrder::AlphabeticalDesc,
            limit: Some(10),
        };
        assert_eq!(options.sort, RemoteSortOrder::AlphabeticalDesc);
        assert_eq!(options.limit, Some(10));
    }

    #[test]
    fn test_list_remote_options_serialization() {
        let options = ListRemoteOptions {
            sort: RemoteSortOrder::AlphabeticalDesc,
            limit: Some(5),
        };
        let json = serde_json::to_string(&options).expect("should serialize");
        assert!(json.contains("\"sort\":\"AlphabeticalDesc\""));
        assert!(json.contains("\"limit\":5"));
    }
}
