use crate::error::{AxisError, Result};
use crate::models::{AppSettings, RecentRepository, Repository};
use crate::services::{
    AvatarService, BackgroundFetchService, CommitCache, GitService, IntegrationService,
    ProgressRegistry, SignatureVerificationCache, SshKeyService,
};
use crate::storage::Database;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, MutexGuard, RwLock};
use tauri::{AppHandle, Manager};

/// Wrapper that holds an Arc<Mutex<GitService>> and provides access
#[derive(Clone)]
pub struct GitServiceHandle {
    inner: Arc<Mutex<GitService>>,
    inner2: Arc<GitService>,
}

impl GitServiceHandle {
    pub fn new(service: GitService, service2: GitService) -> Self {
        Self {
            inner: Arc::new(Mutex::new(service)),
            inner2: Arc::new(service2),
        }
    }

    pub fn lock(&self) -> MutexGuard<'_, GitService> {
        self.inner.lock().unwrap_or_else(|e| e.into_inner())
    }

    /// Access git2 service directly (convenience method)
    pub async fn with_git2<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&crate::services::Git2Service) -> R + Send + 'static,
        R: Send + 'static,
    {
        let inner = self.inner2.clone();
        tauri::async_runtime::spawn_blocking(move || f(inner.git2()))
            .await
            .unwrap_or_else(|e| panic!("git task panicked: {e}"))
    }

    /// Access git CLI service directly (convenience method)
    pub fn with_git_cli<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&crate::services::GitCliService) -> R,
    {
        let guard = self.lock();
        f(guard.git_cli())
    }

    /// Access hook service directly (convenience method)
    pub fn with_hook<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&crate::services::HookService) -> R,
    {
        let guard = self.lock();
        f(guard.hook())
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

        // TODO: this is a temporary workaround until we refactor GitService to avoid double init
        let service2 = GitService::open(path, app_handle.clone(), is_active)?;

        let handle = GitServiceHandle::new(service, service2);

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
    commit_cache: Arc<CommitCache>,
    signature_verification_cache: Arc<SignatureVerificationCache>,
    database: Arc<Database>,
    app_handle: RwLock<Option<AppHandle>>,
    background_fetch: BackgroundFetchService,
    avatar_service: RwLock<Option<Arc<AvatarService>>>,
    integration_service: RwLock<Option<Arc<IntegrationService>>>,
    progress_registry: Arc<ProgressRegistry>,
}

impl AppState {
    pub fn new(database: Database) -> Self {
        let database = Arc::new(database);
        let integration_service = IntegrationService::new(Arc::clone(&database));

        AppState {
            active_repository_path: RwLock::new(None),
            repository_cache: Arc::new(RepositoryCache::new()),
            commit_cache: Arc::new(CommitCache::new()),
            signature_verification_cache: Arc::new(SignatureVerificationCache::new()),
            database,
            app_handle: RwLock::new(None),
            background_fetch: BackgroundFetchService::new(),
            avatar_service: RwLock::new(None),
            integration_service: RwLock::new(Some(Arc::new(integration_service))),
            progress_registry: Arc::new(ProgressRegistry::new()),
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

    /// Get the commit cache for graph data
    pub fn commit_cache(&self) -> Arc<CommitCache> {
        Arc::clone(&self.commit_cache)
    }

    /// Get the signature verification cache
    pub fn signature_verification_cache(&self) -> Arc<SignatureVerificationCache> {
        Arc::clone(&self.signature_verification_cache)
    }

    /// Get the avatar service
    pub fn avatar_service(&self) -> Result<Arc<AvatarService>> {
        self.avatar_service
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
            .ok_or_else(|| AxisError::Other("Avatar service not initialized".to_string()))
    }

    /// Get the integration service
    pub fn integration_service(&self) -> Result<Arc<IntegrationService>> {
        self.integration_service
            .read()
            .unwrap_or_else(|e| e.into_inner())
            .clone()
            .ok_or_else(|| AxisError::Other("Integration service not initialized".to_string()))
    }

    /// Get the progress registry for operation cancellation
    pub fn progress_registry(&self) -> Arc<ProgressRegistry> {
        self.progress_registry.clone()
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
        self.commit_cache.invalidate_repo(path);
        self.signature_verification_cache.invalidate_repo(path);

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

    /// Get a reference to the database
    pub fn database(&self) -> &Database {
        &self.database
    }

    /// Get the current repository path as a string
    pub fn get_repo_path_string(&self) -> Result<String> {
        let path = self.ensure_repository_open()?;
        Ok(path.to_string_lossy().to_string())
    }

    /// Resolve the SSH key for a remote operation
    pub fn resolve_ssh_key_for_remote(&self, remote_name: &str) -> Result<Option<String>> {
        let settings = self.get_settings()?;
        let repo_path = self.get_repo_path_string()?;
        Ok(SshKeyService::resolve_ssh_key(
            &self.database,
            &repo_path,
            remote_name,
            &settings.default_ssh_key,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    // ==================== RepositoryCache Tests ====================

    #[test]
    fn test_repository_cache_new() {
        let cache = RepositoryCache::new();
        assert!(cache.is_empty());
        assert_eq!(cache.len(), 0);
    }

    #[test]
    fn test_repository_cache_default() {
        let cache = RepositoryCache::default();
        assert!(cache.is_empty());
    }

    #[test]
    fn test_repository_cache_get_nonexistent() {
        let cache = RepositoryCache::new();
        let path = PathBuf::from("/nonexistent/repo");
        let result = cache.get(&path);
        assert!(result.is_none());
    }

    #[test]
    fn test_repository_cache_contains_empty() {
        let cache = RepositoryCache::new();
        let path = PathBuf::from("/some/path");
        assert!(!cache.contains(&path));
    }

    #[test]
    fn test_repository_cache_list_paths_empty() {
        let cache = RepositoryCache::new();
        let paths = cache.list_paths();
        assert!(paths.is_empty());
    }

    #[test]
    fn test_repository_cache_remove_nonexistent() {
        let cache = RepositoryCache::new();
        let path = PathBuf::from("/some/path");
        // Should not panic when removing non-existent path
        cache.remove(&path);
        assert!(cache.is_empty());
    }

    #[test]
    fn test_repository_cache_len_empty() {
        let cache = RepositoryCache::new();
        assert_eq!(cache.len(), 0);
    }

    #[test]
    fn test_repository_cache_is_empty_true() {
        let cache = RepositoryCache::new();
        assert!(cache.is_empty());
    }

    // ==================== GitServiceHandle Tests ====================
    // Note: GitServiceHandle requires a real GitService which needs a repository,
    // so we use integration tests with temporary repos for those.

    // ==================== AppState Basic Tests ====================
    // Note: AppState requires Database and AppHandle, testing basic error paths

    #[test]
    fn test_app_state_get_current_repository_path_none() {
        // Create a temporary in-memory database for testing
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        // Initially no repository should be active
        assert!(state.get_current_repository_path().is_none());
    }

    #[test]
    fn test_app_state_ensure_repository_open_error() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let result = state.ensure_repository_open();
        assert!(result.is_err());
    }

    #[test]
    fn test_app_state_get_app_handle_error() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let result = state.get_app_handle();
        assert!(result.is_err());
    }

    #[test]
    fn test_app_state_close_current_repository() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        // Close when nothing is open should not panic
        state.close_current_repository();
        assert!(state.get_current_repository_path().is_none());
    }

    #[test]
    fn test_app_state_close_repository() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let path = PathBuf::from("/test/repo");
        // Close non-existent repo should not panic
        state.close_repository(&path);
        assert!(state.get_current_repository_path().is_none());
    }

    #[test]
    fn test_app_state_repository_cache() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let cache = state.repository_cache();
        assert!(cache.is_empty());
    }

    #[test]
    fn test_app_state_commit_cache() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        // Just verify we can get the commit cache
        let _cache = state.commit_cache();
    }

    #[test]
    fn test_app_state_signature_verification_cache() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let cache = state.signature_verification_cache();
        // Should be empty initially
        assert!(cache.get("anything").is_none());
    }

    #[test]
    fn test_app_state_avatar_service_not_initialized() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        // Avatar service is not initialized until set_app_handle is called
        let result = state.avatar_service();
        assert!(result.is_err());
    }

    #[test]
    fn test_app_state_integration_service() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        // Integration service is initialized in new()
        let result = state.integration_service();
        assert!(result.is_ok());
    }

    #[test]
    fn test_app_state_progress_registry() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let registry = state.progress_registry();
        // Verify registry works
        let token = registry.register("test-op");
        assert!(!token.load(std::sync::atomic::Ordering::SeqCst));
    }

    #[test]
    fn test_app_state_background_fetch_not_running() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        // Initially not running
        assert!(!state.is_background_fetch_running());
    }

    #[test]
    fn test_app_state_stop_background_fetch() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        // Stop should not panic even if not running
        state.stop_background_fetch();
        assert!(!state.is_background_fetch_running());
    }

    #[test]
    fn test_app_state_get_settings() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let result = state.get_settings();
        assert!(result.is_ok());
    }

    #[test]
    fn test_app_state_save_settings() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let settings = AppSettings::default();
        let result = state.save_settings(&settings);
        assert!(result.is_ok());
    }

    #[test]
    fn test_app_state_get_recent_repositories_empty() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let result = state.get_recent_repositories();
        assert!(result.is_ok());
        assert!(result.expect("should get repos").is_empty());
    }

    #[test]
    fn test_app_state_add_recent_repository() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let path = PathBuf::from("/test/repo");
        let result = state.add_recent_repository(&path, "test-repo");
        assert!(result.is_ok());

        let repos = state.get_recent_repositories().expect("should get repos");
        assert_eq!(repos.len(), 1);
    }

    #[test]
    fn test_app_state_remove_recent_repository() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        let path = PathBuf::from("/test/repo");
        state
            .add_recent_repository(&path, "test-repo")
            .expect("should add");

        let result = state.remove_recent_repository(&path);
        assert!(result.is_ok());

        let repos = state.get_recent_repositories().expect("should get repos");
        assert!(repos.is_empty());
    }

    #[test]
    fn test_app_state_secrets() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        // Initially no secret
        assert!(!state.has_secret("test-key").expect("should check"));
        assert!(state.get_secret("test-key").expect("should get").is_none());

        // Set secret
        state
            .set_secret("test-key", "test-value")
            .expect("should set");
        assert!(state.has_secret("test-key").expect("should check"));
        assert_eq!(
            state.get_secret("test-key").expect("should get"),
            Some("test-value".to_string())
        );

        // Delete secret
        state.delete_secret("test-key").expect("should delete");
        assert!(!state.has_secret("test-key").expect("should check"));
    }

    #[test]
    fn test_app_state_get_git_service_error() {
        let db = crate::storage::Database::open_in_memory().expect("should create in-memory db");
        let state = AppState::new(db);

        // No repository open
        let result = state.get_git_service();
        assert!(result.is_err());
    }
}
