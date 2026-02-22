use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a Git submodule
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Submodule {
    /// Submodule name
    pub name: String,
    /// Path within the parent repository
    pub path: String,
    /// Remote URL
    pub url: Option<String>,
    /// Current HEAD commit of the submodule
    pub head_oid: Option<String>,
    /// Short HEAD OID
    pub short_oid: Option<String>,
    /// Expected commit from parent repo's index
    pub indexed_oid: Option<String>,
    /// Branch being tracked (if any)
    pub branch: Option<String>,
    /// Status of the submodule
    pub status: SubmoduleStatus,
}

/// Status of a submodule
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default, Type)]
#[serde(rename_all = "PascalCase")]
pub enum SubmoduleStatus {
    /// Submodule is up to date
    Current,
    /// Submodule has new commits
    Modified,
    /// Submodule is not initialized
    Uninitialized,
    /// Submodule is missing from disk
    Missing,
    /// Submodule has merge conflicts
    Conflict,
    /// Submodule workdir is dirty
    Dirty,
    /// Unknown status
    #[default]
    Unknown,
}

/// Sort order for submodule listing
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum SubmoduleSortOrder {
    #[default]
    Alphabetical,
    AlphabeticalDesc,
    Path,
    PathDesc,
}

/// Options for listing submodules
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ListSubmoduleOptions {
    /// Sort order (defaults to Alphabetical)
    #[serde(default)]
    pub sort: SubmoduleSortOrder,
    /// Maximum number of submodules to return
    pub limit: Option<usize>,
}

/// Options for adding a submodule
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AddSubmoduleOptions {
    /// URL of the repository to add
    pub url: String,
    /// Path where to add the submodule
    pub path: String,
    /// Branch to track (default: default branch of remote)
    pub branch: Option<String>,
    /// Custom name for the submodule (default: derived from path)
    pub name: Option<String>,
    /// Clone depth (shallow clone)
    pub depth: Option<u32>,
}

/// Options for updating submodules
// Allow excessive bools: these map directly to git submodule update CLI flags
#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSubmoduleOptions {
    /// Specific submodule paths to update (empty = all)
    pub paths: Vec<String>,
    /// Initialize uninitialized submodules
    pub init: bool,
    /// Update recursively
    pub recursive: bool,
    /// Force update (discard local changes)
    pub force: bool,
    /// Fetch new commits from remote
    pub remote: bool,
    /// Rebase instead of merge when updating
    pub rebase: bool,
    /// Merge instead of checkout
    pub merge: bool,
}

/// Options for syncing submodules
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct SyncSubmoduleOptions {
    /// Specific submodule paths to sync (empty = all)
    pub paths: Vec<String>,
    /// Sync recursively
    pub recursive: bool,
}

/// Result of a submodule operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SubmoduleResult {
    pub success: bool,
    pub message: String,
    /// Affected submodules
    pub submodules: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== Submodule Tests ====================

    #[test]
    fn test_submodule_current() {
        let sm = Submodule {
            name: "lib/utils".to_string(),
            path: "lib/utils".to_string(),
            url: Some("https://github.com/example/utils.git".to_string()),
            head_oid: Some("abc123".to_string()),
            short_oid: Some("abc123a".to_string()),
            indexed_oid: Some("abc123".to_string()),
            branch: Some("main".to_string()),
            status: SubmoduleStatus::Current,
        };

        assert_eq!(sm.status, SubmoduleStatus::Current);
        assert!(sm.url.is_some());
        assert_eq!(sm.head_oid, sm.indexed_oid);
    }

    #[test]
    fn test_submodule_modified() {
        let sm = Submodule {
            name: "external".to_string(),
            path: "external".to_string(),
            url: Some("https://example.com/repo.git".to_string()),
            head_oid: Some("def456".to_string()),
            short_oid: Some("def456a".to_string()),
            indexed_oid: Some("abc123".to_string()),
            branch: None,
            status: SubmoduleStatus::Modified,
        };

        assert_eq!(sm.status, SubmoduleStatus::Modified);
        assert_ne!(sm.head_oid, sm.indexed_oid);
    }

    #[test]
    fn test_submodule_uninitialized() {
        let sm = Submodule {
            name: "new-sub".to_string(),
            path: "deps/new-sub".to_string(),
            url: Some("https://example.com/new.git".to_string()),
            head_oid: None,
            short_oid: None,
            indexed_oid: Some("aaa".to_string()),
            branch: None,
            status: SubmoduleStatus::Uninitialized,
        };

        assert_eq!(sm.status, SubmoduleStatus::Uninitialized);
        assert!(sm.head_oid.is_none());
    }

    #[test]
    fn test_submodule_serialization() {
        let sm = Submodule {
            name: "test".to_string(),
            path: "test".to_string(),
            url: Some("https://example.com".to_string()),
            head_oid: Some("123".to_string()),
            short_oid: Some("123".to_string()),
            indexed_oid: Some("123".to_string()),
            branch: Some("main".to_string()),
            status: SubmoduleStatus::Current,
        };

        let json = serde_json::to_string(&sm).expect("should serialize");
        assert!(json.contains("\"name\":\"test\""));
        assert!(json.contains("\"status\":\"Current\""));
        assert!(json.contains("\"branch\":\"main\""));
    }

    // ==================== SubmoduleStatus Tests ====================

    #[test]
    fn test_submodule_status_default() {
        let status = SubmoduleStatus::default();
        assert_eq!(status, SubmoduleStatus::Unknown);
    }

    #[test]
    fn test_submodule_status_equality() {
        assert_eq!(SubmoduleStatus::Current, SubmoduleStatus::Current);
        assert_eq!(SubmoduleStatus::Modified, SubmoduleStatus::Modified);
        assert_eq!(
            SubmoduleStatus::Uninitialized,
            SubmoduleStatus::Uninitialized
        );
        assert_eq!(SubmoduleStatus::Missing, SubmoduleStatus::Missing);
        assert_eq!(SubmoduleStatus::Conflict, SubmoduleStatus::Conflict);
        assert_eq!(SubmoduleStatus::Dirty, SubmoduleStatus::Dirty);
        assert_eq!(SubmoduleStatus::Unknown, SubmoduleStatus::Unknown);
        assert_ne!(SubmoduleStatus::Current, SubmoduleStatus::Modified);
    }

    #[test]
    fn test_submodule_status_serialization() {
        let current = SubmoduleStatus::Current;
        let json = serde_json::to_string(&current).expect("should serialize");
        assert_eq!(json, "\"Current\"");

        let modified = SubmoduleStatus::Modified;
        let json = serde_json::to_string(&modified).expect("should serialize");
        assert_eq!(json, "\"Modified\"");

        let dirty = SubmoduleStatus::Dirty;
        let json = serde_json::to_string(&dirty).expect("should serialize");
        assert_eq!(json, "\"Dirty\"");
    }

    #[test]
    fn test_submodule_status_deserialization() {
        let status: SubmoduleStatus =
            serde_json::from_str("\"Current\"").expect("should deserialize");
        assert_eq!(status, SubmoduleStatus::Current);

        let status: SubmoduleStatus =
            serde_json::from_str("\"Missing\"").expect("should deserialize");
        assert_eq!(status, SubmoduleStatus::Missing);
    }

    // ==================== SubmoduleSortOrder Tests ====================

    #[test]
    fn test_submodule_sort_order_default() {
        let sort = SubmoduleSortOrder::default();
        assert_eq!(sort, SubmoduleSortOrder::Alphabetical);
    }

    #[test]
    fn test_submodule_sort_order_equality() {
        assert_eq!(
            SubmoduleSortOrder::Alphabetical,
            SubmoduleSortOrder::Alphabetical
        );
        assert_eq!(
            SubmoduleSortOrder::AlphabeticalDesc,
            SubmoduleSortOrder::AlphabeticalDesc
        );
        assert_eq!(SubmoduleSortOrder::Path, SubmoduleSortOrder::Path);
        assert_eq!(SubmoduleSortOrder::PathDesc, SubmoduleSortOrder::PathDesc);
        assert_ne!(
            SubmoduleSortOrder::Alphabetical,
            SubmoduleSortOrder::AlphabeticalDesc
        );
    }

    #[test]
    fn test_submodule_sort_order_serialization() {
        let alphabetical = SubmoduleSortOrder::Alphabetical;
        let json = serde_json::to_string(&alphabetical).expect("should serialize");
        assert_eq!(json, "\"Alphabetical\"");

        let desc = SubmoduleSortOrder::AlphabeticalDesc;
        let json = serde_json::to_string(&desc).expect("should serialize");
        assert_eq!(json, "\"AlphabeticalDesc\"");

        let path = SubmoduleSortOrder::Path;
        let json = serde_json::to_string(&path).expect("should serialize");
        assert_eq!(json, "\"Path\"");

        let path_desc = SubmoduleSortOrder::PathDesc;
        let json = serde_json::to_string(&path_desc).expect("should serialize");
        assert_eq!(json, "\"PathDesc\"");
    }

    #[test]
    fn test_submodule_sort_order_deserialization() {
        let sort: SubmoduleSortOrder =
            serde_json::from_str("\"Alphabetical\"").expect("should deserialize");
        assert_eq!(sort, SubmoduleSortOrder::Alphabetical);

        let sort: SubmoduleSortOrder =
            serde_json::from_str("\"AlphabeticalDesc\"").expect("should deserialize");
        assert_eq!(sort, SubmoduleSortOrder::AlphabeticalDesc);

        let sort: SubmoduleSortOrder =
            serde_json::from_str("\"Path\"").expect("should deserialize");
        assert_eq!(sort, SubmoduleSortOrder::Path);

        let sort: SubmoduleSortOrder =
            serde_json::from_str("\"PathDesc\"").expect("should deserialize");
        assert_eq!(sort, SubmoduleSortOrder::PathDesc);
    }

    // ==================== ListSubmoduleOptions Tests ====================

    #[test]
    fn test_list_submodule_options_default() {
        let options = ListSubmoduleOptions::default();
        assert_eq!(options.sort, SubmoduleSortOrder::Alphabetical);
        assert!(options.limit.is_none());
    }

    #[test]
    fn test_list_submodule_options_custom() {
        let options = ListSubmoduleOptions {
            sort: SubmoduleSortOrder::Path,
            limit: Some(10),
        };
        assert_eq!(options.sort, SubmoduleSortOrder::Path);
        assert_eq!(options.limit, Some(10));
    }

    #[test]
    fn test_list_submodule_options_serialization() {
        let options = ListSubmoduleOptions {
            sort: SubmoduleSortOrder::AlphabeticalDesc,
            limit: Some(5),
        };
        let json = serde_json::to_string(&options).expect("should serialize");
        assert!(json.contains("\"sort\":\"AlphabeticalDesc\""));
        assert!(json.contains("\"limit\":5"));
    }

    // ==================== AddSubmoduleOptions Tests ====================

    #[test]
    fn test_add_submodule_options_minimal() {
        let opts = AddSubmoduleOptions {
            url: "https://github.com/example/lib.git".to_string(),
            path: "lib/example".to_string(),
            branch: None,
            name: None,
            depth: None,
        };

        assert_eq!(opts.url, "https://github.com/example/lib.git");
        assert_eq!(opts.path, "lib/example");
        assert!(opts.branch.is_none());
    }

    #[test]
    fn test_add_submodule_options_full() {
        let opts = AddSubmoduleOptions {
            url: "https://example.com/repo.git".to_string(),
            path: "deps/repo".to_string(),
            branch: Some("develop".to_string()),
            name: Some("custom-name".to_string()),
            depth: Some(1),
        };

        assert_eq!(opts.branch, Some("develop".to_string()));
        assert_eq!(opts.name, Some("custom-name".to_string()));
        assert_eq!(opts.depth, Some(1));
    }

    #[test]
    fn test_add_submodule_options_serialization() {
        let opts = AddSubmoduleOptions {
            url: "https://example.com".to_string(),
            path: "sub".to_string(),
            branch: Some("main".to_string()),
            name: None,
            depth: Some(10),
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"url\":\"https://example.com\""));
        assert!(json.contains("\"branch\":\"main\""));
        assert!(json.contains("\"depth\":10"));
    }

    // ==================== UpdateSubmoduleOptions Tests ====================

    #[test]
    fn test_update_submodule_options_default() {
        let opts = UpdateSubmoduleOptions::default();

        assert!(opts.paths.is_empty());
        assert!(!opts.init);
        assert!(!opts.recursive);
        assert!(!opts.force);
        assert!(!opts.remote);
        assert!(!opts.rebase);
        assert!(!opts.merge);
    }

    #[test]
    fn test_update_submodule_options_init_recursive() {
        let opts = UpdateSubmoduleOptions {
            paths: vec![],
            init: true,
            recursive: true,
            force: false,
            remote: true,
            rebase: false,
            merge: false,
        };

        assert!(opts.init);
        assert!(opts.recursive);
        assert!(opts.remote);
    }

    #[test]
    fn test_update_submodule_options_specific_paths() {
        let opts = UpdateSubmoduleOptions {
            paths: vec!["sub1".to_string(), "sub2".to_string()],
            init: false,
            recursive: false,
            force: true,
            remote: false,
            rebase: true,
            merge: false,
        };

        assert_eq!(opts.paths.len(), 2);
        assert!(opts.force);
        assert!(opts.rebase);
    }

    #[test]
    fn test_update_submodule_options_serialization() {
        let opts = UpdateSubmoduleOptions {
            paths: vec!["a".to_string()],
            init: true,
            recursive: true,
            ..Default::default()
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"paths\":[\"a\"]"));
        assert!(json.contains("\"init\":true"));
        assert!(json.contains("\"recursive\":true"));
    }

    // ==================== SyncSubmoduleOptions Tests ====================

    #[test]
    fn test_sync_submodule_options_default() {
        let opts = SyncSubmoduleOptions::default();

        assert!(opts.paths.is_empty());
        assert!(!opts.recursive);
    }

    #[test]
    fn test_sync_submodule_options_recursive() {
        let opts = SyncSubmoduleOptions {
            paths: vec!["sub".to_string()],
            recursive: true,
        };

        assert!(opts.recursive);
        assert_eq!(opts.paths.len(), 1);
    }

    #[test]
    fn test_sync_submodule_options_serialization() {
        let opts = SyncSubmoduleOptions {
            paths: vec![],
            recursive: true,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"recursive\":true"));
    }

    // ==================== SubmoduleResult Tests ====================

    #[test]
    fn test_submodule_result_success() {
        let result = SubmoduleResult {
            success: true,
            message: "Submodule updated".to_string(),
            submodules: vec!["sub1".to_string(), "sub2".to_string()],
        };

        assert!(result.success);
        assert_eq!(result.submodules.len(), 2);
    }

    #[test]
    fn test_submodule_result_failure() {
        let result = SubmoduleResult {
            success: false,
            message: "Failed to update submodule".to_string(),
            submodules: vec![],
        };

        assert!(!result.success);
        assert!(result.submodules.is_empty());
    }

    #[test]
    fn test_submodule_result_serialization() {
        let result = SubmoduleResult {
            success: true,
            message: "OK".to_string(),
            submodules: vec!["a".to_string()],
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"submodules\":[\"a\"]"));
    }
}
