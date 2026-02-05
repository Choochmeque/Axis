use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::{Path, PathBuf};

use crate::storage::RecentRepositoryRow;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub is_bare: bool,
    pub is_unborn: bool,
    pub current_branch: Option<String>,
    pub state: RepositoryState,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum RepositoryState {
    Clean,
    Merging,
    Rebasing,
    RebasingInteractive,
    CherryPicking,
    Reverting,
    Bisecting,
    ApplyMailbox,
    ApplyMailboxOrRebase,
}

impl From<git2::RepositoryState> for RepositoryState {
    fn from(state: git2::RepositoryState) -> Self {
        match state {
            git2::RepositoryState::Clean => RepositoryState::Clean,
            git2::RepositoryState::Merge => RepositoryState::Merging,
            git2::RepositoryState::Rebase => RepositoryState::Rebasing,
            git2::RepositoryState::RebaseInteractive => RepositoryState::RebasingInteractive,
            git2::RepositoryState::RebaseMerge => RepositoryState::Rebasing,
            git2::RepositoryState::CherryPick | git2::RepositoryState::CherryPickSequence => {
                RepositoryState::CherryPicking
            }
            git2::RepositoryState::Revert | git2::RepositoryState::RevertSequence => {
                RepositoryState::Reverting
            }
            git2::RepositoryState::Bisect => RepositoryState::Bisecting,
            git2::RepositoryState::ApplyMailbox => RepositoryState::ApplyMailbox,
            git2::RepositoryState::ApplyMailboxOrRebase => RepositoryState::ApplyMailboxOrRebase,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RecentRepository {
    pub path: PathBuf,
    pub name: String,
    pub last_opened: chrono::DateTime<chrono::Utc>,
    pub exists: bool,
    pub current_branch: Option<String>,
    pub is_pinned: bool,
    pub display_path: String,
}

impl RecentRepository {
    /// Build a `RecentRepository` from a database row, enriching with live data.
    pub fn from_row(row: RecentRepositoryRow) -> Self {
        let exists = row.path.exists();

        let current_branch = if exists {
            git2::Repository::open(&row.path).ok().and_then(|repo| {
                repo.head()
                    .ok()
                    .and_then(|head| head.shorthand().map(String::from))
            })
        } else {
            None
        };

        let display_path = make_display_path(&row.path);

        Self {
            path: row.path,
            name: row.name,
            last_opened: row.last_opened,
            exists,
            current_branch,
            is_pinned: row.is_pinned,
            display_path,
        }
    }
}

/// Format a path for display, replacing the home directory with `~`.
pub fn make_display_path(path: &Path) -> String {
    if let Some(home) = dirs::home_dir() {
        if let Ok(stripped) = path.strip_prefix(&home) {
            let sep = std::path::MAIN_SEPARATOR;
            return format!("~{sep}{}", stripped.display());
        }
    }
    path.display().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== RepositoryState Tests ====================

    #[test]
    fn test_repository_state_equality() {
        assert_eq!(RepositoryState::Clean, RepositoryState::Clean);
        assert_eq!(RepositoryState::Merging, RepositoryState::Merging);
        assert_eq!(RepositoryState::Rebasing, RepositoryState::Rebasing);
        assert_eq!(RepositoryState::Bisecting, RepositoryState::Bisecting);
        assert_ne!(RepositoryState::Clean, RepositoryState::Merging);
    }

    #[test]
    fn test_repository_state_serialization() {
        let clean = RepositoryState::Clean;
        let json = serde_json::to_string(&clean).expect("should serialize");
        assert_eq!(json, "\"Clean\"");

        let merging = RepositoryState::Merging;
        let json = serde_json::to_string(&merging).expect("should serialize");
        assert_eq!(json, "\"Merging\"");

        let rebasing = RepositoryState::Rebasing;
        let json = serde_json::to_string(&rebasing).expect("should serialize");
        assert_eq!(json, "\"Rebasing\"");

        let bisecting = RepositoryState::Bisecting;
        let json = serde_json::to_string(&bisecting).expect("should serialize");
        assert_eq!(json, "\"Bisecting\"");
    }

    #[test]
    fn test_repository_state_deserialization() {
        let clean: RepositoryState = serde_json::from_str("\"Clean\"").expect("should deserialize");
        assert_eq!(clean, RepositoryState::Clean);

        let merging: RepositoryState =
            serde_json::from_str("\"Merging\"").expect("should deserialize");
        assert_eq!(merging, RepositoryState::Merging);
    }

    #[test]
    fn test_repository_state_from_git2_clean() {
        let state = RepositoryState::from(git2::RepositoryState::Clean);
        assert_eq!(state, RepositoryState::Clean);
    }

    #[test]
    fn test_repository_state_from_git2_merge() {
        let state = RepositoryState::from(git2::RepositoryState::Merge);
        assert_eq!(state, RepositoryState::Merging);
    }

    #[test]
    fn test_repository_state_from_git2_rebase() {
        let state = RepositoryState::from(git2::RepositoryState::Rebase);
        assert_eq!(state, RepositoryState::Rebasing);
    }

    #[test]
    fn test_repository_state_from_git2_rebase_interactive() {
        let state = RepositoryState::from(git2::RepositoryState::RebaseInteractive);
        assert_eq!(state, RepositoryState::RebasingInteractive);
    }

    #[test]
    fn test_repository_state_from_git2_rebase_merge() {
        let state = RepositoryState::from(git2::RepositoryState::RebaseMerge);
        assert_eq!(state, RepositoryState::Rebasing);
    }

    #[test]
    fn test_repository_state_from_git2_cherry_pick() {
        let state = RepositoryState::from(git2::RepositoryState::CherryPick);
        assert_eq!(state, RepositoryState::CherryPicking);
    }

    #[test]
    fn test_repository_state_from_git2_cherry_pick_sequence() {
        let state = RepositoryState::from(git2::RepositoryState::CherryPickSequence);
        assert_eq!(state, RepositoryState::CherryPicking);
    }

    #[test]
    fn test_repository_state_from_git2_revert() {
        let state = RepositoryState::from(git2::RepositoryState::Revert);
        assert_eq!(state, RepositoryState::Reverting);
    }

    #[test]
    fn test_repository_state_from_git2_revert_sequence() {
        let state = RepositoryState::from(git2::RepositoryState::RevertSequence);
        assert_eq!(state, RepositoryState::Reverting);
    }

    #[test]
    fn test_repository_state_from_git2_bisect() {
        let state = RepositoryState::from(git2::RepositoryState::Bisect);
        assert_eq!(state, RepositoryState::Bisecting);
    }

    #[test]
    fn test_repository_state_from_git2_apply_mailbox() {
        let state = RepositoryState::from(git2::RepositoryState::ApplyMailbox);
        assert_eq!(state, RepositoryState::ApplyMailbox);
    }

    #[test]
    fn test_repository_state_from_git2_apply_mailbox_or_rebase() {
        let state = RepositoryState::from(git2::RepositoryState::ApplyMailboxOrRebase);
        assert_eq!(state, RepositoryState::ApplyMailboxOrRebase);
    }

    // ==================== Repository Tests ====================

    #[test]
    fn test_repository_creation() {
        let repo = Repository {
            id: "test-repo-id".to_string(),
            name: "my-repo".to_string(),
            path: PathBuf::from("/home/user/projects/my-repo"),
            is_bare: false,
            is_unborn: false,
            current_branch: Some("main".to_string()),
            state: RepositoryState::Clean,
        };

        assert_eq!(repo.id, "test-repo-id");
        assert_eq!(repo.name, "my-repo");
        assert!(!repo.is_bare);
        assert!(!repo.is_unborn);
        assert_eq!(repo.current_branch, Some("main".to_string()));
        assert_eq!(repo.state, RepositoryState::Clean);
    }

    #[test]
    fn test_repository_bare() {
        let repo = Repository {
            id: "bare-repo".to_string(),
            name: "bare".to_string(),
            path: PathBuf::from("/srv/git/bare.git"),
            is_bare: true,
            is_unborn: false,
            current_branch: None,
            state: RepositoryState::Clean,
        };

        assert!(repo.is_bare);
        assert!(repo.current_branch.is_none());
    }

    #[test]
    fn test_repository_unborn() {
        let repo = Repository {
            id: "new-repo".to_string(),
            name: "new".to_string(),
            path: PathBuf::from("/home/user/new-project"),
            is_bare: false,
            is_unborn: true,
            current_branch: Some("main".to_string()),
            state: RepositoryState::Clean,
        };

        assert!(repo.is_unborn);
    }

    #[test]
    fn test_repository_in_merge_state() {
        let repo = Repository {
            id: "merging-repo".to_string(),
            name: "merging".to_string(),
            path: PathBuf::from("/home/user/merging"),
            is_bare: false,
            is_unborn: false,
            current_branch: Some("feature".to_string()),
            state: RepositoryState::Merging,
        };

        assert_eq!(repo.state, RepositoryState::Merging);
    }

    #[test]
    fn test_repository_serialization() {
        let repo = Repository {
            id: "repo-123".to_string(),
            name: "test-repo".to_string(),
            path: PathBuf::from("/test/path"),
            is_bare: false,
            is_unborn: false,
            current_branch: Some("develop".to_string()),
            state: RepositoryState::Clean,
        };

        let json = serde_json::to_string(&repo).expect("should serialize");
        assert!(json.contains("\"id\":\"repo-123\""));
        assert!(json.contains("\"name\":\"test-repo\""));
        assert!(json.contains("\"isBare\":false"));
        assert!(json.contains("\"isUnborn\":false"));
        assert!(json.contains("\"currentBranch\":\"develop\""));
        assert!(json.contains("\"state\":\"Clean\""));
    }

    // ==================== RecentRepository Tests ====================

    #[test]
    fn test_recent_repository_creation() {
        let recent = RecentRepository {
            path: PathBuf::from("/home/user/project"),
            name: "project".to_string(),
            last_opened: chrono::Utc::now(),
            exists: true,
            current_branch: Some("main".to_string()),
            is_pinned: false,
            display_path: "~/project".to_string(),
        };

        assert_eq!(recent.name, "project");
        assert_eq!(recent.path, PathBuf::from("/home/user/project"));
        assert!(recent.exists);
        assert_eq!(recent.current_branch, Some("main".to_string()));
        assert!(!recent.is_pinned);
        assert_eq!(recent.display_path, "~/project");
    }

    #[test]
    fn test_recent_repository_missing() {
        let recent = RecentRepository {
            path: PathBuf::from("/deleted/repo"),
            name: "deleted".to_string(),
            last_opened: chrono::Utc::now(),
            exists: false,
            current_branch: None,
            is_pinned: false,
            display_path: "/deleted/repo".to_string(),
        };

        assert!(!recent.exists);
        assert!(recent.current_branch.is_none());
    }

    #[test]
    fn test_recent_repository_pinned() {
        let recent = RecentRepository {
            path: PathBuf::from("/home/user/project"),
            name: "project".to_string(),
            last_opened: chrono::Utc::now(),
            exists: true,
            current_branch: Some("develop".to_string()),
            is_pinned: true,
            display_path: "~/project".to_string(),
        };

        assert!(recent.is_pinned);
    }

    #[test]
    fn test_recent_repository_serialization() {
        let recent = RecentRepository {
            path: PathBuf::from("/test/path"),
            name: "recent-repo".to_string(),
            last_opened: chrono::DateTime::from_timestamp(1700000000, 0)
                .expect("valid timestamp")
                .with_timezone(&chrono::Utc),
            exists: true,
            current_branch: Some("main".to_string()),
            is_pinned: true,
            display_path: "~/path".to_string(),
        };

        let json = serde_json::to_string(&recent).expect("should serialize");
        assert!(json.contains("\"name\":\"recent-repo\""));
        assert!(json.contains("\"lastOpened\""));
        assert!(json.contains("\"exists\":true"));
        assert!(json.contains("\"currentBranch\":\"main\""));
        assert!(json.contains("\"isPinned\":true"));
        assert!(json.contains("\"displayPath\":\"~/path\""));
    }
}
