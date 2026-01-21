use serde::Serialize;
use specta::Type;
use tauri_specta::Event;

use crate::models::ProviderType;

/// OAuth callback received from deep link
#[derive(Clone, Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct OAuthCallbackEvent {
    pub provider: ProviderType,
    pub code: String,
    pub state: Option<String>,
}

/// Integration connection status changed
#[derive(Clone, Serialize, Type, Event)]
#[serde(rename_all = "camelCase")]
pub struct IntegrationStatusChangedEvent {
    pub provider: ProviderType,
    pub connected: bool,
}
