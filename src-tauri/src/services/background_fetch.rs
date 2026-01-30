use crate::events::RemoteFetchedEvent;
use crate::models::{FetchOptions, SshCredentials, SshKeyFormat};
use crate::services::SshKeyService;
use crate::state::{AppState, RepositoryCache};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::async_runtime::JoinHandle;
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

/// Background service for periodically fetching all cached repositories
pub struct BackgroundFetchService {
    interval_handle: Mutex<Option<JoinHandle<()>>>,
}

impl BackgroundFetchService {
    pub fn new() -> Self {
        Self {
            interval_handle: Mutex::new(None),
        }
    }

    /// Start the background fetch task
    /// interval_minutes: fetch interval in minutes (0 = disabled)
    pub fn start(&self, cache: Arc<RepositoryCache>, app_handle: AppHandle, interval_minutes: u32) {
        if interval_minutes == 0 {
            log::info!("Background fetch disabled (interval is 0)");
            return;
        }

        log::info!("Starting background fetch service with {interval_minutes} minute interval");

        let handle = tauri::async_runtime::spawn(async move {
            let mut interval =
                tokio::time::interval(Duration::from_secs(interval_minutes as u64 * 60));

            loop {
                interval.tick().await;

                log::debug!("Background fetch: checking cached repositories");

                // Get all cached repository paths
                let paths = cache.list_paths();

                for path in paths {
                    // Get the service handle from cache
                    if let Some(handle) = cache.get(&path) {
                        let guard = handle.lock();
                        let git2 = guard.git2();

                        // Resolve SSH keys for this repo
                        let app_state = app_handle.state::<AppState>();
                        let repo_path_str = path.to_string_lossy().to_string();
                        let default_ssh_key = app_state
                            .get_settings()
                            .map(|s| s.default_ssh_key)
                            .unwrap_or(None);

                        // Get all remotes and fetch from each
                        match git2.list_remotes() {
                            Ok(remotes) => {
                                let options = FetchOptions::default();
                                let mut total_updates = 0u32;

                                for remote in remotes {
                                    let ssh_key = SshKeyService::resolve_ssh_key(
                                        app_state.database(),
                                        &repo_path_str,
                                        &remote.name,
                                        &default_ssh_key,
                                    );

                                    // Skip keys that can't work in background
                                    if let Some(key_path) = &ssh_key {
                                        let format = SshKeyService::check_key_format_optional(
                                            std::path::Path::new(key_path),
                                        );
                                        match format {
                                            Some(SshKeyFormat::OpenSsh) => {
                                                log::debug!(
                                                    "Background fetch: skipping remote {} (OpenSSH key format)",
                                                    remote.name
                                                );
                                                continue;
                                            }
                                            Some(SshKeyFormat::EncryptedPem) => {
                                                if app_state
                                                    .get_cached_ssh_passphrase(key_path)
                                                    .is_none()
                                                {
                                                    log::debug!(
                                                        "Background fetch: skipping remote {} (encrypted key, no cached passphrase)",
                                                        remote.name
                                                    );
                                                    continue;
                                                }
                                            }
                                            _ => {}
                                        }
                                    }

                                    let ssh_creds = ssh_key.map(|key_path| {
                                        let passphrase =
                                            app_state.get_cached_ssh_passphrase(&key_path);
                                        SshCredentials {
                                            key_path,
                                            passphrase,
                                        }
                                    });

                                    match git2.fetch(
                                        &remote.name,
                                        &options,
                                        None,
                                        None::<fn(&git2::Progress<'_>) -> bool>,
                                        ssh_creds,
                                    ) {
                                        Ok(result) => {
                                            // Count updated refs as new commits
                                            total_updates += result.updated_refs.len() as u32;
                                        }
                                        Err(e) => {
                                            log::warn!(
                                                "Background fetch failed for {} remote {}: {e}",
                                                path.display(),
                                                remote.name
                                            );
                                        }
                                    }
                                }

                                if total_updates > 0 {
                                    log::info!(
                                        "Background fetch: {total_updates} updates in {}",
                                        path.display()
                                    );

                                    // Emit event for this repo
                                    let event = RemoteFetchedEvent {
                                        path: path.to_string_lossy().to_string(),
                                        new_commits: total_updates,
                                    };
                                    if let Err(e) = event.emit(&app_handle) {
                                        log::error!("Failed to emit RemoteFetchedEvent: {e}");
                                    }
                                }
                            }
                            Err(e) => {
                                log::warn!(
                                    "Background fetch: failed to list remotes for {}: {e}",
                                    path.display()
                                );
                            }
                        }
                    }
                }
            }
        });

        if let Ok(mut guard) = self.interval_handle.lock() {
            *guard = Some(handle);
        } else {
            log::error!("Failed to acquire lock for background fetch handle");
        }
    }

    /// Stop the background fetch task
    pub fn stop(&self) {
        if let Ok(mut guard) = self.interval_handle.lock() {
            if let Some(handle) = guard.take() {
                log::info!("Stopping background fetch service");
                handle.abort();
            }
        } else {
            log::error!("Failed to acquire lock to stop background fetch");
        }
    }

    /// Restart the background fetch task with a new interval
    pub fn restart(
        &self,
        cache: Arc<RepositoryCache>,
        app_handle: AppHandle,
        interval_minutes: u32,
    ) {
        self.stop();
        self.start(cache, app_handle, interval_minutes);
    }

    /// Check if the background fetch service is running
    pub fn is_running(&self) -> bool {
        if let Ok(guard) = self.interval_handle.lock() {
            guard.is_some()
        } else {
            false
        }
    }
}

impl Default for BackgroundFetchService {
    fn default() -> Self {
        Self::new()
    }
}
