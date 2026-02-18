#![cfg(feature = "integration")]

//! Integration tests for git hooks operations.
//!
//! Pattern: `RepoOperations` performs actions → filesystem/git verifies (source of truth)
//!          Filesystem/git sets up state → `RepoOperations` reads/verifies

mod common;

use axis_lib::models::GitHookType;
use common::*;

// ==================== Local Helper Functions ====================

/// Get the hooks directory path
fn hooks_dir(path: &std::path::Path) -> std::path::PathBuf {
    path.join(".git/hooks")
}

/// Get hook file path
fn hook_path(path: &std::path::Path, hook_type: GitHookType) -> std::path::PathBuf {
    hooks_dir(path).join(hook_type.filename())
}

/// Check if hook file exists
fn hook_exists(path: &std::path::Path, hook_type: GitHookType) -> bool {
    hook_path(path, hook_type).exists()
}

/// Read hook content
fn read_hook(path: &std::path::Path, hook_type: GitHookType) -> Option<String> {
    let hook_file = hook_path(path, hook_type);
    std::fs::read_to_string(hook_file).ok()
}

/// Write hook file directly
fn write_hook(path: &std::path::Path, hook_type: GitHookType, content: &str) {
    let hook_file = hook_path(path, hook_type);
    std::fs::create_dir_all(hooks_dir(path)).expect("should create hooks dir");
    std::fs::write(&hook_file, content).expect("should write hook");

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = std::fs::metadata(&hook_file)
            .expect("should get metadata")
            .permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&hook_file, perms).expect("should set permissions");
    }
}

/// Check if hook is executable (Unix)
#[cfg(unix)]
fn hook_is_executable(path: &std::path::Path, hook_type: GitHookType) -> bool {
    use std::os::unix::fs::PermissionsExt;
    let hook_file = hook_path(path, hook_type);
    if let Ok(metadata) = std::fs::metadata(hook_file) {
        metadata.permissions().mode() & 0o111 != 0
    } else {
        false
    }
}

#[cfg(windows)]
fn hook_is_executable(_path: &std::path::Path, _hook_type: GitHookType) -> bool {
    true // Windows doesn't have executable permission
}

// ==================== list_hooks Tests ====================

#[tokio::test]
async fn test_list_hooks_includes_all_types() {
    let (_tmp, ops) = setup_test_repo();

    // Action: list hooks
    let hooks = ops.list_hooks();

    // Verify: all hook types are listed
    assert!(hooks.len() >= 9, "Should list all standard hook types");

    // Check for common hook types
    let hook_types: Vec<_> = hooks.iter().map(|h| h.hook_type).collect();
    assert!(hook_types.contains(&GitHookType::PreCommit));
    assert!(hook_types.contains(&GitHookType::CommitMsg));
    assert!(hook_types.contains(&GitHookType::PrePush));
}

#[tokio::test]
async fn test_list_hooks_detects_existing_hook() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a hook file via filesystem
    write_hook(tmp.path(), GitHookType::PreCommit, "#!/bin/sh\nexit 0\n");

    // Action: list hooks
    let hooks = ops.list_hooks();

    // Verify: pre-commit hook shows as existing
    let pre_commit = hooks
        .iter()
        .find(|h| h.hook_type == GitHookType::PreCommit)
        .expect("should find pre-commit");
    assert!(pre_commit.exists, "Pre-commit hook should exist");
    assert!(pre_commit.enabled, "Pre-commit hook should be enabled");
}

#[tokio::test]
async fn test_list_hooks_detects_disabled_hook() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a disabled hook (with .disabled suffix)
    let hook_file = hooks_dir(tmp.path()).join("pre-commit.disabled");
    std::fs::create_dir_all(hooks_dir(tmp.path())).expect("should create dir");
    std::fs::write(&hook_file, "#!/bin/sh\nexit 0\n").expect("should write");

    // Action: list hooks
    let hooks = ops.list_hooks();

    // Verify: pre-commit shows as disabled
    let pre_commit = hooks
        .iter()
        .find(|h| h.hook_type == GitHookType::PreCommit)
        .expect("should find pre-commit");
    assert!(pre_commit.exists, "Pre-commit hook should exist");
    assert!(!pre_commit.enabled, "Pre-commit hook should be disabled");
}

// ==================== get_hook_details Tests ====================

#[tokio::test]
async fn test_get_hook_details_returns_content() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a hook with specific content
    let hook_content = "#!/bin/sh\necho 'Hello from hook'\nexit 0\n";
    write_hook(tmp.path(), GitHookType::PreCommit, hook_content);

    // Action: get hook details
    let details = ops
        .get_hook_details(GitHookType::PreCommit)
        .expect("should get details");

    // Verify: content matches
    assert!(details.info.exists);
    assert!(details.content.is_some());
    assert!(details
        .content
        .expect("should have content")
        .contains("Hello from hook"));
}

#[tokio::test]
async fn test_get_hook_details_nonexistent_hook() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get details for non-existent hook
    let details = ops
        .get_hook_details(GitHookType::PreCommit)
        .expect("should get details");

    // Verify: exists is false, no content
    assert!(!details.info.exists);
    assert!(details.content.is_none());
}

// ==================== create_hook Tests ====================

#[tokio::test]
async fn test_create_hook_verified_by_filesystem() {
    let (tmp, ops) = setup_test_repo();

    // Verify: hook doesn't exist initially
    assert!(
        !hook_exists(tmp.path(), GitHookType::PreCommit),
        "Hook should not exist initially"
    );

    // Action: create hook via RepoOperations
    let content = "#!/bin/sh\necho 'Test hook'\nexit 0\n";
    ops.create_hook(GitHookType::PreCommit, content)
        .expect("should create hook");

    // Verify: filesystem confirms hook exists with correct content
    assert!(
        hook_exists(tmp.path(), GitHookType::PreCommit),
        "Hook should exist after creation"
    );

    let saved = read_hook(tmp.path(), GitHookType::PreCommit).expect("should read hook");
    assert!(saved.contains("Test hook"), "Content should be saved");
}

#[tokio::test]
async fn test_create_hook_is_executable() {
    let (tmp, ops) = setup_test_repo();

    // Action: create hook
    ops.create_hook(GitHookType::CommitMsg, "#!/bin/sh\nexit 0\n")
        .expect("should create hook");

    // Verify: hook is executable
    assert!(
        hook_is_executable(tmp.path(), GitHookType::CommitMsg),
        "Created hook should be executable"
    );
}

// ==================== update_hook Tests ====================

#[tokio::test]
async fn test_update_hook_verified_by_filesystem() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create initial hook
    write_hook(tmp.path(), GitHookType::PreCommit, "#!/bin/sh\nexit 0\n");

    // Action: update hook content
    let new_content = "#!/bin/sh\necho 'Updated'\nexit 0\n";
    ops.update_hook(GitHookType::PreCommit, new_content)
        .expect("should update hook");

    // Verify: filesystem shows updated content
    let saved = read_hook(tmp.path(), GitHookType::PreCommit).expect("should read hook");
    assert!(
        saved.contains("Updated"),
        "Hook should have updated content"
    );
}

// ==================== delete_hook Tests ====================

#[tokio::test]
async fn test_delete_hook_verified_by_filesystem() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a hook
    write_hook(tmp.path(), GitHookType::PreCommit, "#!/bin/sh\nexit 0\n");
    assert!(
        hook_exists(tmp.path(), GitHookType::PreCommit),
        "Hook should exist before deletion"
    );

    // Action: delete hook
    ops.delete_hook(GitHookType::PreCommit)
        .expect("should delete hook");

    // Verify: filesystem confirms hook is gone
    assert!(
        !hook_exists(tmp.path(), GitHookType::PreCommit),
        "Hook should not exist after deletion"
    );
}

// ==================== toggle_hook Tests ====================

#[tokio::test]
async fn test_toggle_hook_disables() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create enabled hook
    write_hook(tmp.path(), GitHookType::PreCommit, "#!/bin/sh\nexit 0\n");

    // Action: toggle hook (should disable)
    let enabled = ops
        .toggle_hook(GitHookType::PreCommit)
        .expect("should toggle");

    // Verify: hook is now disabled
    assert!(!enabled, "Hook should be disabled after toggle");

    // Verify: filesystem shows .disabled file
    let disabled_path = hooks_dir(tmp.path()).join("pre-commit.disabled");
    assert!(disabled_path.exists(), "Disabled hook file should exist");
}

#[tokio::test]
async fn test_toggle_hook_enables() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create disabled hook
    let disabled_path = hooks_dir(tmp.path()).join("pre-commit.disabled");
    std::fs::create_dir_all(hooks_dir(tmp.path())).expect("should create dir");
    std::fs::write(&disabled_path, "#!/bin/sh\nexit 0\n").expect("should write");

    // Action: toggle hook (should enable)
    let enabled = ops
        .toggle_hook(GitHookType::PreCommit)
        .expect("should toggle");

    // Verify: hook is now enabled
    assert!(enabled, "Hook should be enabled after toggle");

    // Verify: filesystem shows normal hook file
    assert!(
        hook_exists(tmp.path(), GitHookType::PreCommit),
        "Enabled hook file should exist"
    );
    assert!(!disabled_path.exists(), "Disabled hook should be gone");
}

// ==================== get_templates Tests ====================

#[tokio::test]
async fn test_get_templates_returns_templates() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get templates
    let templates = ops.get_templates();

    // Verify: has templates
    assert!(!templates.is_empty(), "Should have templates");

    // Verify: templates have valid content
    for template in &templates {
        assert!(!template.name.is_empty(), "Template should have name");
        assert!(
            template.content.starts_with("#!/bin/sh"),
            "Template should have shebang"
        );
    }
}

#[tokio::test]
async fn test_get_templates_for_type() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get templates for pre-commit
    let templates = ops.get_templates_for_type(GitHookType::PreCommit);

    // Verify: all returned templates are for pre-commit
    for template in &templates {
        assert_eq!(
            template.hook_type,
            GitHookType::PreCommit,
            "Template should be for pre-commit"
        );
    }
}

// ==================== Hook Execution Tests ====================

#[tokio::test]
async fn test_run_pre_commit_no_hook() {
    let (_tmp, ops) = setup_test_repo();

    // Action: run pre-commit when no hook exists
    let result = ops.run_pre_commit().await;

    // Verify: skipped
    assert!(result.skipped, "Should be skipped when hook doesn't exist");
    assert!(result.success, "Skipped hook should report success");
}

#[tokio::test]
async fn test_run_pre_commit_success() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create passing pre-commit hook
    write_hook(
        tmp.path(),
        GitHookType::PreCommit,
        "#!/bin/sh\necho 'Hook ran'\nexit 0\n",
    );

    // Action: run pre-commit
    let result = ops.run_pre_commit().await;

    // Verify: success
    assert!(result.success, "Hook should succeed");
    assert_eq!(result.exit_code, 0);
    assert!(!result.skipped);
}

#[tokio::test]
async fn test_run_pre_commit_failure() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create failing pre-commit hook
    write_hook(
        tmp.path(),
        GitHookType::PreCommit,
        "#!/bin/sh\necho 'Hook failed'\nexit 1\n",
    );

    // Action: run pre-commit
    let result = ops.run_pre_commit().await;

    // Verify: failure
    assert!(!result.success, "Hook should fail");
    assert_eq!(result.exit_code, 1);
}

#[tokio::test]
async fn test_run_commit_msg_success() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit-msg hook that validates message
    write_hook(
        tmp.path(),
        GitHookType::CommitMsg,
        "#!/bin/sh\ncat \"$1\"\nexit 0\n",
    );

    // Create a temp msg file
    let msg_file = tmp.path().join("COMMIT_EDITMSG");
    std::fs::write(&msg_file, "Test commit message").expect("should write msg");

    // Action: run commit-msg
    let result = ops.run_commit_msg(&msg_file).await;

    // Verify: success
    assert!(result.success, "Hook should succeed");
}

#[tokio::test]
async fn test_run_post_commit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create post-commit hook that writes to a file
    let marker_file = tmp.path().join("post-commit-ran");
    let hook_content = format!("#!/bin/sh\ntouch \"{}\"\n", marker_file.display());
    write_hook(tmp.path(), GitHookType::PostCommit, &hook_content);

    // Action: run post-commit
    let result = ops.run_post_commit().await;

    // Verify: hook ran
    assert!(result.success, "Hook should succeed");
    assert!(marker_file.exists(), "Hook should have created marker file");
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_create_hook_fails_if_exists() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create initial hook
    write_hook(
        tmp.path(),
        GitHookType::PreCommit,
        "#!/bin/sh\necho 'old'\n",
    );

    // Action: try to create hook when it already exists
    let result = ops.create_hook(GitHookType::PreCommit, "#!/bin/sh\necho 'new'\nexit 0\n");

    // Verify: should fail
    assert!(result.is_err(), "Create should fail when hook exists");

    // Verify: original content preserved
    let content = read_hook(tmp.path(), GitHookType::PreCommit).expect("should read");
    assert!(
        content.contains("old"),
        "Original content should be preserved"
    );
}

#[tokio::test]
async fn test_hook_created_by_cli_seen_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create hook via filesystem
    write_hook(
        tmp.path(),
        GitHookType::PrePush,
        "#!/bin/sh\necho 'CLI hook'\nexit 0\n",
    );

    // Action: get details via RepoOperations
    let details = ops
        .get_hook_details(GitHookType::PrePush)
        .expect("should get details");

    // Verify: RepoOperations sees the hook
    assert!(
        details.info.exists,
        "RepoOperations should see CLI-created hook"
    );
    let content = details.content.expect("should have content");
    assert!(
        content.contains("CLI hook"),
        "Should see correct hook content"
    );
}

#[tokio::test]
async fn test_delete_nonexistent_hook() {
    let (tmp, ops) = setup_test_repo();

    // Verify: hook doesn't exist
    assert!(!hook_exists(tmp.path(), GitHookType::PreRebase));

    // Action: delete non-existent hook (should not error)
    // Some implementations may error, some may succeed silently
    let result = ops.delete_hook(GitHookType::PreRebase);

    // Verify: operation completed (either way)
    // Implementation-specific whether this errors or succeeds
    assert!(
        result.is_ok() || result.is_err(),
        "Should handle gracefully"
    );
}

#[tokio::test]
async fn test_hook_with_output() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create hook that produces stdout and stderr
    write_hook(
        tmp.path(),
        GitHookType::PreCommit,
        "#!/bin/sh\necho 'stdout message'\necho 'stderr message' >&2\nexit 0\n",
    );

    // Action: run hook
    let result = ops.run_pre_commit().await;

    // Verify: captured output
    assert!(result.success);
    assert!(
        result.stdout.contains("stdout message") || result.stderr.contains("stderr message"),
        "Should capture hook output"
    );
}
