use serde::{Deserialize, Serialize};
use specta::Type;

/// Type of ignore pattern suggestion
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "PascalCase")]
pub enum IgnoreSuggestionType {
    /// Exact file path (e.g., "src/foo/bar.txt")
    ExactFile,
    /// File extension (e.g., "*.txt")
    Extension,
    /// Directory (e.g., "src/foo/")
    Directory,
    /// File name anywhere (e.g., "bar.txt")
    FileName,
}

/// A suggested pattern for ignoring a file
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IgnoreSuggestion {
    /// The pattern to add to .gitignore
    pub pattern: String,
    /// Description of what this pattern does
    pub description: String,
    /// Type of the suggestion
    pub suggestion_type: IgnoreSuggestionType,
}

/// Result of adding a pattern to .gitignore
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IgnoreResult {
    /// Human-readable message about the operation
    pub message: String,
    /// The pattern that was added
    pub pattern: String,
    /// Path to the .gitignore file that was modified
    pub gitignore_path: String,
    /// Whether the pattern already existed (no changes made)
    pub already_existed: bool,
}

/// Options for ignoring a file, returned by `get_ignore_options`
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IgnoreOptions {
    /// List of ancestor .gitignore files (relative paths from repo root)
    /// Always includes ".gitignore" (root), plus any existing .gitignore files
    /// in the path hierarchy of the target file
    pub gitignore_files: Vec<String>,
    /// Default .gitignore file to use (closest existing ancestor)
    pub default_gitignore: String,
    /// Suggested patterns for the file
    pub suggestions: Vec<IgnoreSuggestion>,
}
