#![cfg(feature = "integration")]

mod common;

use common::{git_branch_exists, git_branch_list, git_cmd, git_current_branch, setup_test_repo};

use axis_lib::models::{BranchFilter, BranchType, CheckoutOptions, CreateBranchOptions};

// ==================== Happy Path Tests ====================

#[tokio::test]
async fn test_create_branch_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Action: RepoOperations creates branch
    ops.create_branch("feature-x", &CreateBranchOptions::default())
        .await
        .expect("should create branch");

    // Verify: git CLI sees the branch
    assert!(
        git_branch_exists(tmp.path(), "feature-x"),
        "CLI should see branch created by RepoOperations"
    );
}

#[tokio::test]
async fn test_cli_branch_read_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: git CLI creates branch
    git_cmd(tmp.path(), &["branch", "cli-branch"]);

    // Verify: RepoOperations sees the branch
    let filter = BranchFilter {
        include_local: true,
        include_remote: false,
    };
    let branches = ops
        .list_branches(filter)
        .await
        .expect("should list branches");
    assert!(
        branches.iter().any(|b| b.name == "cli-branch"),
        "RepoOperations should see branch created by CLI"
    );
}

#[tokio::test]
async fn test_checkout_branch_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    git_cmd(tmp.path(), &["branch", "feature"]);

    // Action: RepoOperations checkouts branch
    ops.checkout_branch("feature", &CheckoutOptions::default())
        .await
        .expect("should checkout");

    // Verify: git CLI shows correct current branch
    assert_eq!(
        git_current_branch(tmp.path()),
        "feature",
        "CLI should show branch checked out by RepoOperations"
    );
}

#[tokio::test]
async fn test_delete_branch_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    git_cmd(tmp.path(), &["branch", "to-delete"]);

    // Action: RepoOperations deletes branch
    ops.delete_branch("to-delete", false)
        .await
        .expect("should delete branch");

    // Verify: git CLI confirms branch gone
    assert!(
        !git_branch_exists(tmp.path(), "to-delete"),
        "CLI should not see branch deleted by RepoOperations"
    );
}

#[tokio::test]
async fn test_rename_branch_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    git_cmd(tmp.path(), &["branch", "old-name"]);

    // Action: RepoOperations renames branch
    ops.rename_branch("old-name", "new-name", false)
        .await
        .expect("should rename branch");

    // Verify: git CLI shows new name, not old
    let branches = git_branch_list(tmp.path());
    assert!(
        branches.contains(&"new-name".to_string()),
        "CLI should see renamed branch"
    );
    assert!(
        !branches.contains(&"old-name".to_string()),
        "CLI should not see old branch name"
    );
}

#[tokio::test]
async fn test_compare_branches() {
    let (tmp, ops) = setup_test_repo();
    let default_branch = git_current_branch(tmp.path());

    // Setup: create divergent branches
    git_cmd(tmp.path(), &["checkout", "-b", "feature"]);
    std::fs::write(tmp.path().join("feature.txt"), "feature").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Feature commit"]);
    git_cmd(tmp.path(), &["checkout", &default_branch]);

    // Action: compare branches
    let result = ops
        .compare_branches(&default_branch, "feature")
        .await
        .expect("should compare");

    // Verify: feature branch has commits that default doesn't (behind_commits)
    // Note: "behind_commits" = commits in compare (feature) not in base (default)
    assert!(
        !result.behind_commits.is_empty(),
        "feature should have commits that default branch doesn't have"
    );
}

// ==================== Edge Case Tests ====================

#[tokio::test]
async fn test_create_branch_already_exists() {
    let (tmp, ops) = setup_test_repo();
    git_cmd(tmp.path(), &["branch", "existing"]);

    // Action: try to create duplicate
    let result = ops
        .create_branch("existing", &CreateBranchOptions::default())
        .await;

    // Verify: should fail
    assert!(result.is_err(), "Creating duplicate branch should fail");
}

#[tokio::test]
async fn test_delete_current_branch_fails() {
    let (tmp, ops) = setup_test_repo();
    let current = git_current_branch(tmp.path());

    // Action: try to delete current branch
    let result = ops.delete_branch(&current, false).await;

    // Verify: should fail
    assert!(result.is_err(), "Deleting current branch should fail");
}

#[tokio::test]
async fn test_checkout_nonexistent_branch() {
    let (_tmp, ops) = setup_test_repo();

    // Action: try to checkout non-existent branch
    let result = ops
        .checkout_branch("nonexistent", &CheckoutOptions::default())
        .await;

    // Verify: should fail
    assert!(result.is_err(), "Checkout nonexistent branch should fail");
}

#[tokio::test]
async fn test_branch_with_special_chars() {
    let (tmp, ops) = setup_test_repo();

    // Action: create branch with slashes and dashes
    ops.create_branch("feature/foo-bar_123", &CreateBranchOptions::default())
        .await
        .expect("should create branch with special chars");

    // Verify
    assert!(
        git_branch_exists(tmp.path(), "feature/foo-bar_123"),
        "Branch with special chars should exist"
    );
}

#[tokio::test]
async fn test_get_branch() {
    let (tmp, ops) = setup_test_repo();
    git_cmd(tmp.path(), &["branch", "test-branch"]);

    // Action: get specific branch
    let branch = ops
        .get_branch("test-branch", BranchType::Local)
        .await
        .expect("should get branch");

    // Verify
    assert_eq!(branch.name, "test-branch");
}

#[tokio::test]
async fn test_set_branch_upstream() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create bare repo and add as remote
    let bare_path = tmp.path().join("bare.git");
    git_cmd(
        tmp.path(),
        &["clone", "--bare", ".", bare_path.to_str().expect("path")],
    );
    git_cmd(
        tmp.path(),
        &["remote", "add", "origin", bare_path.to_str().expect("path")],
    );
    git_cmd(tmp.path(), &["push", "-u", "origin", "HEAD"]);

    let default_branch = git_current_branch(tmp.path());

    // Action: set upstream
    let result = ops
        .set_branch_upstream(&default_branch, Some(&format!("origin/{default_branch}")))
        .await;

    // Verify
    assert!(result.is_ok(), "Setting upstream should succeed");
}
