#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

use axis_lib::models::LogOptions;

// ==================== Helpers ====================

/// Get current branch via CLI
fn git_current_branch(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "--abbrev-ref", "HEAD"])
}

/// Get HEAD OID via CLI
fn git_head_oid(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "HEAD"])
}

/// Get repo root path via CLI
fn git_repo_root(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "--show-toplevel"])
}

/// Get user name from config via CLI
fn git_config_user_name(path: &std::path::Path) -> Option<String> {
    let output = git_cmd(path, &["config", "--local", "--get", "user.name"]);
    if output.is_empty() {
        None
    } else {
        Some(output)
    }
}

/// Get user email from config via CLI
fn git_config_user_email(path: &std::path::Path) -> Option<String> {
    let output = git_cmd(path, &["config", "--local", "--get", "user.email"]);
    if output.is_empty() {
        None
    } else {
        Some(output)
    }
}

/// Get commit count via CLI
fn git_commit_count(path: &std::path::Path) -> usize {
    let output = git_cmd(path, &["rev-list", "--count", "HEAD"]);
    output.parse().unwrap_or(0)
}

/// Check if file is staged via CLI
fn git_is_staged(path: &std::path::Path, filename: &str) -> bool {
    let output = git_cmd(path, &["diff", "--cached", "--name-only"]);
    output.lines().any(|l| l == filename)
}

/// Check if file is modified (unstaged) via CLI
fn git_is_modified(path: &std::path::Path, filename: &str) -> bool {
    let output = git_cmd(path, &["diff", "--name-only"]);
    output.lines().any(|l| l == filename)
}

/// Check if file is untracked via CLI
fn git_is_untracked(path: &std::path::Path, filename: &str) -> bool {
    let output = git_cmd(path, &["ls-files", "--others", "--exclude-standard"]);
    output.lines().any(|l| l == filename)
}

// ==================== get_current_branch Tests ====================

#[tokio::test]
async fn test_get_current_branch_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Get CLI current branch
    let cli_branch = git_current_branch(tmp.path());

    // Action: RepoOperations gets current branch
    let ops_branch = ops.get_current_branch().await;

    // Verify: matches CLI
    assert_eq!(
        ops_branch,
        Some(cli_branch),
        "RepoOperations should return same branch as CLI"
    );
}

#[tokio::test]
async fn test_get_current_branch_after_checkout() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create and checkout new branch via CLI
    git_cmd(tmp.path(), &["checkout", "-b", "feature-branch"]);
    let cli_branch = git_current_branch(tmp.path());
    assert_eq!(cli_branch, "feature-branch");

    // Verify: RepoOperations sees the new branch
    let ops_branch = ops.get_current_branch().await;
    assert_eq!(ops_branch, Some("feature-branch".to_string()));
}

// ==================== get_head_oid Tests ====================

#[tokio::test]
async fn test_get_head_oid_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Get CLI HEAD OID
    let cli_oid = git_head_oid(tmp.path());

    // Action: RepoOperations gets HEAD OID
    let ops_oid = ops.get_head_oid().await;

    // Verify: matches CLI
    assert_eq!(ops_oid, cli_oid, "RepoOperations should return same OID as CLI");
}

#[tokio::test]
async fn test_get_head_oid_after_commit() {
    let (tmp, ops) = setup_test_repo();

    let old_oid = git_head_oid(tmp.path());

    // Setup: create new commit via CLI
    std::fs::write(tmp.path().join("new.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "New commit"]);

    let new_cli_oid = git_head_oid(tmp.path());
    assert_ne!(old_oid, new_cli_oid);

    // Verify: RepoOperations sees new HEAD
    let ops_oid = ops.get_head_oid().await;
    assert_eq!(ops_oid, new_cli_oid);
}

#[tokio::test]
async fn test_get_head_oid_opt_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let cli_oid = git_head_oid(tmp.path());

    // Action: RepoOperations gets HEAD OID optionally
    let ops_oid = ops.get_head_oid_opt().await;

    // Verify: matches CLI
    assert_eq!(ops_oid, Some(cli_oid));
}

// ==================== get_repository_info Tests ====================

#[tokio::test]
async fn test_get_repository_info_path_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Get CLI repo root
    let cli_root = git_repo_root(tmp.path());

    // Action: RepoOperations gets repo info
    let info = ops.get_repository_info().await.expect("should get repo info");

    // Verify: path matches CLI
    assert_eq!(
        info.path,
        std::path::PathBuf::from(&cli_root),
        "Repo path should match CLI"
    );
}

#[tokio::test]
async fn test_get_repository_info_has_branch() {
    let (_tmp, ops) = setup_test_repo();

    // Action: RepoOperations gets repo info
    let info = ops.get_repository_info().await.expect("should get repo info");

    // Verify: has current branch (we have initial commit)
    assert!(
        info.current_branch.is_some(),
        "Repo should have current branch after initial commit"
    );
    assert!(!info.is_unborn, "Repo should not be unborn after initial commit");
}

// ==================== status Tests ====================

#[tokio::test]
async fn test_status_clean_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Verify CLI shows clean status
    let cli_status = git_cmd(tmp.path(), &["status", "--porcelain"]);
    assert!(cli_status.is_empty(), "CLI should show clean status");

    // Action: RepoOperations gets status
    let status = ops.status().await.expect("should get status");

    // Verify: no changes
    assert!(status.staged.is_empty(), "Should have no staged files");
    assert!(status.unstaged.is_empty(), "Should have no unstaged files");
    assert!(status.untracked.is_empty(), "Should have no untracked files");
}

#[tokio::test]
async fn test_status_staged_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: stage a file via CLI
    std::fs::write(tmp.path().join("staged.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "staged.txt"]);

    assert!(git_is_staged(tmp.path(), "staged.txt"));

    // Action: RepoOperations gets status
    let status = ops.status().await.expect("should get status");

    // Verify: sees staged file
    assert!(
        status.staged.iter().any(|f| f.path == "staged.txt"),
        "Should see staged file"
    );
}

#[tokio::test]
async fn test_status_modified_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: modify tracked file
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");

    assert!(git_is_modified(tmp.path(), "README.md"));

    // Action: RepoOperations gets status
    let status = ops.status().await.expect("should get status");

    // Verify: sees modified file
    assert!(
        status.unstaged.iter().any(|f| f.path == "README.md"),
        "Should see modified file"
    );
}

#[tokio::test]
async fn test_status_untracked_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create untracked file
    std::fs::write(tmp.path().join("untracked.txt"), "content").expect("should write");

    assert!(git_is_untracked(tmp.path(), "untracked.txt"));

    // Action: RepoOperations gets status
    let status = ops.status().await.expect("should get status");

    // Verify: sees untracked file
    assert!(
        status.untracked.iter().any(|f| f.path == "untracked.txt"),
        "Should see untracked file"
    );
}

#[tokio::test]
async fn test_status_mixed_changes() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create mixed changes
    std::fs::write(tmp.path().join("staged.txt"), "staged").expect("should write");
    git_cmd(tmp.path(), &["add", "staged.txt"]);

    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");

    std::fs::write(tmp.path().join("untracked.txt"), "untracked").expect("should write");

    // Action: RepoOperations gets status
    let status = ops.status().await.expect("should get status");

    // Verify: all types present
    assert!(!status.staged.is_empty(), "Should have staged");
    assert!(!status.unstaged.is_empty(), "Should have unstaged");
    assert!(!status.untracked.is_empty(), "Should have untracked");
}

// ==================== log Tests ====================

#[tokio::test]
async fn test_log_count_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commits via CLI
    for i in 1..=3 {
        std::fs::write(tmp.path().join(format!("file{i}.txt")), format!("content {i}"))
            .expect("should write");
        git_cmd(tmp.path(), &["add", "."]);
        git_cmd(tmp.path(), &["commit", "-m", &format!("Commit {i}")]);
    }

    let cli_count = git_commit_count(tmp.path());

    // Action: RepoOperations gets log
    let log = ops
        .log(LogOptions::default())
        .await
        .expect("should get log");

    // Verify: count matches CLI
    assert_eq!(log.len(), cli_count, "Log count should match CLI");
}

#[tokio::test]
async fn test_log_head_oid_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let cli_head = git_head_oid(tmp.path());

    // Action: RepoOperations gets log
    let log = ops
        .log(LogOptions::default())
        .await
        .expect("should get log");

    // Verify: first commit is HEAD
    assert!(!log.is_empty());
    assert_eq!(log[0].oid, cli_head, "First log entry should be HEAD");
}

#[tokio::test]
async fn test_log_with_limit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple commits
    for i in 1..=5 {
        std::fs::write(tmp.path().join(format!("file{i}.txt")), format!("content {i}"))
            .expect("should write");
        git_cmd(tmp.path(), &["add", "."]);
        git_cmd(tmp.path(), &["commit", "-m", &format!("Commit {i}")]);
    }

    // Action: get log with limit
    let options = LogOptions {
        limit: Some(3),
        ..Default::default()
    };
    let log = ops.log(options).await.expect("should get log");

    // Verify: limited to 3
    assert_eq!(log.len(), 3, "Log should be limited to 3 entries");
}

#[tokio::test]
async fn test_cli_commit_appears_in_ops_log() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit via CLI with specific message
    std::fs::write(tmp.path().join("cli-file.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "CLI created commit"]);

    let cli_head = git_head_oid(tmp.path());

    // Action: RepoOperations gets log
    let log = ops
        .log(LogOptions::default())
        .await
        .expect("should get log");

    // Verify: CLI commit appears in log
    let found = log.iter().find(|c| c.oid == cli_head);
    assert!(found.is_some(), "CLI commit should appear in log");
    assert!(
        found.expect("commit exists").message.contains("CLI created commit"),
        "Commit message should match"
    );
}

// ==================== User Config Tests ====================

#[tokio::test]
async fn test_get_repo_user_config_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Get CLI config (setup_test_repo sets user.name and user.email)
    let cli_name = git_config_user_name(tmp.path());
    let cli_email = git_config_user_email(tmp.path());

    // Action: RepoOperations gets config
    let (ops_name, ops_email) = ops
        .get_repo_user_config()
        .await
        .expect("should get config");

    // Verify: matches CLI
    assert_eq!(ops_name, cli_name);
    assert_eq!(ops_email, cli_email);
}

#[tokio::test]
async fn test_set_repo_user_config_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Action: RepoOperations sets config
    ops.set_repo_user_config(Some("New Name"), Some("new@example.com"))
        .await
        .expect("should set config");

    // Verify: CLI sees new config
    let cli_name = git_config_user_name(tmp.path());
    let cli_email = git_config_user_email(tmp.path());

    assert_eq!(cli_name, Some("New Name".to_string()));
    assert_eq!(cli_email, Some("new@example.com".to_string()));
}

#[tokio::test]
async fn test_cli_config_read_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: CLI sets new config
    git_cmd(tmp.path(), &["config", "user.name", "CLI User"]);
    git_cmd(tmp.path(), &["config", "user.email", "cli@example.com"]);

    // Action: RepoOperations reads config
    let (name, email) = ops
        .get_repo_user_config()
        .await
        .expect("should get config");

    // Verify: sees CLI config
    assert_eq!(name, Some("CLI User".to_string()));
    assert_eq!(email, Some("cli@example.com".to_string()));
}

#[tokio::test]
async fn test_get_user_signature_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let cli_name = git_config_user_name(tmp.path()).expect("should have name");
    let cli_email = git_config_user_email(tmp.path()).expect("should have email");

    // Action: RepoOperations gets signature
    let (name, email) = ops
        .get_user_signature()
        .await
        .expect("should get signature");

    // Verify: matches CLI config
    assert_eq!(name, cli_name);
    assert_eq!(email, cli_email);
}

// ==================== resolve_ref Tests ====================

#[tokio::test]
async fn test_resolve_ref_head_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    let cli_head = git_head_oid(tmp.path());

    // Action: RepoOperations resolves HEAD
    let resolved = ops.resolve_ref("HEAD").await;

    // Verify: matches CLI
    assert_eq!(resolved, Some(cli_head));
}

#[tokio::test]
async fn test_resolve_ref_branch_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create branch via CLI
    git_cmd(tmp.path(), &["branch", "test-branch"]);
    let cli_oid = git_cmd(tmp.path(), &["rev-parse", "test-branch"]);

    // Action: RepoOperations resolves branch
    let resolved = ops.resolve_ref("test-branch").await;

    // Verify: matches CLI
    assert_eq!(resolved, Some(cli_oid));
}

#[tokio::test]
async fn test_resolve_ref_tag_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create tag via CLI
    git_cmd(tmp.path(), &["tag", "v1.0.0"]);
    let cli_oid = git_cmd(tmp.path(), &["rev-parse", "v1.0.0"]);

    // Action: RepoOperations resolves tag
    let resolved = ops.resolve_ref("v1.0.0").await;

    // Verify: matches CLI
    assert_eq!(resolved, Some(cli_oid));
}

#[tokio::test]
async fn test_resolve_ref_nonexistent() {
    let (_tmp, ops) = setup_test_repo();

    // Action: resolve non-existent ref
    let resolved = ops.resolve_ref("nonexistent-ref").await;

    // Verify: returns None
    assert!(resolved.is_none(), "Non-existent ref should return None");
}

#[tokio::test]
async fn test_resolve_ref_short_oid() {
    let (tmp, ops) = setup_test_repo();

    let full_oid = git_head_oid(tmp.path());
    let short_oid = &full_oid[..7];

    // Action: resolve short OID
    let resolved = ops.resolve_ref(short_oid).await;

    // Verify: resolves to full OID
    assert_eq!(resolved, Some(full_oid));
}
