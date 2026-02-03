use crate::error::Result;
use crate::models::{
    ActionContext, ActionExecutionResult, ActionStorageType, ActionVariables, CustomAction,
    RepoActionsFile,
};
use regex::Regex;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::sync::LazyLock;
use std::time::Instant;
use tokio::process::Command;

/// Directory name for per-repository Axis config
const AXIS_DIR: &str = ".axis";
/// Filename for actions (used in both app data dir and .axis/)
const ACTIONS_FILE: &str = "actions.json";

/// Regex for matching variable patterns like $VARIABLE or ${VARIABLE}
static VARIABLE_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\$\{?([A-Z_]+)\}?").expect("Invalid regex pattern"));

/// Service for executing custom actions
pub struct CustomActionsService;

impl CustomActionsService {
    /// Substitute variables in a command string
    pub fn substitute_variables(command: &str, vars: &ActionVariables) -> String {
        let mut result = command.to_string();

        // Replace known variables
        result = result.replace("$REPO_PATH", &vars.repo_path);
        result = result.replace("${REPO_PATH}", &vars.repo_path);

        if let Some(branch) = &vars.branch {
            result = result.replace("$BRANCH", branch);
            result = result.replace("${BRANCH}", branch);
        }

        if let Some(file) = &vars.file {
            result = result.replace("$FILE", file);
            result = result.replace("${FILE}", file);
        }

        if let Some(selected_files) = &vars.selected_files {
            result = result.replace("$SELECTED_FILES", selected_files);
            result = result.replace("${SELECTED_FILES}", selected_files);
        }

        if let Some(commit_hash) = &vars.commit_hash {
            result = result.replace("$COMMIT_HASH", commit_hash);
            result = result.replace("${COMMIT_HASH}", commit_hash);
        }

        if let Some(commit_short) = &vars.commit_short {
            result = result.replace("$COMMIT_SHORT", commit_short);
            result = result.replace("${COMMIT_SHORT}", commit_short);
        }

        if let Some(commit_message) = &vars.commit_message {
            result = result.replace("$COMMIT_MESSAGE", commit_message);
            result = result.replace("${COMMIT_MESSAGE}", commit_message);
        }

        if let Some(remote_url) = &vars.remote_url {
            result = result.replace("$REMOTE_URL", remote_url);
            result = result.replace("${REMOTE_URL}", remote_url);
        }

        if let Some(tag) = &vars.tag {
            result = result.replace("$TAG", tag);
            result = result.replace("${TAG}", tag);
        }

        if let Some(stash_ref) = &vars.stash_ref {
            result = result.replace("$STASH_REF", stash_ref);
            result = result.replace("${STASH_REF}", stash_ref);
        }

        // Remove any remaining unsubstituted variables
        VARIABLE_REGEX.replace_all(&result, "").to_string()
    }

    /// Execute a custom action
    pub async fn execute(
        action: &CustomAction,
        variables: &ActionVariables,
    ) -> Result<ActionExecutionResult> {
        let command = Self::substitute_variables(&action.command, variables);

        let working_dir = action
            .working_dir
            .as_ref()
            .map(|d| Self::substitute_variables(d, variables))
            .unwrap_or_else(|| variables.repo_path.clone());

        let start = Instant::now();

        // Execute command based on platform
        let output = Self::run_shell_command(&command, &working_dir).await;

        let duration_ms = start.elapsed().as_millis() as u64;

        match output {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                let exit_code = output.status.code().unwrap_or(-1);

                if output.status.success() {
                    Ok(ActionExecutionResult::success(stdout, stderr, duration_ms))
                } else {
                    Ok(ActionExecutionResult::failure(
                        exit_code,
                        stdout,
                        stderr,
                        duration_ms,
                    ))
                }
            }
            Err(e) => Ok(ActionExecutionResult::error(e.to_string())),
        }
    }

    /// Run a shell command with platform-specific shell
    async fn run_shell_command(
        command: &str,
        working_dir: &str,
    ) -> std::io::Result<std::process::Output> {
        #[cfg(windows)]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            Command::new("cmd")
                .args(["/C", command])
                .current_dir(working_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .creation_flags(CREATE_NO_WINDOW)
                .output()
                .await
        }

        #[cfg(not(windows))]
        {
            Command::new("sh")
                .args(["-c", command])
                .current_dir(working_dir)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .output()
                .await
        }
    }

    // ==================== Global Actions ====================

    /// Get the path to the global actions.json file
    pub fn get_global_actions_file_path(app_data_dir: &Path) -> PathBuf {
        app_data_dir.join(ACTIONS_FILE)
    }

    /// Read global actions from app data directory
    pub fn read_global_actions(app_data_dir: &Path) -> Result<Vec<CustomAction>> {
        let actions_path = Self::get_global_actions_file_path(app_data_dir);

        if !actions_path.exists() {
            return Ok(Vec::new());
        }

        let content = std::fs::read_to_string(&actions_path)?;
        let file: RepoActionsFile = serde_json::from_str(&content)?;

        // Mark all actions as global storage
        let actions = file
            .actions
            .into_iter()
            .map(|mut a| {
                a.storage = Some(ActionStorageType::Global);
                a
            })
            .collect();

        Ok(actions)
    }

    /// Write global actions to app data directory
    pub fn write_global_actions(app_data_dir: &Path, actions: &[CustomAction]) -> Result<()> {
        let actions_path = Self::get_global_actions_file_path(app_data_dir);

        let file = RepoActionsFile::v1(actions.to_vec());

        let content = serde_json::to_string_pretty(&file)?;
        std::fs::write(&actions_path, content)?;

        Ok(())
    }

    /// Save a single global action
    pub fn save_global_action(app_data_dir: &Path, action: CustomAction) -> Result<()> {
        let mut actions = Self::read_global_actions(app_data_dir)?;

        // Find and update or insert
        if let Some(existing) = actions.iter_mut().find(|a| a.id == action.id) {
            *existing = action;
        } else {
            actions.push(action);
        }

        Self::write_global_actions(app_data_dir, &actions)
    }

    /// Delete a global action
    pub fn delete_global_action(app_data_dir: &Path, action_id: &str) -> Result<()> {
        let mut actions = Self::read_global_actions(app_data_dir)?;
        actions.retain(|a| a.id != action_id);
        Self::write_global_actions(app_data_dir, &actions)
    }

    // ==================== Repository Actions ====================

    /// Get the path to the .axis directory for a repository
    pub fn get_axis_dir(repo_path: &Path) -> PathBuf {
        repo_path.join(AXIS_DIR)
    }

    /// Get the path to the actions.json file for a repository
    pub fn get_repo_actions_file_path(repo_path: &Path) -> PathBuf {
        Self::get_axis_dir(repo_path).join(ACTIONS_FILE)
    }

    /// Read repository-specific actions from .axis/actions.json
    pub fn read_repo_actions(repo_path: &Path) -> Result<Vec<CustomAction>> {
        let actions_path = Self::get_repo_actions_file_path(repo_path);

        if !actions_path.exists() {
            return Ok(Vec::new());
        }

        let content = std::fs::read_to_string(&actions_path)?;
        let file: RepoActionsFile = serde_json::from_str(&content)?;

        // Mark all actions as repository storage
        let actions = file
            .actions
            .into_iter()
            .map(|mut a| {
                a.storage = Some(ActionStorageType::Repository);
                a
            })
            .collect();

        Ok(actions)
    }

    /// Write repository-specific actions to .axis/actions.json
    pub fn write_repo_actions(repo_path: &Path, actions: &[CustomAction]) -> Result<()> {
        let axis_dir = Self::get_axis_dir(repo_path);
        let actions_path = Self::get_repo_actions_file_path(repo_path);

        // Create .axis directory if it doesn't exist
        if !axis_dir.exists() {
            std::fs::create_dir_all(&axis_dir)?;
        }

        let file = RepoActionsFile::v1(actions.to_vec());

        let content = serde_json::to_string_pretty(&file)?;
        std::fs::write(&actions_path, content)?;

        Ok(())
    }

    /// Save a single action to repository storage
    pub fn save_repo_action(repo_path: &Path, action: CustomAction) -> Result<()> {
        let mut actions = Self::read_repo_actions(repo_path)?;

        // Find and update or insert
        if let Some(existing) = actions.iter_mut().find(|a| a.id == action.id) {
            *existing = action;
        } else {
            actions.push(action);
        }

        Self::write_repo_actions(repo_path, &actions)
    }

    /// Delete an action from repository storage
    pub fn delete_repo_action(repo_path: &Path, action_id: &str) -> Result<()> {
        let mut actions = Self::read_repo_actions(repo_path)?;
        actions.retain(|a| a.id != action_id);
        Self::write_repo_actions(repo_path, &actions)
    }

    /// Filter actions by context
    pub fn filter_by_context(
        actions: &[CustomAction],
        context: ActionContext,
    ) -> Vec<CustomAction> {
        actions
            .iter()
            .filter(|a| a.enabled && a.contexts.contains(&context))
            .cloned()
            .collect()
    }

    /// Merge global and repository actions, with repo actions taking precedence
    pub fn merge_actions(
        global_actions: Vec<CustomAction>,
        repo_actions: Vec<CustomAction>,
    ) -> Vec<CustomAction> {
        let mut merged = Vec::new();
        let mut seen_ids: std::collections::HashSet<String> = std::collections::HashSet::new();

        // Add repo actions first (they have priority)
        for mut action in repo_actions {
            action.storage = Some(ActionStorageType::Repository);
            seen_ids.insert(action.id.clone());
            merged.push(action);
        }

        // Add global actions that aren't overridden
        for mut action in global_actions {
            if !seen_ids.contains(&action.id) {
                action.storage = Some(ActionStorageType::Global);
                merged.push(action);
            }
        }

        // Sort by order
        merged.sort_by_key(|a| a.order);
        merged
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_substitute_variables_basic() {
        let vars = ActionVariables {
            repo_path: "/path/to/repo".to_string(),
            branch: Some("main".to_string()),
            file: Some("src/test.rs".to_string()),
            ..Default::default()
        };

        let command = "echo $REPO_PATH $BRANCH $FILE";
        let result = CustomActionsService::substitute_variables(command, &vars);
        assert_eq!(result, "echo /path/to/repo main src/test.rs");
    }

    #[test]
    fn test_substitute_variables_braces() {
        let vars = ActionVariables {
            repo_path: "/path/to/repo".to_string(),
            branch: Some("main".to_string()),
            ..Default::default()
        };

        let command = "echo ${REPO_PATH} ${BRANCH}";
        let result = CustomActionsService::substitute_variables(command, &vars);
        assert_eq!(result, "echo /path/to/repo main");
    }

    #[test]
    fn test_substitute_variables_removes_unset() {
        let vars = ActionVariables {
            repo_path: "/path/to/repo".to_string(),
            branch: None,
            ..Default::default()
        };

        // All unsubstituted variables (including None ones) are removed
        let command = "echo $REPO_PATH $BRANCH $UNKNOWN";
        let result = CustomActionsService::substitute_variables(command, &vars);
        assert_eq!(result, "echo /path/to/repo  ");
    }

    #[test]
    fn test_filter_by_context() {
        let actions = vec![
            CustomAction::new(
                "File Action".to_string(),
                "echo file".to_string(),
                vec![ActionContext::File],
            ),
            CustomAction::new(
                "Branch Action".to_string(),
                "echo branch".to_string(),
                vec![ActionContext::Branch],
            ),
            CustomAction::new(
                "Both".to_string(),
                "echo both".to_string(),
                vec![ActionContext::File, ActionContext::Branch],
            ),
        ];

        let file_actions = CustomActionsService::filter_by_context(&actions, ActionContext::File);
        assert_eq!(file_actions.len(), 2);

        let branch_actions =
            CustomActionsService::filter_by_context(&actions, ActionContext::Branch);
        assert_eq!(branch_actions.len(), 2);

        let tag_actions = CustomActionsService::filter_by_context(&actions, ActionContext::Tag);
        assert_eq!(tag_actions.len(), 0);
    }
}
