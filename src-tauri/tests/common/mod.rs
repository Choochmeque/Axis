#![cfg(feature = "integration")]

use std::path::Path;
use std::process::Command;
use std::sync::Arc;
use tempfile::TempDir;

use axis_lib::services::ops::RepoOperations;
use axis_lib::services::GitService;

/// Create test repo with initial commit (git CLI as source of truth)
pub fn setup_test_repo() -> (TempDir, RepoOperations) {
    let tmp = TempDir::new().expect("should create temp dir");

    git_cmd(tmp.path(), &["init"]);
    git_cmd(tmp.path(), &["config", "user.email", "test@test.com"]);
    git_cmd(tmp.path(), &["config", "user.name", "Test User"]);

    std::fs::write(tmp.path().join("README.md"), "# Test").expect("should write file");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Initial commit"]);

    let service = Arc::new(GitService::new_for_test(tmp.path()).expect("should create GitService"));
    let ops = RepoOperations::new(service);

    (tmp, ops)
}

/// Execute git CLI command, return stdout
pub fn git_cmd(path: &Path, args: &[&str]) -> String {
    let output = Command::new("git")
        .args(args)
        .current_dir(path)
        .output()
        .expect("should execute git");

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        panic!("git command failed: git {}: {}", args.join(" "), stderr);
    }

    String::from_utf8_lossy(&output.stdout).trim().to_string()
}

/// Get current branch via CLI
pub fn git_current_branch(path: &Path) -> String {
    git_cmd(path, &["rev-parse", "--abbrev-ref", "HEAD"])
}

/// List branches via CLI
pub fn git_branch_list(path: &Path) -> Vec<String> {
    let output = git_cmd(path, &["branch", "--list", "--format=%(refname:short)"]);
    if output.is_empty() {
        return Vec::new();
    }
    output.lines().map(|s| s.to_string()).collect()
}

/// Check if branch exists via CLI
pub fn git_branch_exists(path: &Path, branch_name: &str) -> bool {
    git_branch_list(path).contains(&branch_name.to_string())
}
