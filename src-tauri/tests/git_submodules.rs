#![cfg(feature = "integration")]

//! Integration tests for git submodule operations.
//!
//! Pattern: RepoOperations performs actions → git CLI verifies (source of truth)
//!          git CLI sets up state → RepoOperations reads/verifies

mod common;

use axis_lib::models::{SyncSubmoduleOptions, UpdateSubmoduleOptions};
use common::*;
use tempfile::TempDir;

// ==================== Local Helper Functions ====================

/// Create a bare repository to use as a submodule source
fn create_submodule_source() -> TempDir {
    let tmp = TempDir::new().expect("should create temp dir");

    // Init non-bare first to create content
    git_cmd(tmp.path(), &["init"]);
    git_cmd(tmp.path(), &["config", "user.email", "test@test.com"]);
    git_cmd(tmp.path(), &["config", "user.name", "Test User"]);

    std::fs::write(tmp.path().join("lib.txt"), "library code").expect("should write");
    git_cmd(tmp.path(), &["add", "lib.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Initial lib commit"]);

    tmp
}

/// Run git submodule command with file protocol allowed
fn git_submodule_cmd(path: &std::path::Path, args: &[&str]) -> String {
    let output = std::process::Command::new("git")
        .args(["-c", "protocol.file.allow=always"])
        .args(args)
        .current_dir(path)
        .output()
        .expect("should execute git");

    if !output.status.success() {
        panic!(
            "git submodule command failed: git {} {}: {}",
            args.join(" "),
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }
    String::from_utf8_lossy(&output.stdout).trim().to_string()
}

/// Create a second submodule source for multi-submodule tests
fn create_another_submodule_source() -> TempDir {
    let tmp = TempDir::new().expect("should create temp dir");

    git_cmd(tmp.path(), &["init"]);
    git_cmd(tmp.path(), &["config", "user.email", "test@test.com"]);
    git_cmd(tmp.path(), &["config", "user.name", "Test User"]);

    std::fs::write(tmp.path().join("utils.txt"), "utility code").expect("should write");
    git_cmd(tmp.path(), &["add", "utils.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Initial utils commit"]);

    tmp
}

/// Add a submodule via CLI (with file protocol allowed)
fn git_add_submodule(path: &std::path::Path, url: &str, subpath: &str) {
    git_submodule_cmd(path, &["submodule", "add", url, subpath]);
    git_cmd(path, &["commit", "-m", &format!("Add submodule {subpath}")]);
}

/// Configure repo to allow file:// protocol for submodules
fn enable_file_protocol(path: &std::path::Path) {
    git_cmd(path, &["config", "protocol.file.allow", "always"]);
}

// ==================== submodule_list Tests ====================

#[tokio::test]
async fn test_submodule_list_empty() {
    let (_tmp, ops) = setup_test_repo();

    // Action: list submodules (none exist)
    let result = ops.submodule_list().await.expect("should list");

    // Verify: empty list
    assert!(result.is_empty(), "Should have no submodules initially");
}

#[tokio::test]
async fn test_submodule_list_after_add() {
    let (tmp, ops) = setup_test_repo();
    let sub_source = create_submodule_source();

    // Setup: add submodule via CLI
    git_add_submodule(
        tmp.path(),
        sub_source
            .path()
            .to_str()
            .expect("path should be valid UTF-8"),
        "libs/mylib",
    );

    // Action: list via RepoOperations
    let result = ops.submodule_list().await.expect("should list");

    // Verify: sees CLI-added submodule
    assert_eq!(result.len(), 1, "Should have one submodule");
    assert_eq!(result[0].path, "libs/mylib");
}

#[tokio::test]
async fn test_submodule_list_multiple() {
    let (tmp, ops) = setup_test_repo();
    let sub1 = create_submodule_source();
    let sub2 = create_another_submodule_source();

    // Setup: add multiple submodules
    git_add_submodule(
        tmp.path(),
        sub1.path().to_str().expect("path should be valid UTF-8"),
        "libs/lib1",
    );
    git_add_submodule(
        tmp.path(),
        sub2.path().to_str().expect("path should be valid UTF-8"),
        "libs/lib2",
    );

    // Action
    let result = ops.submodule_list().await.expect("should list");

    // Verify
    assert_eq!(result.len(), 2, "Should have two submodules");
    let paths: Vec<_> = result.iter().map(|s| s.path.as_str()).collect();
    assert!(paths.contains(&"libs/lib1"));
    assert!(paths.contains(&"libs/lib2"));
}

// ==================== submodule_init Tests ====================

#[tokio::test]
async fn test_submodule_init_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    let sub_source = create_submodule_source();

    // Setup: add submodule
    git_add_submodule(
        tmp.path(),
        sub_source
            .path()
            .to_str()
            .expect("path should be valid UTF-8"),
        "libs/sub",
    );

    // Deinit first to test init
    git_cmd(tmp.path(), &["submodule", "deinit", "-f", "libs/sub"]);

    // Action: init via RepoOperations
    ops.submodule_init(&["libs/sub".to_string()])
        .await
        .expect("should init");

    // Verify: submodule is initialized (URL is configured)
    let config = git_cmd(tmp.path(), &["config", "--get", "submodule.libs/sub.url"]);
    assert!(
        !config.is_empty(),
        "Submodule URL should be configured after init"
    );
}

// ==================== submodule_update Tests ====================

#[tokio::test]
async fn test_submodule_update_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    let sub_source = create_submodule_source();

    // Enable file protocol
    enable_file_protocol(tmp.path());

    // Setup: add submodule and deinit content
    git_add_submodule(
        tmp.path(),
        sub_source
            .path()
            .to_str()
            .expect("path should be valid UTF-8"),
        "deps/lib",
    );

    // Remove the content to test update
    std::fs::remove_dir_all(tmp.path().join("deps/lib")).ok();

    // Action: update to restore content
    let options = UpdateSubmoduleOptions {
        init: true,
        paths: vec!["deps/lib".to_string()],
        ..Default::default()
    };
    ops.submodule_update(&options, None)
        .await
        .expect("should update");

    // Verify: content is restored
    assert!(
        tmp.path().join("deps/lib/lib.txt").exists(),
        "Submodule content should be restored after update"
    );
}

#[tokio::test]
async fn test_submodule_update_recursive() {
    let (tmp, ops) = setup_test_repo();
    let sub_source = create_submodule_source();

    // Setup
    git_add_submodule(
        tmp.path(),
        sub_source
            .path()
            .to_str()
            .expect("path should be valid UTF-8"),
        "deps/lib",
    );

    // Action: recursive update
    let options = UpdateSubmoduleOptions {
        init: true,
        recursive: true,
        paths: vec![],
        ..Default::default()
    };
    let result = ops.submodule_update(&options, None).await;

    // Verify: succeeds
    assert!(result.is_ok(), "Recursive update should succeed");
}

// ==================== submodule_sync Tests ====================

#[tokio::test]
async fn test_submodule_sync() {
    let (tmp, ops) = setup_test_repo();
    let sub_source = create_submodule_source();

    // Setup
    git_add_submodule(
        tmp.path(),
        sub_source
            .path()
            .to_str()
            .expect("path should be valid UTF-8"),
        "sync/lib",
    );

    // Action: sync
    let options = SyncSubmoduleOptions {
        recursive: false,
        paths: vec!["sync/lib".to_string()],
    };
    let result = ops.submodule_sync(&options).await;

    // Verify: succeeds
    assert!(result.is_ok(), "Sync should succeed");
}

// ==================== submodule_remove Tests ====================

#[tokio::test]
async fn test_submodule_remove_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    let sub_source = create_submodule_source();

    // Setup: add submodule
    git_add_submodule(
        tmp.path(),
        sub_source
            .path()
            .to_str()
            .expect("path should be valid UTF-8"),
        "remove/lib",
    );

    // Action: remove
    ops.submodule_remove("remove/lib")
        .await
        .expect("should remove");

    // Verify: submodule directory is gone
    assert!(
        !tmp.path().join("remove/lib/.git").exists(),
        "Submodule should be removed"
    );
}

// ==================== submodule_summary Tests ====================

#[tokio::test]
async fn test_submodule_summary() {
    let (tmp, ops) = setup_test_repo();
    let sub_source = create_submodule_source();

    // Setup
    git_add_submodule(
        tmp.path(),
        sub_source
            .path()
            .to_str()
            .expect("path should be valid UTF-8"),
        "sum/lib",
    );

    // Action
    let result = ops.submodule_summary().await;

    // Verify: succeeds (may be empty if no changes)
    assert!(result.is_ok(), "Summary should succeed");
}

// ==================== CLI sets up → Ops reads Tests ====================

#[tokio::test]
async fn test_cli_submodule_read_by_ops() {
    let (tmp, ops) = setup_test_repo();
    let sub_source = create_submodule_source();

    // Setup: CLI adds submodule
    git_add_submodule(
        tmp.path(),
        sub_source
            .path()
            .to_str()
            .expect("path should be valid UTF-8"),
        "cli/added",
    );

    // Action: RepoOperations lists
    let result = ops.submodule_list().await.expect("should list");

    // Verify: sees CLI-added submodule
    assert!(
        result.iter().any(|s| s.path == "cli/added"),
        "Should see CLI-added submodule"
    );
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_submodule_has_correct_info() {
    let (tmp, ops) = setup_test_repo();
    let sub_source = create_submodule_source();
    let url = sub_source
        .path()
        .to_str()
        .expect("path should be valid UTF-8")
        .to_string();

    // Setup
    git_add_submodule(tmp.path(), &url, "info/lib");

    // Action
    let result = ops.submodule_list().await.expect("should list");

    // Verify: has correct info
    let sm = &result[0];
    assert_eq!(sm.path, "info/lib");
    assert!(sm.url.is_some(), "Should have URL");
    assert!(sm.head_oid.is_some(), "Should have HEAD OID");
}
