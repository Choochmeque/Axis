#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

use axis_lib::models::{AddWorktreeOptions, RemoveWorktreeOptions};

// ==================== Helpers ====================

/// Normalize path for cross-platform comparison
fn normalize_path(p: &str) -> String {
    // Replace backslashes with forward slashes and lowercase for Windows
    p.replace('\\', "/").to_lowercase()
}

/// List worktrees via CLI
fn git_worktree_list(path: &std::path::Path) -> Vec<String> {
    let output = git_cmd(path, &["worktree", "list", "--porcelain"]);
    output
        .lines()
        .filter(|line| line.starts_with("worktree "))
        .map(|line| line.strip_prefix("worktree ").unwrap_or(line).to_string())
        .collect()
}

/// Check if worktree exists via CLI
fn git_worktree_exists(path: &std::path::Path, worktree_path: &str) -> bool {
    let normalized_target = normalize_path(worktree_path);
    git_worktree_list(path).iter().any(|p| {
        let normalized_p = normalize_path(p);
        normalized_p == normalized_target || normalized_p.ends_with(&normalized_target)
    })
}

/// Check if worktree is locked via CLI
fn git_worktree_is_locked(path: &std::path::Path, worktree_path: &str) -> bool {
    let output = git_cmd(path, &["worktree", "list", "--porcelain"]);
    let normalized_target = normalize_path(worktree_path);
    let mut in_worktree = false;
    for line in output.lines() {
        if line.starts_with("worktree ") {
            let wt_path = line.strip_prefix("worktree ").unwrap_or(line);
            let normalized_wt = normalize_path(wt_path);
            if normalized_wt.contains(&normalized_target)
                || normalized_target.contains(&normalized_wt)
            {
                in_worktree = true;
            } else if in_worktree {
                // Moved to next worktree without finding "locked"
                return false;
            }
        } else if in_worktree && (line == "locked" || line.starts_with("locked ")) {
            return true;
        }
    }
    false
}

// ==================== worktree_list Tests ====================

#[tokio::test]
async fn test_worktree_list_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Get CLI worktree list (should have main worktree)
    let cli_list = git_worktree_list(tmp.path());
    assert!(!cli_list.is_empty(), "CLI should show main worktree");

    // Action: RepoOperations lists worktrees
    let worktrees = ops.worktree_list().await.expect("should list worktrees");

    // Verify: matches CLI count
    assert_eq!(
        worktrees.len(),
        cli_list.len(),
        "Should have same number of worktrees as CLI"
    );
}

#[tokio::test]
async fn test_worktree_list_main_has_branch() {
    let (_tmp, ops) = setup_test_repo();

    // Action: list worktrees
    let worktrees = ops.worktree_list().await.expect("should list worktrees");

    // Verify: main worktree has a branch
    assert!(!worktrees.is_empty(), "Should have at least main worktree");
    let main_wt = &worktrees[0];
    assert!(main_wt.branch.is_some(), "Main worktree should have branch");
}

// ==================== worktree_add Tests ====================

#[tokio::test]
async fn test_worktree_add_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Create a branch to checkout in the new worktree
    git_cmd(tmp.path(), &["branch", "feature"]);

    let wt_path = tmp.path().join("feature-wt");

    // Action: add worktree
    let options = AddWorktreeOptions {
        path: wt_path.to_str().expect("path").to_string(),
        branch: Some("feature".to_string()),
        create_branch: false,
        base: None,
        force: false,
        detach: false,
    };
    let result = ops
        .worktree_add(&options)
        .await
        .expect("should add worktree");

    // Verify: operation succeeded
    assert!(result.success, "Add worktree should succeed");

    // Verify: CLI sees the worktree
    assert!(
        git_worktree_exists(tmp.path(), wt_path.to_str().expect("path")),
        "CLI should see new worktree"
    );

    // Verify: worktree directory exists
    assert!(wt_path.exists(), "Worktree directory should exist");
}

#[tokio::test]
async fn test_worktree_add_creates_new_branch() {
    let (tmp, ops) = setup_test_repo();

    let wt_path = tmp.path().join("new-branch-wt");

    // Action: add worktree with new branch
    let options = AddWorktreeOptions {
        path: wt_path.to_str().expect("path").to_string(),
        branch: Some("new-feature".to_string()),
        create_branch: true,
        base: None,
        force: false,
        detach: false,
    };
    let result = ops
        .worktree_add(&options)
        .await
        .expect("should add worktree");

    assert!(result.success, "Add worktree should succeed");

    // Verify: CLI sees new worktree
    assert!(
        git_worktree_exists(tmp.path(), wt_path.to_str().expect("path")),
        "CLI should see new worktree"
    );

    // Verify: branch exists
    let branches = git_cmd(tmp.path(), &["branch", "--list"]);
    assert!(
        branches.contains("new-feature"),
        "New branch should be created"
    );
}

#[tokio::test]
async fn test_worktree_add_appears_in_list() {
    let (tmp, ops) = setup_test_repo();

    git_cmd(tmp.path(), &["branch", "test-branch"]);
    let wt_path = tmp.path().join("test-wt");

    let options = AddWorktreeOptions {
        path: wt_path.to_str().expect("path").to_string(),
        branch: Some("test-branch".to_string()),
        create_branch: false,
        base: None,
        force: false,
        detach: false,
    };
    let _ = ops.worktree_add(&options).await.expect("should add");

    // Action: list worktrees
    let worktrees = ops.worktree_list().await.expect("should list");

    // Verify: new worktree appears in list
    assert!(
        worktrees.iter().any(|w| w.path.contains("test-wt")),
        "New worktree should appear in list"
    );
}

#[tokio::test]
async fn test_worktree_add_detached_head() {
    let (tmp, ops) = setup_test_repo();

    let head_oid = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);
    let wt_path = tmp.path().join("detached-wt");

    // Action: add worktree at specific commit (detached HEAD)
    let options = AddWorktreeOptions {
        path: wt_path.to_str().expect("path").to_string(),
        branch: None,
        create_branch: false,
        base: Some(head_oid),
        force: false,
        detach: true,
    };
    let result = ops.worktree_add(&options).await.expect("should add");

    assert!(result.success, "Add detached worktree should succeed");

    // Verify: worktree exists
    assert!(wt_path.exists(), "Worktree should exist");
}

// ==================== worktree_remove Tests ====================

#[tokio::test]
async fn test_worktree_remove_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add a worktree
    git_cmd(tmp.path(), &["branch", "to-remove"]);
    let wt_path = tmp.path().join("remove-wt");
    git_cmd(
        tmp.path(),
        &[
            "worktree",
            "add",
            wt_path.to_str().expect("path"),
            "to-remove",
        ],
    );

    assert!(
        git_worktree_exists(tmp.path(), wt_path.to_str().expect("path")),
        "Worktree should exist before removal"
    );

    // Action: remove worktree
    let options = RemoveWorktreeOptions {
        path: wt_path.to_str().expect("path").to_string(),
        force: false,
    };
    let result = ops.worktree_remove(&options).await.expect("should remove");

    // Verify: operation succeeded
    assert!(result.success, "Remove worktree should succeed");

    // Verify: CLI no longer sees worktree
    assert!(
        !git_worktree_exists(tmp.path(), wt_path.to_str().expect("path")),
        "CLI should not see removed worktree"
    );
}

#[tokio::test]
async fn test_worktree_remove_force() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add a worktree with uncommitted changes
    git_cmd(tmp.path(), &["branch", "dirty"]);
    let wt_path = tmp.path().join("dirty-wt");
    git_cmd(
        tmp.path(),
        &["worktree", "add", wt_path.to_str().expect("path"), "dirty"],
    );

    // Create uncommitted change
    std::fs::write(wt_path.join("uncommitted.txt"), "dirty").expect("should write");

    // Action: force remove worktree
    let options = RemoveWorktreeOptions {
        path: wt_path.to_str().expect("path").to_string(),
        force: true,
    };
    let result = ops.worktree_remove(&options).await.expect("should remove");

    // Verify
    assert!(result.success, "Force remove should succeed");
    assert!(
        !git_worktree_exists(tmp.path(), wt_path.to_str().expect("path")),
        "Worktree should be removed"
    );
}

// ==================== worktree_lock/unlock Tests ====================

#[tokio::test]
async fn test_worktree_lock_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add a worktree
    git_cmd(tmp.path(), &["branch", "to-lock"]);
    let wt_path = tmp.path().join("lock-wt");
    git_cmd(
        tmp.path(),
        &[
            "worktree",
            "add",
            wt_path.to_str().expect("path"),
            "to-lock",
        ],
    );

    // Verify not locked initially
    assert!(
        !git_worktree_is_locked(tmp.path(), wt_path.to_str().expect("path")),
        "Worktree should not be locked initially"
    );

    // Action: lock worktree
    let result = ops
        .worktree_lock(wt_path.to_str().expect("path"), Some("test reason"))
        .await
        .expect("should lock");

    // Verify
    assert!(result.success, "Lock should succeed");
    assert!(
        git_worktree_is_locked(tmp.path(), wt_path.to_str().expect("path")),
        "CLI should show worktree as locked"
    );
}

#[tokio::test]
async fn test_worktree_unlock_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add and lock a worktree
    git_cmd(tmp.path(), &["branch", "to-unlock"]);
    let wt_path = tmp.path().join("unlock-wt");
    git_cmd(
        tmp.path(),
        &[
            "worktree",
            "add",
            wt_path.to_str().expect("path"),
            "to-unlock",
        ],
    );
    git_cmd(
        tmp.path(),
        &["worktree", "lock", wt_path.to_str().expect("path")],
    );

    assert!(
        git_worktree_is_locked(tmp.path(), wt_path.to_str().expect("path")),
        "Worktree should be locked"
    );

    // Action: unlock worktree
    let result = ops
        .worktree_unlock(wt_path.to_str().expect("path"))
        .await
        .expect("should unlock");

    // Verify
    assert!(result.success, "Unlock should succeed");
    assert!(
        !git_worktree_is_locked(tmp.path(), wt_path.to_str().expect("path")),
        "CLI should show worktree as unlocked"
    );
}

#[tokio::test]
async fn test_worktree_lock_without_reason() {
    let (tmp, ops) = setup_test_repo();

    git_cmd(tmp.path(), &["branch", "no-reason"]);
    let wt_path = tmp.path().join("no-reason-wt");
    git_cmd(
        tmp.path(),
        &[
            "worktree",
            "add",
            wt_path.to_str().expect("path"),
            "no-reason",
        ],
    );

    // Action: lock without reason
    let result = ops
        .worktree_lock(wt_path.to_str().expect("path"), None)
        .await
        .expect("should lock");

    assert!(result.success, "Lock without reason should succeed");
    assert!(
        git_worktree_is_locked(tmp.path(), wt_path.to_str().expect("path")),
        "Worktree should be locked"
    );
}

// ==================== worktree_prune Tests ====================

#[tokio::test]
async fn test_worktree_prune_dry_run() {
    let (_tmp, ops) = setup_test_repo();

    // Action: prune with dry run
    let result = ops.worktree_prune(true).await.expect("should prune");

    // Verify: operation completed (may or may not prune anything)
    assert!(result.success, "Prune dry run should succeed");
}

#[tokio::test]
async fn test_worktree_prune_removes_stale() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add a worktree then delete its directory
    git_cmd(tmp.path(), &["branch", "stale"]);
    let wt_path = tmp.path().join("stale-wt");
    git_cmd(
        tmp.path(),
        &["worktree", "add", wt_path.to_str().expect("path"), "stale"],
    );

    // Delete the worktree directory (making it stale)
    std::fs::remove_dir_all(&wt_path).expect("should remove dir");

    // Action: prune
    let result = ops.worktree_prune(false).await.expect("should prune");

    // Verify
    assert!(result.success, "Prune should succeed");

    // Verify: stale worktree is removed from list
    let worktrees = ops.worktree_list().await.expect("should list");
    assert!(
        !worktrees.iter().any(|w| w.path.contains("stale-wt")),
        "Stale worktree should be pruned"
    );
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_worktree_add_duplicate_path_fails() {
    let (tmp, ops) = setup_test_repo();

    git_cmd(tmp.path(), &["branch", "dup1"]);
    git_cmd(tmp.path(), &["branch", "dup2"]);
    let wt_path = tmp.path().join("dup-wt");

    // First add
    let options = AddWorktreeOptions {
        path: wt_path.to_str().expect("path").to_string(),
        branch: Some("dup1".to_string()),
        create_branch: false,
        base: None,
        force: false,
        detach: false,
    };
    let _ = ops.worktree_add(&options).await.expect("should add first");

    // Second add to same path
    let options2 = AddWorktreeOptions {
        path: wt_path.to_str().expect("path").to_string(),
        branch: Some("dup2".to_string()),
        create_branch: false,
        base: None,
        force: false,
        detach: false,
    };
    let result = ops.worktree_add(&options2).await;

    // Should fail (path already exists)
    assert!(
        result.is_err() || !result.expect("result").success,
        "Adding worktree to existing path should fail"
    );
}

#[tokio::test]
async fn test_worktree_remove_nonexistent_fails() {
    let (_tmp, ops) = setup_test_repo();

    let options = RemoveWorktreeOptions {
        path: "/nonexistent/path".to_string(),
        force: false,
    };
    let result = ops.worktree_remove(&options).await;

    // Should fail
    assert!(
        result.is_err() || !result.expect("result").success,
        "Removing nonexistent worktree should fail"
    );
}

#[tokio::test]
async fn test_worktree_cli_add_read_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: CLI adds worktree
    git_cmd(tmp.path(), &["branch", "cli-branch"]);
    let wt_path = tmp.path().join("cli-wt");
    git_cmd(
        tmp.path(),
        &[
            "worktree",
            "add",
            wt_path.to_str().expect("path"),
            "cli-branch",
        ],
    );

    // Action: RepoOperations reads worktrees
    let worktrees = ops.worktree_list().await.expect("should list");

    // Verify: sees CLI-created worktree
    assert!(
        worktrees.iter().any(|w| w.path.contains("cli-wt")),
        "Should see CLI-created worktree"
    );

    // Verify: has correct branch
    let cli_wt = worktrees.iter().find(|w| w.path.contains("cli-wt"));
    assert!(cli_wt.is_some(), "Should find CLI worktree");
    assert_eq!(
        cli_wt.expect("worktree").branch.as_deref(),
        Some("cli-branch"),
        "Should have correct branch"
    );
}

#[tokio::test]
async fn test_worktree_multiple_list() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add multiple worktrees
    for i in 1..=3 {
        git_cmd(tmp.path(), &["branch", &format!("branch{i}")]);
        let wt_path = tmp.path().join(format!("wt{i}"));
        git_cmd(
            tmp.path(),
            &[
                "worktree",
                "add",
                wt_path.to_str().expect("path"),
                &format!("branch{i}"),
            ],
        );
    }

    // Get CLI count
    let cli_list = git_worktree_list(tmp.path());

    // Action: RepoOperations lists
    let worktrees = ops.worktree_list().await.expect("should list");

    // Verify: same count (main + 3 added)
    assert_eq!(
        worktrees.len(),
        cli_list.len(),
        "Should match CLI worktree count"
    );
    assert_eq!(worktrees.len(), 4, "Should have 4 worktrees (main + 3)");
}

#[tokio::test]
async fn test_worktree_has_correct_head() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add worktree at specific commit
    git_cmd(tmp.path(), &["branch", "head-test"]);
    let wt_path = tmp.path().join("head-wt");
    git_cmd(
        tmp.path(),
        &[
            "worktree",
            "add",
            wt_path.to_str().expect("path"),
            "head-test",
        ],
    );

    // Get CLI HEAD for worktree
    let cli_head = git_cmd(&wt_path, &["rev-parse", "HEAD"]);

    // Action: list worktrees
    let worktrees = ops.worktree_list().await.expect("should list");

    // Verify: has correct head_oid
    let wt = worktrees.iter().find(|w| w.path.contains("head-wt"));
    assert!(wt.is_some(), "Should find worktree");
    assert_eq!(
        wt.expect("worktree").head_oid,
        cli_head,
        "HEAD OID should match CLI"
    );
}
