use crate::events::RemoteFetchedEvent;
use crate::models::{FetchOptions, SshCredentials, SshKeyFormat};
use crate::services::SshKeyService;
use crate::state::{AppState, RepositoryCache};
use parking_lot::Mutex;
use std::sync::Arc;
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
                        let app_state = app_handle.state::<AppState>();
                        let repo_path_str = path.to_string_lossy().to_string();
                        let default_ssh_key = app_state
                            .get_settings()
                            .map(|s| s.default_ssh_key)
                            .unwrap_or(None);

                        // List remotes (read lock)
                        let remotes = match handle.read().await.list_remotes().await {
                            Ok(remotes) => remotes,
                            Err(e) => {
                                log::warn!(
                                    "Background fetch: failed to list remotes for {}: {e}",
                                    path.display()
                                );
                                continue;
                            }
                        };

                        let options = FetchOptions::default();
                        let mut total_updates = 0u32;

                        for remote in remotes {
                            let ssh_key = SshKeyService::resolve_ssh_key(
                                app_state.database(),
                                &repo_path_str,
                                &remote.name,
                                &default_ssh_key,
                            );

                            // Skip encrypted keys when no cached passphrase is available
                            if let Some(key_path) = &ssh_key {
                                let format = SshKeyService::check_key_format_optional(
                                    std::path::Path::new(key_path),
                                );
                                if let Some(
                                    SshKeyFormat::EncryptedPem | SshKeyFormat::EncryptedOpenSsh,
                                ) = format
                                {
                                    if app_state.get_cached_ssh_passphrase(key_path).is_none() {
                                        log::debug!(
                                            "Background fetch: skipping remote {} (encrypted key, no cached passphrase)",
                                            remote.name
                                        );
                                        continue;
                                    }
                                }
                            }

                            let ssh_creds = ssh_key.map(|key_path| {
                                let passphrase = app_state.get_cached_ssh_passphrase(&key_path);
                                SshCredentials {
                                    key_path,
                                    passphrase,
                                }
                            });

                            // Fetch (write lock, per remote)
                            match handle
                                .write()
                                .await
                                .fetch(
                                    &remote.name,
                                    &options,
                                    None,
                                    None::<fn(&git2::Progress<'_>) -> bool>,
                                    ssh_creds,
                                )
                                .await
                            {
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
                }
            }
        });

        *self.interval_handle.lock() = Some(handle);
    }

    /// Stop the background fetch task
    pub fn stop(&self) {
        if let Some(handle) = self.interval_handle.lock().take() {
            log::info!("Stopping background fetch service");
            handle.abort();
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

    #[cfg(test)]
    /// Check if the background fetch service is running
    pub fn is_running(&self) -> bool {
        self.interval_handle.lock().is_some()
    }
}

impl Default for BackgroundFetchService {
    fn default() -> Self {
        Self::new()
    }
}
