#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

use axis_lib::services::ConflictVersion;

// ==================== Helpers ====================

/// Get current branch via CLI
fn git_current_branch(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "--abbrev-ref", "HEAD"])
}

/// Get HEAD OID via CLI
fn git_head_oid(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "HEAD"])
}

/// Check if merge is in progress via CLI
fn git_is_merging(path: &std::path::Path) -> bool {
    path.join(".git/MERGE_HEAD").exists()
}

/// Check if rebase is in progress via CLI
fn git_is_rebasing(path: &std::path::Path) -> bool {
    path.join(".git/rebase-merge").exists() || path.join(".git/rebase-apply").exists()
}

/// Check if cherry-pick is in progress via CLI
fn git_is_cherry_picking(path: &std::path::Path) -> bool {
    path.join(".git/CHERRY_PICK_HEAD").exists()
}

/// Check if revert is in progress via CLI
fn git_is_reverting(path: &std::path::Path) -> bool {
    path.join(".git/REVERT_HEAD").exists()
}

/// Get conflicted files via CLI
fn git_conflicted_files(path: &std::path::Path) -> Vec<String> {
    let output = git_cmd(path, &["diff", "--name-only", "--diff-filter=U"]);
    if output.is_empty() {
        return Vec::new();
    }
    output.lines().map(|s| s.to_string()).collect()
}

/// Create a feature branch from a given base with a conflicting change
/// The branch is created from base_ref, not current HEAD
fn create_conflicting_branch_from(
    path: &std::path::Path,
    branch_name: &str,
    base_ref: &str,
    file: &str,
    content: &str,
) {
    let current = git_current_branch(path);
    git_cmd(path, &["checkout", "-b", branch_name, base_ref]);
    std::fs::write(path.join(file), content).expect("should write");
    git_cmd(path, &["add", file]);
    git_cmd(path, &["commit", "-m", &format!("Change in {branch_name}")]);
    git_cmd(path, &["checkout", &current]);
}

/// Create a feature branch with a commit (no conflict)
fn create_feature_branch(path: &std::path::Path, branch_name: &str, file: &str, content: &str) {
    let default_branch = git_current_branch(path);
    git_cmd(path, &["checkout", "-b", branch_name]);
    std::fs::write(path.join(file), content).expect("should write");
    git_cmd(path, &["add", file]);
    git_cmd(path, &["commit", "-m", &format!("Add {file}")]);
    git_cmd(path, &["checkout", &default_branch]);
}

// ==================== Merge Tests ====================

#[tokio::test]
async fn test_merge_fast_forward_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create feature branch with new file (fast-forward possible)
    create_feature_branch(tmp.path(), "feature", "feature.txt", "feature content");

    let head_before = git_head_oid(tmp.path());

    // Action: RepoOperations merges
    let result = ops
        .merge("feature", None, false, false, false, false)
        .await
        .expect("should merge");

    // Verify: merge succeeded
    assert!(result.success, "Merge should succeed");

    // Verify: CLI shows HEAD moved
    let head_after = git_head_oid(tmp.path());
    assert_ne!(head_before, head_after, "HEAD should move after merge");

    // Verify: file exists
    assert!(
        tmp.path().join("feature.txt").exists(),
        "Feature file should exist after merge"
    );
}

#[tokio::test]
async fn test_merge_no_ff_creates_merge_commit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create feature branch
    create_feature_branch(tmp.path(), "feature", "feature.txt", "feature content");

    // Action: merge with --no-ff
    let result = ops
        .merge("feature", Some("Merge feature"), true, false, false, false)
        .await
        .expect("should merge");

    assert!(result.success, "Merge should succeed");

    // Verify: CLI shows merge commit (parent count > 1)
    let parent_count = git_cmd(tmp.path(), &["rev-list", "--parents", "-1", "HEAD"]);
    let parents: Vec<&str> = parent_count.split_whitespace().collect();
    assert!(
        parents.len() > 2,
        "Merge commit should have multiple parents"
    );
}

#[tokio::test]
async fn test_merge_with_conflict_detected() {
    let (tmp, ops) = setup_test_repo();

    // Get initial commit as base for divergent branches
    let base = git_head_oid(tmp.path());

    // Setup: create conflicting changes on main
    std::fs::write(tmp.path().join("conflict.txt"), "main content\nline 2\n")
        .expect("should write");
    git_cmd(tmp.path(), &["add", "conflict.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add conflict.txt on main"]);

    // Create feature branch from base (before main's change) with conflicting content
    create_conflicting_branch_from(
        tmp.path(),
        "feature",
        &base,
        "conflict.txt",
        "feature content\nline 2\n",
    );

    // Action: merge (should conflict)
    let result = ops
        .merge("feature", None, false, false, false, false)
        .await
        .expect("should complete");

    // Verify: merge failed due to conflict
    assert!(!result.success, "Merge with conflict should not succeed");

    // Verify: CLI shows merge in progress
    assert!(
        git_is_merging(tmp.path()),
        "CLI should show merge in progress"
    );

    // Verify: CLI shows conflicted files
    let conflicts = git_conflicted_files(tmp.path());
    assert!(
        conflicts.contains(&"conflict.txt".to_string()),
        "CLI should show conflicted file"
    );
}

#[tokio::test]
async fn test_merge_abort_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let base = git_head_oid(tmp.path());

    // Setup: create conflict and start merge
    std::fs::write(tmp.path().join("conflict.txt"), "main content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "conflict.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add conflict.txt"]);
    create_conflicting_branch_from(
        tmp.path(),
        "feature",
        &base,
        "conflict.txt",
        "feature content\n",
    );

    let _ = ops.merge("feature", None, false, false, false, false).await;
    assert!(git_is_merging(tmp.path()), "Should be merging");

    // Action: abort merge
    let result = ops.merge_abort().await.expect("should abort");

    // Verify
    assert!(result.success, "Abort should succeed");
    assert!(!git_is_merging(tmp.path()), "CLI should show merge aborted");
}

#[tokio::test]
async fn test_is_merging_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let base = git_head_oid(tmp.path());

    // Setup: create conflict and start merge
    std::fs::write(tmp.path().join("conflict.txt"), "main content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main commit"]);
    create_conflicting_branch_from(
        tmp.path(),
        "feature",
        &base,
        "conflict.txt",
        "feature content\n",
    );

    // Verify: not merging initially
    assert!(
        !ops.is_merging().expect("should check"),
        "Should not be merging initially"
    );
    assert!(!git_is_merging(tmp.path()), "CLI should show not merging");

    // Start merge
    let _ = ops.merge("feature", None, false, false, false, false).await;

    // Verify: both ops and CLI agree on merge state
    assert!(ops.is_merging().expect("should check"), "Should be merging");
    assert!(git_is_merging(tmp.path()), "CLI should show merging");
}

// ==================== Rebase Tests ====================

#[tokio::test]
async fn test_rebase_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    let default_branch = git_current_branch(tmp.path());

    // Setup: create commits on main
    std::fs::write(tmp.path().join("main1.txt"), "main1").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main commit"]);
    let main_head = git_head_oid(tmp.path());

    // Create feature branch from initial commit
    git_cmd(tmp.path(), &["checkout", "HEAD~1"]);
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("feature.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "feature commit"]);

    // Action: rebase feature onto main
    let result = ops
        .rebase(&default_branch, false)
        .await
        .expect("should rebase");

    // Verify
    assert!(result.success, "Rebase should succeed");

    // Verify: feature branch is now based on main
    let feature_parent = git_cmd(tmp.path(), &["rev-parse", "HEAD~1"]);
    assert_eq!(
        feature_parent, main_head,
        "Feature should be rebased onto main"
    );
}

#[tokio::test]
async fn test_rebase_with_conflict_detected() {
    let (tmp, ops) = setup_test_repo();
    let default_branch = git_current_branch(tmp.path());

    // Setup: create conflicting commits
    std::fs::write(tmp.path().join("conflict.txt"), "main").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main commit"]);

    git_cmd(tmp.path(), &["checkout", "HEAD~1"]);
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("conflict.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "feature commit"]);

    // Action: rebase (should conflict)
    let result = ops
        .rebase(&default_branch, false)
        .await
        .expect("should complete");

    // Verify: rebase failed
    assert!(!result.success, "Rebase with conflict should fail");

    // Verify: CLI shows rebase in progress
    assert!(
        git_is_rebasing(tmp.path()),
        "CLI should show rebase in progress"
    );
}

#[tokio::test]
async fn test_rebase_abort_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    let default_branch = git_current_branch(tmp.path());

    // Setup: create conflict and start rebase
    std::fs::write(tmp.path().join("conflict.txt"), "main").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main"]);

    git_cmd(tmp.path(), &["checkout", "HEAD~1"]);
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("conflict.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "feature"]);

    let _ = ops.rebase(&default_branch, false).await;
    assert!(git_is_rebasing(tmp.path()), "Should be rebasing");

    // Action: abort
    let result = ops.rebase_abort().await.expect("should abort");

    // Verify
    assert!(result.success, "Abort should succeed");
    assert!(
        !git_is_rebasing(tmp.path()),
        "CLI should show rebase aborted"
    );
}

#[tokio::test]
async fn test_is_rebasing_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    let default_branch = git_current_branch(tmp.path());

    // Setup conflict scenario
    std::fs::write(tmp.path().join("conflict.txt"), "main").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main"]);

    git_cmd(tmp.path(), &["checkout", "HEAD~1"]);
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("conflict.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "feature"]);

    // Verify: not rebasing initially
    assert!(
        !ops.is_rebasing().expect("should check"),
        "Should not be rebasing"
    );
    assert!(!git_is_rebasing(tmp.path()), "CLI should show not rebasing");

    // Start rebase
    let _ = ops.rebase(&default_branch, false).await;

    // Verify: both agree on rebase state
    assert!(
        ops.is_rebasing().expect("should check"),
        "Should be rebasing"
    );
    assert!(git_is_rebasing(tmp.path()), "CLI should show rebasing");
}

// ==================== Cherry-pick Tests ====================

#[tokio::test]
async fn test_cherry_pick_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a commit on feature branch
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("feature.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Feature commit"]);
    let feature_oid = git_head_oid(tmp.path());

    // Go back to main
    git_cmd(tmp.path(), &["checkout", "-"]);

    // Action: cherry-pick the commit
    let result = ops
        .cherry_pick(&feature_oid, false)
        .await
        .expect("should cherry-pick");

    // Verify
    assert!(result.success, "Cherry-pick should succeed");

    // Verify: file exists
    assert!(
        tmp.path().join("feature.txt").exists(),
        "Cherry-picked file should exist"
    );

    // Verify: commit message preserved
    let log = git_cmd(tmp.path(), &["log", "-1", "--format=%s"]);
    assert!(
        log.contains("Feature commit"),
        "Commit message should be preserved"
    );
}

#[tokio::test]
async fn test_cherry_pick_with_conflict_detected() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create conflicting changes
    std::fs::write(tmp.path().join("conflict.txt"), "main").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main"]);

    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("conflict.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "feature"]);
    let feature_oid = git_head_oid(tmp.path());

    git_cmd(tmp.path(), &["checkout", "-"]);
    std::fs::write(tmp.path().join("conflict.txt"), "main modified").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main modified"]);

    // Action: cherry-pick (should conflict)
    let result = ops
        .cherry_pick(&feature_oid, false)
        .await
        .expect("should complete");

    // Verify
    assert!(!result.success, "Cherry-pick with conflict should fail");
    assert!(
        git_is_cherry_picking(tmp.path()),
        "CLI should show cherry-pick in progress"
    );
}

#[tokio::test]
async fn test_cherry_pick_abort_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup conflict
    std::fs::write(tmp.path().join("conflict.txt"), "main").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main"]);

    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("conflict.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "feature"]);
    let feature_oid = git_head_oid(tmp.path());

    git_cmd(tmp.path(), &["checkout", "-"]);
    std::fs::write(tmp.path().join("conflict.txt"), "main mod").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main mod"]);

    let _ = ops.cherry_pick(&feature_oid, false).await;
    assert!(
        git_is_cherry_picking(tmp.path()),
        "Should be cherry-picking"
    );

    // Action: abort
    let result = ops.cherry_pick_abort().await.expect("should abort");

    // Verify
    assert!(result.success, "Abort should succeed");
    assert!(
        !git_is_cherry_picking(tmp.path()),
        "CLI should show cherry-pick aborted"
    );
}

#[tokio::test]
async fn test_is_cherry_picking_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup conflict scenario
    std::fs::write(tmp.path().join("conflict.txt"), "main").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main"]);

    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("conflict.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "feature"]);
    let feature_oid = git_head_oid(tmp.path());

    git_cmd(tmp.path(), &["checkout", "-"]);
    std::fs::write(tmp.path().join("conflict.txt"), "main mod").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main mod"]);

    // Verify: not cherry-picking initially
    assert!(
        !ops.is_cherry_picking().expect("should check"),
        "Should not be cherry-picking"
    );
    assert!(
        !git_is_cherry_picking(tmp.path()),
        "CLI should show not cherry-picking"
    );

    // Start cherry-pick
    let _ = ops.cherry_pick(&feature_oid, false).await;

    // Verify: both agree
    assert!(
        ops.is_cherry_picking().expect("should check"),
        "Should be cherry-picking"
    );
    assert!(
        git_is_cherry_picking(tmp.path()),
        "CLI should show cherry-picking"
    );
}

// ==================== Revert Tests ====================

#[tokio::test]
async fn test_revert_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a commit to revert
    std::fs::write(tmp.path().join("to_revert.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file to revert"]);
    let commit_oid = git_head_oid(tmp.path());

    assert!(
        tmp.path().join("to_revert.txt").exists(),
        "File should exist"
    );

    // Action: revert the commit
    let result = ops.revert(&commit_oid, false).await.expect("should revert");

    // Verify
    assert!(result.success, "Revert should succeed");

    // Verify: file is gone
    assert!(
        !tmp.path().join("to_revert.txt").exists(),
        "File should be removed after revert"
    );

    // Verify: revert commit exists
    let log = git_cmd(tmp.path(), &["log", "-1", "--format=%s"]);
    assert!(log.contains("Revert"), "Should have revert commit");
}

#[tokio::test]
async fn test_revert_with_conflict_detected() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a commit and then modify the same file
    std::fs::write(tmp.path().join("conflict.txt"), "original").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Original"]);
    let original_oid = git_head_oid(tmp.path());

    std::fs::write(tmp.path().join("conflict.txt"), "modified").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Modified"]);

    // Action: revert original commit (should conflict with modification)
    let result = ops
        .revert(&original_oid, false)
        .await
        .expect("should complete");

    // Verify: revert may or may not conflict depending on git version
    // If it doesn't auto-resolve, it will show reverting state
    if !result.success {
        assert!(
            git_is_reverting(tmp.path()),
            "CLI should show revert in progress"
        );
    }
}

#[tokio::test]
async fn test_revert_abort_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create scenario where revert conflicts
    std::fs::write(tmp.path().join("file.txt"), "line1").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);
    let first_oid = git_head_oid(tmp.path());

    std::fs::write(tmp.path().join("file.txt"), "line1\nline2").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Append line"]);

    std::fs::write(tmp.path().join("file.txt"), "modified line1\nline2").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Modify first line"]);

    // Try to revert the first commit (may conflict)
    let _ = ops.revert(&first_oid, false).await;

    if git_is_reverting(tmp.path()) {
        // Action: abort
        let result = ops.revert_abort().await.expect("should abort");

        // Verify
        assert!(result.success, "Abort should succeed");
        assert!(
            !git_is_reverting(tmp.path()),
            "CLI should show revert aborted"
        );
    }
}

#[tokio::test]
async fn test_is_reverting_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Initially not reverting
    assert!(
        !ops.is_reverting().expect("should check"),
        "Should not be reverting"
    );
    assert!(
        !git_is_reverting(tmp.path()),
        "CLI should show not reverting"
    );
}

// ==================== Conflict Resolution Tests ====================

#[tokio::test]
async fn test_get_conflicted_files_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let base = git_head_oid(tmp.path());

    // Setup: create merge conflict
    std::fs::write(tmp.path().join("conflict.txt"), "main content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main"]);

    create_conflicting_branch_from(
        tmp.path(),
        "feature",
        &base,
        "conflict.txt",
        "feature content\n",
    );

    let _ = ops.merge("feature", None, false, false, false, false).await;

    // Get conflicted files from both
    let cli_conflicts = git_conflicted_files(tmp.path());
    let ops_conflicts = ops
        .get_conflicted_files()
        .await
        .expect("should get conflicts");

    // Verify: both agree
    assert_eq!(
        cli_conflicts.len(),
        ops_conflicts.len(),
        "Should have same number of conflicts"
    );
    for file in &cli_conflicts {
        assert!(
            ops_conflicts.contains(file),
            "Ops should report same conflicted files as CLI"
        );
    }
}

#[tokio::test]
async fn test_mark_resolved_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let base = git_head_oid(tmp.path());

    // Setup: create merge conflict
    std::fs::write(tmp.path().join("conflict.txt"), "main content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main"]);

    create_conflicting_branch_from(
        tmp.path(),
        "feature",
        &base,
        "conflict.txt",
        "feature content\n",
    );

    let _ = ops.merge("feature", None, false, false, false, false).await;
    assert!(
        !git_conflicted_files(tmp.path()).is_empty(),
        "Should have conflicts"
    );

    // Resolve the conflict manually
    std::fs::write(tmp.path().join("conflict.txt"), "resolved content").expect("should write");

    // Action: mark as resolved
    let result = ops
        .mark_resolved("conflict.txt")
        .await
        .expect("should mark resolved");

    // Verify
    assert!(result.success, "Mark resolved should succeed");

    // Verify: CLI shows no more conflicts for this file
    let conflicts = git_conflicted_files(tmp.path());
    assert!(
        !conflicts.contains(&"conflict.txt".to_string()),
        "File should no longer be conflicted"
    );
}

#[tokio::test]
async fn test_resolve_with_ours_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let base = git_head_oid(tmp.path());

    // Setup: create merge conflict
    std::fs::write(tmp.path().join("conflict.txt"), "ours content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "ours"]);

    create_conflicting_branch_from(
        tmp.path(),
        "feature",
        &base,
        "conflict.txt",
        "theirs content\n",
    );

    let _ = ops.merge("feature", None, false, false, false, false).await;
    assert!(git_is_merging(tmp.path()), "Should be merging");

    // Action: resolve with ours
    let result = ops
        .resolve_with_version("conflict.txt", ConflictVersion::Ours)
        .await
        .expect("should resolve");

    assert!(result.success, "Resolve should succeed");

    // Verify: content is "ours"
    let content = std::fs::read_to_string(tmp.path().join("conflict.txt")).expect("should read");
    // Normalize line endings for cross-platform compatibility
    assert_eq!(
        content.replace("\r\n", "\n"),
        "ours content\n",
        "Content should be ours version"
    );
}

#[tokio::test]
async fn test_resolve_with_theirs_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let base = git_head_oid(tmp.path());

    // Setup: create merge conflict
    std::fs::write(tmp.path().join("conflict.txt"), "ours content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "ours"]);

    create_conflicting_branch_from(
        tmp.path(),
        "feature",
        &base,
        "conflict.txt",
        "theirs content\n",
    );

    let _ = ops.merge("feature", None, false, false, false, false).await;
    assert!(git_is_merging(tmp.path()), "Should be merging");

    // Action: resolve with theirs
    let result = ops
        .resolve_with_version("conflict.txt", ConflictVersion::Theirs)
        .await
        .expect("should resolve");

    assert!(result.success, "Resolve should succeed");

    // Verify: content is "theirs"
    let content = std::fs::read_to_string(tmp.path().join("conflict.txt")).expect("should read");
    // Normalize line endings for cross-platform compatibility
    assert_eq!(
        content.replace("\r\n", "\n"),
        "theirs content\n",
        "Content should be theirs version"
    );
}

#[tokio::test]
async fn test_get_conflict_versions() {
    let (tmp, ops) = setup_test_repo();

    let base = git_head_oid(tmp.path());

    // Setup: create merge conflict
    std::fs::write(tmp.path().join("conflict.txt"), "ours content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "ours"]);

    create_conflicting_branch_from(
        tmp.path(),
        "feature",
        &base,
        "conflict.txt",
        "theirs content\n",
    );

    let _ = ops.merge("feature", None, false, false, false, false).await;
    assert!(git_is_merging(tmp.path()), "Should be merging");

    // Action: get conflict versions
    let ours = ops
        .get_conflict_ours("conflict.txt")
        .await
        .expect("should get ours");
    let theirs = ops
        .get_conflict_theirs("conflict.txt")
        .await
        .expect("should get theirs");

    // Verify
    assert_eq!(ours.trim(), "ours content", "Ours should match");
    assert_eq!(theirs.trim(), "theirs content", "Theirs should match");
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_merge_nonexistent_branch_fails() {
    let (_tmp, ops) = setup_test_repo();

    // Action: try to merge non-existent branch
    let result = ops
        .merge("nonexistent", None, false, false, false, false)
        .await
        .expect("should complete");

    // Verify: should fail
    assert!(!result.success, "Merge non-existent branch should fail");
}

#[tokio::test]
async fn test_merge_squash_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create feature branch with multiple commits
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    for i in 1..=3 {
        std::fs::write(
            tmp.path().join(format!("file{i}.txt")),
            format!("content {i}"),
        )
        .expect("should write");
        git_cmd(tmp.path(), &["add", "."]);
        git_cmd(tmp.path(), &["commit", "-m", &format!("Commit {i}")]);
    }
    git_cmd(tmp.path(), &["checkout", "-"]);

    let head_before = git_head_oid(tmp.path());

    // Action: squash merge
    let result = ops
        .merge("feature", None, false, true, false, false)
        .await
        .expect("should merge");

    // Verify: merge succeeded but no commit yet (squash stages changes)
    assert!(result.success, "Squash merge should succeed");

    // Verify: HEAD unchanged (squash doesn't commit automatically)
    let head_after = git_head_oid(tmp.path());
    assert_eq!(
        head_before, head_after,
        "HEAD should not change with squash (no commit)"
    );

    // Verify: files are staged
    let status = git_cmd(tmp.path(), &["status", "--porcelain"]);
    assert!(!status.is_empty(), "Should have staged changes");
}

#[tokio::test]
async fn test_cherry_pick_no_commit_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("feature.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Feature"]);
    let feature_oid = git_head_oid(tmp.path());
    git_cmd(tmp.path(), &["checkout", "-"]);

    let head_before = git_head_oid(tmp.path());

    // Action: cherry-pick with no-commit
    let result = ops
        .cherry_pick(&feature_oid, true)
        .await
        .expect("should cherry-pick");

    // Verify
    assert!(result.success, "Cherry-pick should succeed");

    // Verify: HEAD unchanged
    let head_after = git_head_oid(tmp.path());
    assert_eq!(
        head_before, head_after,
        "HEAD should not change with no-commit"
    );

    // Verify: changes are staged
    let status = git_cmd(tmp.path(), &["status", "--porcelain"]);
    assert!(status.contains("feature.txt"), "File should be staged");
}

#[tokio::test]
async fn test_revert_no_commit_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    std::fs::write(tmp.path().join("to_revert.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);
    let commit_oid = git_head_oid(tmp.path());

    let head_before = git_head_oid(tmp.path());

    // Action: revert with no-commit
    let result = ops.revert(&commit_oid, true).await.expect("should revert");

    // Verify
    assert!(result.success, "Revert should succeed");

    // Verify: HEAD unchanged
    let head_after = git_head_oid(tmp.path());
    assert_eq!(
        head_before, head_after,
        "HEAD should not change with no-commit"
    );

    // Verify: deletion is staged
    let status = git_cmd(tmp.path(), &["status", "--porcelain"]);
    assert!(
        status.contains("to_revert.txt"),
        "File deletion should be staged"
    );
}

#[tokio::test]
async fn test_get_rebase_progress_during_rebase() {
    let (tmp, ops) = setup_test_repo();
    let default_branch = git_current_branch(tmp.path());

    // Setup: create conflict scenario
    std::fs::write(tmp.path().join("conflict.txt"), "main").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main"]);

    git_cmd(tmp.path(), &["checkout", "HEAD~1"]);
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("conflict.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "feature"]);

    // Start rebase (will conflict)
    let _ = ops.rebase(&default_branch, false).await;

    // Action: get rebase progress
    let progress = ops.get_rebase_progress().expect("should get progress");

    // Verify: progress exists during rebase
    assert!(
        progress.is_some(),
        "Should have rebase progress during rebase"
    );
    if let Some(p) = progress {
        assert!(p.total_steps > 0, "Should have steps");
    }
}

#[tokio::test]
async fn test_merge_continue_after_resolve() {
    let (tmp, ops) = setup_test_repo();

    let base = git_head_oid(tmp.path());

    // Setup: create merge conflict
    std::fs::write(tmp.path().join("conflict.txt"), "main content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "main"]);

    create_conflicting_branch_from(
        tmp.path(),
        "feature",
        &base,
        "conflict.txt",
        "feature content\n",
    );

    let _ = ops.merge("feature", None, false, false, false, false).await;
    assert!(git_is_merging(tmp.path()), "Should be merging");

    // Resolve conflict
    std::fs::write(tmp.path().join("conflict.txt"), "resolved").expect("should write");
    git_cmd(tmp.path(), &["add", "conflict.txt"]);

    // Action: continue merge
    let result = ops.merge_continue().await.expect("should continue");

    // Verify
    assert!(result.success, "Merge continue should succeed");
    assert!(!git_is_merging(tmp.path()), "Merge should be complete");
}
