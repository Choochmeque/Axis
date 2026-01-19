use crate::error::{AxisError, Result};
use crate::models::{AppSettings, RecentRepository, Repository};
use crate::services::{BackgroundFetchService, GitService};
use crate::storage::Database;
use parking_lot::{Mutex, MutexGuard, RwLock};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::AppHandle;

/// Wrapper that holds an Arc<Mutex<GitService>> and provides access
#[derive(Clone)]
pub struct GitServiceHandle {
    inner: Arc<Mutex<GitService>>,
}

impl GitServiceHandle {
    pub fn new(service: GitService) -> Self {
        Self {
            inner: Arc::new(Mutex::new(service)),
        }
    }

    pub fn lock(&self) -> MutexGuard<'_, GitService> {
        self.inner.lock()
    }

    /// Access git2 service directly (convenience method)
    pub fn with_git2<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&crate::services::Git2Service) -> R,
    {
        let guard = self.inner.lock();
        f(guard.git2())
    }

    /// Access git CLI service directly (convenience method)
    pub fn with_git_cli<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&crate::services::GitCliService) -> R,
    {
        let guard = self.inner.lock();
        f(guard.git_cli())
    }
}

/// Cache for open repository services.
/// Stores GitService instances keyed by repository path.
pub struct RepositoryCache {
    repos: RwLock<HashMap<PathBuf, GitServiceHandle>>,
}

impl RepositoryCache {
    pub fn new() -> Self {
        Self {
            repos: RwLock::new(HashMap::new()),
        }
    }

    /// Get an existing cached service handle (without opening if not cached)
    pub fn get(&self, path: &Path) -> Option<GitServiceHandle> {
        let repos = self.repos.read();
        repos.get(path).cloned()
    }

    /// Get or open a repository service
    pub fn get_or_open(
        &self,
        path: &Path,
        app_handle: &AppHandle,
        is_active: bool,
    ) -> Result<GitServiceHandle> {
        // Check if already cached
        {
            let repos = self.repos.read();
            if let Some(handle) = repos.get(path) {
                return Ok(handle.clone());
            }
        }

        // Open and cache
        let service = GitService::open(path, app_handle.clone(), is_active)?;
        let handle = GitServiceHandle::new(service);

        let mut repos = self.repos.write();
        repos.insert(path.to_path_buf(), handle.clone());

        Ok(handle)
    }

    /// Set the active repository, updating all cached services
    pub fn set_active(&self, active_path: &Path) {
        let repos = self.repos.read();
        for (path, handle) in repos.iter() {
            let service = handle.lock();
            service.set_active(path == active_path);
        }
    }

    /// Remove a repository from the cache
    pub fn remove(&self, path: &Path) {
        self.repos.write().remove(path);
    }

    /// List all cached repository paths
    pub fn list_paths(&self) -> Vec<PathBuf> {
        self.repos.read().keys().cloned().collect()
    }

    /// Check if a repository is cached
    pub fn contains(&self, path: &Path) -> bool {
        self.repos.read().contains_key(path)
    }

    /// Get the number of cached repositories
    pub fn len(&self) -> usize {
        self.repos.read().len()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.repos.read().is_empty()
    }
}

impl Default for RepositoryCache {
    fn default() -> Self {
        Self::new()
    }
}

pub struct AppState {
    active_repository_path: RwLock<Option<PathBuf>>,
    repository_cache: Arc<RepositoryCache>,
    database: Arc<Database>,
    app_handle: RwLock<Option<AppHandle>>,
    background_fetch: BackgroundFetchService,
}

impl AppState {
    pub fn new(database: Database) -> Self {
        AppState {
            active_repository_path: RwLock::new(None),
            repository_cache: Arc::new(RepositoryCache::new()),
            database: Arc::new(database),
            app_handle: RwLock::new(None),
            background_fetch: BackgroundFetchService::new(),
        }
    }

    /// Set the app handle (must be called after Tauri setup)
    pub fn set_app_handle(&self, app_handle: AppHandle) {
        *self.app_handle.write() = Some(app_handle);
    }

    /// Get the app handle
    pub fn get_app_handle(&self) -> Result<AppHandle> {
        self.app_handle
            .read()
            .clone()
            .ok_or_else(|| AxisError::Other("App handle not set".to_string()))
    }

    /// Get the repository cache (for background fetch service)
    pub fn repository_cache(&self) -> Arc<RepositoryCache> {
        Arc::clone(&self.repository_cache)
    }

    /// Set/switch the active repository (adds to cache if needed)
    pub fn switch_active_repository(&self, path: &Path) -> Result<Repository> {
        let app_handle = self.get_app_handle()?;

        // Ensure the repo is cached
        let handle = self.repository_cache.get_or_open(path, &app_handle, true)?;

        // Update active flags
        self.repository_cache.set_active(path);

        *self.active_repository_path.write() = Some(path.to_path_buf());

        // Return repo info
        let guard = handle.lock();
        guard.git2().get_repository_info()
    }

    pub fn get_current_repository_path(&self) -> Option<PathBuf> {
        self.active_repository_path.read().clone()
    }

    pub fn close_current_repository(&self) {
        let mut repo_path = self.active_repository_path.write();
        *repo_path = None;
    }

    /// Close a specific repository and remove from cache
    pub fn close_repository(&self, path: &Path) {
        self.repository_cache.remove(path);

        // Clear active if this was it
        let mut active = self.active_repository_path.write();
        if active.as_ref().map(|p| p.as_path()) == Some(path) {
            *active = None;
        }
    }

    pub fn ensure_repository_open(&self) -> Result<PathBuf> {
        self.get_current_repository_path()
            .ok_or(AxisError::NoRepositoryOpen)
    }

    /// Get the GitService handle for the active repository
    pub fn get_git_service(&self) -> Result<GitServiceHandle> {
        let path = self.ensure_repository_open()?;
        let app_handle = self.get_app_handle()?;
        self.repository_cache.get_or_open(&path, &app_handle, true)
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

    pub fn get_secret(&self, key: &str) -> Result<Option<String>> {
        self.database.get_secret(key)
    }

    pub fn set_secret(&self, key: &str, value: &str) -> Result<()> {
        self.database.set_secret(key, value)
    }

    pub fn has_secret(&self, key: &str) -> Result<bool> {
        self.database.has_secret(key)
    }

    pub fn delete_secret(&self, key: &str) -> Result<()> {
        self.database.delete_secret(key)
    }

    /// Start the background fetch service
    pub fn start_background_fetch(&self, interval_minutes: u32) -> Result<()> {
        let app_handle = self.get_app_handle()?;
        self.background_fetch
            .start(self.repository_cache(), app_handle, interval_minutes);
        Ok(())
    }

    /// Stop the background fetch service
    pub fn stop_background_fetch(&self) {
        self.background_fetch.stop();
    }

    /// Restart the background fetch service with a new interval
    pub fn restart_background_fetch(&self, interval_minutes: u32) -> Result<()> {
        let app_handle = self.get_app_handle()?;
        self.background_fetch
            .restart(self.repository_cache(), app_handle, interval_minutes);
        Ok(())
    }

    /// Check if background fetch is running
    pub fn is_background_fetch_running(&self) -> bool {
        self.background_fetch.is_running()
    }
}
