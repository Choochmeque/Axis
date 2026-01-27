use serde::{Deserialize, Serialize};
use specta::Type;

/// Options for starting a bisect session
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct BisectStartOptions {
    /// The known bad commit (defaults to HEAD if not specified)
    pub bad_commit: Option<String>,
    /// The known good commit
    pub good_commit: String,
}

/// Result of a bisect operation step
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BisectResult {
    /// Whether the operation was successful
    pub success: bool,
    /// Current bisect state
    pub state: BisectState,
    /// Informational message
    pub message: String,
}

/// Current state of the bisect session
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct BisectState {
    /// Whether bisect is in progress
    pub is_active: bool,
    /// Current commit being tested (if any)
    pub current_commit: Option<String>,
    /// Number of remaining steps (approximate)
    pub steps_remaining: Option<usize>,
    /// Total commits in range
    pub total_commits: Option<usize>,
    /// The bad commit
    pub bad_commit: Option<String>,
    /// The good commit(s)
    pub good_commits: Vec<String>,
    /// Skipped commits
    pub skipped_commits: Vec<String>,
    /// The first bad commit (when bisect completes)
    pub first_bad_commit: Option<String>,
}

/// Mark type for bisect marking operations
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum BisectMarkType {
    /// Mark commit as good
    Good,
    /// Mark commit as bad
    Bad,
    /// Skip this commit (cannot be tested)
    Skip,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== BisectMarkType Tests ====================

    #[test]
    fn test_bisect_mark_type_equality() {
        assert_eq!(BisectMarkType::Good, BisectMarkType::Good);
        assert_eq!(BisectMarkType::Bad, BisectMarkType::Bad);
        assert_eq!(BisectMarkType::Skip, BisectMarkType::Skip);
        assert_ne!(BisectMarkType::Good, BisectMarkType::Bad);
    }

    #[test]
    fn test_bisect_mark_type_serialization() {
        let good = BisectMarkType::Good;
        let json = serde_json::to_string(&good).expect("should serialize");
        assert_eq!(json, "\"Good\"");

        let bad = BisectMarkType::Bad;
        let json = serde_json::to_string(&bad).expect("should serialize");
        assert_eq!(json, "\"Bad\"");

        let skip = BisectMarkType::Skip;
        let json = serde_json::to_string(&skip).expect("should serialize");
        assert_eq!(json, "\"Skip\"");
    }

    #[test]
    fn test_bisect_mark_type_deserialization() {
        let good: BisectMarkType = serde_json::from_str("\"Good\"").expect("should deserialize");
        assert_eq!(good, BisectMarkType::Good);

        let bad: BisectMarkType = serde_json::from_str("\"Bad\"").expect("should deserialize");
        assert_eq!(bad, BisectMarkType::Bad);
    }

    // ==================== BisectStartOptions Tests ====================

    #[test]
    fn test_bisect_start_options_default() {
        let opts = BisectStartOptions::default();
        assert!(opts.bad_commit.is_none());
        assert!(opts.good_commit.is_empty());
    }

    #[test]
    fn test_bisect_start_options_with_commits() {
        let opts = BisectStartOptions {
            bad_commit: Some("abc123".to_string()),
            good_commit: "def456".to_string(),
        };

        assert_eq!(opts.bad_commit, Some("abc123".to_string()));
        assert_eq!(opts.good_commit, "def456");
    }

    #[test]
    fn test_bisect_start_options_serialization() {
        let opts = BisectStartOptions {
            bad_commit: Some("HEAD".to_string()),
            good_commit: "v1.0.0".to_string(),
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"badCommit\":\"HEAD\""));
        assert!(json.contains("\"goodCommit\":\"v1.0.0\""));
    }

    // ==================== BisectState Tests ====================

    #[test]
    fn test_bisect_state_default() {
        let state = BisectState::default();
        assert!(!state.is_active);
        assert!(state.current_commit.is_none());
        assert!(state.steps_remaining.is_none());
        assert!(state.total_commits.is_none());
        assert!(state.bad_commit.is_none());
        assert!(state.good_commits.is_empty());
        assert!(state.skipped_commits.is_empty());
        assert!(state.first_bad_commit.is_none());
    }

    #[test]
    fn test_bisect_state_active() {
        let state = BisectState {
            is_active: true,
            current_commit: Some("abc123".to_string()),
            steps_remaining: Some(3),
            total_commits: Some(10),
            bad_commit: Some("bad123".to_string()),
            good_commits: vec!["good456".to_string()],
            skipped_commits: vec![],
            first_bad_commit: None,
        };

        assert!(state.is_active);
        assert_eq!(state.current_commit, Some("abc123".to_string()));
        assert_eq!(state.steps_remaining, Some(3));
        assert_eq!(state.good_commits.len(), 1);
    }

    #[test]
    fn test_bisect_state_completed() {
        let state = BisectState {
            is_active: false,
            current_commit: None,
            steps_remaining: Some(0),
            total_commits: Some(10),
            bad_commit: Some("bad123".to_string()),
            good_commits: vec!["good456".to_string()],
            skipped_commits: vec!["skip789".to_string()],
            first_bad_commit: Some("culprit".to_string()),
        };

        assert!(!state.is_active);
        assert_eq!(state.first_bad_commit, Some("culprit".to_string()));
        assert_eq!(state.skipped_commits.len(), 1);
    }

    #[test]
    fn test_bisect_state_serialization() {
        let state = BisectState {
            is_active: true,
            current_commit: Some("test".to_string()),
            steps_remaining: Some(5),
            total_commits: Some(20),
            bad_commit: Some("bad".to_string()),
            good_commits: vec!["good1".to_string(), "good2".to_string()],
            skipped_commits: vec![],
            first_bad_commit: None,
        };

        let json = serde_json::to_string(&state).expect("should serialize");
        assert!(json.contains("\"isActive\":true"));
        assert!(json.contains("\"currentCommit\":\"test\""));
        assert!(json.contains("\"stepsRemaining\":5"));
        assert!(json.contains("\"goodCommits\":[\"good1\",\"good2\"]"));
    }

    // ==================== BisectResult Tests ====================

    #[test]
    fn test_bisect_result_success() {
        let result = BisectResult {
            success: true,
            state: BisectState::default(),
            message: "Bisect started".to_string(),
        };

        assert!(result.success);
        assert_eq!(result.message, "Bisect started");
    }

    #[test]
    fn test_bisect_result_with_found_commit() {
        let result = BisectResult {
            success: true,
            state: BisectState {
                is_active: false,
                first_bad_commit: Some("abc123".to_string()),
                ..Default::default()
            },
            message: "Found the first bad commit".to_string(),
        };

        assert!(result.success);
        assert_eq!(result.state.first_bad_commit, Some("abc123".to_string()));
    }

    #[test]
    fn test_bisect_result_serialization() {
        let result = BisectResult {
            success: true,
            state: BisectState::default(),
            message: "OK".to_string(),
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"message\":\"OK\""));
    }
}
