use serde::{Deserialize, Serialize};
use specta::Type;

/// Git-flow configuration
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GitFlowConfig {
    pub master: String,
    pub develop: String,
    pub feature_prefix: String,
    pub release_prefix: String,
    pub hotfix_prefix: String,
    pub support_prefix: String,
    pub version_tag_prefix: String,
}

impl Default for GitFlowConfig {
    fn default() -> Self {
        GitFlowConfig {
            master: "main".to_string(),
            develop: "develop".to_string(),
            feature_prefix: "feature/".to_string(),
            release_prefix: "release/".to_string(),
            hotfix_prefix: "hotfix/".to_string(),
            support_prefix: "support/".to_string(),
            version_tag_prefix: "".to_string(),
        }
    }
}

/// Options for initializing git-flow
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct GitFlowInitOptions {
    #[serde(default)]
    pub master: Option<String>,
    #[serde(default)]
    pub develop: Option<String>,
    #[serde(default)]
    pub feature_prefix: Option<String>,
    #[serde(default)]
    pub release_prefix: Option<String>,
    #[serde(default)]
    pub hotfix_prefix: Option<String>,
    #[serde(default)]
    pub support_prefix: Option<String>,
    #[serde(default)]
    pub version_tag_prefix: Option<String>,
    #[serde(default)]
    pub force: bool,
}

/// Options for finishing a feature/release/hotfix
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct GitFlowFinishOptions {
    #[serde(default)]
    pub fetch: bool,
    #[serde(default)]
    pub rebase: bool,
    #[serde(default)]
    pub keep: bool,
    #[serde(default)]
    pub force_delete: bool,
    #[serde(default)]
    pub squash: bool,
    #[serde(default)]
    pub no_ff: bool,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub tag_message: Option<String>,
    #[serde(default)]
    pub push: bool,
}

/// Result of a git-flow operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GitFlowResult {
    pub success: bool,
    pub message: String,
    pub branch: Option<String>,
}

/// Type of git-flow branch
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "PascalCase")]
pub enum GitFlowBranchType {
    Feature,
    Release,
    Hotfix,
    Support,
}

impl GitFlowBranchType {
    pub fn as_str(&self) -> &'static str {
        match self {
            GitFlowBranchType::Feature => "feature",
            GitFlowBranchType::Release => "release",
            GitFlowBranchType::Hotfix => "hotfix",
            GitFlowBranchType::Support => "support",
        }
    }
}

/// Content search options
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct GrepOptions {
    pub pattern: String,
    #[serde(default)]
    pub paths: Vec<String>,
    #[serde(default)]
    pub ignore_case: bool,
    #[serde(default)]
    pub word_regexp: bool,
    #[serde(default)]
    pub extended_regexp: bool,
    #[serde(default)]
    pub invert_match: bool,
    #[serde(default)]
    pub show_line_numbers: bool,
    #[serde(default)]
    pub max_count: Option<u32>,
    #[serde(default)]
    pub context_lines: Option<u32>,
}

/// A single grep match
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GrepMatch {
    pub path: String,
    pub line_number: Option<usize>,
    pub content: String,
}

/// Result of a grep search
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GrepResult {
    pub matches: Vec<GrepMatch>,
    pub total_matches: usize,
}
