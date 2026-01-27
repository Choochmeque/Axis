use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a Git worktree
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Worktree {
    /// Absolute path to the worktree directory
    pub path: String,
    /// Branch name (None if detached HEAD)
    pub branch: Option<String>,
    /// Current HEAD commit OID
    pub head_oid: String,
    /// Short HEAD OID (7 characters)
    pub short_oid: String,
    /// Whether this worktree is locked
    pub is_locked: bool,
    /// Lock reason (if locked)
    pub lock_reason: Option<String>,
    /// Whether this is the main worktree
    pub is_main: bool,
    /// Whether the worktree is prunable (directory missing)
    pub is_prunable: bool,
}

/// Options for adding a worktree
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct AddWorktreeOptions {
    /// Path where to create the worktree
    pub path: String,
    /// Branch to checkout (creates new branch if create_branch is true)
    pub branch: Option<String>,
    /// Create a new branch with this name
    pub create_branch: bool,
    /// Commit/branch to base new branch on (if create_branch is true)
    pub base: Option<String>,
    /// Force creation even if branch is checked out elsewhere
    pub force: bool,
    /// Create worktree in detached HEAD state
    pub detach: bool,
}

/// Options for removing a worktree
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct RemoveWorktreeOptions {
    /// Path of the worktree to remove
    pub path: String,
    /// Force removal even with uncommitted changes
    pub force: bool,
}

/// Result of a worktree operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// Message describing the result
    pub message: String,
    /// Path of the affected worktree
    pub path: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== Worktree Tests ====================

    #[test]
    fn test_worktree_main() {
        let wt = Worktree {
            path: "/home/user/project".to_string(),
            branch: Some("main".to_string()),
            head_oid: "abc123def456".to_string(),
            short_oid: "abc123d".to_string(),
            is_locked: false,
            lock_reason: None,
            is_main: true,
            is_prunable: false,
        };

        assert!(wt.is_main);
        assert!(!wt.is_locked);
        assert!(!wt.is_prunable);
        assert_eq!(wt.branch, Some("main".to_string()));
    }

    #[test]
    fn test_worktree_linked() {
        let wt = Worktree {
            path: "/home/user/project-feature".to_string(),
            branch: Some("feature/new-ui".to_string()),
            head_oid: "def456".to_string(),
            short_oid: "def456a".to_string(),
            is_locked: false,
            lock_reason: None,
            is_main: false,
            is_prunable: false,
        };

        assert!(!wt.is_main);
        assert_eq!(wt.branch, Some("feature/new-ui".to_string()));
    }

    #[test]
    fn test_worktree_detached() {
        let wt = Worktree {
            path: "/home/user/project-detached".to_string(),
            branch: None,
            head_oid: "xyz789".to_string(),
            short_oid: "xyz789a".to_string(),
            is_locked: false,
            lock_reason: None,
            is_main: false,
            is_prunable: false,
        };

        assert!(wt.branch.is_none());
    }

    #[test]
    fn test_worktree_locked() {
        let wt = Worktree {
            path: "/home/user/project-locked".to_string(),
            branch: Some("hotfix".to_string()),
            head_oid: "aaa".to_string(),
            short_oid: "aaa".to_string(),
            is_locked: true,
            lock_reason: Some("Work in progress".to_string()),
            is_main: false,
            is_prunable: false,
        };

        assert!(wt.is_locked);
        assert_eq!(wt.lock_reason, Some("Work in progress".to_string()));
    }

    #[test]
    fn test_worktree_prunable() {
        let wt = Worktree {
            path: "/home/user/deleted-worktree".to_string(),
            branch: Some("old-feature".to_string()),
            head_oid: "bbb".to_string(),
            short_oid: "bbb".to_string(),
            is_locked: false,
            lock_reason: None,
            is_main: false,
            is_prunable: true,
        };

        assert!(wt.is_prunable);
    }

    #[test]
    fn test_worktree_serialization() {
        let wt = Worktree {
            path: "/path/to/wt".to_string(),
            branch: Some("feature".to_string()),
            head_oid: "123".to_string(),
            short_oid: "123".to_string(),
            is_locked: true,
            lock_reason: Some("reason".to_string()),
            is_main: false,
            is_prunable: false,
        };

        let json = serde_json::to_string(&wt).expect("should serialize");
        assert!(json.contains("\"path\":\"/path/to/wt\""));
        assert!(json.contains("\"branch\":\"feature\""));
        assert!(json.contains("\"isLocked\":true"));
        assert!(json.contains("\"isMain\":false"));
    }

    // ==================== AddWorktreeOptions Tests ====================

    #[test]
    fn test_add_worktree_options_default() {
        let opts = AddWorktreeOptions::default();

        assert!(opts.path.is_empty());
        assert!(opts.branch.is_none());
        assert!(!opts.create_branch);
        assert!(opts.base.is_none());
        assert!(!opts.force);
        assert!(!opts.detach);
    }

    #[test]
    fn test_add_worktree_options_new_branch() {
        let opts = AddWorktreeOptions {
            path: "/home/user/new-worktree".to_string(),
            branch: Some("feature/new".to_string()),
            create_branch: true,
            base: Some("main".to_string()),
            force: false,
            detach: false,
        };

        assert!(opts.create_branch);
        assert_eq!(opts.base, Some("main".to_string()));
    }

    #[test]
    fn test_add_worktree_options_detached() {
        let opts = AddWorktreeOptions {
            path: "/path".to_string(),
            branch: None,
            create_branch: false,
            base: None,
            force: false,
            detach: true,
        };

        assert!(opts.detach);
        assert!(opts.branch.is_none());
    }

    #[test]
    fn test_add_worktree_options_serialization() {
        let opts = AddWorktreeOptions {
            path: "/wt".to_string(),
            branch: Some("dev".to_string()),
            create_branch: true,
            base: None,
            force: true,
            detach: false,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"path\":\"/wt\""));
        assert!(json.contains("\"createBranch\":true"));
        assert!(json.contains("\"force\":true"));
    }

    // ==================== RemoveWorktreeOptions Tests ====================

    #[test]
    fn test_remove_worktree_options_default() {
        let opts = RemoveWorktreeOptions::default();

        assert!(opts.path.is_empty());
        assert!(!opts.force);
    }

    #[test]
    fn test_remove_worktree_options_force() {
        let opts = RemoveWorktreeOptions {
            path: "/path/to/remove".to_string(),
            force: true,
        };

        assert!(opts.force);
        assert_eq!(opts.path, "/path/to/remove");
    }

    #[test]
    fn test_remove_worktree_options_serialization() {
        let opts = RemoveWorktreeOptions {
            path: "/wt".to_string(),
            force: true,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"path\":\"/wt\""));
        assert!(json.contains("\"force\":true"));
    }

    // ==================== WorktreeResult Tests ====================

    #[test]
    fn test_worktree_result_success() {
        let result = WorktreeResult {
            success: true,
            message: "Worktree created".to_string(),
            path: Some("/new/worktree".to_string()),
        };

        assert!(result.success);
        assert_eq!(result.path, Some("/new/worktree".to_string()));
    }

    #[test]
    fn test_worktree_result_failure() {
        let result = WorktreeResult {
            success: false,
            message: "Failed to create worktree".to_string(),
            path: None,
        };

        assert!(!result.success);
        assert!(result.path.is_none());
    }

    #[test]
    fn test_worktree_result_serialization() {
        let result = WorktreeResult {
            success: true,
            message: "OK".to_string(),
            path: Some("/wt".to_string()),
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"path\":\"/wt\""));
    }
}
