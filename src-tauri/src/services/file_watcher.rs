use crate::events::{
    FilesChangedEvent, HeadChangedEvent, IndexChangedEvent, RefChangedEvent, RepositoryDirtyEvent,
    WatchErrorEvent,
};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{channel, Receiver};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::AppHandle;
use tauri_specta::Event as _;

/// Per-repository file watcher that emits events based on active status.
/// Active repos get detailed events; inactive repos get a single RepositoryDirtyEvent.
pub struct FileWatcher {
    repo_path: PathBuf,
    is_active: Arc<AtomicBool>,
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
    receiver_handle: Arc<Mutex<Option<thread::JoinHandle<()>>>>,
}

impl FileWatcher {
    /// Create a new file watcher for a repository
    pub fn new(repo_path: PathBuf, app_handle: AppHandle, is_active: bool) -> notify::Result<Self> {
        let is_active_flag = Arc::new(AtomicBool::new(is_active));

        let (tx, rx) = channel::<notify::Result<Event>>();

        // Create watcher with debouncing
        let config = Config::default().with_poll_interval(Duration::from_millis(500));
        let mut watcher = RecommendedWatcher::new(tx, config)?;

        // Watch the repository directory
        watcher.watch(&repo_path, RecursiveMode::Recursive)?;

        let watcher_arc = Arc::new(Mutex::new(Some(watcher)));

        // Spawn thread to handle events
        let handle = Self::spawn_event_handler(
            rx,
            repo_path.clone(),
            app_handle,
            Arc::clone(&is_active_flag),
        );
        let handle_arc = Arc::new(Mutex::new(Some(handle)));

        Ok(Self {
            repo_path,
            is_active: is_active_flag,
            watcher: watcher_arc,
            receiver_handle: handle_arc,
        })
    }

    /// Set whether this repo is the active one (affects event emission mode)
    pub fn set_active(&self, active: bool) {
        self.is_active.store(active, Ordering::SeqCst);
    }

    /// Check if this watcher is for the active repository
    pub fn is_active(&self) -> bool {
        self.is_active.load(Ordering::SeqCst)
    }

    /// Get the repository path
    pub fn repo_path(&self) -> &PathBuf {
        &self.repo_path
    }

    /// Stop watching and clean up resources
    pub fn stop(&self) {
        // Drop the watcher to close the channel
        if let Ok(mut guard) = self.watcher.lock() {
            *guard = None;
        }

        // The receiver thread will exit when the channel is closed
        if let Ok(mut guard) = self.receiver_handle.lock() {
            if let Some(handle) = guard.take() {
                drop(handle);
            }
        }
    }

    fn spawn_event_handler(
        rx: Receiver<notify::Result<Event>>,
        repo_path: PathBuf,
        app_handle: AppHandle,
        is_active: Arc<AtomicBool>,
    ) -> thread::JoinHandle<()> {
        let git_dir = repo_path.join(".git");

        thread::spawn(move || {
            // Debouncing: collect events for a short period before emitting
            let mut pending_changes: Vec<PathBuf> = Vec::new();
            let mut last_emit = std::time::Instant::now();
            let debounce_duration = Duration::from_millis(100);

            // Track if we've already emitted a dirty event (for inactive repos)
            let mut dirty_emitted = false;

            // Track pending git events for debouncing
            let mut pending_index_changed = false;
            let mut pending_head_changed = false;
            let mut pending_refs: Vec<String> = Vec::new();

            loop {
                // Use timeout to allow periodic flushing
                match rx.recv_timeout(debounce_duration) {
                    Ok(Ok(event)) => {
                        let active = is_active.load(Ordering::SeqCst);

                        for path in event.paths {
                            // Skip paths outside this repo
                            if !path.starts_with(&repo_path) {
                                continue;
                            }

                            if active {
                                // Active repo: emit detailed events
                                if path.starts_with(&git_dir) {
                                    let relative = path.strip_prefix(&git_dir).unwrap_or(&path);
                                    let relative_str = relative.to_string_lossy();

                                    if relative_str == "index" || relative_str == "index.lock" {
                                        pending_index_changed = true;
                                    } else if relative_str == "HEAD" || relative_str == "HEAD.lock"
                                    {
                                        pending_head_changed = true;
                                    } else if relative_str.starts_with("refs/") {
                                        let ref_name = relative_str.to_string();
                                        if !pending_refs.contains(&ref_name) {
                                            pending_refs.push(ref_name);
                                        }
                                    }
                                } else {
                                    pending_changes.push(path);
                                }
                            } else {
                                // Inactive repo: emit dirty event once per batch
                                if !dirty_emitted {
                                    let _ = RepositoryDirtyEvent {
                                        path: repo_path.to_string_lossy().to_string(),
                                    }
                                    .emit(&app_handle);
                                    dirty_emitted = true;
                                }
                            }
                        }
                    }
                    Ok(Err(e)) => {
                        let _ = WatchErrorEvent {
                            message: e.to_string(),
                        }
                        .emit(&app_handle);
                    }
                    Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                        // Timeout - flush pending changes if any and reset dirty flag
                        dirty_emitted = false;
                    }
                    Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                        // Channel closed, exit the thread
                        break;
                    }
                }

                // Emit pending events if debounce period has passed
                let has_pending = !pending_changes.is_empty()
                    || pending_index_changed
                    || pending_head_changed
                    || !pending_refs.is_empty();

                if has_pending && last_emit.elapsed() >= debounce_duration {
                    // Emit git events
                    if pending_index_changed {
                        let _ = IndexChangedEvent {}.emit(&app_handle);
                        pending_index_changed = false;
                    }
                    if pending_head_changed {
                        let _ = HeadChangedEvent {}.emit(&app_handle);
                        pending_head_changed = false;
                    }
                    for ref_name in pending_refs.drain(..) {
                        let _ = RefChangedEvent { ref_name }.emit(&app_handle);
                    }

                    // Emit file changes
                    if !pending_changes.is_empty() {
                        let paths: Vec<String> = pending_changes
                            .drain(..)
                            .filter_map(|p| {
                                p.strip_prefix(&repo_path)
                                    .ok()
                                    .map(|r| r.to_string_lossy().to_string())
                            })
                            .collect();

                        if !paths.is_empty() {
                            let _ = FilesChangedEvent { paths }.emit(&app_handle);
                        }
                    }
                    last_emit = std::time::Instant::now();
                }
            }
        })
    }
}

impl Drop for FileWatcher {
    fn drop(&mut self) {
        self.stop();
    }
}
