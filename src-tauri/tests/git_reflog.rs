#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

use axis_lib::models::ReflogOptions;

// ==================== Helpers ====================

/// Get HEAD OID via CLI
fn git_head_oid(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "HEAD"])
}

/// Get reflog via CLI
fn git_reflog_list(path: &std::path::Path, refname: &str) -> Vec<String> {
    let output = git_cmd(path, &["reflog", "show", refname, "--format=%H"]);
    if output.is_empty() {
        return Vec::new();
    }
    output
        .lines()
        .map(std::string::ToString::to_string)
        .collect()
}

/// Get reflog count via CLI
fn git_reflog_count(path: &std::path::Path, refname: &str) -> usize {
    git_reflog_list(path, refname).len()
}

// ==================== Happy Path Tests ====================

#[tokio::test]
async fn test_get_reflog_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Get CLI reflog for comparison
    let cli_reflog = git_reflog_list(tmp.path(), "HEAD");
    assert!(
        !cli_reflog.is_empty(),
        "Should have at least initial commit in reflog"
    );

    // Action: RepoOperations gets reflog
    let reflog = ops
        .get_reflog(&ReflogOptions::default())
        .await
        .expect("should get reflog");

    // Verify: ops reflog matches CLI
    assert_eq!(
        reflog.len(),
        cli_reflog.len(),
        "Reflog count should match CLI"
    );
    assert_eq!(
        reflog[0].new_oid, cli_reflog[0],
        "Most recent reflog entry OID should match CLI"
    );
}

#[tokio::test]
async fn test_cli_action_appears_in_ops_reflog() {
    let (tmp, ops) = setup_test_repo();
    let initial_count = git_reflog_count(tmp.path(), "HEAD");

    // Setup: perform action via CLI that creates reflog entry
    std::fs::write(tmp.path().join("new.txt"), "new content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "New commit"]);

    let new_head = git_head_oid(tmp.path());

    // Action: RepoOperations reads reflog
    let reflog = ops
        .get_reflog(&ReflogOptions::default())
        .await
        .expect("should get reflog");

    // Verify: new entry visible to ops
    assert_eq!(
        reflog.len(),
        initial_count + 1,
        "Should have one more reflog entry after commit"
    );
    assert_eq!(
        reflog[0].new_oid, new_head,
        "Most recent reflog entry should be the new commit"
    );
}

#[tokio::test]
async fn test_get_reflog_count_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a few commits via CLI
    for i in 1..=3 {
        std::fs::write(
            tmp.path().join(format!("file{i}.txt")),
            format!("content {i}"),
        )
        .expect("should write");
        git_cmd(tmp.path(), &["add", "."]);
        git_cmd(tmp.path(), &["commit", "-m", &format!("Commit {i}")]);
    }

    let cli_count = git_reflog_count(tmp.path(), "HEAD");

    // Action: RepoOperations counts reflog
    let ops_count = ops
        .get_reflog_count("HEAD")
        .await
        .expect("should get reflog count");

    // Verify: counts match
    assert_eq!(ops_count, cli_count, "Reflog count should match CLI");
}

#[tokio::test]
async fn test_list_reflogs_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a branch to have multiple reflogs
    git_cmd(tmp.path(), &["branch", "feature"]);

    // Action: RepoOperations lists reflogs
    let reflogs = ops.list_reflogs().await.expect("should list reflogs");

    // Verify: HEAD reflog exists
    assert!(
        reflogs.iter().any(|r| r == "HEAD"),
        "Should have HEAD reflog"
    );
}

#[tokio::test]
async fn test_checkout_reflog_entry_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commits and record first commit OID
    let first_oid = git_head_oid(tmp.path());

    std::fs::write(tmp.path().join("second.txt"), "second").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Second commit"]);

    let second_oid = git_head_oid(tmp.path());
    assert_ne!(first_oid, second_oid, "Should have different commits");

    // Action: RepoOperations checkouts reflog entry (first commit)
    ops.checkout_reflog_entry("HEAD@{1}")
        .await
        .expect("should checkout reflog entry");

    // Verify: CLI shows we're at first commit
    let current_oid = git_head_oid(tmp.path());
    assert_eq!(
        current_oid, first_oid,
        "Should be at first commit after checkout"
    );
}

#[tokio::test]
async fn test_get_reflog_with_limit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple commits
    for i in 1..=5 {
        std::fs::write(
            tmp.path().join(format!("file{i}.txt")),
            format!("content {i}"),
        )
        .expect("should write");
        git_cmd(tmp.path(), &["add", "."]);
        git_cmd(tmp.path(), &["commit", "-m", &format!("Commit {i}")]);
    }

    // Action: get reflog with limit
    let options = ReflogOptions {
        limit: Some(3),
        ..Default::default()
    };
    let reflog = ops.get_reflog(&options).await.expect("should get reflog");

    // Verify: respects limit
    assert_eq!(reflog.len(), 3, "Should return only 3 entries");
    assert_eq!(reflog[0].index, 0, "First entry should be index 0");
}

#[tokio::test]
async fn test_get_reflog_for_branch() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create and switch to feature branch, make commits
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("feature.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Feature commit"]);

    let feature_head = git_head_oid(tmp.path());

    // Get CLI reflog for branch
    let cli_reflog = git_reflog_list(tmp.path(), "refs/heads/feature");

    // Action: get reflog for specific branch
    let options = ReflogOptions {
        refname: Some("refs/heads/feature".to_string()),
        ..Default::default()
    };
    let reflog = ops.get_reflog(&options).await.expect("should get reflog");

    // Verify: matches CLI
    assert_eq!(
        reflog.len(),
        cli_reflog.len(),
        "Branch reflog count should match CLI"
    );
    assert_eq!(
        reflog[0].new_oid, feature_head,
        "Most recent entry should be feature commit"
    );
}

// ==================== Reflog Entry Fields Tests ====================

#[tokio::test]
async fn test_reflog_entry_fields_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Get CLI info for verification
    let cli_head = git_head_oid(tmp.path());
    let cli_short = git_cmd(tmp.path(), &["rev-parse", "--short", "HEAD"]);

    // Action: get reflog entry
    let reflog = ops
        .get_reflog(&ReflogOptions::default())
        .await
        .expect("should get reflog");
    let entry = &reflog[0];

    // Verify fields match CLI
    assert_eq!(entry.index, 0);
    assert!(entry.reflog_ref.starts_with("HEAD@{"));
    assert_eq!(entry.new_oid, cli_head, "new_oid should match CLI HEAD");
    assert_eq!(
        entry.short_new_oid, cli_short,
        "short_new_oid should match CLI short"
    );
    assert!(!entry.committer_name.is_empty());
    assert!(!entry.committer_email.is_empty());
}

#[tokio::test]
async fn test_reflog_action_commit() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get reflog
    let reflog = ops
        .get_reflog(&ReflogOptions::default())
        .await
        .expect("should get reflog");

    // Verify: initial commit action is recognized
    let entry = &reflog[0];
    assert!(
        entry.message.contains("commit"),
        "Initial commit message should contain 'commit'"
    );
}

#[tokio::test]
async fn test_reflog_action_checkout() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create branch and checkout
    git_cmd(tmp.path(), &["branch", "feature"]);
    git_cmd(tmp.path(), &["checkout", "feature"]);

    // Action: get reflog
    let reflog = ops
        .get_reflog(&ReflogOptions::default())
        .await
        .expect("should get reflog");

    // Verify: checkout action is recorded
    let entry = &reflog[0];
    assert!(
        entry.message.contains("checkout") || entry.message.contains("moving"),
        "Checkout should be recorded in reflog: {}",
        entry.message
    );
}

// ==================== Edge Case Tests ====================

#[tokio::test]
async fn test_get_reflog_with_skip() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commits
    for i in 1..=3 {
        std::fs::write(
            tmp.path().join(format!("file{i}.txt")),
            format!("content {i}"),
        )
        .expect("should write");
        git_cmd(tmp.path(), &["add", "."]);
        git_cmd(tmp.path(), &["commit", "-m", &format!("Commit {i}")]);
    }

    // Get full reflog for comparison
    let full_reflog = ops
        .get_reflog(&ReflogOptions::default())
        .await
        .expect("should get reflog");

    // Action: get reflog with skip
    let options = ReflogOptions {
        skip: Some(1),
        ..Default::default()
    };
    let skipped_reflog = ops.get_reflog(&options).await.expect("should get reflog");

    // Verify: skipped first entry
    assert_eq!(
        skipped_reflog.len(),
        full_reflog.len() - 1,
        "Should have one less entry"
    );
    assert_eq!(
        skipped_reflog[0].new_oid, full_reflog[1].new_oid,
        "First entry after skip should be second entry from full"
    );
}

#[tokio::test]
async fn test_reflog_after_reset() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit then reset
    std::fs::write(tmp.path().join("to_reset.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Will reset"]);

    let before_reset = git_head_oid(tmp.path());
    git_cmd(tmp.path(), &["reset", "--hard", "HEAD~1"]);
    let after_reset = git_head_oid(tmp.path());

    // Get CLI reflog
    let cli_reflog = git_reflog_list(tmp.path(), "HEAD");

    // Action: get reflog via ops
    let reflog = ops
        .get_reflog(&ReflogOptions::default())
        .await
        .expect("should get reflog");

    // Verify: reset is recorded
    assert_eq!(reflog.len(), cli_reflog.len());
    assert_eq!(
        reflog[0].new_oid, after_reset,
        "Most recent should be after reset"
    );
    assert_eq!(
        reflog[1].new_oid, before_reset,
        "Previous should be before reset"
    );
}

#[tokio::test]
async fn test_checkout_nonexistent_reflog_entry_fails() {
    let (_tmp, ops) = setup_test_repo();

    // Action: try to checkout non-existent reflog entry
    let result = ops.checkout_reflog_entry("HEAD@{999}").await;

    // Verify: should fail
    assert!(
        result.is_err(),
        "Checkout non-existent reflog entry should fail"
    );
}
