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
    /// Sort order
    pub sort: Option<TagSortOrder>,
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
