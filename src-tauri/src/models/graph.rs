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
