#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

// ==================== Helpers ====================

/// List remotes via CLI
fn git_remote_list(path: &std::path::Path) -> Vec<String> {
    let output = git_cmd(path, &["remote"]);
    if output.is_empty() {
        return Vec::new();
    }
    output.lines().map(|s| s.to_string()).collect()
}

/// Get remote URL via CLI
fn git_remote_url(path: &std::path::Path, name: &str) -> Option<String> {
    let output = git_cmd(path, &["remote", "get-url", name]);
    if output.is_empty() {
        None
    } else {
        Some(output)
    }
}

/// Get remote push URL via CLI
fn git_remote_push_url(path: &std::path::Path, name: &str) -> Option<String> {
    let output = git_cmd(path, &["remote", "get-url", "--push", name]);
    if output.is_empty() {
        None
    } else {
        Some(output)
    }
}

/// Check if remote exists via CLI
fn git_remote_exists(path: &std::path::Path, name: &str) -> bool {
    git_remote_list(path).contains(&name.to_string())
}

// ==================== Happy Path Tests ====================

#[tokio::test]
async fn test_add_remote_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Action: RepoOperations adds remote
    ops.add_remote("origin", "https://github.com/test/repo.git")
        .await
        .expect("should add remote");

    // Verify: CLI sees the remote
    assert!(
        git_remote_exists(tmp.path(), "origin"),
        "CLI should see remote added by RepoOperations"
    );

    let url = git_remote_url(tmp.path(), "origin");
    assert_eq!(
        url,
        Some("https://github.com/test/repo.git".to_string()),
        "Remote URL should match"
    );
}

#[tokio::test]
async fn test_cli_remote_read_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: CLI adds remote
    git_cmd(
        tmp.path(),
        &["remote", "add", "origin", "https://example.com/repo.git"],
    );

    // Verify: RepoOperations sees the remote
    let remotes = ops.list_remotes().await.expect("should list remotes");
    assert!(
        remotes.iter().any(|r| r.name == "origin"),
        "RepoOperations should see CLI remote"
    );

    let remote = ops.get_remote("origin").await.expect("should get remote");
    assert_eq!(remote.url, Some("https://example.com/repo.git".to_string()));
}

#[tokio::test]
async fn test_remove_remote_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add remote via CLI
    git_cmd(
        tmp.path(),
        &["remote", "add", "origin", "https://example.com/repo.git"],
    );
    assert!(git_remote_exists(tmp.path(), "origin"));

    // Action: RepoOperations removes remote
    ops.remove_remote("origin")
        .await
        .expect("should remove remote");

    // Verify: CLI confirms remote gone
    assert!(
        !git_remote_exists(tmp.path(), "origin"),
        "CLI should not see removed remote"
    );
}

#[tokio::test]
async fn test_rename_remote_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add remote via CLI
    git_cmd(
        tmp.path(),
        &["remote", "add", "old-name", "https://example.com/repo.git"],
    );

    // Action: RepoOperations renames remote
    ops.rename_remote("old-name", "new-name")
        .await
        .expect("should rename remote");

    // Verify: CLI sees new name, not old
    assert!(
        git_remote_exists(tmp.path(), "new-name"),
        "CLI should see new remote name"
    );
    assert!(
        !git_remote_exists(tmp.path(), "old-name"),
        "CLI should not see old remote name"
    );
}

#[tokio::test]
async fn test_set_remote_url_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add remote via CLI
    git_cmd(
        tmp.path(),
        &["remote", "add", "origin", "https://old-url.com/repo.git"],
    );

    // Action: RepoOperations changes URL
    ops.set_remote_url("origin", "https://new-url.com/repo.git")
        .await
        .expect("should set remote url");

    // Verify: CLI sees new URL
    let url = git_remote_url(tmp.path(), "origin");
    assert_eq!(
        url,
        Some("https://new-url.com/repo.git".to_string()),
        "Remote URL should be updated"
    );
}

#[tokio::test]
async fn test_set_remote_push_url_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add remote via CLI
    git_cmd(
        tmp.path(),
        &["remote", "add", "origin", "https://fetch-url.com/repo.git"],
    );

    // Action: RepoOperations sets separate push URL
    ops.set_remote_push_url("origin", "https://push-url.com/repo.git")
        .await
        .expect("should set remote push url");

    // Verify: CLI sees different push URL
    let push_url = git_remote_push_url(tmp.path(), "origin");
    assert_eq!(
        push_url,
        Some("https://push-url.com/repo.git".to_string()),
        "Remote push URL should be set"
    );

    // Fetch URL should remain unchanged
    let fetch_url = git_remote_url(tmp.path(), "origin");
    assert_eq!(
        fetch_url,
        Some("https://fetch-url.com/repo.git".to_string()),
        "Fetch URL should remain unchanged"
    );
}

#[tokio::test]
async fn test_list_remotes_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add multiple remotes via CLI
    git_cmd(
        tmp.path(),
        &["remote", "add", "origin", "https://origin.com/repo.git"],
    );
    git_cmd(
        tmp.path(),
        &["remote", "add", "upstream", "https://upstream.com/repo.git"],
    );
    git_cmd(
        tmp.path(),
        &["remote", "add", "fork", "https://fork.com/repo.git"],
    );

    let cli_remotes = git_remote_list(tmp.path());

    // Action: RepoOperations lists remotes
    let ops_remotes = ops.list_remotes().await.expect("should list remotes");

    // Verify: same count and names
    assert_eq!(ops_remotes.len(), cli_remotes.len());
    for name in &cli_remotes {
        assert!(
            ops_remotes.iter().any(|r| &r.name == name),
            "Should find remote: {name}"
        );
    }
}

#[tokio::test]
async fn test_get_remote_fields_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add remote via CLI with specific URL
    let url = "https://github.com/test/repo.git";
    git_cmd(tmp.path(), &["remote", "add", "origin", url]);

    // Action: RepoOperations gets remote details
    let remote = ops.get_remote("origin").await.expect("should get remote");

    // Verify: fields match CLI
    assert_eq!(remote.name, "origin");
    assert_eq!(remote.url, Some(url.to_string()));
}

// ==================== Local Fetch/Push Tests (using bare repo) ====================

#[tokio::test]
async fn test_fetch_from_local_remote_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Get current branch name
    let branch = git_cmd(tmp.path(), &["rev-parse", "--abbrev-ref", "HEAD"]);

    // Setup: create bare repo as "remote"
    let bare_path = tmp.path().join("bare.git");
    git_cmd(
        tmp.path(),
        &["clone", "--bare", ".", bare_path.to_str().expect("path")],
    );
    git_cmd(
        tmp.path(),
        &["remote", "add", "origin", bare_path.to_str().expect("path")],
    );

    // Initial fetch to set up tracking
    git_cmd(tmp.path(), &["fetch", "origin"]);

    // Create a commit in the bare repo (simulate remote changes)
    let clone_path = tmp.path().join("clone");
    git_cmd(
        tmp.path(),
        &[
            "clone",
            bare_path.to_str().expect("path"),
            clone_path.to_str().expect("path"),
        ],
    );
    git_cmd(&clone_path, &["config", "user.email", "test@test.com"]);
    git_cmd(&clone_path, &["config", "user.name", "Test"]);
    std::fs::write(clone_path.join("remote-file.txt"), "remote content").expect("should write");
    git_cmd(&clone_path, &["add", "."]);
    git_cmd(&clone_path, &["commit", "-m", "Remote commit"]);
    git_cmd(&clone_path, &["push"]);

    // Get remote branch ref before fetch
    let remote_ref = format!("origin/{branch}");
    let remote_head_before = git_cmd(tmp.path(), &["rev-parse", &remote_ref]);

    // Action: RepoOperations fetches
    let result: Result<axis_lib::models::FetchResult, _> = ops
        .fetch::<fn(&git2::Progress<'_>) -> bool>("origin", &Default::default(), None, None, None)
        .await;
    assert!(result.is_ok(), "Fetch should succeed");

    // Verify: CLI sees updated remote tracking branch
    let remote_head_after = git_cmd(tmp.path(), &["rev-parse", &remote_ref]);
    assert_ne!(
        remote_head_before, remote_head_after,
        "Remote tracking branch should be updated after fetch"
    );
}

#[tokio::test]
async fn test_push_to_local_remote_verified_by_cli() {
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

    // Get current branch name
    let branch = git_cmd(tmp.path(), &["rev-parse", "--abbrev-ref", "HEAD"]);

    // Setup tracking
    git_cmd(tmp.path(), &["push", "-u", "origin", &branch]);

    // Create new commit
    std::fs::write(tmp.path().join("new-file.txt"), "new content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "New local commit"]);

    let local_head = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);

    // Action: RepoOperations pushes
    let result = ops
        .push::<fn(usize, usize, usize) -> bool>(
            "origin",
            &[format!("refs/heads/{branch}:refs/heads/{branch}")],
            &Default::default(),
            None,
            None,
        )
        .await;
    assert!(result.is_ok(), "Push should succeed");

    // Verify: bare repo has the commit
    let bare_head = git_cmd(&bare_path, &["rev-parse", "HEAD"]);
    assert_eq!(local_head, bare_head, "Bare repo should have pushed commit");
}

// ==================== Edge Case Tests ====================

#[tokio::test]
async fn test_list_remotes_empty() {
    let (_tmp, ops) = setup_test_repo();

    // Action: list remotes on repo with no remotes
    let remotes = ops.list_remotes().await.expect("should list remotes");

    // Verify: empty list
    assert!(remotes.is_empty(), "New repo should have no remotes");
}

#[tokio::test]
async fn test_add_remote_already_exists_fails() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add remote via CLI
    git_cmd(
        tmp.path(),
        &["remote", "add", "origin", "https://example.com/repo.git"],
    );

    // Action: try to add same remote name
    let result = ops.add_remote("origin", "https://other.com/repo.git").await;

    // Verify: should fail
    assert!(result.is_err(), "Adding duplicate remote should fail");
}

#[tokio::test]
async fn test_get_nonexistent_remote_fails() {
    let (_tmp, ops) = setup_test_repo();

    // Action: try to get non-existent remote
    let result = ops.get_remote("nonexistent").await;

    // Verify: should fail
    assert!(result.is_err(), "Getting non-existent remote should fail");
}

#[tokio::test]
async fn test_remove_nonexistent_remote_fails() {
    let (_tmp, ops) = setup_test_repo();

    // Action: try to remove non-existent remote
    let result = ops.remove_remote("nonexistent").await;

    // Verify: should fail
    assert!(result.is_err(), "Removing non-existent remote should fail");
}

#[tokio::test]
async fn test_remote_with_special_url() {
    let (tmp, ops) = setup_test_repo();

    // Action: add remote with SSH URL
    ops.add_remote("ssh-remote", "git@github.com:user/repo.git")
        .await
        .expect("should add ssh remote");

    // Verify: CLI sees correct URL
    let url = git_remote_url(tmp.path(), "ssh-remote");
    assert_eq!(url, Some("git@github.com:user/repo.git".to_string()));
}
