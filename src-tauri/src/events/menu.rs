use specta::Type;
use tauri_specta::Event;

/// Menu action triggered
#[derive(Clone, serde::Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct MenuActionEvent {
    pub action_id: String,
}
