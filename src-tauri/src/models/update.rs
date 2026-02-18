use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub date: Option<String>,
    pub body: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_update_info_serialization() {
        let info = UpdateInfo {
            version: "1.2.0".to_string(),
            date: Some("2026-01-30".to_string()),
            body: Some("New features".to_string()),
        };

        let json = serde_json::to_string(&info).expect("should serialize");
        assert!(json.contains("\"version\":\"1.2.0\""));
        assert!(json.contains("\"date\":\"2026-01-30\""));
        assert!(json.contains("\"body\":\"New features\""));
    }

    #[test]
    fn test_update_info_deserialization() {
        let json = r#"{"version":"1.2.0","date":"2026-01-30","body":"New features"}"#;
        let info: UpdateInfo = serde_json::from_str(json).expect("should deserialize");

        assert_eq!(info.version, "1.2.0");
        assert_eq!(info.date, Some("2026-01-30".to_string()));
        assert_eq!(info.body, Some("New features".to_string()));
    }

    #[test]
    fn test_update_info_with_null_fields() {
        let info = UpdateInfo {
            version: "0.1.0".to_string(),
            date: None,
            body: None,
        };

        let json = serde_json::to_string(&info).expect("should serialize");
        assert!(json.contains("\"date\":null"));
        assert!(json.contains("\"body\":null"));

        let deserialized: UpdateInfo = serde_json::from_str(&json).expect("should deserialize");
        assert_eq!(deserialized.version, "0.1.0");
        assert!(deserialized.date.is_none());
        assert!(deserialized.body.is_none());
    }

    #[test]
    fn test_update_info_clone() {
        let info = UpdateInfo {
            version: "2.0.0".to_string(),
            date: Some("2026-02-01".to_string()),
            body: Some("Major release".to_string()),
        };

        let cloned = info.clone();
        assert_eq!(cloned.version, info.version);
        assert_eq!(cloned.date, info.date);
        assert_eq!(cloned.body, info.body);
    }

    #[test]
    fn test_update_info_debug() {
        let info = UpdateInfo {
            version: "1.0.0".to_string(),
            date: None,
            body: None,
        };

        let debug_str = format!("{info:?}");
        assert!(debug_str.contains("UpdateInfo"));
        assert!(debug_str.contains("1.0.0"));
    }

    #[test]
    fn test_update_info_camel_case_serialization() {
        let json = r#"{"version":"1.0.0","date":null,"body":null}"#;
        let info: UpdateInfo = serde_json::from_str(json).expect("should deserialize camelCase");
        assert_eq!(info.version, "1.0.0");
    }
}
