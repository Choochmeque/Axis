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

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== GitFlowConfig Tests ====================

    #[test]
    fn test_git_flow_config_default() {
        let config = GitFlowConfig::default();

        assert_eq!(config.master, "main");
        assert_eq!(config.develop, "develop");
        assert_eq!(config.feature_prefix, "feature/");
        assert_eq!(config.release_prefix, "release/");
        assert_eq!(config.hotfix_prefix, "hotfix/");
        assert_eq!(config.support_prefix, "support/");
        assert!(config.version_tag_prefix.is_empty());
    }

    #[test]
    fn test_git_flow_config_custom() {
        let config = GitFlowConfig {
            master: "master".to_string(),
            develop: "dev".to_string(),
            feature_prefix: "feat/".to_string(),
            release_prefix: "rel/".to_string(),
            hotfix_prefix: "fix/".to_string(),
            support_prefix: "sup/".to_string(),
            version_tag_prefix: "v".to_string(),
        };

        assert_eq!(config.master, "master");
        assert_eq!(config.develop, "dev");
        assert_eq!(config.version_tag_prefix, "v");
    }

    #[test]
    fn test_git_flow_config_serialization() {
        let config = GitFlowConfig::default();
        let json = serde_json::to_string(&config).expect("should serialize");

        assert!(json.contains("\"master\":\"main\""));
        assert!(json.contains("\"develop\":\"develop\""));
        assert!(json.contains("\"featurePrefix\":\"feature/\""));
    }

    // ==================== GitFlowInitOptions Tests ====================

    #[test]
    fn test_git_flow_init_options_default() {
        let opts = GitFlowInitOptions::default();

        assert!(opts.master.is_none());
        assert!(opts.develop.is_none());
        assert!(opts.feature_prefix.is_none());
        assert!(!opts.force);
    }

    #[test]
    fn test_git_flow_init_options_custom() {
        let opts = GitFlowInitOptions {
            master: Some("master".to_string()),
            develop: Some("dev".to_string()),
            feature_prefix: Some("f/".to_string()),
            release_prefix: None,
            hotfix_prefix: None,
            support_prefix: None,
            version_tag_prefix: Some("v".to_string()),
            force: true,
        };

        assert_eq!(opts.master, Some("master".to_string()));
        assert!(opts.force);
    }

    #[test]
    fn test_git_flow_init_options_serialization() {
        let opts = GitFlowInitOptions {
            master: Some("main".to_string()),
            force: true,
            ..Default::default()
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"master\":\"main\""));
        assert!(json.contains("\"force\":true"));
    }

    // ==================== GitFlowFinishOptions Tests ====================

    #[test]
    fn test_git_flow_finish_options_default() {
        let opts = GitFlowFinishOptions::default();

        assert!(!opts.fetch);
        assert!(!opts.rebase);
        assert!(!opts.keep);
        assert!(!opts.force_delete);
        assert!(!opts.squash);
        assert!(!opts.no_ff);
        assert!(opts.message.is_none());
        assert!(opts.tag_message.is_none());
        assert!(!opts.push);
    }

    #[test]
    fn test_git_flow_finish_options_custom() {
        let opts = GitFlowFinishOptions {
            fetch: true,
            rebase: true,
            keep: false,
            force_delete: true,
            squash: true,
            no_ff: true,
            message: Some("Merge feature".to_string()),
            tag_message: Some("Release v1.0".to_string()),
            push: true,
        };

        assert!(opts.fetch);
        assert!(opts.rebase);
        assert!(opts.push);
        assert_eq!(opts.message, Some("Merge feature".to_string()));
    }

    #[test]
    fn test_git_flow_finish_options_serialization() {
        let opts = GitFlowFinishOptions {
            squash: true,
            message: Some("Done".to_string()),
            ..Default::default()
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"squash\":true"));
        assert!(json.contains("\"message\":\"Done\""));
    }

    // ==================== GitFlowResult Tests ====================

    #[test]
    fn test_git_flow_result_success() {
        let result = GitFlowResult {
            success: true,
            message: "Feature started".to_string(),
            branch: Some("feature/my-feature".to_string()),
        };

        assert!(result.success);
        assert_eq!(result.branch, Some("feature/my-feature".to_string()));
    }

    #[test]
    fn test_git_flow_result_failure() {
        let result = GitFlowResult {
            success: false,
            message: "Failed to create branch".to_string(),
            branch: None,
        };

        assert!(!result.success);
        assert!(result.branch.is_none());
    }

    #[test]
    fn test_git_flow_result_serialization() {
        let result = GitFlowResult {
            success: true,
            message: "OK".to_string(),
            branch: Some("feature/test".to_string()),
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"branch\":\"feature/test\""));
    }

    // ==================== GitFlowBranchType Tests ====================

    #[test]
    fn test_git_flow_branch_type_as_str() {
        assert_eq!(GitFlowBranchType::Feature.as_str(), "feature");
        assert_eq!(GitFlowBranchType::Release.as_str(), "release");
        assert_eq!(GitFlowBranchType::Hotfix.as_str(), "hotfix");
        assert_eq!(GitFlowBranchType::Support.as_str(), "support");
    }

    #[test]
    fn test_git_flow_branch_type_equality() {
        assert_eq!(GitFlowBranchType::Feature, GitFlowBranchType::Feature);
        assert_ne!(GitFlowBranchType::Feature, GitFlowBranchType::Release);
    }

    #[test]
    fn test_git_flow_branch_type_serialization() {
        let branch_type = GitFlowBranchType::Feature;
        let json = serde_json::to_string(&branch_type).expect("should serialize");
        assert_eq!(json, "\"Feature\"");

        let branch_type = GitFlowBranchType::Hotfix;
        let json = serde_json::to_string(&branch_type).expect("should serialize");
        assert_eq!(json, "\"Hotfix\"");
    }

    #[test]
    fn test_git_flow_branch_type_deserialization() {
        let branch_type: GitFlowBranchType =
            serde_json::from_str("\"Feature\"").expect("should deserialize");
        assert_eq!(branch_type, GitFlowBranchType::Feature);

        let branch_type: GitFlowBranchType =
            serde_json::from_str("\"Release\"").expect("should deserialize");
        assert_eq!(branch_type, GitFlowBranchType::Release);
    }

    // ==================== GrepOptions Tests ====================

    #[test]
    fn test_grep_options_default() {
        let opts = GrepOptions::default();

        assert!(opts.pattern.is_empty());
        assert!(opts.paths.is_empty());
        assert!(!opts.ignore_case);
        assert!(!opts.word_regexp);
        assert!(!opts.extended_regexp);
        assert!(!opts.invert_match);
        assert!(!opts.show_line_numbers);
        assert!(opts.max_count.is_none());
        assert!(opts.context_lines.is_none());
    }

    #[test]
    fn test_grep_options_custom() {
        let opts = GrepOptions {
            pattern: "TODO".to_string(),
            paths: vec!["src/".to_string()],
            ignore_case: true,
            word_regexp: false,
            extended_regexp: true,
            invert_match: false,
            show_line_numbers: true,
            max_count: Some(100),
            context_lines: Some(3),
        };

        assert_eq!(opts.pattern, "TODO");
        assert!(opts.ignore_case);
        assert_eq!(opts.max_count, Some(100));
    }

    #[test]
    fn test_grep_options_serialization() {
        let opts = GrepOptions {
            pattern: "test".to_string(),
            ignore_case: true,
            ..Default::default()
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"pattern\":\"test\""));
        assert!(json.contains("\"ignoreCase\":true"));
    }

    // ==================== GrepMatch Tests ====================

    #[test]
    fn test_grep_match_creation() {
        let match_ = GrepMatch {
            path: "src/main.rs".to_string(),
            line_number: Some(42),
            content: "// TODO: fix this".to_string(),
        };

        assert_eq!(match_.path, "src/main.rs");
        assert_eq!(match_.line_number, Some(42));
        assert!(match_.content.contains("TODO"));
    }

    #[test]
    fn test_grep_match_without_line_number() {
        let match_ = GrepMatch {
            path: "README.md".to_string(),
            line_number: None,
            content: "Some content".to_string(),
        };

        assert!(match_.line_number.is_none());
    }

    #[test]
    fn test_grep_match_serialization() {
        let match_ = GrepMatch {
            path: "test.rs".to_string(),
            line_number: Some(10),
            content: "match".to_string(),
        };

        let json = serde_json::to_string(&match_).expect("should serialize");
        assert!(json.contains("\"path\":\"test.rs\""));
        assert!(json.contains("\"lineNumber\":10"));
    }

    // ==================== GrepResult Tests ====================

    #[test]
    fn test_grep_result_empty() {
        let result = GrepResult {
            matches: vec![],
            total_matches: 0,
        };

        assert!(result.matches.is_empty());
        assert_eq!(result.total_matches, 0);
    }

    #[test]
    fn test_grep_result_with_matches() {
        let result = GrepResult {
            matches: vec![
                GrepMatch {
                    path: "a.rs".to_string(),
                    line_number: Some(1),
                    content: "match1".to_string(),
                },
                GrepMatch {
                    path: "b.rs".to_string(),
                    line_number: Some(2),
                    content: "match2".to_string(),
                },
            ],
            total_matches: 2,
        };

        assert_eq!(result.matches.len(), 2);
        assert_eq!(result.total_matches, 2);
    }

    #[test]
    fn test_grep_result_serialization() {
        let result = GrepResult {
            matches: vec![],
            total_matches: 5,
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"totalMatches\":5"));
    }
}
