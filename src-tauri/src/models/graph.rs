use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

use super::{BranchFilterType, Commit, SortOrder};

/// A commit with graph layout information for visualization
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GraphCommit {
    /// The underlying commit data
    #[serde(flatten)]
    pub commit: Commit,
    /// The lane (column) this commit occupies
    pub lane: usize,
    /// Connections to parent commits
    pub parent_edges: Vec<GraphEdge>,
    /// Branch/tag refs pointing to this commit
    pub refs: Vec<CommitRef>,
}

/// An edge connecting a commit to its parent in the graph
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GraphEdge {
    /// The parent commit OID
    pub parent_oid: String,
    /// The lane of the parent commit
    pub parent_lane: usize,
    /// The type of edge (straight, merge, branch)
    pub edge_type: EdgeType,
}

/// Type of edge in the commit graph
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum EdgeType {
    /// Straight line (same lane)
    Straight,
    /// Merge edge (coming from a different lane)
    Merge,
    /// Branch edge (going to a different lane)
    Branch,
    /// Merge preview edge (dashed line showing merge source)
    MergePreview,
}

/// A reference (branch or tag) pointing to a commit
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CommitRef {
    pub name: String,
    pub ref_type: RefType,
    pub is_head: bool,
}

/// Type of reference
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum RefType {
    LocalBranch,
    RemoteBranch,
    Tag,
}

/// Options for graph generation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GraphOptions {
    /// Maximum number of commits to include
    pub limit: Option<usize>,
    /// Number of commits to skip (for pagination)
    pub skip: Option<usize>,
    /// Start from a specific ref
    pub from_ref: Option<String>,
    /// Include all branches (not just current) - deprecated, use branch_filter instead
    #[serde(default)]
    pub all_branches: bool,
    /// Branch filter (all, current, or specific branch)
    #[serde(default)]
    pub branch_filter: BranchFilterType,
    /// Whether to include remote branches
    #[serde(default = "default_include_remotes")]
    pub include_remotes: bool,
    /// Sort order for commits
    #[serde(default)]
    pub sort_order: SortOrder,
    /// Whether to include uncommitted changes as first entry
    #[serde(default)]
    pub include_uncommitted: bool,
}

fn default_include_remotes() -> bool {
    true
}

impl Default for GraphOptions {
    fn default() -> Self {
        GraphOptions {
            limit: Some(100),
            skip: None,
            from_ref: None,
            all_branches: true,
            branch_filter: BranchFilterType::default(),
            include_remotes: true,
            sort_order: SortOrder::default(),
            include_uncommitted: false,
        }
    }
}

/// Result of graph generation with metadata
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GraphResult {
    /// The commits with graph layout
    pub commits: Vec<GraphCommit>,
    /// Total number of commits (for pagination)
    pub total_count: usize,
    /// Maximum lane used (for graph width calculation)
    pub max_lane: usize,
    /// Whether there are more commits
    pub has_more: bool,
}

/// Search options for commit search
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchOptions {
    /// Search query
    pub query: String,
    /// Search in message
    pub search_message: bool,
    /// Search in author name/email
    pub search_author: bool,
    /// Search in commit hash
    pub search_hash: bool,
    /// Maximum results
    pub limit: Option<usize>,
}

impl Default for SearchOptions {
    fn default() -> Self {
        SearchOptions {
            query: String::new(),
            search_message: true,
            search_author: true,
            search_hash: true,
            limit: Some(50),
        }
    }
}

/// Search result
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub commits: Vec<Commit>,
    pub total_matches: usize,
}

/// Options for file history (log for specific files)
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileLogOptions {
    /// Paths to filter commits by
    pub paths: Vec<String>,
    /// Maximum number of commits to return
    pub limit: Option<usize>,
    /// Number of commits to skip (for pagination)
    pub skip: Option<usize>,
    /// Follow file renames
    #[serde(default)]
    pub follow_renames: bool,
}

impl Default for FileLogOptions {
    fn default() -> Self {
        FileLogOptions {
            paths: Vec::new(),
            limit: Some(50),
            skip: None,
            follow_renames: false,
        }
    }
}

/// Result of file history query
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileLogResult {
    /// Commits that modified the specified files
    pub commits: Vec<Commit>,
    /// Whether there are more commits
    pub has_more: bool,
}

/// Blame information for a file
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BlameResult {
    pub path: String,
    pub lines: Vec<BlameLine>,
}

/// A single line in a blame result
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct BlameLine {
    /// Line number (1-indexed)
    pub line_number: usize,
    /// The commit OID that last modified this line
    pub commit_oid: String,
    /// Short commit OID
    pub short_oid: String,
    /// Author name
    pub author: String,
    /// When the line was last modified
    pub timestamp: chrono::DateTime<chrono::Utc>,
    /// The actual line content
    pub content: String,
    /// Original line number in the commit
    pub original_line: usize,
    /// Whether this is the first line of a group from the same commit
    pub is_group_start: bool,
}

/// Internal structure for tracking lane assignments during graph building
#[derive(Debug, Clone)]
pub struct LaneState {
    /// Currently active lanes (commit OID expected in each lane)
    pub active_lanes: Vec<Option<String>>,
    /// Mapping from commit OID to assigned lane
    pub commit_lanes: HashMap<String, usize>,
}

impl LaneState {
    pub fn new() -> Self {
        LaneState {
            active_lanes: Vec::new(),
            commit_lanes: HashMap::new(),
        }
    }

    fn find_active_lane(&self, oid: &str) -> Option<usize> {
        self.active_lanes
            .iter()
            .enumerate()
            .find_map(|(lane, active)| {
                if active.as_deref() == Some(oid) {
                    Some(lane)
                } else {
                    None
                }
            })
    }

    pub fn find_lane(&self, oid: &str) -> Option<usize> {
        self.commit_lanes
            .get(oid)
            .copied()
            .or_else(|| self.find_active_lane(oid))
    }

    /// Find or allocate a lane for a commit
    pub fn get_lane_for_commit(&mut self, oid: &str) -> (usize, bool) {
        // Check if this commit already has an assigned lane
        if let Some(&lane) = self.commit_lanes.get(oid) {
            return (lane, false);
        }

        // Look for this commit in active lanes
        if let Some(lane) = self.find_active_lane(oid) {
            self.commit_lanes.insert(oid.to_string(), lane);
            return (lane, false);
        }

        // Allocate a new lane
        let lane = self.allocate_new_lane();
        self.commit_lanes.insert(oid.to_string(), lane);
        (lane, true)
    }

    /// Allocate a new lane, reusing an empty slot if available
    fn allocate_new_lane(&mut self) -> usize {
        // Look for an empty lane
        for (lane, active) in self.active_lanes.iter().enumerate() {
            if active.is_none() {
                return lane;
            }
        }
        // No empty lane, create a new one
        let lane = self.active_lanes.len();
        self.active_lanes.push(None);
        lane
    }

    /// Update lanes after processing a commit
    pub fn process_commit(&mut self, oid: &str, lane: usize, parent_oids: &[String]) {
        // Clear this commit from its lane
        if lane < self.active_lanes.len() {
            self.active_lanes[lane] = None;
        }

        // Reserve lanes for parents
        if parent_oids.is_empty() {
            return;
        }

        // First parent takes the current lane unless it already belongs to another lane
        if let Some(first_parent) = parent_oids.first() {
            let parent_lane = self.find_lane(first_parent);
            if parent_lane.is_some() && parent_lane != Some(lane) {
                // Parent already tracked on another lane, don't hijack it
                if lane < self.active_lanes.len() {
                    self.active_lanes[lane] = None;
                }
            } else {
                if lane < self.active_lanes.len() {
                    self.active_lanes[lane] = Some(first_parent.clone());
                } else {
                    while self.active_lanes.len() <= lane {
                        self.active_lanes.push(None);
                    }
                    self.active_lanes[lane] = Some(first_parent.clone());
                }
            }
        }

        // Other parents get new lanes (merge commits)
        for parent_oid in parent_oids.iter().skip(1) {
            // Check if parent already has a lane
            let parent_has_lane = self
                .active_lanes
                .iter()
                .any(|l| l.as_deref() == Some(parent_oid));
            if !parent_has_lane {
                let new_lane = self.allocate_new_lane();
                if new_lane < self.active_lanes.len() {
                    self.active_lanes[new_lane] = Some(parent_oid.clone());
                }
            }
        }
    }

    /// Get the lane for a parent, allocating if necessary
    pub fn get_parent_lane(&mut self, parent_oid: &str) -> usize {
        // Check if parent already has an assigned lane
        if let Some(&lane) = self.commit_lanes.get(parent_oid) {
            return lane;
        }

        // Look for parent in active lanes
        if let Some(lane) = self.find_active_lane(parent_oid) {
            return lane;
        }

        // Allocate new lane for parent
        let lane = self.allocate_new_lane();
        self.active_lanes[lane] = Some(parent_oid.to_string());
        lane
    }

    /// Get the maximum lane currently in use
    pub fn max_lane(&self) -> usize {
        self.active_lanes.len().saturating_sub(1)
    }
}

impl Default for LaneState {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== LaneState Tests ====================

    #[test]
    fn test_lane_state_new() {
        let state = LaneState::new();
        assert!(state.active_lanes.is_empty());
        assert!(state.commit_lanes.is_empty());
    }

    #[test]
    fn test_lane_state_default() {
        let state = LaneState::default();
        assert!(state.active_lanes.is_empty());
        assert!(state.commit_lanes.is_empty());
    }

    #[test]
    fn test_get_lane_for_commit_new_commit() {
        let mut state = LaneState::new();
        let (lane, is_new) = state.get_lane_for_commit("abc123");
        assert_eq!(lane, 0);
        assert!(is_new);
        assert_eq!(state.commit_lanes.get("abc123"), Some(&0));
    }

    #[test]
    fn test_get_lane_for_commit_existing_in_commit_lanes() {
        let mut state = LaneState::new();
        state.commit_lanes.insert("abc123".to_string(), 5);

        let (lane, is_new) = state.get_lane_for_commit("abc123");
        assert_eq!(lane, 5);
        assert!(!is_new);
    }

    #[test]
    fn test_get_lane_for_commit_existing_in_active_lanes() {
        let mut state = LaneState::new();
        state.active_lanes = vec![None, Some("abc123".to_string()), None];

        let (lane, is_new) = state.get_lane_for_commit("abc123");
        assert_eq!(lane, 1);
        assert!(!is_new);
        assert_eq!(state.commit_lanes.get("abc123"), Some(&1));
    }

    #[test]
    fn test_get_lane_for_commit_multiple_commits() {
        let mut state = LaneState::new();

        // First commit gets lane 0
        let (lane1, is_new1) = state.get_lane_for_commit("commit1");
        assert_eq!(lane1, 0);
        assert!(is_new1);

        // Mark lane 0 as used (not empty) so next commit gets lane 1
        state.active_lanes[0] = Some("commit1".to_string());

        let (lane2, is_new2) = state.get_lane_for_commit("commit2");
        assert_eq!(lane2, 1);
        assert!(is_new2);

        // Mark lane 1 as used so next commit gets lane 2
        state.active_lanes[1] = Some("commit2".to_string());

        let (lane3, is_new3) = state.get_lane_for_commit("commit3");
        assert_eq!(lane3, 2);
        assert!(is_new3);
    }

    #[test]
    fn test_get_lane_for_commit_reuses_empty_lane() {
        let mut state = LaneState::new();
        state.active_lanes = vec![Some("a".to_string()), None, Some("c".to_string())];

        let (lane, is_new) = state.get_lane_for_commit("new_commit");
        assert_eq!(lane, 1); // Should reuse the empty lane at index 1
        assert!(is_new);
    }

    #[test]
    fn test_find_lane_from_commit_lanes() {
        let mut state = LaneState::new();
        state.commit_lanes.insert("abc123".to_string(), 3);

        assert_eq!(state.find_lane("abc123"), Some(3));
    }

    #[test]
    fn test_find_lane_from_active_lanes() {
        let mut state = LaneState::new();
        state.active_lanes = vec![None, Some("abc123".to_string())];

        assert_eq!(state.find_lane("abc123"), Some(1));
    }

    #[test]
    fn test_find_lane_not_found() {
        let state = LaneState::new();
        assert_eq!(state.find_lane("nonexistent"), None);
    }

    #[test]
    fn test_find_lane_prefers_commit_lanes_over_active() {
        let mut state = LaneState::new();
        state.commit_lanes.insert("abc123".to_string(), 5);
        state.active_lanes = vec![None, Some("abc123".to_string())];

        // commit_lanes takes precedence
        assert_eq!(state.find_lane("abc123"), Some(5));
    }

    #[test]
    fn test_process_commit_clears_lane() {
        let mut state = LaneState::new();
        state.active_lanes = vec![Some("commit1".to_string()), Some("commit2".to_string())];

        state.process_commit("commit1", 0, &[]);

        assert_eq!(state.active_lanes[0], None);
        assert_eq!(state.active_lanes[1], Some("commit2".to_string()));
    }

    #[test]
    fn test_process_commit_with_single_parent() {
        let mut state = LaneState::new();
        state.active_lanes = vec![Some("child".to_string())];

        let parents = vec!["parent1".to_string()];
        state.process_commit("child", 0, &parents);

        assert_eq!(state.active_lanes[0], Some("parent1".to_string()));
    }

    #[test]
    fn test_process_commit_with_no_parents() {
        let mut state = LaneState::new();
        state.active_lanes = vec![Some("root".to_string())];

        state.process_commit("root", 0, &[]);

        assert_eq!(state.active_lanes[0], None);
    }

    #[test]
    fn test_process_commit_with_merge_parents() {
        let mut state = LaneState::new();
        state.active_lanes = vec![Some("merge".to_string())];

        let parents = vec!["parent1".to_string(), "parent2".to_string()];
        state.process_commit("merge", 0, &parents);

        assert_eq!(state.active_lanes[0], Some("parent1".to_string()));
        assert!(state.active_lanes.len() >= 2);
        assert_eq!(state.active_lanes[1], Some("parent2".to_string()));
    }

    #[test]
    fn test_process_commit_parent_already_has_lane() {
        let mut state = LaneState::new();
        state.active_lanes = vec![Some("child".to_string()), Some("parent1".to_string())];

        let parents = vec!["parent1".to_string()];
        state.process_commit("child", 0, &parents);

        // Parent already tracked on lane 1, so lane 0 should be cleared
        assert_eq!(state.active_lanes[0], None);
        assert_eq!(state.active_lanes[1], Some("parent1".to_string()));
    }

    #[test]
    fn test_process_commit_expands_lanes_if_needed() {
        let mut state = LaneState::new();
        // Empty active_lanes but process at lane 2
        state.process_commit("commit", 2, &["parent".to_string()]);

        assert!(state.active_lanes.len() > 2);
        assert_eq!(state.active_lanes[2], Some("parent".to_string()));
    }

    #[test]
    fn test_get_parent_lane_existing_in_commit_lanes() {
        let mut state = LaneState::new();
        state.commit_lanes.insert("parent".to_string(), 3);

        let lane = state.get_parent_lane("parent");
        assert_eq!(lane, 3);
    }

    #[test]
    fn test_get_parent_lane_existing_in_active_lanes() {
        let mut state = LaneState::new();
        state.active_lanes = vec![None, Some("parent".to_string())];

        let lane = state.get_parent_lane("parent");
        assert_eq!(lane, 1);
    }

    #[test]
    fn test_get_parent_lane_allocates_new() {
        let mut state = LaneState::new();

        let lane = state.get_parent_lane("new_parent");
        assert_eq!(lane, 0);
        assert_eq!(state.active_lanes[0], Some("new_parent".to_string()));
    }

    #[test]
    fn test_max_lane_empty() {
        let state = LaneState::new();
        assert_eq!(state.max_lane(), 0);
    }

    #[test]
    fn test_max_lane_with_lanes() {
        let mut state = LaneState::new();
        state.active_lanes = vec![None, None, None, None, None];

        assert_eq!(state.max_lane(), 4);
    }

    #[test]
    fn test_max_lane_single() {
        let mut state = LaneState::new();
        state.active_lanes = vec![Some("a".to_string())];

        assert_eq!(state.max_lane(), 0);
    }

    // ==================== GraphOptions Tests ====================

    #[test]
    fn test_graph_options_default() {
        let opts = GraphOptions::default();
        assert_eq!(opts.limit, Some(100));
        assert_eq!(opts.skip, None);
        assert_eq!(opts.from_ref, None);
        assert!(opts.all_branches);
        assert_eq!(opts.branch_filter, BranchFilterType::default());
        assert!(opts.include_remotes);
        assert_eq!(opts.sort_order, SortOrder::default());
        assert!(!opts.include_uncommitted);
    }

    // ==================== SearchOptions Tests ====================

    #[test]
    fn test_search_options_default() {
        let opts = SearchOptions::default();
        assert_eq!(opts.query, String::new());
        assert!(opts.search_message);
        assert!(opts.search_author);
        assert!(opts.search_hash);
        assert_eq!(opts.limit, Some(50));
    }

    // ==================== FileLogOptions Tests ====================

    #[test]
    fn test_file_log_options_default() {
        let opts = FileLogOptions::default();
        assert!(opts.paths.is_empty());
        assert_eq!(opts.limit, Some(50));
        assert_eq!(opts.skip, None);
        assert!(!opts.follow_renames);
    }

    // ==================== EdgeType Tests ====================

    #[test]
    fn test_edge_type_equality() {
        assert_eq!(EdgeType::Straight, EdgeType::Straight);
        assert_eq!(EdgeType::Merge, EdgeType::Merge);
        assert_eq!(EdgeType::Branch, EdgeType::Branch);
        assert_eq!(EdgeType::MergePreview, EdgeType::MergePreview);
        assert_ne!(EdgeType::Straight, EdgeType::Merge);
    }

    // ==================== RefType Tests ====================

    #[test]
    fn test_ref_type_equality() {
        assert_eq!(RefType::LocalBranch, RefType::LocalBranch);
        assert_eq!(RefType::RemoteBranch, RefType::RemoteBranch);
        assert_eq!(RefType::Tag, RefType::Tag);
        assert_ne!(RefType::LocalBranch, RefType::RemoteBranch);
    }

    // ==================== Serialization Tests ====================

    #[test]
    fn test_edge_type_serialization() {
        let edge = EdgeType::Straight;
        let json = serde_json::to_string(&edge).expect("should serialize EdgeType");
        assert_eq!(json, "\"Straight\"");

        let merge = EdgeType::Merge;
        let json = serde_json::to_string(&merge).expect("should serialize EdgeType");
        assert_eq!(json, "\"Merge\"");
    }

    #[test]
    fn test_ref_type_serialization() {
        let local = RefType::LocalBranch;
        let json = serde_json::to_string(&local).expect("should serialize RefType");
        assert_eq!(json, "\"LocalBranch\"");
    }

    #[test]
    fn test_graph_edge_serialization() {
        let edge = GraphEdge {
            parent_oid: "abc123".to_string(),
            parent_lane: 2,
            edge_type: EdgeType::Merge,
        };
        let json = serde_json::to_string(&edge).expect("should serialize GraphEdge");
        assert!(json.contains("\"parentOid\":\"abc123\""));
        assert!(json.contains("\"parentLane\":2"));
        assert!(json.contains("\"edgeType\":\"Merge\""));
    }

    #[test]
    fn test_commit_ref_serialization() {
        let commit_ref = CommitRef {
            name: "main".to_string(),
            ref_type: RefType::LocalBranch,
            is_head: true,
        };
        let json = serde_json::to_string(&commit_ref).expect("should serialize CommitRef");
        assert!(json.contains("\"name\":\"main\""));
        assert!(json.contains("\"refType\":\"LocalBranch\""));
        assert!(json.contains("\"isHead\":true"));
    }

    #[test]
    fn test_graph_options_serialization_roundtrip() {
        let opts = GraphOptions {
            limit: Some(50),
            skip: Some(10),
            from_ref: Some("main".to_string()),
            all_branches: false,
            branch_filter: BranchFilterType::Current,
            include_remotes: false,
            sort_order: SortOrder::AncestorOrder,
            include_uncommitted: true,
        };

        let json = serde_json::to_string(&opts).expect("should serialize GraphOptions");
        let deserialized: GraphOptions =
            serde_json::from_str(&json).expect("should deserialize GraphOptions");

        assert_eq!(deserialized.limit, Some(50));
        assert_eq!(deserialized.skip, Some(10));
        assert_eq!(deserialized.from_ref, Some("main".to_string()));
        assert!(!deserialized.all_branches);
        assert_eq!(deserialized.branch_filter, BranchFilterType::Current);
        assert!(!deserialized.include_remotes);
        assert_eq!(deserialized.sort_order, SortOrder::AncestorOrder);
        assert!(deserialized.include_uncommitted);
    }

    #[test]
    fn test_search_options_serialization_roundtrip() {
        let opts = SearchOptions {
            query: "test query".to_string(),
            search_message: false,
            search_author: true,
            search_hash: false,
            limit: Some(25),
        };

        let json = serde_json::to_string(&opts).expect("should serialize SearchOptions");
        let deserialized: SearchOptions =
            serde_json::from_str(&json).expect("should deserialize SearchOptions");

        assert_eq!(deserialized.query, "test query");
        assert!(!deserialized.search_message);
        assert!(deserialized.search_author);
        assert!(!deserialized.search_hash);
        assert_eq!(deserialized.limit, Some(25));
    }

    #[test]
    fn test_file_log_options_serialization_roundtrip() {
        let opts = FileLogOptions {
            paths: vec!["src/main.rs".to_string(), "Cargo.toml".to_string()],
            limit: Some(100),
            skip: Some(5),
            follow_renames: true,
        };

        let json = serde_json::to_string(&opts).expect("should serialize FileLogOptions");
        let deserialized: FileLogOptions =
            serde_json::from_str(&json).expect("should deserialize FileLogOptions");

        assert_eq!(deserialized.paths, vec!["src/main.rs", "Cargo.toml"]);
        assert_eq!(deserialized.limit, Some(100));
        assert_eq!(deserialized.skip, Some(5));
        assert!(deserialized.follow_renames);
    }

    // ==================== Complex Scenario Tests ====================

    #[test]
    fn test_lane_state_linear_history() {
        let mut state = LaneState::new();

        // Simulate processing commits in linear order: C3 -> C2 -> C1 -> C0
        let (lane, _) = state.get_lane_for_commit("C3");
        assert_eq!(lane, 0);
        state.process_commit("C3", 0, &["C2".to_string()]);

        let (lane, _) = state.get_lane_for_commit("C2");
        assert_eq!(lane, 0); // Should reuse same lane
        state.process_commit("C2", 0, &["C1".to_string()]);

        let (lane, _) = state.get_lane_for_commit("C1");
        assert_eq!(lane, 0);
        state.process_commit("C1", 0, &["C0".to_string()]);

        let (lane, _) = state.get_lane_for_commit("C0");
        assert_eq!(lane, 0);
        state.process_commit("C0", 0, &[]);

        // In linear history, max lane should stay at 0
        assert_eq!(state.max_lane(), 0);
    }

    #[test]
    fn test_lane_state_branch_and_merge() {
        let mut state = LaneState::new();

        // Merge commit M with parents P1 and P2
        let (lane, _) = state.get_lane_for_commit("M");
        assert_eq!(lane, 0);
        state.process_commit("M", 0, &["P1".to_string(), "P2".to_string()]);

        // P1 should be on lane 0, P2 on lane 1
        assert_eq!(state.find_lane("P1"), Some(0));
        let p2_lane = state.get_parent_lane("P2");
        assert!(p2_lane >= 1);
    }
}
