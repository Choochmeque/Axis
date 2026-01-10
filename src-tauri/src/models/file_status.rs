use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileStatus {
    pub path: String,
    pub status: StatusType,
    pub staged_status: Option<StatusType>,
    pub unstaged_status: Option<StatusType>,
    pub is_conflict: bool,
    pub old_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
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

        let primary_status = staged_status
            .clone()
            .or_else(|| unstaged_status.clone())
            .unwrap_or(StatusType::Untracked);

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RepositoryStatus {
    pub staged: Vec<FileStatus>,
    pub unstaged: Vec<FileStatus>,
    pub untracked: Vec<FileStatus>,
    pub conflicted: Vec<FileStatus>,
}

impl Default for RepositoryStatus {
    fn default() -> Self {
        RepositoryStatus {
            staged: Vec::new(),
            unstaged: Vec::new(),
            untracked: Vec::new(),
            conflicted: Vec::new(),
        }
    }
}
