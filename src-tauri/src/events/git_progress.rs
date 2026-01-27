use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumString};
use tauri_specta::Event;

#[derive(Clone, Copy, Serialize, Deserialize, Type, Display, EnumString, Debug, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "PascalCase")]
pub enum GitOperationType {
    Clone,
    Fetch,
    Push,
    Pull,
}

#[derive(Clone, Copy, Serialize, Deserialize, Type, Display, EnumString, Debug, PartialEq, Eq)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "PascalCase")]
pub enum ProgressStage {
    Connecting,
    Counting,
    Compressing,
    Receiving,
    Resolving,
    Writing,
    Complete,
    Failed,
    Cancelled,
}

/// Progress update for git operations (clone, fetch, push, pull)
#[derive(Clone, Serialize, Type, Event, Debug)]
#[serde(rename_all = "camelCase")]
pub struct GitOperationProgressEvent {
    pub operation_id: String,
    pub operation_type: GitOperationType,
    pub stage: ProgressStage,
    pub total_objects: Option<usize>,
    pub received_objects: Option<usize>,
    pub indexed_objects: Option<usize>,
    pub received_bytes: usize,
    pub total_deltas: Option<usize>,
    pub indexed_deltas: Option<usize>,
    pub message: Option<String>,
}

impl GitOperationProgressEvent {
    pub fn new(
        operation_id: String,
        operation_type: GitOperationType,
        stage: ProgressStage,
    ) -> Self {
        Self {
            operation_id,
            operation_type,
            stage,
            total_objects: None,
            received_objects: None,
            indexed_objects: None,
            received_bytes: 0,
            total_deltas: None,
            indexed_deltas: None,
            message: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    // ==================== GitOperationType Tests ====================

    #[test]
    fn test_git_operation_type_display() {
        assert_eq!(GitOperationType::Clone.to_string(), "Clone");
        assert_eq!(GitOperationType::Fetch.to_string(), "Fetch");
        assert_eq!(GitOperationType::Push.to_string(), "Push");
        assert_eq!(GitOperationType::Pull.to_string(), "Pull");
    }

    #[test]
    fn test_git_operation_type_from_str() {
        assert_eq!(
            GitOperationType::from_str("Clone").expect("should parse"),
            GitOperationType::Clone
        );
        assert_eq!(
            GitOperationType::from_str("Fetch").expect("should parse"),
            GitOperationType::Fetch
        );
        assert_eq!(
            GitOperationType::from_str("Push").expect("should parse"),
            GitOperationType::Push
        );
        assert_eq!(
            GitOperationType::from_str("Pull").expect("should parse"),
            GitOperationType::Pull
        );
    }

    #[test]
    fn test_git_operation_type_serialization() {
        let clone = GitOperationType::Clone;
        let json = serde_json::to_string(&clone).expect("should serialize");
        assert_eq!(json, "\"Clone\"");

        let fetch = GitOperationType::Fetch;
        let json = serde_json::to_string(&fetch).expect("should serialize");
        assert_eq!(json, "\"Fetch\"");
    }

    #[test]
    fn test_git_operation_type_deserialization() {
        let op: GitOperationType = serde_json::from_str("\"Push\"").expect("should deserialize");
        assert_eq!(op, GitOperationType::Push);
    }

    // ==================== ProgressStage Tests ====================

    #[test]
    fn test_progress_stage_display() {
        assert_eq!(ProgressStage::Connecting.to_string(), "Connecting");
        assert_eq!(ProgressStage::Counting.to_string(), "Counting");
        assert_eq!(ProgressStage::Compressing.to_string(), "Compressing");
        assert_eq!(ProgressStage::Receiving.to_string(), "Receiving");
        assert_eq!(ProgressStage::Resolving.to_string(), "Resolving");
        assert_eq!(ProgressStage::Writing.to_string(), "Writing");
        assert_eq!(ProgressStage::Complete.to_string(), "Complete");
        assert_eq!(ProgressStage::Failed.to_string(), "Failed");
        assert_eq!(ProgressStage::Cancelled.to_string(), "Cancelled");
    }

    #[test]
    fn test_progress_stage_from_str() {
        assert_eq!(
            ProgressStage::from_str("Connecting").expect("should parse"),
            ProgressStage::Connecting
        );
        assert_eq!(
            ProgressStage::from_str("Complete").expect("should parse"),
            ProgressStage::Complete
        );
        assert_eq!(
            ProgressStage::from_str("Failed").expect("should parse"),
            ProgressStage::Failed
        );
    }

    #[test]
    fn test_progress_stage_serialization() {
        let stage = ProgressStage::Receiving;
        let json = serde_json::to_string(&stage).expect("should serialize");
        assert_eq!(json, "\"Receiving\"");
    }

    // ==================== GitOperationProgressEvent Tests ====================

    #[test]
    fn test_git_operation_progress_event_new() {
        let event = GitOperationProgressEvent::new(
            "op-123".to_string(),
            GitOperationType::Fetch,
            ProgressStage::Receiving,
        );

        assert_eq!(event.operation_id, "op-123");
        assert_eq!(event.operation_type, GitOperationType::Fetch);
        assert_eq!(event.stage, ProgressStage::Receiving);
        assert!(event.total_objects.is_none());
        assert!(event.received_objects.is_none());
        assert_eq!(event.received_bytes, 0);
        assert!(event.message.is_none());
    }

    #[test]
    fn test_git_operation_progress_event_with_stats() {
        let mut event = GitOperationProgressEvent::new(
            "op-456".to_string(),
            GitOperationType::Clone,
            ProgressStage::Receiving,
        );

        event.total_objects = Some(100);
        event.received_objects = Some(50);
        event.indexed_objects = Some(40);
        event.received_bytes = 1024 * 1024;
        event.total_deltas = Some(20);
        event.indexed_deltas = Some(10);

        assert_eq!(event.total_objects, Some(100));
        assert_eq!(event.received_objects, Some(50));
        assert_eq!(event.received_bytes, 1024 * 1024);
    }

    #[test]
    fn test_git_operation_progress_event_with_message() {
        let mut event = GitOperationProgressEvent::new(
            "op-789".to_string(),
            GitOperationType::Push,
            ProgressStage::Failed,
        );

        event.message = Some("Authentication failed".to_string());

        assert_eq!(event.message, Some("Authentication failed".to_string()));
    }

    #[test]
    fn test_git_operation_progress_event_serialization() {
        let event = GitOperationProgressEvent::new(
            "test-op".to_string(),
            GitOperationType::Pull,
            ProgressStage::Complete,
        );

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"operationId\":\"test-op\""));
        assert!(json.contains("\"operationType\":\"Pull\""));
        assert!(json.contains("\"stage\":\"Complete\""));
    }

    #[test]
    fn test_git_operation_progress_event_complete_serialization() {
        let mut event = GitOperationProgressEvent::new(
            "op".to_string(),
            GitOperationType::Fetch,
            ProgressStage::Resolving,
        );
        event.total_objects = Some(500);
        event.received_objects = Some(500);
        event.received_bytes = 2048;

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"totalObjects\":500"));
        assert!(json.contains("\"receivedObjects\":500"));
        assert!(json.contains("\"receivedBytes\":2048"));
    }
}
