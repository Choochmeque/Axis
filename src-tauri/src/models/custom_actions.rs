use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumIter, EnumString};

/// Context where a custom action can appear
#[derive(
    Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type, Display, EnumString, EnumIter,
)]
#[serde(rename_all = "PascalCase")]
pub enum ActionContext {
    /// File in staging area (staged or unstaged)
    File,
    /// Commit in history
    Commit,
    /// Branch (local or remote)
    Branch,
    /// Tag
    Tag,
    /// Stash entry
    Stash,
    /// Repository-wide (available everywhere)
    Repository,
}

/// Storage location for actions
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type, Display, EnumString)]
#[serde(rename_all = "PascalCase")]
pub enum ActionStorageType {
    /// Global actions stored in app database
    Global,
    /// Per-repository actions stored in .axis/actions.json
    Repository,
}

/// Custom action definition
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CustomAction {
    /// Unique identifier (UUID)
    pub id: String,
    /// Display name shown in menus
    pub name: String,
    /// Optional description/tooltip
    pub description: Option<String>,
    /// Shell command to execute (supports variable substitution)
    pub command: String,
    /// Working directory (defaults to repo path)
    pub working_dir: Option<String>,
    /// Contexts where this action appears
    pub contexts: Vec<ActionContext>,
    /// Keyboard shortcut (e.g., "mod+shift+1")
    pub shortcut: Option<String>,
    /// Show confirmation dialog before execution
    pub confirm: bool,
    /// Custom confirmation message
    pub confirm_message: Option<String>,
    /// Show output dialog after execution
    pub show_output: bool,
    /// Whether action is enabled
    pub enabled: bool,
    /// Sort order for menu display
    pub order: i32,
    /// Storage type (global or repository)
    #[serde(default)]
    pub storage: Option<ActionStorageType>,
}

#[cfg(test)]
impl CustomAction {
    /// Create a new custom action with default values
    pub fn new(name: String, command: String, contexts: Vec<ActionContext>) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description: None,
            command,
            working_dir: None,
            contexts,
            shortcut: None,
            confirm: false,
            confirm_message: None,
            show_output: true,
            enabled: true,
            order: 0,
            storage: None,
        }
    }
}

/// Variables available for substitution in commands
#[derive(Debug, Clone, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ActionVariables {
    /// Repository root path
    pub repo_path: String,
    /// Current branch name
    pub branch: Option<String>,
    /// Selected file path (relative)
    pub file: Option<String>,
    /// Multiple selected files (space-separated, quoted)
    pub selected_files: Option<String>,
    /// Commit hash (full SHA)
    pub commit_hash: Option<String>,
    /// Commit hash (short, 7 chars)
    pub commit_short: Option<String>,
    /// Commit message (first line)
    pub commit_message: Option<String>,
    /// Remote URL (origin)
    pub remote_url: Option<String>,
    /// Tag name
    pub tag: Option<String>,
    /// Stash reference (e.g., stash@{0})
    pub stash_ref: Option<String>,
}

/// Result of executing a custom action
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ActionExecutionResult {
    /// Exit code from command (0 = success)
    pub exit_code: i32,
    /// Standard output
    pub stdout: String,
    /// Standard error
    pub stderr: String,
    /// Execution time in milliseconds
    pub duration_ms: u64,
}

impl ActionExecutionResult {
    /// Create a successful result
    pub fn success(stdout: String, stderr: String, duration_ms: u64) -> Self {
        Self {
            exit_code: 0,
            stdout,
            stderr,
            duration_ms,
        }
    }

    /// Create a failed result
    pub fn failure(exit_code: i32, stdout: String, stderr: String, duration_ms: u64) -> Self {
        Self {
            exit_code,
            stdout,
            stderr,
            duration_ms,
        }
    }

    /// Create an error result (command couldn't be executed)
    pub fn error(message: String) -> Self {
        Self {
            exit_code: -1,
            stdout: String::new(),
            stderr: message,
            duration_ms: 0,
        }
    }
}

/// Per-repository actions file format
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoActionsFile {
    /// File format version
    pub version: u32,
    /// List of actions
    pub actions: Vec<CustomAction>,
}

impl Default for RepoActionsFile {
    fn default() -> Self {
        Self {
            version: 1,
            actions: Vec::new(),
        }
    }
}

impl RepoActionsFile {
    pub fn v1(actions: Vec<CustomAction>) -> Self {
        Self {
            version: 1,
            actions,
        }
    }
}
