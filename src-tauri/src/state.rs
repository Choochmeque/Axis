use crate::error::{AxisError, Result};
use crate::models::RecentRepository;
use crate::storage::Database;
use parking_lot::RwLock;
use std::path::PathBuf;
use std::sync::Arc;

pub struct AppState {
    current_repository_path: RwLock<Option<PathBuf>>,
    database: Arc<Database>,
}

impl AppState {
    pub fn new(database: Database) -> Self {
        AppState {
            current_repository_path: RwLock::new(None),
            database: Arc::new(database),
        }
    }

    pub fn set_current_repository_path(&self, path: PathBuf) {
        let mut repo_path = self.current_repository_path.write();
        *repo_path = Some(path);
    }

    pub fn get_current_repository_path(&self) -> Option<PathBuf> {
        let repo_path = self.current_repository_path.read();
        repo_path.clone()
    }

    pub fn close_current_repository(&self) {
        let mut repo_path = self.current_repository_path.write();
        *repo_path = None;
    }

    pub fn ensure_repository_open(&self) -> Result<PathBuf> {
        self.get_current_repository_path()
            .ok_or(AxisError::NoRepositoryOpen)
    }

    pub fn add_recent_repository(&self, path: &PathBuf, name: &str) -> Result<()> {
        self.database.add_recent_repository(path, name)
    }

    pub fn get_recent_repositories(&self) -> Result<Vec<RecentRepository>> {
        self.database.get_recent_repositories()
    }
}
