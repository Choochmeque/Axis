use crate::error::{AxisError, Result};
use crate::models::{AppSettings, RecentRepository, Repository};
use crate::services::{AvatarService, BackgroundFetchService, GitService};
use crate::storage::Database;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard, RwLock};
use tauri::{AppHandle, Manager};

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
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Access git2 service directly (convenience method)
    pub fn with_git2<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&crate::services::Git2Service) -> R,
    {
        let guard = self.inner.lock().unwrap_or_else(|e| e.into_inner());
        f(guard.git2())
    }

    /// Access git CLI service directly (convenience method)
    pub fn with_git_cli<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&crate::services::GitCliService) -> R,
    {
        let guard = self.inner.lock().unwrap_or_else(|e| e.into_inner());
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
        let repos = self.repos.read().unwrap_or_else(|e| e.into_inner());
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
            let repos = self.repos.read().unwrap_or_else(|e| e.into_inner());
            if let Some(handle) = repos.get(path) {
                return Ok(handle.clone());
            }
        }

        // Open and cache
        let service = GitService::open(path, app_handle.clone(), is_active)?;
        let handle = GitServiceHandle::new(service);

        let mut repos = self.repos.write().unwrap_or_else(|e| e.into_inner());
        repos.insert(path.to_path_buf(), handle.clone());

        Ok(handle)
    }

    /// Set the active repository, updating all cached services
    pub fn set_active(&self, active_path: &Path) {
        let repos = self.repos.read().unwrap_or_else(|e| e.into_inner());
        for (path, handle) in repos.iter() {
            let service = handle.lock();
            service.set_active(path == active_path);
        }
    }

    /// Remove a repository from the cache
    pub fn remove(&self, path: &Path) {
        self.repos
            .write()
            .unwrap_or_else(|e| e.into_inner())
            .remove(path);
    }

    /// List all cached repository paths
    pub fn list_paths(&self) -> Vec<PathBuf> {
        self.repos
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .keys()
            .cloned()
            .collect()
    }

    /// Check if a repository is cached
    pub fn contains(&self, path: &Path) -> bool {
        self.repos
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .contains_key(path)
    }

    /// Get the number of cached repositories
    pub fn len(&self) -> usize {
        self.repos.read().unwrap_or_else(|e| e.into_inner()).len()
    }

    /// Check if cache is empty
    pub fn is_empty(&self) -> bool {
        self.repos
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .is_empty()
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
    avatar_service: RwLock<Option<Arc<AvatarService>>>,
}

impl AppState {
    pub fn new(database: Database) -> Self {
        AppState {
            active_repository_path: RwLock::new(None),
            repository_cache: Arc::new(RepositoryCache::new()),
            database: Arc::new(database),
            app_handle: RwLock::new(None),
            background_fetch: BackgroundFetchService::new(),
            avatar_service: RwLock::new(None),
        }
    }

    /// Set the app handle (must be called after Tauri setup)
    pub fn set_app_handle(&self, app_handle: AppHandle) {
        // Initialize avatar service with app data dir
        if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
            let avatar_service = AvatarService::new(&app_data_dir);
            *self
                .avatar_service
                .write()
                .unwrap_or_else(|e| e.into_inner()) = Some(Arc::new(avatar_service));
        }

        *self.app_handle.write().unwrap_or_else(|e| e.into_inner()) = Some(app_handle);
    }

    /// Get the app handle
    pub fn get_app_handle(&self) -> Result<AppHandle> {
        self.app_handle
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
            .ok_or_else(|| AxisError::Other("App handle not set".to_string()))
    }

    /// Get the repository cache (for background fetch service)
    pub fn repository_cache(&self) -> Arc<RepositoryCache> {
        Arc::clone(&self.repository_cache)
    }

    /// Get the database Arc (for integration providers that need 'static closures)
    pub fn database(&self) -> Arc<Database> {
        Arc::clone(&self.database)
    }

    /// Get the avatar service
    pub fn avatar_service(&self) -> Result<Arc<AvatarService>> {
        self.avatar_service
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
            .ok_or_else(|| AxisError::Other("Avatar service not initialized".to_string()))
    }

    /// Set/switch the active repository (adds to cache if needed)
    pub fn switch_active_repository(&self, path: &Path) -> Result<Repository> {
        let app_handle = self.get_app_handle()?;

        // Ensure the repo is cached
        let handle = self.repository_cache.get_or_open(path, &app_handle, true)?;

        // Update active flags
        self.repository_cache.set_active(path);

        *self
            .active_repository_path
            .write()
            .unwrap_or_else(|e| e.into_inner()) = Some(path.to_path_buf());

        // Return repo info
        let guard = handle.lock();
        guard.git2().get_repository_info()
    }

    pub fn get_current_repository_path(&self) -> Option<PathBuf> {
        self.active_repository_path
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
    }

    pub fn close_current_repository(&self) {
        let mut repo_path = self
            .active_repository_path
            .write()
            .unwrap_or_else(|e| e.into_inner());
        *repo_path = None;
    }

    /// Close a specific repository and remove from cache
    pub fn close_repository(&self, path: &Path) {
        self.repository_cache.remove(path);

        // Clear active if this was it
        let mut active = self
            .active_repository_path
            .write()
            .unwrap_or_else(|e| e.into_inner());
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
