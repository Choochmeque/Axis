use specta::Type;
use tauri_specta::Event;

/// Request from a launched Axis process to open a repository path.
#[derive(Clone, serde::Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct OpenRepositoryRequestEvent {
    pub path: String,
}
