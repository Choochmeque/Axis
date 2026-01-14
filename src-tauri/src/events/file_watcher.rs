use specta::Type;
use tauri_specta::Event;

/// Files in the repository changed
#[derive(Clone, serde::Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct FilesChangedEvent {
    pub paths: Vec<String>,
}

/// The index (staging area) changed
#[derive(Clone, serde::Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct IndexChangedEvent;

/// A ref (branch, tag) changed
#[derive(Clone, serde::Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct RefChangedEvent {
    pub ref_name: String,
}

/// HEAD changed (checkout, commit)
#[derive(Clone, serde::Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct HeadChangedEvent;

/// Watch error occurred
#[derive(Clone, serde::Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct WatchErrorEvent {
    pub message: String,
}
