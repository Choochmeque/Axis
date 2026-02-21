use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use specta::Type;

/// Represents a Git tag
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    /// Tag name
    pub name: String,
    /// Full ref name (e.g., "refs/tags/v1.0.0")
    pub full_name: String,
    /// Target commit OID
    pub target_oid: String,
    /// Short target OID
    pub short_oid: String,
    /// Whether this is an annotated tag
    pub is_annotated: bool,
    /// Tag message (for annotated tags)
    pub message: Option<String>,
    /// Tagger information (for annotated tags)
    pub tagger: Option<TagSignature>,
    /// Commit summary for the target
    pub target_summary: Option<String>,
    /// Timestamp of the target commit
    pub target_time: Option<DateTime<Utc>>,
}

/// Signature for a tag tagger
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TagSignature {
    pub name: String,
    pub email: String,
    pub timestamp: DateTime<Utc>,
}

/// Options for creating a tag
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreateTagOptions {
    /// Target ref/commit (default: HEAD)
    pub target: Option<String>,
    /// Create an annotated tag
    pub annotated: bool,
    /// Tag message (required for annotated tags)
    pub message: Option<String>,
    /// Force overwrite existing tag
    pub force: bool,
}

/// Options for listing tags
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ListTagsOptions {
    /// Filter pattern (glob-style)
    pub pattern: Option<String>,
    /// Sort order (defaults to Alphabetical)
    #[serde(default)]
    pub sort: TagSortOrder,
    /// Maximum number of tags to return
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "PascalCase")]
pub enum TagSortOrder {
    #[default]
    Alphabetical,
    AlphabeticalDesc,
    CreationDate,
    CreationDateDesc,
}

/// Result of a tag operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TagResult {
    pub success: bool,
    pub message: String,
    pub tag: Option<Tag>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== TagSortOrder Tests ====================

    #[test]
    fn test_tag_sort_order_default() {
        let order = TagSortOrder::default();
        assert!(matches!(order, TagSortOrder::Alphabetical));
    }

    #[test]
    fn test_tag_sort_order_serialization() {
        let alpha = TagSortOrder::Alphabetical;
        let json = serde_json::to_string(&alpha).expect("should serialize");
        assert_eq!(json, "\"Alphabetical\"");

        let alpha_desc = TagSortOrder::AlphabeticalDesc;
        let json = serde_json::to_string(&alpha_desc).expect("should serialize");
        assert_eq!(json, "\"AlphabeticalDesc\"");

        let date = TagSortOrder::CreationDate;
        let json = serde_json::to_string(&date).expect("should serialize");
        assert_eq!(json, "\"CreationDate\"");

        let date_desc = TagSortOrder::CreationDateDesc;
        let json = serde_json::to_string(&date_desc).expect("should serialize");
        assert_eq!(json, "\"CreationDateDesc\"");
    }

    // ==================== TagSignature Tests ====================

    #[test]
    fn test_tag_signature_creation() {
        let sig = TagSignature {
            name: "John Doe".to_string(),
            email: "john@example.com".to_string(),
            timestamp: Utc::now(),
        };

        assert_eq!(sig.name, "John Doe");
        assert_eq!(sig.email, "john@example.com");
    }

    #[test]
    fn test_tag_signature_serialization() {
        let sig = TagSignature {
            name: "Tagger".to_string(),
            email: "tagger@example.com".to_string(),
            timestamp: DateTime::from_timestamp(1_700_000_000, 0)
                .expect("valid timestamp")
                .with_timezone(&Utc),
        };

        let json = serde_json::to_string(&sig).expect("should serialize");
        assert!(json.contains("\"name\":\"Tagger\""));
        assert!(json.contains("\"email\":\"tagger@example.com\""));
    }

    // ==================== Tag Tests ====================

    #[test]
    fn test_tag_lightweight() {
        let tag = Tag {
            name: "v1.0.0".to_string(),
            full_name: "refs/tags/v1.0.0".to_string(),
            target_oid: "abc123".to_string(),
            short_oid: "abc123d".to_string(),
            is_annotated: false,
            message: None,
            tagger: None,
            target_summary: Some("Initial release".to_string()),
            target_time: Some(Utc::now()),
        };

        assert_eq!(tag.name, "v1.0.0");
        assert!(!tag.is_annotated);
        assert!(tag.message.is_none());
        assert!(tag.tagger.is_none());
    }

    #[test]
    fn test_tag_annotated() {
        let tag = Tag {
            name: "v2.0.0".to_string(),
            full_name: "refs/tags/v2.0.0".to_string(),
            target_oid: "def456".to_string(),
            short_oid: "def456a".to_string(),
            is_annotated: true,
            message: Some("Release version 2.0.0\n\nMajor changes included.".to_string()),
            tagger: Some(TagSignature {
                name: "Release Manager".to_string(),
                email: "release@example.com".to_string(),
                timestamp: Utc::now(),
            }),
            target_summary: Some("Prepare for v2.0.0".to_string()),
            target_time: Some(Utc::now()),
        };

        assert!(tag.is_annotated);
        assert!(tag.message.is_some());
        assert!(tag.tagger.is_some());
    }

    #[test]
    fn test_tag_serialization() {
        let tag = Tag {
            name: "test-tag".to_string(),
            full_name: "refs/tags/test-tag".to_string(),
            target_oid: "xyz789".to_string(),
            short_oid: "xyz789a".to_string(),
            is_annotated: true,
            message: Some("Test tag message".to_string()),
            tagger: None,
            target_summary: None,
            target_time: None,
        };

        let json = serde_json::to_string(&tag).expect("should serialize");
        assert!(json.contains("\"name\":\"test-tag\""));
        assert!(json.contains("\"fullName\":\"refs/tags/test-tag\""));
        assert!(json.contains("\"isAnnotated\":true"));
        assert!(json.contains("\"message\":\"Test tag message\""));
    }

    // ==================== CreateTagOptions Tests ====================

    #[test]
    fn test_create_tag_options_default() {
        let opts = CreateTagOptions::default();
        assert!(opts.target.is_none());
        assert!(!opts.annotated);
        assert!(opts.message.is_none());
        assert!(!opts.force);
    }

    #[test]
    fn test_create_tag_options_lightweight() {
        let opts = CreateTagOptions {
            target: Some("HEAD".to_string()),
            annotated: false,
            message: None,
            force: false,
        };

        assert_eq!(opts.target, Some("HEAD".to_string()));
        assert!(!opts.annotated);
    }

    #[test]
    fn test_create_tag_options_annotated() {
        let opts = CreateTagOptions {
            target: Some("main".to_string()),
            annotated: true,
            message: Some("Release tag".to_string()),
            force: false,
        };

        assert!(opts.annotated);
        assert_eq!(opts.message, Some("Release tag".to_string()));
    }

    #[test]
    fn test_create_tag_options_force() {
        let opts = CreateTagOptions {
            target: None,
            annotated: false,
            message: None,
            force: true,
        };

        assert!(opts.force);
    }

    // ==================== ListTagsOptions Tests ====================

    #[test]
    fn test_list_tags_options_default() {
        let opts = ListTagsOptions::default();
        assert!(opts.pattern.is_none());
        assert!(matches!(opts.sort, TagSortOrder::Alphabetical));
        assert!(opts.limit.is_none());
    }

    #[test]
    fn test_list_tags_options_with_pattern() {
        let opts = ListTagsOptions {
            pattern: Some("v*".to_string()),
            sort: TagSortOrder::CreationDateDesc,
            limit: Some(10),
        };

        assert_eq!(opts.pattern, Some("v*".to_string()));
        assert!(matches!(opts.sort, TagSortOrder::CreationDateDesc));
        assert_eq!(opts.limit, Some(10));
    }

    #[test]
    fn test_list_tags_options_sort_defaults_on_deserialize() {
        let json = r#"{"pattern": "v*"}"#;
        let opts: ListTagsOptions = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(opts.pattern, Some("v*".to_string()));
        assert!(matches!(opts.sort, TagSortOrder::Alphabetical));
        assert!(opts.limit.is_none());
    }

    // ==================== TagResult Tests ====================

    #[test]
    fn test_tag_result_success() {
        let result = TagResult {
            success: true,
            message: "Tag created successfully".to_string(),
            tag: Some(Tag {
                name: "v1.0.0".to_string(),
                full_name: "refs/tags/v1.0.0".to_string(),
                target_oid: "abc".to_string(),
                short_oid: "abc".to_string(),
                is_annotated: false,
                message: None,
                tagger: None,
                target_summary: None,
                target_time: None,
            }),
        };

        assert!(result.success);
        assert!(result.tag.is_some());
    }

    #[test]
    fn test_tag_result_failure() {
        let result = TagResult {
            success: false,
            message: "Tag already exists".to_string(),
            tag: None,
        };

        assert!(!result.success);
        assert!(result.tag.is_none());
    }

    #[test]
    fn test_tag_result_serialization() {
        let result = TagResult {
            success: true,
            message: "OK".to_string(),
            tag: None,
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"message\":\"OK\""));
    }
}
