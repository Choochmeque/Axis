use crate::error::{AxisError, Result};
use crate::models::{AppSettings, RecentRepository};
use crate::services::{FileWatcherService, Git2Service, GitCliService};
use crate::storage::Database;
use parking_lot::RwLock;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::AppHandle;

pub struct AppState {
    current_repository_path: RwLock<Option<PathBuf>>,
    database: Arc<Database>,
    file_watcher: FileWatcherService,
}

impl AppState {
    pub fn new(database: Database) -> Self {
        AppState {
            current_repository_path: RwLock::new(None),
            database: Arc::new(database),
            file_watcher: FileWatcherService::new(),
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
        // Stop the file watcher
        self.file_watcher.stop_watching();

        let mut repo_path = self.current_repository_path.write();
        *repo_path = None;
    }

    pub fn ensure_repository_open(&self) -> Result<PathBuf> {
        self.get_current_repository_path()
            .ok_or(AxisError::NoRepositoryOpen)
    }

    pub fn get_service(&self) -> Result<Git2Service> {
        let path = self.ensure_repository_open()?;
        Git2Service::open(&path)
    }

    pub fn get_cli_service(&self) -> Result<GitCliService> {
        let path = self.ensure_repository_open()?;
        Ok(GitCliService::new(&path))
    }

    pub fn add_recent_repository(&self, path: &Path, name: &str) -> Result<()> {
        self.database.add_recent_repository(path, name)
    }

    pub fn get_recent_repositories(&self) -> Result<Vec<RecentRepository>> {
        self.database.get_recent_repositories()
    }

    pub fn remove_recent_repository(&self, path: &Path) -> Result<()> {
        self.database.remove_recent_repository(path)
    }

    pub fn get_settings(&self) -> Result<AppSettings> {
        self.database.get_settings()
    }

    pub fn save_settings(&self, settings: &AppSettings) -> Result<()> {
        self.database.save_settings(settings)
    }

    /// Start watching the current repository for file changes
    pub fn start_file_watcher(&self, app_handle: AppHandle) -> Result<()> {
        let path = self.ensure_repository_open()?;
        self.file_watcher
            .start_watching(path, app_handle)
            .map_err(|e| AxisError::Other(format!("Failed to start file watcher: {}", e)))
    }

    /// Stop watching for file changes
    pub fn stop_file_watcher(&self) {
        self.file_watcher.stop_watching();
    }

    /// Check if file watcher is active
    pub fn is_watching(&self) -> bool {
        self.file_watcher.is_watching()
    }
}
