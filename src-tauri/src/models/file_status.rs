use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FileStatus {
    pub path: String,
    pub status: StatusType,
    pub staged_status: Option<StatusType>,
    pub unstaged_status: Option<StatusType>,
    pub is_conflict: bool,
    pub old_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum StatusType {
    Untracked,
    Added,
    Modified,
    Deleted,
    Renamed,
    Copied,
    TypeChanged,
    Ignored,
    Conflicted,
}

impl FileStatus {
    pub fn from_git2_status(entry: &git2::StatusEntry) -> Self {
        let status = entry.status();
        let path = entry.path().unwrap_or("").to_string();
        let old_path = entry
            .head_to_index()
            .and_then(|d| d.old_file().path().map(|p| p.to_string_lossy().to_string()));

        let staged_status = Self::get_staged_status(status);
        let unstaged_status = Self::get_unstaged_status(status);
        let is_conflict = status.is_conflicted();

        let primary_status = if is_conflict {
            StatusType::Conflicted
        } else {
            staged_status
                .clone()
                .or_else(|| unstaged_status.clone())
                .unwrap_or(StatusType::Untracked)
        };

        FileStatus {
            path,
            status: primary_status,
            staged_status,
            unstaged_status,
            is_conflict,
            old_path,
        }
    }

    fn get_staged_status(status: git2::Status) -> Option<StatusType> {
        if status.is_index_new() {
            Some(StatusType::Added)
        } else if status.is_index_modified() {
            Some(StatusType::Modified)
        } else if status.is_index_deleted() {
            Some(StatusType::Deleted)
        } else if status.is_index_renamed() {
            Some(StatusType::Renamed)
        } else if status.is_index_typechange() {
            Some(StatusType::TypeChanged)
        } else {
            None
        }
    }

    fn get_unstaged_status(status: git2::Status) -> Option<StatusType> {
        if status.is_wt_new() {
            Some(StatusType::Untracked)
        } else if status.is_wt_modified() {
            Some(StatusType::Modified)
        } else if status.is_wt_deleted() {
            Some(StatusType::Deleted)
        } else if status.is_wt_renamed() {
            Some(StatusType::Renamed)
        } else if status.is_wt_typechange() {
            Some(StatusType::TypeChanged)
        } else {
            None
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
pub struct RepositoryStatus {
    pub staged: Vec<FileStatus>,
    pub unstaged: Vec<FileStatus>,
    pub untracked: Vec<FileStatus>,
    pub conflicted: Vec<FileStatus>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== StatusType Tests ====================

    #[test]
    fn test_status_type_equality() {
        assert_eq!(StatusType::Untracked, StatusType::Untracked);
        assert_eq!(StatusType::Added, StatusType::Added);
        assert_eq!(StatusType::Modified, StatusType::Modified);
        assert_eq!(StatusType::Deleted, StatusType::Deleted);
        assert_eq!(StatusType::Renamed, StatusType::Renamed);
        assert_eq!(StatusType::Copied, StatusType::Copied);
        assert_eq!(StatusType::TypeChanged, StatusType::TypeChanged);
        assert_eq!(StatusType::Ignored, StatusType::Ignored);
        assert_eq!(StatusType::Conflicted, StatusType::Conflicted);
        assert_ne!(StatusType::Added, StatusType::Deleted);
    }

    #[test]
    fn test_status_type_serialization() {
        let untracked = StatusType::Untracked;
        let json = serde_json::to_string(&untracked).expect("should serialize");
        assert_eq!(json, "\"Untracked\"");

        let added = StatusType::Added;
        let json = serde_json::to_string(&added).expect("should serialize");
        assert_eq!(json, "\"Added\"");

        let modified = StatusType::Modified;
        let json = serde_json::to_string(&modified).expect("should serialize");
        assert_eq!(json, "\"Modified\"");

        let deleted = StatusType::Deleted;
        let json = serde_json::to_string(&deleted).expect("should serialize");
        assert_eq!(json, "\"Deleted\"");

        let renamed = StatusType::Renamed;
        let json = serde_json::to_string(&renamed).expect("should serialize");
        assert_eq!(json, "\"Renamed\"");

        let conflicted = StatusType::Conflicted;
        let json = serde_json::to_string(&conflicted).expect("should serialize");
        assert_eq!(json, "\"Conflicted\"");
    }

    #[test]
    fn test_status_type_deserialization() {
        let added: StatusType = serde_json::from_str("\"Added\"").expect("should deserialize");
        assert_eq!(added, StatusType::Added);

        let modified: StatusType =
            serde_json::from_str("\"Modified\"").expect("should deserialize");
        assert_eq!(modified, StatusType::Modified);

        let conflicted: StatusType =
            serde_json::from_str("\"Conflicted\"").expect("should deserialize");
        assert_eq!(conflicted, StatusType::Conflicted);
    }

    // ==================== FileStatus Tests ====================

    #[test]
    fn test_file_status_untracked() {
        let status = FileStatus {
            path: "new_file.rs".to_string(),
            status: StatusType::Untracked,
            staged_status: None,
            unstaged_status: Some(StatusType::Untracked),
            is_conflict: false,
            old_path: None,
        };

        assert_eq!(status.path, "new_file.rs");
        assert_eq!(status.status, StatusType::Untracked);
        assert!(status.staged_status.is_none());
        assert_eq!(status.unstaged_status, Some(StatusType::Untracked));
        assert!(!status.is_conflict);
        assert!(status.old_path.is_none());
    }

    #[test]
    fn test_file_status_staged_new() {
        let status = FileStatus {
            path: "staged_file.rs".to_string(),
            status: StatusType::Added,
            staged_status: Some(StatusType::Added),
            unstaged_status: None,
            is_conflict: false,
            old_path: None,
        };

        assert_eq!(status.status, StatusType::Added);
        assert_eq!(status.staged_status, Some(StatusType::Added));
        assert!(status.unstaged_status.is_none());
    }

    #[test]
    fn test_file_status_modified_both() {
        let status = FileStatus {
            path: "modified.rs".to_string(),
            status: StatusType::Modified,
            staged_status: Some(StatusType::Modified),
            unstaged_status: Some(StatusType::Modified),
            is_conflict: false,
            old_path: None,
        };

        assert_eq!(status.status, StatusType::Modified);
        assert!(status.staged_status.is_some());
        assert!(status.unstaged_status.is_some());
    }

    #[test]
    fn test_file_status_renamed() {
        let status = FileStatus {
            path: "new_name.rs".to_string(),
            status: StatusType::Renamed,
            staged_status: Some(StatusType::Renamed),
            unstaged_status: None,
            is_conflict: false,
            old_path: Some("old_name.rs".to_string()),
        };

        assert_eq!(status.status, StatusType::Renamed);
        assert_eq!(status.old_path, Some("old_name.rs".to_string()));
    }

    #[test]
    fn test_file_status_conflicted() {
        let status = FileStatus {
            path: "conflict.rs".to_string(),
            status: StatusType::Conflicted,
            staged_status: None,
            unstaged_status: None,
            is_conflict: true,
            old_path: None,
        };

        assert_eq!(status.status, StatusType::Conflicted);
        assert!(status.is_conflict);
    }

    #[test]
    fn test_file_status_serialization() {
        let status = FileStatus {
            path: "test.rs".to_string(),
            status: StatusType::Modified,
            staged_status: Some(StatusType::Modified),
            unstaged_status: None,
            is_conflict: false,
            old_path: None,
        };

        let json = serde_json::to_string(&status).expect("should serialize");
        assert!(json.contains("\"path\":\"test.rs\""));
        assert!(json.contains("\"status\":\"Modified\""));
        assert!(json.contains("\"stagedStatus\":\"Modified\""));
        assert!(json.contains("\"isConflict\":false"));
    }

    #[test]
    fn test_file_status_deserialization() {
        let json = r#"{
            "path": "file.rs",
            "status": "Added",
            "stagedStatus": "Added",
            "unstagedStatus": null,
            "isConflict": false,
            "oldPath": null
        }"#;

        let status: FileStatus = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(status.path, "file.rs");
        assert_eq!(status.status, StatusType::Added);
        assert_eq!(status.staged_status, Some(StatusType::Added));
        assert!(status.unstaged_status.is_none());
        assert!(!status.is_conflict);
    }

    // ==================== RepositoryStatus Tests ====================

    #[test]
    fn test_repository_status_default() {
        let status = RepositoryStatus::default();
        assert!(status.staged.is_empty());
        assert!(status.unstaged.is_empty());
        assert!(status.untracked.is_empty());
        assert!(status.conflicted.is_empty());
    }

    #[test]
    fn test_repository_status_with_files() {
        let status = RepositoryStatus {
            staged: vec![FileStatus {
                path: "staged.rs".to_string(),
                status: StatusType::Added,
                staged_status: Some(StatusType::Added),
                unstaged_status: None,
                is_conflict: false,
                old_path: None,
            }],
            unstaged: vec![FileStatus {
                path: "unstaged.rs".to_string(),
                status: StatusType::Modified,
                staged_status: None,
                unstaged_status: Some(StatusType::Modified),
                is_conflict: false,
                old_path: None,
            }],
            untracked: vec![FileStatus {
                path: "new.rs".to_string(),
                status: StatusType::Untracked,
                staged_status: None,
                unstaged_status: Some(StatusType::Untracked),
                is_conflict: false,
                old_path: None,
            }],
            conflicted: vec![],
        };

        assert_eq!(status.staged.len(), 1);
        assert_eq!(status.unstaged.len(), 1);
        assert_eq!(status.untracked.len(), 1);
        assert!(status.conflicted.is_empty());
    }

    #[test]
    fn test_repository_status_serialization() {
        let status = RepositoryStatus {
            staged: vec![],
            unstaged: vec![],
            untracked: vec![FileStatus {
                path: "new.txt".to_string(),
                status: StatusType::Untracked,
                staged_status: None,
                unstaged_status: Some(StatusType::Untracked),
                is_conflict: false,
                old_path: None,
            }],
            conflicted: vec![],
        };

        let json = serde_json::to_string(&status).expect("should serialize");
        assert!(json.contains("\"staged\":[]"));
        assert!(json.contains("\"unstaged\":[]"));
        assert!(json.contains("\"untracked\":["));
        assert!(json.contains("\"conflicted\":[]"));
    }
}
