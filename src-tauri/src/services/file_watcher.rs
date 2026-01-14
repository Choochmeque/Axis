use crate::events::{
    FilesChangedEvent, HeadChangedEvent, IndexChangedEvent, RefChangedEvent, WatchErrorEvent,
};
use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use parking_lot::Mutex;
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::AppHandle;
use tauri_specta::Event as _;

pub struct FileWatcherService {
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
    receiver_handle: Arc<Mutex<Option<thread::JoinHandle<()>>>>,
}

impl FileWatcherService {
    pub fn new() -> Self {
        FileWatcherService {
            watcher: Arc::new(Mutex::new(None)),
            receiver_handle: Arc::new(Mutex::new(None)),
        }
    }

    /// Start watching a repository path
    pub fn start_watching(&self, repo_path: PathBuf, app_handle: AppHandle) -> notify::Result<()> {
        // Stop any existing watcher
        self.stop_watching();

        let (tx, rx) = channel::<notify::Result<Event>>();

        // Create watcher with debouncing
        let config = Config::default().with_poll_interval(Duration::from_millis(500));

        let mut watcher = RecommendedWatcher::new(tx, config)?;

        // Watch the repository directory
        watcher.watch(&repo_path, RecursiveMode::Recursive)?;

        // Store the watcher
        *self.watcher.lock() = Some(watcher);

        // Spawn thread to handle events
        let handle = self.spawn_event_handler(rx, repo_path, app_handle);
        *self.receiver_handle.lock() = Some(handle);

        Ok(())
    }

    /// Stop watching
    pub fn stop_watching(&self) {
        // Drop the watcher
        *self.watcher.lock() = None;

        // The receiver thread will exit when the channel is closed
        if let Some(handle) = self.receiver_handle.lock().take() {
            // Don't wait for the thread, just let it finish
            drop(handle);
        }
    }

    /// Check if currently watching
    pub fn is_watching(&self) -> bool {
        self.watcher.lock().is_some()
    }

    fn spawn_event_handler(
        &self,
        rx: Receiver<notify::Result<Event>>,
        repo_path: PathBuf,
        app_handle: AppHandle,
    ) -> thread::JoinHandle<()> {
        let git_dir = repo_path.join(".git");

        thread::spawn(move || {
            // Debouncing: collect events for a short period before emitting
            let mut pending_changes: Vec<PathBuf> = Vec::new();
            let mut last_emit = std::time::Instant::now();
            let debounce_duration = Duration::from_millis(100);

            loop {
                // Use timeout to allow periodic flushing
                match rx.recv_timeout(debounce_duration) {
                    Ok(Ok(event)) => {
                        for path in event.paths {
                            // Categorize the event
                            if path.starts_with(&git_dir) {
                                // Git internal changes
                                let relative = path.strip_prefix(&git_dir).unwrap_or(&path);
                                let relative_str = relative.to_string_lossy();

                                if relative_str == "index" || relative_str == "index.lock" {
                                    let _ = IndexChangedEvent {}.emit(&app_handle);
                                } else if relative_str == "HEAD" || relative_str == "HEAD.lock" {
                                    let _ = HeadChangedEvent {}.emit(&app_handle);
                                } else if relative_str.starts_with("refs/") {
                                    let ref_name = relative_str.to_string();
                                    let _ = RefChangedEvent { ref_name }.emit(&app_handle);
                                }
                                // Ignore other .git internal files
                            } else {
                                // Working directory changes
                                pending_changes.push(path);
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
                        // Timeout - flush pending changes if any
                    }
                    Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                        // Channel closed, exit the thread
                        break;
                    }
                }

                // Emit pending changes if debounce period has passed
                if !pending_changes.is_empty() && last_emit.elapsed() >= debounce_duration {
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
                    last_emit = std::time::Instant::now();
                }
            }
        })
    }
}

impl Default for FileWatcherService {
    fn default() -> Self {
        Self::new()
    }
}
