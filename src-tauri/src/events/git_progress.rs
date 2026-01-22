use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumString};
use tauri_specta::Event;

#[derive(Clone, Copy, Serialize, Deserialize, Type, Display, EnumString, Debug)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "PascalCase")]
pub enum GitOperationType {
    Clone,
    Fetch,
    Push,
    Pull,
}

#[derive(Clone, Copy, Serialize, Deserialize, Type, Display, EnumString, Debug)]
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
