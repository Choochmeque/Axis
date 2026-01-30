use serde::Serialize;
use specta::Type;
use tauri_specta::Event;

#[derive(Clone, Serialize, Type, Event, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDownloadProgressEvent {
    pub downloaded: u64,
    pub total: Option<u64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_download_progress_event_serialization() {
        let event = UpdateDownloadProgressEvent {
            downloaded: 500,
            total: Some(1000),
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"downloaded\":500"));
        assert!(json.contains("\"total\":1000"));
    }

    #[test]
    fn test_update_download_progress_event_with_unknown_total() {
        let event = UpdateDownloadProgressEvent {
            downloaded: 250,
            total: None,
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        assert!(json.contains("\"downloaded\":250"));
        assert!(json.contains("\"total\":null"));
    }

    #[test]
    fn test_update_download_progress_event_clone() {
        let event = UpdateDownloadProgressEvent {
            downloaded: 100,
            total: Some(200),
        };

        let cloned = event.clone();
        assert_eq!(cloned.downloaded, 100);
        assert_eq!(cloned.total, Some(200));
    }

    #[test]
    fn test_update_download_progress_event_debug() {
        let event = UpdateDownloadProgressEvent {
            downloaded: 0,
            total: None,
        };

        let debug_str = format!("{:?}", event);
        assert!(debug_str.contains("UpdateDownloadProgressEvent"));
        assert!(debug_str.contains("0"));
    }

    #[test]
    fn test_update_download_progress_event_camel_case() {
        let event = UpdateDownloadProgressEvent {
            downloaded: 42,
            total: Some(100),
        };

        let json = serde_json::to_string(&event).expect("should serialize");
        // Verify camelCase keys
        assert!(json.contains("\"downloaded\":"));
        assert!(json.contains("\"total\":"));
        // Verify no snake_case
        assert!(!json.contains("_"));
    }
}
