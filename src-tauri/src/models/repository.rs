use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::PathBuf;

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
}
