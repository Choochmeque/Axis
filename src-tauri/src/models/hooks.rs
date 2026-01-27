use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumIter, EnumString};

/// Git hook types
#[derive(
    Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type, Display, EnumString, EnumIter,
)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "kebab-case")]
pub enum GitHookType {
    /// Runs before commit starts
    PreCommit,
    /// Can modify commit message
    PrepareCommitMsg,
    /// Validates commit message
    CommitMsg,
    /// Runs after commit
    PostCommit,
    /// Runs before push
    PrePush,
    /// Runs after merge
    PostMerge,
    /// Runs before rebase
    PreRebase,
    /// Runs after checkout
    PostCheckout,
    /// Runs after amend/rebase
    PostRewrite,
}

impl GitHookType {
    /// Whether this hook can abort the operation
    pub fn can_abort(&self) -> bool {
        matches!(
            self,
            GitHookType::PreCommit
                | GitHookType::PrepareCommitMsg
                | GitHookType::CommitMsg
                | GitHookType::PrePush
                | GitHookType::PreRebase
        )
    }

    /// Get the hook filename
    pub fn filename(&self) -> &'static str {
        match self {
            GitHookType::PreCommit => "pre-commit",
            GitHookType::PrepareCommitMsg => "prepare-commit-msg",
            GitHookType::CommitMsg => "commit-msg",
            GitHookType::PostCommit => "post-commit",
            GitHookType::PrePush => "pre-push",
            GitHookType::PostMerge => "post-merge",
            GitHookType::PreRebase => "pre-rebase",
            GitHookType::PostCheckout => "post-checkout",
            GitHookType::PostRewrite => "post-rewrite",
        }
    }

    /// Get human-readable description
    pub fn description(&self) -> &'static str {
        match self {
            GitHookType::PreCommit => "Runs before commit starts",
            GitHookType::PrepareCommitMsg => "Can modify commit message",
            GitHookType::CommitMsg => "Validates commit message",
            GitHookType::PostCommit => "Runs after commit completes",
            GitHookType::PrePush => "Runs before push to remote",
            GitHookType::PostMerge => "Runs after merge completes",
            GitHookType::PreRebase => "Runs before rebase starts",
            GitHookType::PostCheckout => "Runs after checkout completes",
            GitHookType::PostRewrite => "Runs after amend or rebase",
        }
    }
}

/// Result of running a git hook
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HookResult {
    /// Type of hook that was run
    pub hook_type: GitHookType,
    /// Whether the hook succeeded
    pub success: bool,
    /// Exit code from the hook (0 = success)
    pub exit_code: i32,
    /// Standard output from the hook
    pub stdout: String,
    /// Standard error from the hook
    pub stderr: String,
    /// Whether the hook was skipped (not found or not executable)
    pub skipped: bool,
}

impl HookResult {
    /// Create a result for a skipped hook (hook doesn't exist)
    pub fn skipped(hook_type: GitHookType) -> Self {
        Self {
            hook_type,
            success: true,
            exit_code: 0,
            stdout: String::new(),
            stderr: String::new(),
            skipped: true,
        }
    }

    /// Create a result for a hook that isn't executable
    pub fn not_executable(hook_type: GitHookType) -> Self {
        Self {
            hook_type,
            success: true,
            exit_code: 0,
            stdout: String::new(),
            stderr: "Hook exists but is not executable".to_string(),
            skipped: true,
        }
    }

    /// Create a result for a hook execution error
    pub fn error(hook_type: GitHookType, message: &str) -> Self {
        Self {
            hook_type,
            success: false,
            exit_code: -1,
            stdout: String::new(),
            stderr: message.to_string(),
            skipped: false,
        }
    }
}

/// Hook info for management UI
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HookInfo {
    /// Type of hook
    pub hook_type: GitHookType,
    /// Whether the hook file exists
    pub exists: bool,
    /// Whether the hook is enabled (false if has .disabled suffix)
    pub enabled: bool,
    /// Full path to the hook file
    pub path: String,
    /// Whether the hook file is executable (Unix only, always true on Windows)
    pub is_executable: bool,
}

/// Hook with content for editing
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HookDetails {
    /// Hook info
    pub info: HookInfo,
    /// Content of the hook file (None if file doesn't exist)
    pub content: Option<String>,
}

/// Template for creating hooks
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HookTemplate {
    /// Template name
    pub name: String,
    /// Human-readable description
    pub description: String,
    /// Hook type this template is for
    pub hook_type: GitHookType,
    /// Template content (shell script)
    pub content: String,
}

/// Built-in hook templates
pub fn get_hook_templates() -> Vec<HookTemplate> {
    vec![
        HookTemplate {
            name: "Lint Check".to_string(),
            description: "Run linter before commit".to_string(),
            hook_type: GitHookType::PreCommit,
            content: r#"#!/bin/sh
# Run linter before commit
# Customize the command for your project

# Example for Node.js projects:
# npm run lint

# Example for Rust projects:
# cargo clippy

echo "Running linter..."
# Add your lint command here

exit 0
"#
            .to_string(),
        },
        HookTemplate {
            name: "Test Runner".to_string(),
            description: "Run tests before commit".to_string(),
            hook_type: GitHookType::PreCommit,
            content: r#"#!/bin/sh
# Run tests before commit
# Customize the command for your project

# Example for Node.js projects:
# npm test

# Example for Rust projects:
# cargo test

echo "Running tests..."
# Add your test command here

exit 0
"#
            .to_string(),
        },
        HookTemplate {
            name: "Branch Name in Message".to_string(),
            description: "Add branch name to commit message".to_string(),
            hook_type: GitHookType::PrepareCommitMsg,
            content: r#"#!/bin/sh
# Add branch name to commit message

COMMIT_MSG_FILE=$1
COMMIT_SOURCE=$2

# Only add branch name for regular commits (not merge, squash, etc.)
if [ -z "$COMMIT_SOURCE" ]; then
    BRANCH_NAME=$(git symbolic-ref --short HEAD 2>/dev/null)
    if [ -n "$BRANCH_NAME" ]; then
        # Prepend branch name to commit message
        sed -i.bak -e "1s/^/[$BRANCH_NAME] /" "$COMMIT_MSG_FILE"
    fi
fi
"#
            .to_string(),
        },
        HookTemplate {
            name: "Conventional Commit".to_string(),
            description: "Enforce conventional commit format".to_string(),
            hook_type: GitHookType::CommitMsg,
            content: r#"#!/bin/sh
# Enforce conventional commit format
# https://www.conventionalcommits.org/

COMMIT_MSG_FILE=$1
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Pattern for conventional commits
PATTERN="^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
    echo "ERROR: Commit message does not follow Conventional Commits format."
    echo ""
    echo "Expected format: <type>(<scope>): <description>"
    echo ""
    echo "Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
    echo ""
    echo "Example: feat(auth): add login functionality"
    exit 1
fi
"#
            .to_string(),
        },
        HookTemplate {
            name: "No Push to Main".to_string(),
            description: "Prevent direct push to main/master".to_string(),
            hook_type: GitHookType::PrePush,
            content: r#"#!/bin/sh
# Prevent direct push to main/master branch

REMOTE=$1

# Read pushed refs from stdin
while read local_ref local_sha remote_ref remote_sha; do
    if [ "$remote_ref" = "refs/heads/main" ] || [ "$remote_ref" = "refs/heads/master" ]; then
        echo "ERROR: Direct push to main/master is not allowed."
        echo "Please create a pull request instead."
        exit 1
    fi
done

exit 0
"#
            .to_string(),
        },
        HookTemplate {
            name: "Post-merge Install".to_string(),
            description: "Run package install after merge".to_string(),
            hook_type: GitHookType::PostMerge,
            content: r#"#!/bin/sh
# Run package manager install after merge
# Checks if package.json or lock files changed

CHANGED_FILES=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)

# Check for Node.js dependency changes
if echo "$CHANGED_FILES" | grep -qE "package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock"; then
    echo "Dependencies changed, running install..."

    if [ -f "pnpm-lock.yaml" ]; then
        pnpm install
    elif [ -f "yarn.lock" ]; then
        yarn install
    elif [ -f "package-lock.json" ]; then
        npm install
    fi
fi

# Check for Rust dependency changes
if echo "$CHANGED_FILES" | grep -q "Cargo.lock"; then
    echo "Cargo dependencies changed, running cargo build..."
    cargo build
fi
"#
            .to_string(),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::str::FromStr;

    // ==================== GitHookType Tests ====================

    #[test]
    fn test_git_hook_type_display() {
        assert_eq!(GitHookType::PreCommit.to_string(), "pre-commit");
        assert_eq!(
            GitHookType::PrepareCommitMsg.to_string(),
            "prepare-commit-msg"
        );
        assert_eq!(GitHookType::CommitMsg.to_string(), "commit-msg");
        assert_eq!(GitHookType::PostCommit.to_string(), "post-commit");
        assert_eq!(GitHookType::PrePush.to_string(), "pre-push");
        assert_eq!(GitHookType::PostMerge.to_string(), "post-merge");
        assert_eq!(GitHookType::PreRebase.to_string(), "pre-rebase");
        assert_eq!(GitHookType::PostCheckout.to_string(), "post-checkout");
        assert_eq!(GitHookType::PostRewrite.to_string(), "post-rewrite");
    }

    #[test]
    fn test_git_hook_type_from_str() {
        assert_eq!(
            GitHookType::from_str("pre-commit").expect("should parse"),
            GitHookType::PreCommit
        );
        assert_eq!(
            GitHookType::from_str("commit-msg").expect("should parse"),
            GitHookType::CommitMsg
        );
        assert_eq!(
            GitHookType::from_str("pre-push").expect("should parse"),
            GitHookType::PrePush
        );
    }

    #[test]
    fn test_git_hook_type_can_abort() {
        assert!(GitHookType::PreCommit.can_abort());
        assert!(GitHookType::PrepareCommitMsg.can_abort());
        assert!(GitHookType::CommitMsg.can_abort());
        assert!(GitHookType::PrePush.can_abort());
        assert!(GitHookType::PreRebase.can_abort());

        assert!(!GitHookType::PostCommit.can_abort());
        assert!(!GitHookType::PostMerge.can_abort());
        assert!(!GitHookType::PostCheckout.can_abort());
        assert!(!GitHookType::PostRewrite.can_abort());
    }

    #[test]
    fn test_git_hook_type_filename() {
        assert_eq!(GitHookType::PreCommit.filename(), "pre-commit");
        assert_eq!(
            GitHookType::PrepareCommitMsg.filename(),
            "prepare-commit-msg"
        );
        assert_eq!(GitHookType::CommitMsg.filename(), "commit-msg");
        assert_eq!(GitHookType::PostCommit.filename(), "post-commit");
        assert_eq!(GitHookType::PrePush.filename(), "pre-push");
        assert_eq!(GitHookType::PostMerge.filename(), "post-merge");
        assert_eq!(GitHookType::PreRebase.filename(), "pre-rebase");
        assert_eq!(GitHookType::PostCheckout.filename(), "post-checkout");
        assert_eq!(GitHookType::PostRewrite.filename(), "post-rewrite");
    }

    #[test]
    fn test_git_hook_type_description() {
        assert!(GitHookType::PreCommit
            .description()
            .contains("before commit"));
        assert!(GitHookType::CommitMsg
            .description()
            .contains("commit message"));
        assert!(GitHookType::PrePush.description().contains("push"));
        assert!(GitHookType::PostMerge.description().contains("merge"));
    }

    #[test]
    fn test_git_hook_type_serialization() {
        let hook = GitHookType::PreCommit;
        let json = serde_json::to_string(&hook).expect("should serialize");
        assert_eq!(json, "\"PreCommit\"");

        let hook = GitHookType::PostCheckout;
        let json = serde_json::to_string(&hook).expect("should serialize");
        assert_eq!(json, "\"PostCheckout\"");
    }

    #[test]
    fn test_git_hook_type_deserialization() {
        let hook: GitHookType = serde_json::from_str("\"PreCommit\"").expect("should deserialize");
        assert_eq!(hook, GitHookType::PreCommit);

        let hook: GitHookType = serde_json::from_str("\"PrePush\"").expect("should deserialize");
        assert_eq!(hook, GitHookType::PrePush);
    }

    // ==================== HookResult Tests ====================

    #[test]
    fn test_hook_result_skipped() {
        let result = HookResult::skipped(GitHookType::PreCommit);

        assert_eq!(result.hook_type, GitHookType::PreCommit);
        assert!(result.success);
        assert_eq!(result.exit_code, 0);
        assert!(result.stdout.is_empty());
        assert!(result.stderr.is_empty());
        assert!(result.skipped);
    }

    #[test]
    fn test_hook_result_not_executable() {
        let result = HookResult::not_executable(GitHookType::CommitMsg);

        assert_eq!(result.hook_type, GitHookType::CommitMsg);
        assert!(result.success);
        assert!(result.skipped);
        assert!(result.stderr.contains("not executable"));
    }

    #[test]
    fn test_hook_result_error() {
        let result = HookResult::error(GitHookType::PrePush, "Hook failed with error");

        assert_eq!(result.hook_type, GitHookType::PrePush);
        assert!(!result.success);
        assert_eq!(result.exit_code, -1);
        assert!(!result.skipped);
        assert_eq!(result.stderr, "Hook failed with error");
    }

    #[test]
    fn test_hook_result_serialization() {
        let result = HookResult {
            hook_type: GitHookType::PreCommit,
            success: true,
            exit_code: 0,
            stdout: "Lint passed".to_string(),
            stderr: String::new(),
            skipped: false,
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"hookType\":\"PreCommit\""));
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"exitCode\":0"));
        assert!(json.contains("\"stdout\":\"Lint passed\""));
    }

    // ==================== HookInfo Tests ====================

    #[test]
    fn test_hook_info_serialization() {
        let info = HookInfo {
            hook_type: GitHookType::PreCommit,
            exists: true,
            enabled: true,
            path: "/repo/.git/hooks/pre-commit".to_string(),
            is_executable: true,
        };

        let json = serde_json::to_string(&info).expect("should serialize");
        assert!(json.contains("\"hookType\":\"PreCommit\""));
        assert!(json.contains("\"exists\":true"));
        assert!(json.contains("\"enabled\":true"));
        assert!(json.contains("\"isExecutable\":true"));
    }

    // ==================== HookDetails Tests ====================

    #[test]
    fn test_hook_details_with_content() {
        let details = HookDetails {
            info: HookInfo {
                hook_type: GitHookType::PreCommit,
                exists: true,
                enabled: true,
                path: "/path/to/hook".to_string(),
                is_executable: true,
            },
            content: Some("#!/bin/sh\nexit 0".to_string()),
        };

        assert!(details.content.is_some());
        assert!(details
            .content
            .expect("should have content")
            .contains("exit 0"));
    }

    #[test]
    fn test_hook_details_without_content() {
        let details = HookDetails {
            info: HookInfo {
                hook_type: GitHookType::PreCommit,
                exists: false,
                enabled: false,
                path: "/path/to/hook".to_string(),
                is_executable: false,
            },
            content: None,
        };

        assert!(details.content.is_none());
        assert!(!details.info.exists);
    }

    // ==================== HookTemplate Tests ====================

    #[test]
    fn test_hook_template_creation() {
        let template = HookTemplate {
            name: "Test Template".to_string(),
            description: "A test template".to_string(),
            hook_type: GitHookType::PreCommit,
            content: "#!/bin/sh\nexit 0".to_string(),
        };

        assert_eq!(template.name, "Test Template");
        assert_eq!(template.hook_type, GitHookType::PreCommit);
        assert!(template.content.starts_with("#!/bin/sh"));
    }

    #[test]
    fn test_hook_template_serialization() {
        let template = HookTemplate {
            name: "Test".to_string(),
            description: "Test desc".to_string(),
            hook_type: GitHookType::CommitMsg,
            content: "content".to_string(),
        };

        let json = serde_json::to_string(&template).expect("should serialize");
        assert!(json.contains("\"name\":\"Test\""));
        assert!(json.contains("\"hookType\":\"CommitMsg\""));
    }

    // ==================== get_hook_templates Tests ====================

    #[test]
    fn test_get_hook_templates_not_empty() {
        let templates = get_hook_templates();
        assert!(!templates.is_empty());
    }

    #[test]
    fn test_get_hook_templates_has_lint_check() {
        let templates = get_hook_templates();
        let lint = templates.iter().find(|t| t.name == "Lint Check");
        assert!(lint.is_some());

        let lint = lint.expect("should have lint template");
        assert_eq!(lint.hook_type, GitHookType::PreCommit);
        assert!(lint.content.contains("#!/bin/sh"));
    }

    #[test]
    fn test_get_hook_templates_has_conventional_commit() {
        let templates = get_hook_templates();
        let conventional = templates.iter().find(|t| t.name == "Conventional Commit");
        assert!(conventional.is_some());

        let conventional = conventional.expect("should have template");
        assert_eq!(conventional.hook_type, GitHookType::CommitMsg);
        assert!(conventional.content.contains("conventionalcommits"));
    }

    #[test]
    fn test_get_hook_templates_has_pre_push() {
        let templates = get_hook_templates();
        let pre_push = templates
            .iter()
            .find(|t| t.hook_type == GitHookType::PrePush);
        assert!(pre_push.is_some());
    }

    #[test]
    fn test_get_hook_templates_all_have_shebang() {
        let templates = get_hook_templates();
        for template in &templates {
            assert!(
                template.content.starts_with("#!/bin/sh"),
                "Template '{}' should start with shebang",
                template.name
            );
        }
    }

    // ==================== EnumIter Tests ====================

    #[test]
    fn test_git_hook_type_iter() {
        use strum::IntoEnumIterator;

        let types: Vec<GitHookType> = GitHookType::iter().collect();
        assert_eq!(types.len(), 9);
        assert!(types.contains(&GitHookType::PreCommit));
        assert!(types.contains(&GitHookType::PostRewrite));
    }
}
