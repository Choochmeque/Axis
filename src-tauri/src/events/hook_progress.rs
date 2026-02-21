use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumString};
use tauri_specta::Event;

use crate::models::GitHookType;

#[derive(Clone, Copy, Serialize, Deserialize, Type, Display, EnumString, Debug, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "PascalCase")]
pub enum HookStage {
    Running,
    Complete,
    Failed,
    Cancelled,
}

/// Progress update for hook execution
#[derive(Clone, Serialize, Type, Event, Debug)]
#[serde(rename_all = "camelCase")]
pub struct HookProgressEvent {
    pub operation_id: String,
    pub hook_type: GitHookType,
    pub stage: HookStage,
    pub message: Option<String>,
    pub can_abort: bool,
}

impl HookProgressEvent {
    pub fn new(operation_id: String, hook_type: GitHookType, stage: HookStage) -> Self {
        Self {
            operation_id,
            hook_type,
            stage,
            message: None,
            can_abort: hook_type.can_abort(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    // ==================== HookStage Tests ====================

    #[test]
    fn test_hook_stage_display() {
        assert_eq!(HookStage::Running.to_string(), "Running");
        assert_eq!(HookStage::Complete.to_string(), "Complete");
        assert_eq!(HookStage::Failed.to_string(), "Failed");
        assert_eq!(HookStage::Cancelled.to_string(), "Cancelled");
    }

    #[test]
    fn test_hook_stage_from_str() {
        assert_eq!(
            HookStage::from_str("Running").expect("should parse"),
            HookStage::Running
        );
        assert_eq!(
            HookStage::from_str("Complete").expect("should parse"),
            HookStage::Complete
        );
        assert_eq!(
            HookStage::from_str("Failed").expect("should parse"),
            HookStage::Failed
        );
        assert_eq!(
            HookStage::from_str("Cancelled").expect("should parse"),
            HookStage::Cancelled
        );
    }

    #[test]
    fn test_hook_stage_serialization() {
        let stage = HookStage::Running;
        let json = serde_json::to_string(&stage).expect("should serialize");
        assert_eq!(json, "\"Running\"");

        let stage = HookStage::Cancelled;
        let json = serde_json::to_string(&stage).expect("should serialize");
        assert_eq!(json, "\"Cancelled\"");
    }

    #[test]
    fn test_hook_stage_deserialization() {
        let stage: HookStage = serde_json::from_str("\"Running\"").expect("should deserialize");
        assert_eq!(stage, HookStage::Running);

        let stage: HookStage = serde_json::from_str("\"Failed\"").expect("should deserialize");
        assert_eq!(stage, HookStage::Failed);
    }

    // ==================== HookProgressEvent Tests ====================

    #[test]
    fn test_hook_progress_event_new() {
        let event = HookProgressEvent::new(
            "op-123".to_string(),
            GitHookType::PreCommit,
            HookStage::Running,
        );

        assert_eq!(event.operation_id, "op-123");
        assert_eq!(event.hook_type, GitHookType::PreCommit);
        assert_eq!(event.stage, HookStage::Running);
        assert!(event.message.is_none());
        assert!(event.can_abort); // PreCommit can abort
    }

    #[test]
    fn test_hook_progress_event_can_abort_true() {
        let event =
            HookProgressEvent::new("op".to_string(), GitHookType::PreCommit, HookStage::Running);
        assert!(event.can_abort);

        let event =
            HookProgressEvent::new("op".to_string(), GitHookType::PrePush, HookStage::Running);
        assert!(event.can_abort);

        let event =
            HookProgressEvent::new("op".to_string(), GitHookType::CommitMsg, HookStage::Running);
        assert!(event.can_abort);
    }

    #[test]
    fn test_hook_progress_event_can_abort_false() {
        let event = HookProgressEvent::new(
            "op".to_string(),
            GitHookType::PostCommit,
            HookStage::Running,
        );
        assert!(!event.can_abort);

        let event =
            HookProgressEvent::new("op".to_string(), GitHookType::PostMerge, HookStage::Running);
        assert!(!event.can_abort);
    }

    #[test]
    fn test_hook_progress_event_serialization() {
        let event = HookProgressEvent::new(
            "test-op".to_string(),
            GitHookType::PreCommit,
            HookStage::Complete,
        );

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"operationId\":\"test-op\""));
        assert!(json.contains("\"hookType\":\"PreCommit\""));
        assert!(json.contains("\"stage\":\"Complete\""));
        assert!(json.contains("\"canAbort\":true"));
    }

    #[test]
    fn test_hook_progress_event_with_message() {
        let mut event =
            HookProgressEvent::new("op".to_string(), GitHookType::PreCommit, HookStage::Failed);
        event.message = Some("Lint failed".to_string());

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"message\":\"Lint failed\""));
    }
}
