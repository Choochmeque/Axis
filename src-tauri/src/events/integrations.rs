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

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== OAuthCallbackEvent Tests ====================

    #[test]
    fn test_oauth_callback_event_creation() {
        let event = OAuthCallbackEvent {
            provider: ProviderType::GitHub,
            code: "abc123".to_string(),
            state: Some("random-state".to_string()),
        };

        assert_eq!(event.provider, ProviderType::GitHub);
        assert_eq!(event.code, "abc123");
        assert_eq!(event.state, Some("random-state".to_string()));
    }

    #[test]
    fn test_oauth_callback_event_no_state() {
        let event = OAuthCallbackEvent {
            provider: ProviderType::GitLab,
            code: "xyz789".to_string(),
            state: None,
        };

        assert!(event.state.is_none());
    }

    #[test]
    fn test_oauth_callback_event_serialization() {
        let event = OAuthCallbackEvent {
            provider: ProviderType::GitHub,
            code: "test-code".to_string(),
            state: Some("test-state".to_string()),
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"provider\":\"GitHub\""));
        assert!(json.contains("\"code\":\"test-code\""));
        assert!(json.contains("\"state\":\"test-state\""));
    }

    // ==================== IntegrationStatusChangedEvent Tests ====================

    #[test]
    fn test_integration_status_changed_event_connected() {
        let event = IntegrationStatusChangedEvent {
            provider: ProviderType::GitHub,
            connected: true,
        };

        assert_eq!(event.provider, ProviderType::GitHub);
        assert!(event.connected);
    }

    #[test]
    fn test_integration_status_changed_event_disconnected() {
        let event = IntegrationStatusChangedEvent {
            provider: ProviderType::Bitbucket,
            connected: false,
        };

        assert_eq!(event.provider, ProviderType::Bitbucket);
        assert!(!event.connected);
    }

    #[test]
    fn test_integration_status_changed_event_serialization() {
        let event = IntegrationStatusChangedEvent {
            provider: ProviderType::Gitea,
            connected: true,
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"provider\":\"Gitea\""));
        assert!(json.contains("\"connected\":true"));
    }
}
