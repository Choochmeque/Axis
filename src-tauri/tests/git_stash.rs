#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

use axis_lib::models::{StashApplyOptions, StashSaveOptions};

// ==================== Helpers ====================

/// List stashes via CLI
fn git_stash_list(path: &std::path::Path) -> Vec<String> {
    let output = git_cmd(path, &["stash", "list"]);
    if output.is_empty() {
        return Vec::new();
    }
    output.lines().map(|s| s.to_string()).collect()
}

/// Get stash count via CLI
fn git_stash_count(path: &std::path::Path) -> usize {
    git_stash_list(path).len()
}

/// Check if file exists in working directory
fn file_exists(path: &std::path::Path, filename: &str) -> bool {
    path.join(filename).exists()
}

/// Check if file has specific content
fn file_has_content(path: &std::path::Path, filename: &str, content: &str) -> bool {
    std::fs::read_to_string(path.join(filename))
        .map(|c| c.contains(content))
        .unwrap_or(false)
}

// ==================== Happy Path Tests ====================

#[tokio::test]
async fn test_stash_save_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create uncommitted changes
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");

    // Action: RepoOperations saves stash
    ops.stash_save(&StashSaveOptions::default())
        .await
        .expect("should save stash");

    // Verify: git CLI sees the stash
    assert_eq!(
        git_stash_count(tmp.path()),
        1,
        "CLI should see stash created by RepoOperations"
    );
}

#[tokio::test]
async fn test_cli_stash_read_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create and stash changes via CLI
    std::fs::write(tmp.path().join("README.md"), "# CLI modified").expect("should write");
    git_cmd(tmp.path(), &["stash", "save", "CLI stash"]);

    // Verify: RepoOperations sees the stash
    let stashes = ops.stash_list().await.expect("should list stashes");
    assert_eq!(stashes.len(), 1, "RepoOperations should see CLI stash");
    assert!(
        stashes[0].message.contains("CLI stash"),
        "Stash message should match"
    );
}

#[tokio::test]
async fn test_stash_apply_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create changes and stash via CLI
    std::fs::write(tmp.path().join("README.md"), "# Stashed content").expect("should write");
    git_cmd(tmp.path(), &["stash", "save"]);

    // Verify file is clean after stash
    assert!(
        !file_has_content(tmp.path(), "README.md", "Stashed content"),
        "File should be clean after stash"
    );

    // Action: RepoOperations applies stash
    ops.stash_apply(&StashApplyOptions::default())
        .await
        .expect("should apply stash");

    // Verify: file content restored AND stash still exists
    assert!(
        file_has_content(tmp.path(), "README.md", "Stashed content"),
        "File should have stashed content after apply"
    );
    assert_eq!(
        git_stash_count(tmp.path()),
        1,
        "Stash should still exist after apply"
    );
}

#[tokio::test]
async fn test_stash_pop_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create changes and stash via CLI
    std::fs::write(tmp.path().join("README.md"), "# Pop content").expect("should write");
    git_cmd(tmp.path(), &["stash", "save"]);

    // Action: RepoOperations pops stash
    ops.stash_pop(&StashApplyOptions::default())
        .await
        .expect("should pop stash");

    // Verify: file content restored AND stash removed
    assert!(
        file_has_content(tmp.path(), "README.md", "Pop content"),
        "File should have popped content"
    );
    assert_eq!(
        git_stash_count(tmp.path()),
        0,
        "Stash should be removed after pop"
    );
}

#[tokio::test]
async fn test_stash_drop_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create stash via CLI
    std::fs::write(tmp.path().join("README.md"), "# To drop").expect("should write");
    git_cmd(tmp.path(), &["stash", "save"]);
    assert_eq!(git_stash_count(tmp.path()), 1);

    // Action: RepoOperations drops stash
    ops.stash_drop(Some(0)).await.expect("should drop stash");

    // Verify: stash removed
    assert_eq!(
        git_stash_count(tmp.path()),
        0,
        "CLI should not see dropped stash"
    );
}

#[tokio::test]
async fn test_stash_clear_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple stashes via CLI
    std::fs::write(tmp.path().join("README.md"), "# First").expect("should write");
    git_cmd(tmp.path(), &["stash", "save", "first"]);
    std::fs::write(tmp.path().join("README.md"), "# Second").expect("should write");
    git_cmd(tmp.path(), &["stash", "save", "second"]);
    assert_eq!(git_stash_count(tmp.path()), 2);

    // Action: RepoOperations clears all stashes
    ops.stash_clear().await.expect("should clear stashes");

    // Verify: all stashes removed
    assert_eq!(
        git_stash_count(tmp.path()),
        0,
        "CLI should see no stashes after clear"
    );
}

#[tokio::test]
async fn test_stash_save_with_message() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create uncommitted changes
    std::fs::write(tmp.path().join("README.md"), "# With message").expect("should write");

    // Action: save stash with custom message
    let options = StashSaveOptions {
        message: Some("My custom stash message".to_string()),
        ..Default::default()
    };
    ops.stash_save(&options).await.expect("should save stash");

    // Verify: CLI shows stash with message
    let stashes = git_stash_list(tmp.path());
    assert_eq!(stashes.len(), 1);
    assert!(
        stashes[0].contains("My custom stash message"),
        "Stash should have custom message"
    );
}

#[tokio::test]
async fn test_stash_save_include_untracked() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create untracked file
    std::fs::write(tmp.path().join("untracked.txt"), "untracked content").expect("should write");
    assert!(file_exists(tmp.path(), "untracked.txt"));

    // Action: save stash including untracked
    let options = StashSaveOptions {
        include_untracked: true,
        ..Default::default()
    };
    ops.stash_save(&options).await.expect("should save stash");

    // Verify: untracked file is stashed (removed from working dir)
    assert!(
        !file_exists(tmp.path(), "untracked.txt"),
        "Untracked file should be stashed"
    );

    // Pop and verify file is back
    ops.stash_pop(&StashApplyOptions::default())
        .await
        .expect("should pop");
    assert!(
        file_exists(tmp.path(), "untracked.txt"),
        "Untracked file should be restored"
    );
}

#[tokio::test]
async fn test_stash_show() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create stash with known changes
    std::fs::write(tmp.path().join("README.md"), "# Changed for show test").expect("should write");
    git_cmd(tmp.path(), &["stash", "save"]);

    // Action: show stash content
    let output = ops
        .stash_show(Some(0), false)
        .await
        .expect("should show stash");

    // Verify: output contains file info
    assert!(
        output.contains("README.md"),
        "Stash show should mention changed file"
    );
}

#[tokio::test]
async fn test_stash_branch() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create stash via CLI
    std::fs::write(tmp.path().join("README.md"), "# Branch content").expect("should write");
    git_cmd(tmp.path(), &["stash", "save"]);
    assert_eq!(git_stash_count(tmp.path()), 1);

    // Action: create branch from stash
    ops.stash_branch("stash-branch", Some(0))
        .await
        .expect("should create branch from stash");

    // Verify: branch exists and stash is removed
    let current_branch = git_cmd(tmp.path(), &["rev-parse", "--abbrev-ref", "HEAD"]);
    assert_eq!(
        current_branch, "stash-branch",
        "Should be on new branch created from stash"
    );
    assert_eq!(
        git_stash_count(tmp.path()),
        0,
        "Stash should be removed after branch creation"
    );
    assert!(
        file_has_content(tmp.path(), "README.md", "Branch content"),
        "File should have stashed content"
    );
}

// ==================== Edge Case Tests ====================

#[tokio::test]
async fn test_stash_list_empty() {
    let (_tmp, ops) = setup_test_repo();

    // Action: list stashes on repo with no stashes
    let stashes = ops.stash_list().await.expect("should list stashes");

    // Verify: empty list
    assert!(stashes.is_empty(), "New repo should have no stashes");
}

#[tokio::test]
async fn test_stash_multiple_and_apply_specific() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple stashes
    std::fs::write(tmp.path().join("README.md"), "# First stash").expect("should write");
    git_cmd(tmp.path(), &["stash", "save", "first"]);
    std::fs::write(tmp.path().join("README.md"), "# Second stash").expect("should write");
    git_cmd(tmp.path(), &["stash", "save", "second"]);

    // Verify order (most recent first)
    let stashes = ops.stash_list().await.expect("should list");
    assert_eq!(stashes.len(), 2);
    assert!(stashes[0].message.contains("second"), "Most recent first");
    assert!(stashes[1].message.contains("first"), "Older second");

    // Action: apply older stash (index 1)
    let options = StashApplyOptions {
        index: Some(1),
        ..Default::default()
    };
    ops.stash_apply(&options).await.expect("should apply");

    // Verify: got first stash content
    assert!(
        file_has_content(tmp.path(), "README.md", "First stash"),
        "Should have first stash content"
    );
}

#[tokio::test]
async fn test_stash_drop_nonexistent_fails() {
    let (_tmp, ops) = setup_test_repo();

    // Action: try to drop non-existent stash
    let result = ops.stash_drop(Some(99)).await;

    // Verify: should fail
    assert!(result.is_err(), "Dropping non-existent stash should fail");
}

#[tokio::test]
async fn test_stash_entry_fields_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create stash via CLI
    std::fs::write(tmp.path().join("README.md"), "# Field test").expect("should write");
    git_cmd(tmp.path(), &["stash", "save", "Detailed stash"]);

    // Get CLI stash info for verification
    let cli_stash_oid = git_cmd(tmp.path(), &["rev-parse", "stash@{0}"]);

    // Action: get stash details via RepoOperations
    let stashes = ops.stash_list().await.expect("should list");
    let stash = &stashes[0];

    // Verify: ops fields match CLI
    assert_eq!(stash.index, 0);
    assert!(
        stash.stash_ref.starts_with("stash@{"),
        "stash_ref should start with stash@{{"
    );
    assert!(stash.message.contains("Detailed stash"));
    assert_eq!(
        stash.commit_oid, cli_stash_oid,
        "Commit OID should match CLI"
    );
    assert!(
        cli_stash_oid.starts_with(&stash.short_oid),
        "Short OID should be prefix of full OID"
    );
}
