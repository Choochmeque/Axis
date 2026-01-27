use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use tauri::AppHandle;
use tauri_specta::Event;

use crate::events::{GitOperationProgressEvent, GitOperationType, ProgressStage};

const THROTTLE_INTERVAL: Duration = Duration::from_millis(100);

/// Manages progress event emission with throttling and cancellation support
pub struct ProgressEmitter {
    app_handle: AppHandle,
    last_emit: Mutex<HashMap<String, Instant>>,
    cancelled: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl ProgressEmitter {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            app_handle,
            last_emit: Mutex::new(HashMap::new()),
            cancelled: Mutex::new(HashMap::new()),
        }
    }

    /// Register an operation and get a cancellation token
    pub fn register_operation(&self, operation_id: &str) -> Arc<AtomicBool> {
        let cancel_token = Arc::new(AtomicBool::new(false));
        if let Ok(mut cancelled) = self.cancelled.lock() {
            cancelled.insert(operation_id.to_string(), Arc::clone(&cancel_token));
        }
        cancel_token
    }

    /// Cancel an operation by ID
    pub fn cancel_operation(&self, operation_id: &str) -> bool {
        if let Ok(cancelled) = self.cancelled.lock() {
            if let Some(token) = cancelled.get(operation_id) {
                token.store(true, Ordering::SeqCst);
                return true;
            }
        }
        false
    }

    /// Check if an operation is cancelled
    pub fn is_cancelled(&self, operation_id: &str) -> bool {
        if let Ok(cancelled) = self.cancelled.lock() {
            if let Some(token) = cancelled.get(operation_id) {
                return token.load(Ordering::SeqCst);
            }
        }
        false
    }

    /// Emit a progress event with throttling
    /// Returns false if the operation should be cancelled
    pub fn emit_progress(&self, event: GitOperationProgressEvent, force: bool) -> bool {
        // Always emit Complete/Failed/Cancelled immediately
        let should_force = force
            || matches!(
                event.stage,
                ProgressStage::Complete | ProgressStage::Failed | ProgressStage::Cancelled
            );

        let now = Instant::now();
        let should_emit = {
            let mut last_emit = match self.last_emit.lock() {
                Ok(guard) => guard,
                Err(e) => e.into_inner(),
            };

            let last = last_emit.get(&event.operation_id).copied();

            if should_force
                || last
                    .map(|l| now.duration_since(l) >= THROTTLE_INTERVAL)
                    .unwrap_or(true)
            {
                last_emit.insert(event.operation_id.clone(), now);
                true
            } else {
                false
            }
        };

        if should_emit {
            if let Err(e) = event.emit(&self.app_handle) {
                log::error!("Failed to emit progress event: {e}");
            }
        }

        // Return whether operation should continue (false = cancelled)
        !self.is_cancelled(&event.operation_id)
    }

    /// Emit a simple progress event
    pub fn emit(
        &self,
        operation_id: &str,
        operation_type: GitOperationType,
        stage: ProgressStage,
        stats: Option<&git2::Progress<'_>>,
    ) -> bool {
        let mut event =
            GitOperationProgressEvent::new(operation_id.to_string(), operation_type, stage);
        if let Some(stats) = stats {
            event.total_objects = Some(stats.total_objects());
            event.received_objects = Some(stats.received_objects());
            event.indexed_objects = Some(stats.indexed_objects());
            event.received_bytes = stats.received_bytes();
            event.total_deltas = Some(stats.total_deltas());
            event.indexed_deltas = Some(stats.indexed_deltas());
        }
        self.emit_progress(event, false)
    }

    /// Emit progress event with simple counts (for push operations)
    pub fn emit_with_counts(
        &self,
        operation_id: &str,
        operation_type: GitOperationType,
        stage: ProgressStage,
        current: usize,
        total: usize,
        bytes: usize,
    ) -> bool {
        let mut event =
            GitOperationProgressEvent::new(operation_id.to_string(), operation_type, stage);
        event.total_objects = Some(total);
        event.received_objects = Some(current);
        event.received_bytes = bytes;
        self.emit_progress(event, false)
    }

    /// Emit completion event
    pub fn emit_complete(&self, operation_id: &str, operation_type: GitOperationType) {
        let event = GitOperationProgressEvent::new(
            operation_id.to_string(),
            operation_type,
            ProgressStage::Complete,
        );
        self.emit_progress(event, true);
    }

    /// Emit failure event
    pub fn emit_failed(&self, operation_id: &str, operation_type: GitOperationType, message: &str) {
        let mut event = GitOperationProgressEvent::new(
            operation_id.to_string(),
            operation_type,
            ProgressStage::Failed,
        );
        event.message = Some(message.to_string());
        self.emit_progress(event, true);
    }

    /// Emit cancelled event
    pub fn emit_cancelled(&self, operation_id: &str, operation_type: GitOperationType) {
        let event = GitOperationProgressEvent::new(
            operation_id.to_string(),
            operation_type,
            ProgressStage::Cancelled,
        );
        self.emit_progress(event, true);
    }

    /// Clean up tracking for an operation
    pub fn cleanup_operation(&self, operation_id: &str) {
        if let Ok(mut last_emit) = self.last_emit.lock() {
            last_emit.remove(operation_id);
        }
        if let Ok(mut cancelled) = self.cancelled.lock() {
            cancelled.remove(operation_id);
        }
    }
}

/// Context for tracking progress of a single operation with automatic cleanup
pub struct ProgressContext<'a> {
    pub operation_id: String,
    emitter: Arc<ProgressEmitter>,
    cancel_token: Arc<AtomicBool>,
    registry: &'a ProgressRegistry,
}

impl<'a> ProgressContext<'a> {
    pub fn new(app_handle: AppHandle, registry: &'a ProgressRegistry) -> Self {
        let operation_id = uuid::Uuid::new_v4().to_string();
        let cancel_token = registry.register(&operation_id);
        let emitter = Arc::new(ProgressEmitter::new(app_handle));

        Self {
            operation_id,
            emitter,
            cancel_token,
            registry,
        }
    }

    /// Get a clone of the cancel token for use in callbacks
    pub fn cancel_token(&self) -> Arc<AtomicBool> {
        Arc::clone(&self.cancel_token)
    }

    /// Get a clone of the emitter for use in callbacks
    pub fn emitter(&self) -> Arc<ProgressEmitter> {
        Arc::clone(&self.emitter)
    }

    /// Check if the operation was cancelled
    pub fn is_cancelled(&self) -> bool {
        self.cancel_token.load(Ordering::SeqCst)
    }

    /// Emit a progress event
    pub fn emit(
        &self,
        operation_type: GitOperationType,
        stage: ProgressStage,
        stats: Option<&git2::Progress<'_>>,
    ) {
        self.emitter
            .emit(&self.operation_id, operation_type, stage, stats);
    }

    /// Emit completion event
    pub fn emit_complete(&self, operation_type: GitOperationType) {
        self.emitter
            .emit_complete(&self.operation_id, operation_type);
    }

    /// Emit failure event
    pub fn emit_failed(&self, operation_type: GitOperationType, message: &str) {
        self.emitter
            .emit_failed(&self.operation_id, operation_type, message);
    }

    /// Emit cancelled event
    pub fn emit_cancelled(&self, operation_type: GitOperationType) {
        self.emitter
            .emit_cancelled(&self.operation_id, operation_type);
    }

    /// Handle result - emits complete/cancelled/failed based on result and cancel state
    pub fn handle_result<T, E: std::fmt::Display>(
        &self,
        result: &Result<T, E>,
        operation_type: GitOperationType,
    ) {
        match result {
            Ok(_) => self.emit_complete(operation_type),
            Err(e) => {
                if self.is_cancelled() {
                    self.emit_cancelled(operation_type);
                } else {
                    self.emit_failed(operation_type, &e.to_string());
                }
            }
        }
    }

    /// Create a receive progress callback for fetch/clone/pull operations
    pub fn make_receive_callback(
        &self,
        operation_type: GitOperationType,
    ) -> impl FnMut(&git2::Progress<'_>) -> bool {
        let cancel_token = self.cancel_token();
        let emitter = self.emitter();
        let op_id = self.operation_id.clone();

        move |stats: &git2::Progress<'_>| {
            if cancel_token.load(Ordering::SeqCst) {
                return false;
            }
            let stage = if stats.received_objects() < stats.total_objects() {
                ProgressStage::Receiving
            } else {
                ProgressStage::Resolving
            };
            emitter.emit(&op_id, operation_type, stage, Some(stats))
        }
    }

    /// Create a send progress callback for push operations
    pub fn make_send_callback(
        &self,
        operation_type: GitOperationType,
    ) -> impl FnMut(usize, usize, usize) -> bool {
        let cancel_token = self.cancel_token();
        let emitter = self.emitter();
        let op_id = self.operation_id.clone();

        move |current: usize, total: usize, bytes: usize| {
            if cancel_token.load(Ordering::SeqCst) {
                return false;
            }
            let stage = if current < total {
                ProgressStage::Compressing
            } else {
                ProgressStage::Writing
            };
            emitter.emit_with_counts(&op_id, operation_type, stage, current, total, bytes)
        }
    }
}

impl Drop for ProgressContext<'_> {
    fn drop(&mut self) {
        self.emitter.cleanup_operation(&self.operation_id);
        self.registry.cleanup(&self.operation_id);
    }
}

/// Global registry for cancellation tokens (needed for cancel command)
pub struct ProgressRegistry {
    emitters: Mutex<HashMap<String, Arc<AtomicBool>>>,
}

impl ProgressRegistry {
    pub fn new() -> Self {
        Self {
            emitters: Mutex::new(HashMap::new()),
        }
    }

    pub fn register(&self, operation_id: &str) -> Arc<AtomicBool> {
        let token = Arc::new(AtomicBool::new(false));
        if let Ok(mut emitters) = self.emitters.lock() {
            emitters.insert(operation_id.to_string(), Arc::clone(&token));
        }
        token
    }

    pub fn cancel(&self, operation_id: &str) -> bool {
        if let Ok(emitters) = self.emitters.lock() {
            if let Some(token) = emitters.get(operation_id) {
                token.store(true, Ordering::SeqCst);
                return true;
            }
        }
        false
    }

    pub fn cleanup(&self, operation_id: &str) {
        if let Ok(mut emitters) = self.emitters.lock() {
            emitters.remove(operation_id);
        }
    }
}

impl Default for ProgressRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== ProgressRegistry Tests ====================

    #[test]
    fn test_progress_registry_new() {
        let registry = ProgressRegistry::new();
        // Should be able to create a new registry
        assert!(registry.emitters.lock().expect("should lock").is_empty());
    }

    #[test]
    fn test_progress_registry_default() {
        let registry = ProgressRegistry::default();
        assert!(registry.emitters.lock().expect("should lock").is_empty());
    }

    #[test]
    fn test_progress_registry_register() {
        let registry = ProgressRegistry::new();
        let token = registry.register("op-123");

        // Token should start as not cancelled
        assert!(!token.load(Ordering::SeqCst));

        // Operation should be tracked
        let emitters = registry.emitters.lock().expect("should lock");
        assert!(emitters.contains_key("op-123"));
    }

    #[test]
    fn test_progress_registry_register_multiple() {
        let registry = ProgressRegistry::new();

        let token1 = registry.register("op-1");
        let token2 = registry.register("op-2");
        let token3 = registry.register("op-3");

        // All tokens should be independent
        assert!(!token1.load(Ordering::SeqCst));
        assert!(!token2.load(Ordering::SeqCst));
        assert!(!token3.load(Ordering::SeqCst));

        // All should be tracked
        let emitters = registry.emitters.lock().expect("should lock");
        assert_eq!(emitters.len(), 3);
    }

    #[test]
    fn test_progress_registry_cancel() {
        let registry = ProgressRegistry::new();
        let token = registry.register("op-123");

        // Initially not cancelled
        assert!(!token.load(Ordering::SeqCst));

        // Cancel the operation
        let cancelled = registry.cancel("op-123");
        assert!(cancelled);

        // Token should now be cancelled
        assert!(token.load(Ordering::SeqCst));
    }

    #[test]
    fn test_progress_registry_cancel_nonexistent() {
        let registry = ProgressRegistry::new();

        // Cancelling non-existent operation should return false
        let cancelled = registry.cancel("nonexistent");
        assert!(!cancelled);
    }

    #[test]
    fn test_progress_registry_cancel_already_cancelled() {
        let registry = ProgressRegistry::new();
        let token = registry.register("op-123");

        // Cancel twice
        registry.cancel("op-123");
        let second_cancel = registry.cancel("op-123");

        // Should still return true (operation exists)
        assert!(second_cancel);
        assert!(token.load(Ordering::SeqCst));
    }

    #[test]
    fn test_progress_registry_cleanup() {
        let registry = ProgressRegistry::new();
        registry.register("op-123");

        // Operation should exist
        {
            let emitters = registry.emitters.lock().expect("should lock");
            assert!(emitters.contains_key("op-123"));
        }

        // Cleanup
        registry.cleanup("op-123");

        // Operation should be removed
        let emitters = registry.emitters.lock().expect("should lock");
        assert!(!emitters.contains_key("op-123"));
    }

    #[test]
    fn test_progress_registry_cleanup_nonexistent() {
        let registry = ProgressRegistry::new();

        // Should not panic on cleaning up non-existent operation
        registry.cleanup("nonexistent");
    }

    #[test]
    fn test_progress_registry_cancel_after_cleanup() {
        let registry = ProgressRegistry::new();
        registry.register("op-123");
        registry.cleanup("op-123");

        // Cancelling after cleanup should return false
        let cancelled = registry.cancel("op-123");
        assert!(!cancelled);
    }

    #[test]
    fn test_progress_registry_multiple_operations_cancel_one() {
        let registry = ProgressRegistry::new();

        let token1 = registry.register("op-1");
        let token2 = registry.register("op-2");

        // Cancel only op-1
        registry.cancel("op-1");

        // op-1 should be cancelled, op-2 should not
        assert!(token1.load(Ordering::SeqCst));
        assert!(!token2.load(Ordering::SeqCst));
    }

    #[test]
    fn test_progress_registry_token_shared() {
        let registry = ProgressRegistry::new();
        let token = registry.register("op-123");
        let token_clone = Arc::clone(&token);

        // Cancel via registry
        registry.cancel("op-123");

        // Both references should see the cancellation
        assert!(token.load(Ordering::SeqCst));
        assert!(token_clone.load(Ordering::SeqCst));
    }

    #[test]
    fn test_progress_registry_replace_operation() {
        let registry = ProgressRegistry::new();

        let token1 = registry.register("op-123");
        token1.store(true, Ordering::SeqCst);

        // Register same operation again
        let token2 = registry.register("op-123");

        // New token should be fresh (not cancelled)
        assert!(!token2.load(Ordering::SeqCst));

        // Old token should still be set
        assert!(token1.load(Ordering::SeqCst));
    }

    // ==================== THROTTLE_INTERVAL Tests ====================

    #[test]
    fn test_throttle_interval_value() {
        // Verify the constant is reasonable
        assert_eq!(THROTTLE_INTERVAL, Duration::from_millis(100));
    }
}
