use serde::Serialize;
use specta::Type;
use tauri_specta::Event;

/// Files in the repository changed
#[derive(Clone, Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct FilesChangedEvent {
    pub paths: Vec<String>,
}

/// The index (staging area) changed
#[derive(Clone, Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct IndexChangedEvent;

/// A ref (branch, tag) changed
#[derive(Clone, Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct RefChangedEvent {
    pub ref_name: String,
}

/// HEAD changed (checkout, commit)
#[derive(Clone, Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct HeadChangedEvent;

/// Watch error occurred
#[derive(Clone, Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct WatchErrorEvent {
    pub message: String,
}

/// Repository has changes (for inactive repo tab badges)
#[derive(Clone, Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryDirtyEvent {
    pub path: String,
}

/// Remote fetch completed with new commits
#[derive(Clone, Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct RemoteFetchedEvent {
    pub path: String,
    pub new_commits: u32,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== FilesChangedEvent Tests ====================

    #[test]
    fn test_files_changed_event_creation() {
        let event = FilesChangedEvent {
            paths: vec!["src/main.rs".to_string(), "Cargo.toml".to_string()],
        };

        assert_eq!(event.paths.len(), 2);
        assert!(event.paths.contains(&"src/main.rs".to_string()));
    }

    #[test]
    fn test_files_changed_event_empty() {
        let event = FilesChangedEvent { paths: vec![] };
        assert!(event.paths.is_empty());
    }

    #[test]
    fn test_files_changed_event_serialization() {
        let event = FilesChangedEvent {
            paths: vec!["file.txt".to_string()],
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"paths\":[\"file.txt\"]"));
    }

    // ==================== IndexChangedEvent Tests ====================

    #[test]
    fn test_index_changed_event_serialization() {
        let event = IndexChangedEvent;
        let json = serde_json::to_string(&event).expect("should serialize");
        assert_eq!(json, "null");
    }

    // ==================== RefChangedEvent Tests ====================

    #[test]
    fn test_ref_changed_event_creation() {
        let event = RefChangedEvent {
            ref_name: "refs/heads/main".to_string(),
        };

        assert_eq!(event.ref_name, "refs/heads/main");
    }

    #[test]
    fn test_ref_changed_event_serialization() {
        let event = RefChangedEvent {
            ref_name: "refs/tags/v1.0.0".to_string(),
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"refName\":\"refs/tags/v1.0.0\""));
    }

    // ==================== HeadChangedEvent Tests ====================

    #[test]
    fn test_head_changed_event_serialization() {
        let event = HeadChangedEvent;
        let json = serde_json::to_string(&event).expect("should serialize");
        assert_eq!(json, "null");
    }

    // ==================== WatchErrorEvent Tests ====================

    #[test]
    fn test_watch_error_event_creation() {
        let event = WatchErrorEvent {
            message: "Permission denied".to_string(),
        };

        assert_eq!(event.message, "Permission denied");
    }

    #[test]
    fn test_watch_error_event_serialization() {
        let event = WatchErrorEvent {
            message: "Error occurred".to_string(),
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"message\":\"Error occurred\""));
    }

    // ==================== RepositoryDirtyEvent Tests ====================

    #[test]
    fn test_repository_dirty_event_creation() {
        let event = RepositoryDirtyEvent {
            path: "/home/user/project".to_string(),
        };

        assert_eq!(event.path, "/home/user/project");
    }

    #[test]
    fn test_repository_dirty_event_serialization() {
        let event = RepositoryDirtyEvent {
            path: "/path/to/repo".to_string(),
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"path\":\"/path/to/repo\""));
    }

    // ==================== RemoteFetchedEvent Tests ====================

    #[test]
    fn test_remote_fetched_event_creation() {
        let event = RemoteFetchedEvent {
            path: "/repo".to_string(),
            new_commits: 5,
        };

        assert_eq!(event.new_commits, 5);
    }

    #[test]
    fn test_remote_fetched_event_no_commits() {
        let event = RemoteFetchedEvent {
            path: "/repo".to_string(),
            new_commits: 0,
        };

        assert_eq!(event.new_commits, 0);
    }

    #[test]
    fn test_remote_fetched_event_serialization() {
        let event = RemoteFetchedEvent {
            path: "/test".to_string(),
            new_commits: 10,
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"newCommits\":10"));
    }
}
