use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumString};

use super::commit::Commit;

/// Options for merge operations
// Allow excessive bools: these map directly to git merge CLI flags
#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct MergeOptions {
    /// The branch to merge into the current branch
    pub branch: String,
    /// Custom commit message (optional)
    pub message: Option<String>,
    /// If true, always create a merge commit (no fast-forward)
    pub no_ff: bool,
    /// If true, squash all commits into a single commit
    pub squash: bool,
    /// If true, only fast-forward (fail if not possible)
    pub ff_only: bool,
    /// If true, don't create a commit (stage changes only)
    pub no_commit: bool,
}

/// Result of a merge operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MergeResult {
    /// Whether the merge was successful
    pub success: bool,
    /// Type of merge that occurred
    pub merge_type: MergeType,
    /// New commit OID if a merge commit was created
    pub commit_oid: Option<String>,
    /// List of conflicted files if merge has conflicts
    pub conflicts: Vec<ConflictedFile>,
    /// Informational message
    pub message: String,
}

/// Type of merge that occurred
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum MergeType {
    /// Already up to date
    UpToDate,
    /// Fast-forward merge
    FastForward,
    /// Normal merge (with merge commit)
    Normal,
    /// Merge resulted in conflicts
    Conflicted,
}

/// Options for rebase operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct RebaseOptions {
    /// The branch/commit to rebase onto
    pub onto: String,
    /// If true, use interactive rebase (requires editor)
    pub interactive: bool,
    /// If true, preserve merge commits
    pub preserve_merges: bool,
    /// Autosquash fixup commits
    pub autosquash: bool,
}

/// Options for rebase --onto operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct RebaseOntoOptions {
    /// Target branch/commit where commits will be replayed (`new_base`)
    pub new_base: String,
    /// Starting point - commits AFTER this point will be moved (`old_base`)
    pub old_base: String,
    /// Optional branch to rebase (defaults to current branch)
    pub branch: Option<String>,
}

/// Result of a rebase operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RebaseResult {
    /// Whether the rebase was successful
    pub success: bool,
    /// Number of commits rebased
    pub commits_rebased: usize,
    /// Current commit being rebased (if in progress)
    pub current_commit: Option<String>,
    /// Total commits to rebase
    pub total_commits: Option<usize>,
    /// Conflicted files if rebase has conflicts
    pub conflicts: Vec<ConflictedFile>,
    /// Informational message
    pub message: String,
}

/// Preview data for a rebase operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RebasePreview {
    /// Commits that will be rebased (from branch tip to merge-base)
    pub commits_to_rebase: Vec<Commit>,
    /// The merge-base commit (fork point)
    pub merge_base: Commit,
    /// Target branch/commit info
    pub target: RebaseTarget,
    /// Number of commits on target since merge-base
    pub target_commits_ahead: usize,
}

/// Target information for rebase preview
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RebaseTarget {
    /// Branch name or commit `short_oid`
    pub name: String,
    /// Full commit OID
    pub oid: String,
    /// Short commit OID
    pub short_oid: String,
    /// Commit summary
    pub summary: String,
}

/// Action for each commit in interactive rebase
#[derive(
    Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type, Display, EnumString, Default,
)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "lowercase")]
pub enum RebaseAction {
    #[default]
    Pick,
    Reword,
    Edit,
    Squash,
    Fixup,
    Drop,
}

/// A single entry in the interactive rebase todo list
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct InteractiveRebaseEntry {
    /// The action to perform
    pub action: RebaseAction,
    /// Commit short OID
    pub short_oid: String,
    /// Commit full OID
    pub oid: String,
    /// Commit message summary
    pub summary: String,
    /// Original index for tracking reordering
    pub original_index: usize,
}

/// Detailed rebase progress state (parsed from .git/rebase-merge or .git/rebase-apply)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RebaseProgress {
    /// Current step number (1-based)
    pub current_step: usize,
    /// Total number of steps
    pub total_steps: usize,
    /// Branch being rebased (stripped of refs/heads/ prefix)
    pub head_name: Option<String>,
    /// Commit/branch being rebased onto
    pub onto: Option<String>,
    /// Action that caused the rebase to pause (Edit or Reword)
    pub paused_action: Option<RebaseAction>,
    /// SHA of the commit where rebase stopped
    pub stopped_sha: Option<String>,
    /// Commit message (available during Reword pause)
    pub commit_message: Option<String>,
    /// Whether the rebase is paused in amend mode (Edit action)
    pub is_amend_mode: bool,
}

/// Options for starting an interactive rebase
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct InteractiveRebaseOptions {
    /// The branch/commit to rebase onto
    pub onto: String,
    /// The ordered list of entries with actions
    pub entries: Vec<InteractiveRebaseEntry>,
    /// Whether to autosquash fixup! commits
    pub autosquash: bool,
}

/// Extended rebase preview with interactive entries
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct InteractiveRebasePreview {
    /// Base preview data
    pub preview: RebasePreview,
    /// Entries prepared for interactive editing (with default pick action)
    pub entries: Vec<InteractiveRebaseEntry>,
}

/// Options for cherry-pick operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct CherryPickOptions {
    /// Commit(s) to cherry-pick
    pub commits: Vec<String>,
    /// If true, don't create commits (stage changes only)
    pub no_commit: bool,
    /// If true, allow empty commits
    pub allow_empty: bool,
}

/// Result of a cherry-pick operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CherryPickResult {
    /// Whether the cherry-pick was successful
    pub success: bool,
    /// New commit OIDs created
    pub commit_oids: Vec<String>,
    /// Conflicted files if cherry-pick has conflicts
    pub conflicts: Vec<ConflictedFile>,
    /// Informational message
    pub message: String,
}

/// Options for revert operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct RevertOptions {
    /// Commit(s) to revert
    pub commits: Vec<String>,
    /// If true, don't create commits (stage changes only)
    pub no_commit: bool,
}

/// Result of a revert operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RevertResult {
    /// Whether the revert was successful
    pub success: bool,
    /// New commit OIDs created
    pub commit_oids: Vec<String>,
    /// Conflicted files if revert has conflicts
    pub conflicts: Vec<ConflictedFile>,
    /// Informational message
    pub message: String,
}

/// Information about a conflicted file
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConflictedFile {
    /// Path to the conflicted file
    pub path: String,
    /// Type of conflict
    pub conflict_type: ConflictType,
    /// Whether the file has been resolved
    pub is_resolved: bool,
}

/// Type of conflict
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum ConflictType {
    /// Content conflict (both sides modified)
    Content,
    /// File deleted on one side, modified on other
    DeleteModify,
    /// File added on both sides with different content
    AddAdd,
    /// File renamed differently on both sides
    RenameRename,
    /// File renamed and modified
    RenameModify,
    /// Binary file conflict
    Binary,
}

/// Three-way content for conflict resolution
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConflictContent {
    /// Path to the file
    pub path: String,
    /// Base (ancestor) content
    pub base: Option<String>,
    /// Ours (current branch) content
    pub ours: Option<String>,
    /// Theirs (incoming) content
    pub theirs: Option<String>,
    /// Current working tree content with conflict markers
    pub merged: String,
}

/// Which version to use when resolving a conflict
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum ConflictResolution {
    /// Use our version
    Ours,
    /// Use their version
    Theirs,
    /// Use custom merged content
    Merged,
}

/// Operation currently in progress
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default, Type)]
#[serde(rename_all = "PascalCase")]
pub enum OperationState {
    /// No operation in progress
    #[default]
    None,
    /// Merge in progress
    Merging {
        /// Branch being merged
        branch: Option<String>,
    },
    /// Rebase in progress
    Rebasing {
        /// Branch being rebased onto
        onto: Option<String>,
        /// Current step
        current: Option<usize>,
        /// Total steps
        total: Option<usize>,
        /// Action that caused the rebase to pause (Edit or Reword)
        #[serde(skip_serializing_if = "Option::is_none")]
        paused_action: Option<RebaseAction>,
        /// Branch being rebased (stripped of refs/heads/ prefix)
        #[serde(skip_serializing_if = "Option::is_none")]
        head_name: Option<String>,
    },
    /// Cherry-pick in progress
    CherryPicking {
        /// Commit being cherry-picked
        commit: Option<String>,
    },
    /// Revert in progress
    Reverting {
        /// Commit being reverted
        commit: Option<String>,
    },
    /// Bisect in progress
    Bisecting {
        /// Current commit being tested
        current_commit: Option<String>,
        /// Approximate steps remaining
        steps_remaining: Option<usize>,
    },
}

/// Reset mode for reset operations
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Default, Type)]
#[serde(rename_all = "PascalCase")]
pub enum ResetMode {
    /// Keep changes staged
    Soft,
    /// Keep changes unstaged
    #[default]
    Mixed,
    /// Discard all changes
    Hard,
}

/// Options for reset operations
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ResetOptions {
    /// Target commit/ref to reset to
    pub target: String,
    /// Reset mode (soft, mixed, hard)
    pub mode: ResetMode,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== MergeType Tests ====================

    #[test]
    fn test_merge_type_equality() {
        assert_eq!(MergeType::UpToDate, MergeType::UpToDate);
        assert_eq!(MergeType::FastForward, MergeType::FastForward);
        assert_eq!(MergeType::Normal, MergeType::Normal);
        assert_eq!(MergeType::Conflicted, MergeType::Conflicted);
        assert_ne!(MergeType::FastForward, MergeType::Normal);
    }

    #[test]
    fn test_merge_type_serialization() {
        assert_eq!(
            serde_json::to_string(&MergeType::UpToDate).expect("serialize"),
            "\"UpToDate\""
        );
        assert_eq!(
            serde_json::to_string(&MergeType::FastForward).expect("serialize"),
            "\"FastForward\""
        );
        assert_eq!(
            serde_json::to_string(&MergeType::Normal).expect("serialize"),
            "\"Normal\""
        );
        assert_eq!(
            serde_json::to_string(&MergeType::Conflicted).expect("serialize"),
            "\"Conflicted\""
        );
    }

    // ==================== MergeOptions Tests ====================

    #[test]
    fn test_merge_options_default() {
        let opts = MergeOptions::default();
        assert!(opts.branch.is_empty());
        assert!(opts.message.is_none());
        assert!(!opts.no_ff);
        assert!(!opts.squash);
        assert!(!opts.ff_only);
        assert!(!opts.no_commit);
    }

    #[test]
    fn test_merge_options_no_ff() {
        let opts = MergeOptions {
            branch: "feature".to_string(),
            message: Some("Merge feature".to_string()),
            no_ff: true,
            squash: false,
            ff_only: false,
            no_commit: false,
        };
        assert!(opts.no_ff);
        assert_eq!(opts.branch, "feature");
    }

    #[test]
    fn test_merge_options_squash() {
        let opts = MergeOptions {
            branch: "feature".to_string(),
            squash: true,
            ..Default::default()
        };
        assert!(opts.squash);
    }

    // ==================== MergeResult Tests ====================

    #[test]
    fn test_merge_result_fast_forward() {
        let result = MergeResult {
            success: true,
            merge_type: MergeType::FastForward,
            commit_oid: Some("abc123".to_string()),
            conflicts: vec![],
            message: "Fast-forward".to_string(),
        };
        assert!(result.success);
        assert_eq!(result.merge_type, MergeType::FastForward);
        assert!(result.conflicts.is_empty());
    }

    #[test]
    fn test_merge_result_with_conflicts() {
        let result = MergeResult {
            success: false,
            merge_type: MergeType::Conflicted,
            commit_oid: None,
            conflicts: vec![ConflictedFile {
                path: "file1.rs".to_string(),
                conflict_type: ConflictType::Content,
                is_resolved: false,
            }],
            message: "Merge conflict".to_string(),
        };
        assert!(!result.success);
        assert_eq!(result.conflicts.len(), 1);
    }

    // ==================== ConflictType Tests ====================

    #[test]
    fn test_conflict_type_equality() {
        assert_eq!(ConflictType::Content, ConflictType::Content);
        assert_eq!(ConflictType::DeleteModify, ConflictType::DeleteModify);
        assert_ne!(ConflictType::Content, ConflictType::Binary);
    }

    #[test]
    fn test_conflict_type_serialization() {
        assert_eq!(
            serde_json::to_string(&ConflictType::Content).expect("serialize"),
            "\"Content\""
        );
        assert_eq!(
            serde_json::to_string(&ConflictType::DeleteModify).expect("serialize"),
            "\"DeleteModify\""
        );
        assert_eq!(
            serde_json::to_string(&ConflictType::AddAdd).expect("serialize"),
            "\"AddAdd\""
        );
        assert_eq!(
            serde_json::to_string(&ConflictType::Binary).expect("serialize"),
            "\"Binary\""
        );
    }

    // ==================== ConflictedFile Tests ====================

    #[test]
    fn test_conflicted_file_unresolved() {
        let file = ConflictedFile {
            path: "src/main.rs".to_string(),
            conflict_type: ConflictType::Content,
            is_resolved: false,
        };
        assert_eq!(file.path, "src/main.rs");
        assert!(!file.is_resolved);
    }

    #[test]
    fn test_conflicted_file_resolved() {
        let file = ConflictedFile {
            path: "README.md".to_string(),
            conflict_type: ConflictType::DeleteModify,
            is_resolved: true,
        };
        assert!(file.is_resolved);
    }

    // ==================== RebaseOptions Tests ====================

    #[test]
    fn test_rebase_options_default() {
        let opts = RebaseOptions::default();
        assert!(opts.onto.is_empty());
        assert!(!opts.interactive);
        assert!(!opts.preserve_merges);
        assert!(!opts.autosquash);
    }

    #[test]
    fn test_rebase_options_interactive() {
        let opts = RebaseOptions {
            onto: "main".to_string(),
            interactive: true,
            preserve_merges: false,
            autosquash: true,
        };
        assert!(opts.interactive);
        assert!(opts.autosquash);
    }

    // ==================== RebaseOntoOptions Tests ====================

    #[test]
    fn test_rebase_onto_options_default() {
        let opts = RebaseOntoOptions::default();
        assert!(opts.new_base.is_empty());
        assert!(opts.old_base.is_empty());
        assert!(opts.branch.is_none());
    }

    #[test]
    fn test_rebase_onto_options_with_branch() {
        let opts = RebaseOntoOptions {
            new_base: "main".to_string(),
            old_base: "feature-old".to_string(),
            branch: Some("feature".to_string()),
        };
        assert_eq!(opts.new_base, "main");
        assert_eq!(opts.old_base, "feature-old");
        assert_eq!(opts.branch, Some("feature".to_string()));
    }

    #[test]
    fn test_rebase_onto_options_serialization() {
        let opts = RebaseOntoOptions {
            new_base: "main".to_string(),
            old_base: "feature-old".to_string(),
            branch: Some("feature".to_string()),
        };
        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"newBase\":\"main\""));
        assert!(json.contains("\"oldBase\":\"feature-old\""));
        assert!(json.contains("\"branch\":\"feature\""));
    }

    #[test]
    fn test_rebase_onto_options_deserialization() {
        let json = r#"{"newBase":"main","oldBase":"develop","branch":null}"#;
        let opts: RebaseOntoOptions = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(opts.new_base, "main");
        assert_eq!(opts.old_base, "develop");
        assert!(opts.branch.is_none());
    }

    // ==================== RebaseAction Tests ====================

    #[test]
    fn test_rebase_action_default() {
        let action = RebaseAction::default();
        assert_eq!(action, RebaseAction::Pick);
    }

    #[test]
    fn test_rebase_action_display() {
        assert_eq!(RebaseAction::Pick.to_string(), "pick");
        assert_eq!(RebaseAction::Reword.to_string(), "reword");
        assert_eq!(RebaseAction::Edit.to_string(), "edit");
        assert_eq!(RebaseAction::Squash.to_string(), "squash");
        assert_eq!(RebaseAction::Fixup.to_string(), "fixup");
        assert_eq!(RebaseAction::Drop.to_string(), "drop");
    }

    #[test]
    fn test_rebase_action_from_str() {
        use std::str::FromStr;
        assert_eq!(
            RebaseAction::from_str("pick").expect("parse"),
            RebaseAction::Pick
        );
        assert_eq!(
            RebaseAction::from_str("squash").expect("parse"),
            RebaseAction::Squash
        );
        assert_eq!(
            RebaseAction::from_str("drop").expect("parse"),
            RebaseAction::Drop
        );
    }

    // ==================== CherryPickOptions Tests ====================

    #[test]
    fn test_cherry_pick_options_default() {
        let opts = CherryPickOptions::default();
        assert!(opts.commits.is_empty());
        assert!(!opts.no_commit);
        assert!(!opts.allow_empty);
    }

    #[test]
    fn test_cherry_pick_options_multiple_commits() {
        let opts = CherryPickOptions {
            commits: vec!["abc".to_string(), "def".to_string()],
            no_commit: true,
            allow_empty: false,
        };
        assert_eq!(opts.commits.len(), 2);
        assert!(opts.no_commit);
    }

    // ==================== RevertOptions Tests ====================

    #[test]
    fn test_revert_options_default() {
        let opts = RevertOptions::default();
        assert!(opts.commits.is_empty());
        assert!(!opts.no_commit);
    }

    // ==================== ConflictResolution Tests ====================

    #[test]
    fn test_conflict_resolution_equality() {
        assert_eq!(ConflictResolution::Ours, ConflictResolution::Ours);
        assert_eq!(ConflictResolution::Theirs, ConflictResolution::Theirs);
        assert_eq!(ConflictResolution::Merged, ConflictResolution::Merged);
        assert_ne!(ConflictResolution::Ours, ConflictResolution::Theirs);
    }

    #[test]
    fn test_conflict_resolution_serialization() {
        assert_eq!(
            serde_json::to_string(&ConflictResolution::Ours).expect("serialize"),
            "\"Ours\""
        );
        assert_eq!(
            serde_json::to_string(&ConflictResolution::Theirs).expect("serialize"),
            "\"Theirs\""
        );
        assert_eq!(
            serde_json::to_string(&ConflictResolution::Merged).expect("serialize"),
            "\"Merged\""
        );
    }

    // ==================== OperationState Tests ====================

    #[test]
    fn test_operation_state_default() {
        let state = OperationState::default();
        assert_eq!(state, OperationState::None);
    }

    #[test]
    fn test_operation_state_merging() {
        let state = OperationState::Merging {
            branch: Some("feature".to_string()),
        };
        assert!(matches!(state, OperationState::Merging { .. }));
    }

    #[test]
    fn test_operation_state_rebasing() {
        let state = OperationState::Rebasing {
            onto: Some("main".to_string()),
            current: Some(3),
            total: Some(5),
            paused_action: None,
            head_name: None,
        };
        if let OperationState::Rebasing { current, total, .. } = state {
            assert_eq!(current, Some(3));
            assert_eq!(total, Some(5));
        } else {
            panic!("Expected Rebasing state");
        }
    }

    #[test]
    fn test_operation_state_rebasing_with_pause() {
        let state = OperationState::Rebasing {
            onto: Some("main".to_string()),
            current: Some(2),
            total: Some(5),
            paused_action: Some(RebaseAction::Edit),
            head_name: Some("feature-branch".to_string()),
        };
        if let OperationState::Rebasing {
            paused_action,
            head_name,
            ..
        } = state
        {
            assert_eq!(paused_action, Some(RebaseAction::Edit));
            assert_eq!(head_name, Some("feature-branch".to_string()));
        } else {
            panic!("Expected Rebasing state");
        }
    }

    #[test]
    fn test_operation_state_rebasing_serialization_without_pause() {
        let state = OperationState::Rebasing {
            onto: Some("main".to_string()),
            current: Some(1),
            total: Some(3),
            paused_action: None,
            head_name: None,
        };
        let json = serde_json::to_string(&state).expect("should serialize");
        // paused_action and head_name should be skipped when None
        assert!(!json.contains("pausedAction"));
        assert!(!json.contains("headName"));
        assert!(json.contains("Rebasing"));
    }

    #[test]
    fn test_operation_state_rebasing_serialization_with_pause() {
        let state = OperationState::Rebasing {
            onto: Some("main".to_string()),
            current: Some(2),
            total: Some(5),
            paused_action: Some(RebaseAction::Reword),
            head_name: Some("feature".to_string()),
        };
        let json = serde_json::to_string(&state).expect("should serialize");
        assert!(json.contains("Reword"));
        assert!(json.contains("feature"));
    }

    // ==================== RebaseProgress Tests ====================

    #[test]
    fn test_rebase_progress_serialization() {
        let progress = RebaseProgress {
            current_step: 3,
            total_steps: 10,
            head_name: Some("feature-branch".to_string()),
            onto: Some("abc123".to_string()),
            paused_action: Some(RebaseAction::Edit),
            stopped_sha: Some("def456".to_string()),
            commit_message: None,
            is_amend_mode: true,
        };
        let json = serde_json::to_string(&progress).expect("should serialize");
        assert!(json.contains("\"currentStep\":3"));
        assert!(json.contains("\"totalSteps\":10"));
        assert!(json.contains("\"headName\":\"feature-branch\""));
        assert!(json.contains("\"isAmendMode\":true"));
    }

    #[test]
    fn test_rebase_progress_deserialization() {
        let json = r#"{"currentStep":2,"totalSteps":5,"headName":"my-branch","onto":"abc","pausedAction":"Reword","stoppedSha":"def","commitMessage":"fix: something","isAmendMode":false}"#;
        let progress: RebaseProgress = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(progress.current_step, 2);
        assert_eq!(progress.total_steps, 5);
        assert_eq!(progress.head_name, Some("my-branch".to_string()));
        assert_eq!(progress.paused_action, Some(RebaseAction::Reword));
        assert_eq!(progress.commit_message, Some("fix: something".to_string()));
        assert!(!progress.is_amend_mode);
    }

    #[test]
    fn test_rebase_progress_no_pause() {
        let progress = RebaseProgress {
            current_step: 1,
            total_steps: 3,
            head_name: None,
            onto: None,
            paused_action: None,
            stopped_sha: None,
            commit_message: None,
            is_amend_mode: false,
        };
        assert!(progress.paused_action.is_none());
        assert!(progress.stopped_sha.is_none());
        assert!(!progress.is_amend_mode);
    }

    #[test]
    fn test_operation_state_serialization() {
        let state = OperationState::CherryPicking {
            commit: Some("abc123".to_string()),
        };
        let json = serde_json::to_string(&state).expect("should serialize");
        assert!(json.contains("CherryPicking"));
    }

    // ==================== ResetMode Tests ====================

    #[test]
    fn test_reset_mode_default() {
        let mode = ResetMode::default();
        assert_eq!(mode, ResetMode::Mixed);
    }

    #[test]
    fn test_reset_mode_equality() {
        assert_eq!(ResetMode::Soft, ResetMode::Soft);
        assert_eq!(ResetMode::Mixed, ResetMode::Mixed);
        assert_eq!(ResetMode::Hard, ResetMode::Hard);
        assert_ne!(ResetMode::Soft, ResetMode::Hard);
    }

    #[test]
    fn test_reset_mode_serialization() {
        assert_eq!(
            serde_json::to_string(&ResetMode::Soft).expect("serialize"),
            "\"Soft\""
        );
        assert_eq!(
            serde_json::to_string(&ResetMode::Mixed).expect("serialize"),
            "\"Mixed\""
        );
        assert_eq!(
            serde_json::to_string(&ResetMode::Hard).expect("serialize"),
            "\"Hard\""
        );
    }

    // ==================== ResetOptions Tests ====================

    #[test]
    fn test_reset_options_default() {
        let opts = ResetOptions::default();
        assert!(opts.target.is_empty());
        assert_eq!(opts.mode, ResetMode::Mixed);
    }

    #[test]
    fn test_reset_options_hard() {
        let opts = ResetOptions {
            target: "HEAD~1".to_string(),
            mode: ResetMode::Hard,
        };
        assert_eq!(opts.target, "HEAD~1");
        assert_eq!(opts.mode, ResetMode::Hard);
    }

    // ==================== ConflictContent Tests ====================

    #[test]
    fn test_conflict_content_all_present() {
        let content = ConflictContent {
            path: "file.rs".to_string(),
            base: Some("base content".to_string()),
            ours: Some("our content".to_string()),
            theirs: Some("their content".to_string()),
            merged: "<<<<<<\nours\n======\ntheirs\n>>>>>>".to_string(),
        };
        assert!(content.base.is_some());
        assert!(content.ours.is_some());
        assert!(content.theirs.is_some());
    }

    #[test]
    fn test_conflict_content_new_file() {
        let content = ConflictContent {
            path: "new.rs".to_string(),
            base: None,
            ours: Some("our version".to_string()),
            theirs: Some("their version".to_string()),
            merged: "conflict".to_string(),
        };
        assert!(content.base.is_none());
    }
}
