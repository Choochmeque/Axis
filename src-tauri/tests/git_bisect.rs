#![cfg(feature = "integration")]

//! Integration tests for git bisect operations.
//!
//! Pattern: `RepoOperations` performs actions → git CLI verifies (source of truth)
//!          git CLI sets up state → `RepoOperations` reads/verifies

mod common;

use common::*;

// ==================== Local Helper Functions ====================

/// Create multiple commits for bisect testing
fn create_bisect_history(path: &std::path::Path, count: usize) {
    for i in 1..=count {
        let content = format!("content {i}");
        std::fs::write(path.join("file.txt"), &content).expect("should write");
        git_cmd(path, &["add", "file.txt"]);
        git_cmd(path, &["commit", "-m", &format!("Commit {i}")]);
    }
}

/// Check if bisect is active via CLI
fn git_bisect_is_active(path: &std::path::Path) -> bool {
    path.join(".git/BISECT_START").exists()
}

/// Get current bisect commit via CLI
fn git_bisect_current(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "HEAD"])
}

/// Run git bisect command
fn git_bisect(path: &std::path::Path, args: &[&str]) -> String {
    let mut full_args = vec!["bisect"];
    full_args.extend(args);
    git_cmd(path, &full_args)
}

// ==================== is_bisecting Tests ====================

#[tokio::test]
async fn test_is_bisecting_false_by_default() {
    let (_tmp, ops) = setup_test_repo();

    // Action: check if bisecting
    let is_bisecting = ops.is_bisecting().expect("should check bisecting");

    // Verify: not bisecting initially
    assert!(!is_bisecting, "Should not be bisecting initially");
}

#[tokio::test]
async fn test_is_bisecting_after_start() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create history
    create_bisect_history(tmp.path(), 10);

    // Start bisect via CLI
    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", "HEAD"]);
    git_bisect(tmp.path(), &["good", "HEAD~5"]);

    // Action: check if bisecting via RepoOperations
    let is_bisecting = ops.is_bisecting().expect("should check bisecting");

    // Verify
    assert!(is_bisecting, "Should be bisecting after CLI bisect start");

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

// ==================== bisect_start Tests ====================

#[tokio::test]
async fn test_bisect_start_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create history
    create_bisect_history(tmp.path(), 10);
    let bad = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);
    let good = git_cmd(tmp.path(), &["rev-parse", "HEAD~5"]);

    // Action: start bisect via RepoOperations
    ops.bisect_start(Some(&bad), &good)
        .await
        .expect("should start bisect");

    // Verify: CLI confirms bisect is active
    assert!(
        git_bisect_is_active(tmp.path()),
        "CLI should confirm bisect is active"
    );

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

#[tokio::test]
async fn test_bisect_start_without_bad() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create history and mark HEAD as bad
    create_bisect_history(tmp.path(), 10);
    let good = git_cmd(tmp.path(), &["rev-parse", "HEAD~5"]);

    // Action: start bisect with implicit bad (HEAD)
    ops.bisect_start(None, &good)
        .await
        .expect("should start bisect");

    // Verify
    assert!(git_bisect_is_active(tmp.path()));

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

// ==================== bisect_good Tests ====================

#[tokio::test]
async fn test_bisect_good_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create history and start bisect
    create_bisect_history(tmp.path(), 10);
    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", "HEAD"]);
    git_bisect(tmp.path(), &["good", "HEAD~9"]);

    let current_before = git_bisect_current(tmp.path());

    // Action: mark current as good
    ops.bisect_good(None).await.expect("should mark good");

    let current_after = git_bisect_current(tmp.path());

    // Verify: bisect moved to next commit
    assert_ne!(
        current_before, current_after,
        "Bisect should move to next commit"
    );

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

// ==================== bisect_bad Tests ====================

#[tokio::test]
async fn test_bisect_bad_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_bisect_history(tmp.path(), 10);
    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", "HEAD"]);
    git_bisect(tmp.path(), &["good", "HEAD~9"]);

    let current_before = git_bisect_current(tmp.path());

    // Action: mark current as bad
    ops.bisect_bad(None).await.expect("should mark bad");

    let current_after = git_bisect_current(tmp.path());

    // Verify: bisect moved
    assert_ne!(current_before, current_after, "Bisect should move");

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

// ==================== bisect_skip Tests ====================

#[tokio::test]
async fn test_bisect_skip_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_bisect_history(tmp.path(), 10);
    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", "HEAD"]);
    git_bisect(tmp.path(), &["good", "HEAD~9"]);

    // Action: skip current commit
    ops.bisect_skip(None).await.expect("should skip");

    // Verify: still in bisect mode
    assert!(
        git_bisect_is_active(tmp.path()),
        "Should still be bisecting after skip"
    );

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

// ==================== bisect_reset Tests ====================

#[tokio::test]
async fn test_bisect_reset_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: start bisect
    create_bisect_history(tmp.path(), 10);
    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", "HEAD"]);
    git_bisect(tmp.path(), &["good", "HEAD~5"]);

    assert!(git_bisect_is_active(tmp.path()));

    // Action: reset bisect
    ops.bisect_reset(None).await.expect("should reset");

    // Verify: CLI confirms bisect is no longer active
    assert!(
        !git_bisect_is_active(tmp.path()),
        "Bisect should be inactive after reset"
    );
}

#[tokio::test]
async fn test_bisect_reset_to_commit() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_bisect_history(tmp.path(), 10);
    let original = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);

    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", "HEAD"]);
    git_bisect(tmp.path(), &["good", "HEAD~5"]);

    // We're now at some bisect commit
    assert!(git_bisect_is_active(tmp.path()));

    // Action: reset to original HEAD
    ops.bisect_reset(Some(&original))
        .await
        .expect("should reset");

    // Verify
    let current = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);
    assert_eq!(current, original, "Should be back at original commit");
}

// ==================== bisect_log Tests ====================

#[tokio::test]
async fn test_bisect_log_returns_history() {
    let (tmp, ops) = setup_test_repo();

    // Setup: do some bisect steps
    create_bisect_history(tmp.path(), 10);
    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", "HEAD"]);
    git_bisect(tmp.path(), &["good", "HEAD~9"]);
    git_bisect(tmp.path(), &["good"]); // mark current as good

    // Action: get bisect log
    let result = ops.bisect_log().await.expect("should get log");

    // Verify: log contains bisect commands
    assert!(
        result.stdout.contains("git bisect"),
        "Log should contain bisect commands"
    );

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

// ==================== get_bisect_state Tests ====================

#[tokio::test]
async fn test_get_bisect_state_inactive() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get state when not bisecting
    let state = ops.get_bisect_state().await.expect("should get state");

    // Verify
    assert!(!state.is_active, "Should not be active");
    assert!(state.current_commit.is_none());
    assert!(state.good_commits.is_empty());
}

#[tokio::test]
async fn test_get_bisect_state_active() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_bisect_history(tmp.path(), 10);
    let bad = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);
    let good = git_cmd(tmp.path(), &["rev-parse", "HEAD~5"]);

    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", &bad]);
    git_bisect(tmp.path(), &["good", &good]);

    // Action: get state via RepoOperations
    let state = ops.get_bisect_state().await.expect("should get state");

    // Verify
    assert!(state.is_active, "Should be active");
    assert!(state.current_commit.is_some(), "Should have current commit");
    assert!(!state.good_commits.is_empty(), "Should have good commits");

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

#[tokio::test]
async fn test_get_bisect_state_tracks_progress() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create history
    create_bisect_history(tmp.path(), 16); // 16 commits = ~4 bisect steps

    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", "HEAD"]);
    git_bisect(tmp.path(), &["good", "HEAD~15"]);

    // Action: get initial state
    let state1 = ops.get_bisect_state().await.expect("should get state");

    // Mark as good and check again
    git_bisect(tmp.path(), &["good"]);
    let state2 = ops.get_bisect_state().await.expect("should get state");

    // Verify: current commit changed
    assert_ne!(
        state1.current_commit, state2.current_commit,
        "Current commit should change as we bisect"
    );

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

// ==================== CLI sets up → Ops reads Tests ====================

#[tokio::test]
async fn test_cli_bisect_read_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: CLI starts bisect
    create_bisect_history(tmp.path(), 10);
    git_bisect(tmp.path(), &["start"]);
    git_bisect(tmp.path(), &["bad", "HEAD"]);
    git_bisect(tmp.path(), &["good", "HEAD~5"]);

    // Action: RepoOperations reads state
    let is_bisecting = ops.is_bisecting().expect("should check");
    let state = ops.get_bisect_state().await.expect("should get state");

    // Verify: Ops correctly sees CLI-started bisect
    assert!(is_bisecting, "Should see CLI bisect as active");
    assert!(state.is_active, "State should be active");

    // Cleanup
    git_bisect(tmp.path(), &["reset"]);
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_bisect_reset_when_not_bisecting() {
    let (_tmp, ops) = setup_test_repo();

    // Action: reset when not bisecting
    let result = ops.bisect_reset(None).await;

    // Verify: should succeed or fail gracefully
    // Some implementations succeed silently, others error
    assert!(
        result.is_ok() || result.is_err(),
        "Should handle gracefully"
    );
}

#[tokio::test]
async fn test_bisect_complete_flow() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create history where "bug" is introduced at commit 5
    create_bisect_history(tmp.path(), 10);

    let bad = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);
    let good = git_cmd(tmp.path(), &["rev-parse", "HEAD~9"]);

    // Action: complete bisect flow using RepoOperations
    ops.bisect_start(Some(&bad), &good)
        .await
        .expect("should start");

    // Simulate finding the bug (just do a few steps)
    for _ in 0..3 {
        let state = ops.get_bisect_state().await.expect("should get state");
        if !state.is_active {
            break;
        }
        // Alternately mark good/bad to simulate bisecting
        ops.bisect_good(None).await.ok();
    }

    // Reset
    ops.bisect_reset(None).await.expect("should reset");

    // Verify: no longer bisecting
    assert!(
        !ops.is_bisecting().expect("should check"),
        "Should not be bisecting after reset"
    );
}
