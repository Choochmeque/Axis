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
