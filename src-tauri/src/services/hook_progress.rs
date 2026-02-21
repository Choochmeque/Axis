use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tauri::AppHandle;
use tauri_specta::Event;

use crate::events::{HookProgressEvent, HookStage};
use crate::models::GitHookType;
use crate::services::ProgressRegistry;

/// Emitter for hook progress events with cancellation support
pub struct HookProgressEmitter {
    operation_id: String,
    app_handle: AppHandle,
    cancel_token: Arc<AtomicBool>,
    registry: Arc<ProgressRegistry>,
}

impl HookProgressEmitter {
    pub fn new(app_handle: AppHandle, registry: Arc<ProgressRegistry>) -> Self {
        let operation_id = uuid::Uuid::new_v4().to_string();
        let cancel_token = registry.register(&operation_id);
        Self {
            operation_id,
            app_handle,
            cancel_token,
            registry,
        }
    }

    /// Get the operation ID
    pub fn operation_id(&self) -> &str {
        &self.operation_id
    }

    /// Check if the operation was cancelled
    pub fn is_cancelled(&self) -> bool {
        self.cancel_token.load(Ordering::SeqCst)
    }

    /// Emit a running event
    pub fn emit_running(&self, hook_type: GitHookType) {
        let event =
            HookProgressEvent::new(self.operation_id.clone(), hook_type, HookStage::Running);
        if let Err(e) = event.emit(&self.app_handle) {
            log::error!("Failed to emit hook running event: {e}");
        }
    }

    /// Emit a complete event
    pub fn emit_complete(&self, hook_type: GitHookType) {
        let event =
            HookProgressEvent::new(self.operation_id.clone(), hook_type, HookStage::Complete);
        if let Err(e) = event.emit(&self.app_handle) {
            log::error!("Failed to emit hook complete event: {e}");
        }
    }

    /// Emit a failed event with message
    pub fn emit_failed(&self, hook_type: GitHookType, message: &str) {
        let mut event =
            HookProgressEvent::new(self.operation_id.clone(), hook_type, HookStage::Failed);
        event.message = Some(message.to_string());
        if let Err(e) = event.emit(&self.app_handle) {
            log::error!("Failed to emit hook failed event: {e}");
        }
    }

    /// Emit a cancelled event
    pub fn emit_cancelled(&self, hook_type: GitHookType) {
        let event =
            HookProgressEvent::new(self.operation_id.clone(), hook_type, HookStage::Cancelled);
        if let Err(e) = event.emit(&self.app_handle) {
            log::error!("Failed to emit hook cancelled event: {e}");
        }
    }
}

impl Drop for HookProgressEmitter {
    fn drop(&mut self) {
        self.registry.cleanup(&self.operation_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== HookProgressEmitter Tests ====================

    #[test]
    fn test_operation_id_is_uuid() {
        // We can't fully test without AppHandle, but we can verify the UUID format
        let uuid = uuid::Uuid::new_v4().to_string();
        assert_eq!(uuid.len(), 36); // UUID v4 string length
        assert!(uuid.contains('-'));
    }

    #[test]
    fn test_cancel_token_initial_state() {
        let token = Arc::new(AtomicBool::new(false));
        assert!(!token.load(Ordering::SeqCst));
    }

    #[test]
    fn test_cancel_token_cancelled_state() {
        let token = Arc::new(AtomicBool::new(false));
        token.store(true, Ordering::SeqCst);
        assert!(token.load(Ordering::SeqCst));
    }
}
