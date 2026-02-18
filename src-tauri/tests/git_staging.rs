#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

use axis_lib::models::ResetMode;

// ==================== Helpers ====================

/// Get HEAD OID via CLI
fn git_head_oid(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "HEAD"])
}

/// Get list of staged files via CLI
fn git_staged_files(path: &std::path::Path) -> Vec<String> {
    let output = git_cmd(path, &["diff", "--cached", "--name-only"]);
    if output.is_empty() {
        return Vec::new();
    }
    output
        .lines()
        .map(std::string::ToString::to_string)
        .collect()
}

/// Get list of unstaged modified files via CLI
fn git_unstaged_files(path: &std::path::Path) -> Vec<String> {
    let output = git_cmd(path, &["diff", "--name-only"]);
    if output.is_empty() {
        return Vec::new();
    }
    output
        .lines()
        .map(std::string::ToString::to_string)
        .collect()
}

/// Get list of untracked files via CLI
fn git_untracked_files(path: &std::path::Path) -> Vec<String> {
    let output = git_cmd(path, &["ls-files", "--others", "--exclude-standard"]);
    if output.is_empty() {
        return Vec::new();
    }
    output
        .lines()
        .map(std::string::ToString::to_string)
        .collect()
}

/// Get commit message via CLI
fn git_commit_message(path: &std::path::Path, oid: &str) -> String {
    git_cmd(path, &["log", "-1", "--format=%s", oid])
}

/// Check if file exists in working directory
fn file_exists(path: &std::path::Path, filename: &str) -> bool {
    path.join(filename).exists()
}

/// Get file content
fn file_content(path: &std::path::Path, filename: &str) -> String {
    std::fs::read_to_string(path.join(filename)).unwrap_or_default()
}

// ==================== Stage Tests ====================

#[tokio::test]
async fn test_stage_file_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create modified file
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");
    assert!(git_unstaged_files(tmp.path()).contains(&"README.md".to_string()));

    // Action: RepoOperations stages file
    ops.stage_file("README.md")
        .await
        .expect("should stage file");

    // Verify: CLI sees file as staged
    assert!(
        git_staged_files(tmp.path()).contains(&"README.md".to_string()),
        "CLI should see staged file"
    );
    assert!(
        !git_unstaged_files(tmp.path()).contains(&"README.md".to_string()),
        "File should not be in unstaged list"
    );
}

#[tokio::test]
async fn test_stage_files_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple modified files
    std::fs::write(tmp.path().join("file1.txt"), "content1").expect("should write");
    std::fs::write(tmp.path().join("file2.txt"), "content2").expect("should write");

    // Action: stage multiple files
    ops.stage_files(&["file1.txt".to_string(), "file2.txt".to_string()])
        .await
        .expect("should stage files");

    // Verify: CLI sees both files staged
    let staged = git_staged_files(tmp.path());
    assert!(staged.contains(&"file1.txt".to_string()));
    assert!(staged.contains(&"file2.txt".to_string()));
}

#[tokio::test]
async fn test_stage_all_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple changes
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");
    std::fs::write(tmp.path().join("new1.txt"), "new1").expect("should write");
    std::fs::write(tmp.path().join("new2.txt"), "new2").expect("should write");

    // Action: stage all
    ops.stage_all().await.expect("should stage all");

    // Verify: all files staged
    let staged = git_staged_files(tmp.path());
    assert!(staged.contains(&"README.md".to_string()));
    assert!(staged.contains(&"new1.txt".to_string()));
    assert!(staged.contains(&"new2.txt".to_string()));
}

#[tokio::test]
async fn test_cli_staged_read_by_ops_commit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: stage via CLI
    std::fs::write(tmp.path().join("cli_staged.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "cli_staged.txt"]);

    // Action: RepoOperations creates commit
    let oid = ops
        .create_commit("Commit CLI staged file", None, None, None)
        .await
        .expect("should create commit");

    // Verify: CLI shows commit with the file
    let cli_head = git_head_oid(tmp.path());
    assert_eq!(oid, cli_head, "Commit OID should match CLI HEAD");

    let files_in_commit = git_cmd(tmp.path(), &["show", "--name-only", "--format=", &oid]);
    assert!(
        files_in_commit.contains("cli_staged.txt"),
        "Commit should include CLI-staged file"
    );
}

// ==================== Unstage Tests ====================

#[tokio::test]
async fn test_unstage_file_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: stage file via CLI
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");
    git_cmd(tmp.path(), &["add", "README.md"]);
    assert!(git_staged_files(tmp.path()).contains(&"README.md".to_string()));

    // Action: RepoOperations unstages file
    ops.unstage_file("README.md")
        .await
        .expect("should unstage file");

    // Verify: CLI sees file as unstaged
    assert!(
        !git_staged_files(tmp.path()).contains(&"README.md".to_string()),
        "File should not be staged"
    );
    assert!(
        git_unstaged_files(tmp.path()).contains(&"README.md".to_string()),
        "File should be in unstaged list"
    );
}

#[tokio::test]
async fn test_unstage_files_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: stage multiple files via CLI
    std::fs::write(tmp.path().join("file1.txt"), "content1").expect("should write");
    std::fs::write(tmp.path().join("file2.txt"), "content2").expect("should write");
    git_cmd(tmp.path(), &["add", "file1.txt", "file2.txt"]);

    // Action: unstage multiple files
    ops.unstage_files(&["file1.txt".to_string(), "file2.txt".to_string()])
        .await
        .expect("should unstage files");

    // Verify: CLI sees both files unstaged
    let staged = git_staged_files(tmp.path());
    assert!(!staged.contains(&"file1.txt".to_string()));
    assert!(!staged.contains(&"file2.txt".to_string()));
}

#[tokio::test]
async fn test_unstage_all_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: stage all via CLI
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");
    std::fs::write(tmp.path().join("new.txt"), "new").expect("should write");
    git_cmd(tmp.path(), &["add", "-A"]);

    let staged_before = git_staged_files(tmp.path());
    assert!(!staged_before.is_empty(), "Should have staged files");

    // Action: unstage all
    ops.unstage_all().await.expect("should unstage all");

    // Verify: no files staged
    let staged_after = git_staged_files(tmp.path());
    assert!(staged_after.is_empty(), "Should have no staged files");
}

// ==================== Discard Tests ====================

#[tokio::test]
async fn test_discard_file_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: modify tracked file
    let original = file_content(tmp.path(), "README.md");
    std::fs::write(tmp.path().join("README.md"), "# Modified content").expect("should write");
    assert_ne!(file_content(tmp.path(), "README.md"), original);

    // Action: RepoOperations discards file
    ops.discard_file("README.md")
        .await
        .expect("should discard file");

    // Verify: file content restored
    assert_eq!(
        file_content(tmp.path(), "README.md"),
        original,
        "File should be restored to original"
    );
    assert!(
        git_unstaged_files(tmp.path()).is_empty(),
        "No unstaged changes"
    );
}

#[tokio::test]
async fn test_discard_unstaged_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: modify multiple files, stage one
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");
    std::fs::write(tmp.path().join("file2.txt"), "new file").expect("should write");
    git_cmd(tmp.path(), &["add", "file2.txt"]);

    // Action: discard unstaged
    ops.discard_unstaged()
        .await
        .expect("should discard unstaged");

    // Verify: unstaged changes gone, staged preserved
    assert!(
        git_unstaged_files(tmp.path()).is_empty(),
        "No unstaged changes"
    );
    assert!(
        git_staged_files(tmp.path()).contains(&"file2.txt".to_string()),
        "Staged file should be preserved"
    );
}

// ==================== Delete Tests ====================

#[tokio::test]
async fn test_delete_file_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: ensure file exists
    assert!(file_exists(tmp.path(), "README.md"));

    // Action: RepoOperations deletes file
    ops.delete_file("README.md")
        .await
        .expect("should delete file");

    // Verify: file gone from working directory
    assert!(
        !file_exists(tmp.path(), "README.md"),
        "File should be deleted"
    );
}

// ==================== Commit Tests ====================

#[tokio::test]
async fn test_create_commit_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: stage changes
    std::fs::write(tmp.path().join("new.txt"), "new content").expect("should write");
    git_cmd(tmp.path(), &["add", "new.txt"]);

    let old_head = git_head_oid(tmp.path());

    // Action: RepoOperations creates commit
    let oid = ops
        .create_commit("Test commit message", None, None, None)
        .await
        .expect("should create commit");

    // Verify: CLI sees new commit
    let new_head = git_head_oid(tmp.path());
    assert_eq!(oid, new_head, "Commit OID should be new HEAD");
    assert_ne!(old_head, new_head, "HEAD should have changed");

    let message = git_commit_message(tmp.path(), &oid);
    assert_eq!(message, "Test commit message");
}

#[tokio::test]
async fn test_amend_commit_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit then stage more changes
    std::fs::write(tmp.path().join("first.txt"), "first").expect("should write");
    git_cmd(tmp.path(), &["add", "first.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "First commit"]);

    let commit_before_amend = git_head_oid(tmp.path());

    std::fs::write(tmp.path().join("second.txt"), "second").expect("should write");
    git_cmd(tmp.path(), &["add", "second.txt"]);

    // Action: RepoOperations amends commit
    let oid = ops
        .amend_commit(Some("Amended message"))
        .await
        .expect("should amend commit");

    // Verify: CLI sees amended commit
    let new_head = git_head_oid(tmp.path());
    assert_eq!(oid, new_head);
    assert_ne!(commit_before_amend, new_head, "Commit should be different");

    let message = git_commit_message(tmp.path(), &oid);
    assert_eq!(message, "Amended message");

    // Both files should be in the amended commit
    let files = git_cmd(tmp.path(), &["show", "--name-only", "--format=", &oid]);
    assert!(files.contains("first.txt"));
    assert!(files.contains("second.txt"));
}

#[tokio::test]
async fn test_get_commit_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Get CLI commit info
    let cli_head = git_head_oid(tmp.path());
    let cli_message = git_commit_message(tmp.path(), &cli_head);
    let cli_short = git_cmd(tmp.path(), &["rev-parse", "--short", &cli_head]);

    // Action: RepoOperations gets commit
    let commit = ops.get_commit(&cli_head).await.expect("should get commit");

    // Verify: matches CLI
    assert_eq!(commit.oid, cli_head);
    assert_eq!(commit.short_oid, cli_short);
    assert!(commit.message.contains(&cli_message));
}

// ==================== Reset Tests ====================

#[tokio::test]
async fn test_reset_soft_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit
    std::fs::write(tmp.path().join("new.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "new.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "New commit"]);

    let head_before = git_head_oid(tmp.path());

    // Action: soft reset to previous commit
    ops.reset("HEAD~1", ResetMode::Soft)
        .await
        .expect("should reset soft");

    // Verify: HEAD changed, changes staged
    let head_after = git_head_oid(tmp.path());
    assert_ne!(head_before, head_after, "HEAD should change");

    let staged = git_staged_files(tmp.path());
    assert!(
        staged.contains(&"new.txt".to_string()),
        "Changes should be staged after soft reset"
    );
}

#[tokio::test]
async fn test_reset_mixed_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit
    std::fs::write(tmp.path().join("new.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "new.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "New commit"]);

    // Action: mixed reset to previous commit
    ops.reset("HEAD~1", ResetMode::Mixed)
        .await
        .expect("should reset mixed");

    // Verify: changes unstaged (untracked)
    let staged = git_staged_files(tmp.path());
    assert!(
        !staged.contains(&"new.txt".to_string()),
        "Changes should not be staged after mixed reset"
    );

    let untracked = git_untracked_files(tmp.path());
    assert!(
        untracked.contains(&"new.txt".to_string()),
        "File should be untracked after mixed reset"
    );
}

#[tokio::test]
async fn test_reset_hard_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit
    std::fs::write(tmp.path().join("new.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "new.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "New commit"]);

    assert!(file_exists(tmp.path(), "new.txt"));

    // Action: hard reset to previous commit
    ops.reset("HEAD~1", ResetMode::Hard)
        .await
        .expect("should reset hard");

    // Verify: file gone
    assert!(
        !file_exists(tmp.path(), "new.txt"),
        "File should be deleted after hard reset"
    );
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_stage_untracked_file() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create new untracked file
    std::fs::write(tmp.path().join("untracked.txt"), "new").expect("should write");
    assert!(git_untracked_files(tmp.path()).contains(&"untracked.txt".to_string()));

    // Action: stage untracked file
    ops.stage_file("untracked.txt")
        .await
        .expect("should stage untracked");

    // Verify: file staged
    assert!(git_staged_files(tmp.path()).contains(&"untracked.txt".to_string()));
}

#[tokio::test]
async fn test_discard_untracked_file() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create untracked file
    std::fs::write(tmp.path().join("untracked.txt"), "content").expect("should write");
    assert!(file_exists(tmp.path(), "untracked.txt"));

    // Action: delete untracked file via delete_file
    ops.delete_file("untracked.txt")
        .await
        .expect("should delete");

    // Verify: file removed
    assert!(!file_exists(tmp.path(), "untracked.txt"));
}
