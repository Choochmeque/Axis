#![cfg(feature = "integration")]

mod common;

use axis_lib::models::PullOptions;
use common::{git_cmd, setup_test_repo};

// ==================== Helpers ====================

/// Setup a test scenario with a local repo, a bare "remote", and optionally a clone for pushing
/// Returns (local_tmp, local_ops, bare_path, clone_path, branch_name)
fn setup_pull_test_scenario() -> (
    tempfile::TempDir,
    axis_lib::services::ops::RepoOperations,
    std::path::PathBuf,
    std::path::PathBuf,
    String,
) {
    let (tmp, ops) = setup_test_repo();

    // Get current branch name
    let branch = git_cmd(tmp.path(), &["rev-parse", "--abbrev-ref", "HEAD"]);

    // Create bare repo as "remote"
    let bare_path = tmp.path().join("bare.git");
    git_cmd(
        tmp.path(),
        &["clone", "--bare", ".", bare_path.to_str().expect("path")],
    );
    git_cmd(
        tmp.path(),
        &["remote", "add", "origin", bare_path.to_str().expect("path")],
    );

    // Initial push to set up tracking
    git_cmd(tmp.path(), &["push", "-u", "origin", &branch]);

    // Create a clone to simulate another contributor pushing changes
    let clone_path = tmp.path().join("clone");
    git_cmd(
        tmp.path(),
        &[
            "clone",
            bare_path.to_str().expect("path"),
            clone_path.to_str().expect("path"),
        ],
    );
    git_cmd(&clone_path, &["config", "user.email", "other@test.com"]);
    git_cmd(&clone_path, &["config", "user.name", "Other User"]);

    (tmp, ops, bare_path, clone_path, branch)
}

/// Push a commit from the clone (simulating remote changes)
fn push_remote_change(clone_path: &std::path::Path, filename: &str, content: &str, message: &str) {
    std::fs::write(clone_path.join(filename), content).expect("should write file");
    git_cmd(clone_path, &["add", filename]);
    git_cmd(clone_path, &["commit", "-m", message]);
    git_cmd(clone_path, &["push"]);
}

// ==================== Bug Reproduction Tests ====================
// These tests demonstrate the bug: pull discards local changes even to unrelated files

#[tokio::test]
async fn test_pull_preserves_unstaged_changes_to_different_file() {
    let (tmp, ops, _bare_path, clone_path, branch) = setup_pull_test_scenario();

    // Remote: push a change to "remote-file.txt"
    push_remote_change(
        &clone_path,
        "remote-file.txt",
        "remote content",
        "Remote change",
    );

    // Local: create unstaged changes to a DIFFERENT file "local-file.txt"
    std::fs::write(tmp.path().join("local-file.txt"), "local unstaged content")
        .expect("should write");

    // Verify local change exists before pull
    let local_content_before =
        std::fs::read_to_string(tmp.path().join("local-file.txt")).expect("should read");
    assert_eq!(local_content_before, "local unstaged content");

    // Fetch first so pull can fast-forward
    git_cmd(tmp.path(), &["fetch", "origin"]);

    // Pull - this should preserve local changes to local-file.txt
    let result = ops
        .pull::<fn(&git2::Progress<'_>) -> bool>(
            "origin",
            &branch,
            &PullOptions::default(),
            None,
            None,
        )
        .await;

    assert!(result.is_ok(), "Pull should succeed: {result:?}");

    // Verify remote changes were applied
    let remote_content =
        std::fs::read_to_string(tmp.path().join("remote-file.txt")).expect("should read");
    assert_eq!(
        remote_content, "remote content",
        "Remote file should be updated"
    );

    // BUG: This assertion will fail if pull discards local changes
    let local_content_after =
        std::fs::read_to_string(tmp.path().join("local-file.txt")).expect("should read");
    assert_eq!(
        local_content_after, "local unstaged content",
        "Local unstaged changes to different file should be preserved after pull"
    );
}

#[tokio::test]
async fn test_pull_preserves_staged_changes_to_different_file() {
    let (tmp, ops, _bare_path, clone_path, branch) = setup_pull_test_scenario();

    // Remote: push a change to "remote-file.txt"
    push_remote_change(
        &clone_path,
        "remote-file.txt",
        "remote content",
        "Remote change",
    );

    // Local: create STAGED changes to a DIFFERENT file "local-file.txt"
    std::fs::write(tmp.path().join("local-file.txt"), "local staged content")
        .expect("should write");
    git_cmd(tmp.path(), &["add", "local-file.txt"]);

    // Verify file is staged
    let status_before = git_cmd(tmp.path(), &["status", "--porcelain"]);
    assert!(
        status_before.contains("A  local-file.txt"),
        "File should be staged: {status_before}"
    );

    // Fetch first so pull can fast-forward
    git_cmd(tmp.path(), &["fetch", "origin"]);

    // Pull - this should preserve staged changes to local-file.txt
    let result = ops
        .pull::<fn(&git2::Progress<'_>) -> bool>(
            "origin",
            &branch,
            &PullOptions::default(),
            None,
            None,
        )
        .await;

    assert!(result.is_ok(), "Pull should succeed: {result:?}");

    // Verify remote changes were applied
    let remote_content =
        std::fs::read_to_string(tmp.path().join("remote-file.txt")).expect("should read");
    assert_eq!(
        remote_content, "remote content",
        "Remote file should be updated"
    );

    // BUG: This assertion will fail if pull discards staged changes
    let status_after = git_cmd(tmp.path(), &["status", "--porcelain"]);
    assert!(
        status_after.contains("A  local-file.txt"),
        "Staged file should still be staged after pull: {status_after}"
    );

    let local_content =
        std::fs::read_to_string(tmp.path().join("local-file.txt")).expect("should read");
    assert_eq!(
        local_content, "local staged content",
        "Staged file content should be preserved"
    );
}

#[tokio::test]
async fn test_pull_preserves_modified_tracked_file_unstaged() {
    let (tmp, ops, _bare_path, clone_path, branch) = setup_pull_test_scenario();

    // Remote: push a change to "remote-file.txt"
    push_remote_change(
        &clone_path,
        "remote-file.txt",
        "remote content",
        "Remote change",
    );

    // Local: modify README.md (tracked file) but don't stage it
    std::fs::write(tmp.path().join("README.md"), "# Modified locally").expect("should write");

    // Verify local change exists
    let readme_before = std::fs::read_to_string(tmp.path().join("README.md")).expect("should read");
    assert_eq!(readme_before, "# Modified locally");

    // Fetch first
    git_cmd(tmp.path(), &["fetch", "origin"]);

    // Pull
    let result = ops
        .pull::<fn(&git2::Progress<'_>) -> bool>(
            "origin",
            &branch,
            &PullOptions::default(),
            None,
            None,
        )
        .await;

    assert!(result.is_ok(), "Pull should succeed: {result:?}");

    // BUG: This will fail if pull resets README.md
    let readme_after = std::fs::read_to_string(tmp.path().join("README.md")).expect("should read");
    assert_eq!(
        readme_after, "# Modified locally",
        "Unstaged modification to tracked file should be preserved"
    );
}

#[tokio::test]
async fn test_pull_preserves_modified_tracked_file_staged() {
    let (tmp, ops, _bare_path, clone_path, branch) = setup_pull_test_scenario();

    // Remote: push a change to "remote-file.txt"
    push_remote_change(
        &clone_path,
        "remote-file.txt",
        "remote content",
        "Remote change",
    );

    // Local: modify README.md (tracked file) AND stage it
    std::fs::write(tmp.path().join("README.md"), "# Staged modification").expect("should write");
    git_cmd(tmp.path(), &["add", "README.md"]);

    // Verify staged
    let status_before = git_cmd(tmp.path(), &["status", "--porcelain"]);
    assert!(
        status_before.contains("M  README.md"),
        "README should be staged: {status_before}"
    );

    // Fetch first
    git_cmd(tmp.path(), &["fetch", "origin"]);

    // Pull
    let result = ops
        .pull::<fn(&git2::Progress<'_>) -> bool>(
            "origin",
            &branch,
            &PullOptions::default(),
            None,
            None,
        )
        .await;

    assert!(result.is_ok(), "Pull should succeed: {result:?}");

    // BUG: This will fail if pull discards staged changes
    let status_after = git_cmd(tmp.path(), &["status", "--porcelain"]);
    assert!(
        status_after.contains("M  README.md"),
        "README should still be staged after pull: {status_after}"
    );

    let readme_content =
        std::fs::read_to_string(tmp.path().join("README.md")).expect("should read");
    assert_eq!(
        readme_content, "# Staged modification",
        "Staged modification should be preserved"
    );
}

// ==================== Conflict Detection Tests ====================
// These tests verify that pull correctly detects conflicts when local changes
// overlap with incoming remote changes

#[tokio::test]
async fn test_pull_detects_conflict_with_unstaged_changes_to_same_file() {
    let (tmp, ops, _bare_path, clone_path, branch) = setup_pull_test_scenario();

    // First, create the file locally and push it
    std::fs::write(tmp.path().join("conflict-file.txt"), "original").expect("should write");
    git_cmd(tmp.path(), &["add", "conflict-file.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add conflict-file"]);
    git_cmd(tmp.path(), &["push"]);

    // Clone pulls and modifies the file, then pushes
    git_cmd(&clone_path, &["pull"]);
    std::fs::write(clone_path.join("conflict-file.txt"), "remote changed").expect("should write");
    git_cmd(&clone_path, &["add", "conflict-file.txt"]);
    git_cmd(
        &clone_path,
        &["commit", "-m", "Remote modifies conflict-file"],
    );
    git_cmd(&clone_path, &["push"]);

    // Local: modify the same file (unstaged)
    std::fs::write(tmp.path().join("conflict-file.txt"), "local version").expect("should write");

    // Fetch
    git_cmd(tmp.path(), &["fetch", "origin"]);

    // Pull should fail with conflict error
    let result = ops
        .pull::<fn(&git2::Progress<'_>) -> bool>(
            "origin",
            &branch,
            &PullOptions::default(),
            None,
            None,
        )
        .await;

    assert!(
        result.is_err(),
        "Pull should fail when local unstaged changes conflict with remote: {result:?}"
    );

    // Local changes should be preserved (not discarded)
    let local_content =
        std::fs::read_to_string(tmp.path().join("conflict-file.txt")).expect("should read");
    assert_eq!(
        local_content, "local version",
        "Local changes should be preserved when pull fails"
    );
}

#[tokio::test]
async fn test_pull_detects_conflict_with_staged_changes_to_same_file() {
    let (tmp, ops, _bare_path, clone_path, branch) = setup_pull_test_scenario();

    // Create the file locally and push
    std::fs::write(tmp.path().join("conflict-file.txt"), "original").expect("should write");
    git_cmd(tmp.path(), &["add", "conflict-file.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add conflict-file"]);
    git_cmd(tmp.path(), &["push"]);

    // Remote: pull and modify the same file
    git_cmd(&clone_path, &["pull"]);
    std::fs::write(clone_path.join("conflict-file.txt"), "remote changed").expect("should write");
    git_cmd(&clone_path, &["add", "conflict-file.txt"]);
    git_cmd(
        &clone_path,
        &["commit", "-m", "Remote modifies conflict-file"],
    );
    git_cmd(&clone_path, &["push"]);

    // Local: modify the same file AND stage it
    std::fs::write(tmp.path().join("conflict-file.txt"), "local staged version")
        .expect("should write");
    git_cmd(tmp.path(), &["add", "conflict-file.txt"]);

    // Fetch
    git_cmd(tmp.path(), &["fetch", "origin"]);

    // Pull should fail with conflict error
    let result = ops
        .pull::<fn(&git2::Progress<'_>) -> bool>(
            "origin",
            &branch,
            &PullOptions::default(),
            None,
            None,
        )
        .await;

    assert!(
        result.is_err(),
        "Pull should fail when staged changes conflict with remote: {result:?}"
    );

    // Local staged changes should be preserved
    let local_content =
        std::fs::read_to_string(tmp.path().join("conflict-file.txt")).expect("should read");
    assert_eq!(
        local_content, "local staged version",
        "Staged changes should be preserved when pull fails"
    );

    let status = git_cmd(tmp.path(), &["status", "--porcelain"]);
    assert!(
        status.contains("M  conflict-file.txt"),
        "File should still be staged: {status}"
    );
}
