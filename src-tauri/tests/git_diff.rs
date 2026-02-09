#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

use axis_lib::models::{DiffOptions, FileDiff, FileLogOptions};

// ==================== Helpers ====================

/// Get HEAD OID via CLI
fn git_head_oid(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "HEAD"])
}

/// Get diff of working directory via CLI
fn git_diff_workdir(path: &std::path::Path) -> String {
    git_cmd(path, &["diff"])
}

/// Get diff of staged changes via CLI
fn git_diff_staged(path: &std::path::Path) -> String {
    git_cmd(path, &["diff", "--cached"])
}

/// Get diff of specific commit via CLI
fn git_diff_commit(path: &std::path::Path, oid: &str) -> String {
    git_cmd(path, &["show", "--format=", oid])
}

/// Get diff between two commits via CLI
fn git_diff_commits(path: &std::path::Path, from: &str, to: &str) -> String {
    git_cmd(path, &["diff", from, to])
}

/// Get list of files changed in diff via CLI
fn git_diff_files(path: &std::path::Path, args: &[&str]) -> Vec<String> {
    let mut cmd_args = vec!["diff", "--name-only"];
    cmd_args.extend(args);
    let output = git_cmd(path, &cmd_args);
    if output.is_empty() {
        return Vec::new();
    }
    output.lines().map(|s| s.to_string()).collect()
}

/// Get file log via CLI
fn git_file_log(path: &std::path::Path, file_path: &str) -> Vec<String> {
    let output = git_cmd(path, &["log", "--format=%H", "--follow", "--", file_path]);
    if output.is_empty() {
        return Vec::new();
    }
    output.lines().map(|s| s.to_string()).collect()
}

/// Get path from FileDiff (new_path or old_path)
fn diff_path(diff: &FileDiff) -> Option<&str> {
    diff.new_path.as_deref().or(diff.old_path.as_deref())
}

/// Check if diff contains file
fn diff_has_file(diffs: &[FileDiff], filename: &str) -> bool {
    diffs.iter().any(|d| diff_path(d) == Some(filename))
}

// ==================== diff_workdir Tests ====================

#[tokio::test]
async fn test_diff_workdir_empty_when_clean() {
    let (tmp, ops) = setup_test_repo();

    // Verify: CLI shows no diff
    let cli_diff = git_diff_workdir(tmp.path());
    assert!(
        cli_diff.is_empty(),
        "CLI should show no diff for clean repo"
    );

    // Action: RepoOperations gets workdir diff
    let diff = ops
        .diff_workdir(&DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: no files changed
    assert!(diff.is_empty(), "Should have no diff for clean repo");
}

#[tokio::test]
async fn test_diff_workdir_shows_modified_file() {
    let (tmp, ops) = setup_test_repo();

    // Setup: modify tracked file
    std::fs::write(tmp.path().join("README.md"), "# Modified content").expect("should write");

    // Verify: CLI shows diff
    let cli_files = git_diff_files(tmp.path(), &[]);
    assert!(cli_files.contains(&"README.md".to_string()));

    // Action: RepoOperations gets workdir diff
    let diff = ops
        .diff_workdir(&DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: sees modified file
    assert!(
        diff_has_file(&diff, "README.md"),
        "Should see modified file in diff"
    );
}

#[tokio::test]
async fn test_diff_workdir_shows_multiple_files() {
    let (tmp, ops) = setup_test_repo();

    // Setup: modify multiple files
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");
    std::fs::write(tmp.path().join("file1.txt"), "content1").expect("should write");
    git_cmd(tmp.path(), &["add", "file1.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file1"]);
    std::fs::write(tmp.path().join("file1.txt"), "modified content1").expect("should write");

    // Verify: CLI shows multiple files
    let cli_files = git_diff_files(tmp.path(), &[]);
    assert_eq!(cli_files.len(), 2);

    // Action: RepoOperations gets workdir diff
    let diff = ops
        .diff_workdir(&DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: sees both files
    assert_eq!(diff.len(), 2, "Should see both modified files");
}

// ==================== diff_staged Tests ====================

#[tokio::test]
async fn test_diff_staged_empty_when_nothing_staged() {
    let (tmp, ops) = setup_test_repo();

    // Verify: CLI shows no staged diff
    let cli_diff = git_diff_staged(tmp.path());
    assert!(cli_diff.is_empty());

    // Action: RepoOperations gets staged diff
    let diff = ops
        .diff_staged(&DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: no files
    assert!(diff.is_empty(), "Should have no staged diff");
}

#[tokio::test]
async fn test_diff_staged_shows_staged_file() {
    let (tmp, ops) = setup_test_repo();

    // Setup: stage a file
    std::fs::write(tmp.path().join("staged.txt"), "staged content").expect("should write");
    git_cmd(tmp.path(), &["add", "staged.txt"]);

    // Verify: CLI shows staged diff
    let cli_files = git_diff_files(tmp.path(), &["--cached"]);
    assert!(cli_files.contains(&"staged.txt".to_string()));

    // Action: RepoOperations gets staged diff
    let diff = ops
        .diff_staged(&DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: sees staged file
    assert!(
        diff_has_file(&diff, "staged.txt"),
        "Should see staged file in diff"
    );
}

#[tokio::test]
async fn test_diff_staged_vs_workdir_separation() {
    let (tmp, ops) = setup_test_repo();

    // Setup: stage one file, modify another
    std::fs::write(tmp.path().join("staged.txt"), "staged").expect("should write");
    git_cmd(tmp.path(), &["add", "staged.txt"]);
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");

    // Action: get both diffs
    let staged_diff = ops
        .diff_staged(&DiffOptions::default())
        .await
        .expect("should get staged diff");
    let workdir_diff = ops
        .diff_workdir(&DiffOptions::default())
        .await
        .expect("should get workdir diff");

    // Verify: staged has staged.txt, workdir has README.md
    assert!(diff_has_file(&staged_diff, "staged.txt"));
    assert!(!diff_has_file(&staged_diff, "README.md"));
    assert!(diff_has_file(&workdir_diff, "README.md"));
    assert!(!diff_has_file(&workdir_diff, "staged.txt"));
}

// ==================== diff_head Tests ====================

#[tokio::test]
async fn test_diff_head_shows_all_uncommitted_changes() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create uncommitted changes (both staged and unstaged)
    std::fs::write(tmp.path().join("staged.txt"), "staged content").expect("should write");
    git_cmd(tmp.path(), &["add", "staged.txt"]);
    std::fs::write(tmp.path().join("README.md"), "# Modified").expect("should write");
    std::fs::write(tmp.path().join("untracked.txt"), "untracked").expect("should write");

    // Action: RepoOperations gets HEAD diff (all uncommitted changes vs HEAD)
    let diff = ops
        .diff_head(&DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: sees all uncommitted files (staged + unstaged + untracked)
    assert!(diff_has_file(&diff, "staged.txt"), "Should see staged file");
    assert!(
        diff_has_file(&diff, "README.md"),
        "Should see modified file"
    );
    assert!(
        diff_has_file(&diff, "untracked.txt"),
        "Should see untracked file"
    );
}

// ==================== diff_commit Tests ====================

#[tokio::test]
async fn test_diff_commit_shows_commit_changes() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit with known changes
    std::fs::write(tmp.path().join("commit_file.txt"), "commit content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add commit_file"]);

    let commit_oid = git_head_oid(tmp.path());

    // Verify: CLI shows commit diff
    let cli_diff = git_diff_commit(tmp.path(), &commit_oid);
    assert!(cli_diff.contains("commit_file.txt"));

    // Action: RepoOperations gets commit diff
    let diff = ops
        .diff_commit(&commit_oid, &DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: sees file in commit
    assert!(
        diff_has_file(&diff, "commit_file.txt"),
        "Should see file in commit diff"
    );
}

#[tokio::test]
async fn test_diff_commit_cli_created_verified_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: CLI creates commit with specific file
    std::fs::write(tmp.path().join("cli_file.txt"), "cli content").expect("should write");
    git_cmd(tmp.path(), &["add", "cli_file.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "CLI commit"]);

    let commit_oid = git_head_oid(tmp.path());

    // Action: RepoOperations gets commit diff
    let diff = ops
        .diff_commit(&commit_oid, &DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: sees CLI-created file
    assert!(
        diff_has_file(&diff, "cli_file.txt"),
        "Should see CLI-created file in commit diff"
    );
}

// ==================== diff_commits Tests ====================

#[tokio::test]
async fn test_diff_commits_between_two_commits() {
    let (tmp, ops) = setup_test_repo();

    let first_oid = git_head_oid(tmp.path());

    // Setup: create two more commits
    std::fs::write(tmp.path().join("file1.txt"), "content1").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Commit 1"]);

    std::fs::write(tmp.path().join("file2.txt"), "content2").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Commit 2"]);

    let last_oid = git_head_oid(tmp.path());

    // Verify: CLI shows diff between commits
    let cli_diff = git_diff_commits(tmp.path(), &first_oid, &last_oid);
    assert!(cli_diff.contains("file1.txt"));
    assert!(cli_diff.contains("file2.txt"));

    // Action: RepoOperations gets commits diff
    let diff = ops
        .diff_commits(&first_oid, &last_oid, &DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: sees both files
    assert!(diff_has_file(&diff, "file1.txt"));
    assert!(diff_has_file(&diff, "file2.txt"));
}

#[tokio::test]
async fn test_diff_commits_reverse_direction() {
    let (tmp, ops) = setup_test_repo();

    let first_oid = git_head_oid(tmp.path());

    // Setup: add new file
    std::fs::write(tmp.path().join("added.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    let second_oid = git_head_oid(tmp.path());

    // Action: diff in both directions
    let forward = ops
        .diff_commits(&first_oid, &second_oid, &DiffOptions::default())
        .await
        .expect("forward diff");
    let reverse = ops
        .diff_commits(&second_oid, &first_oid, &DiffOptions::default())
        .await
        .expect("reverse diff");

    // Verify: both show the file (with opposite status)
    assert!(diff_has_file(&forward, "added.txt"));
    assert!(diff_has_file(&reverse, "added.txt"));
}

// ==================== diff_file Tests ====================

#[tokio::test]
async fn test_diff_file_unstaged() {
    let (tmp, ops) = setup_test_repo();

    // Setup: modify specific file
    std::fs::write(tmp.path().join("README.md"), "# Modified content").expect("should write");

    // Action: get diff for specific file (unstaged)
    let diff = ops
        .diff_file("README.md", false, &DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: has diff for the file
    assert!(diff.is_some(), "Should have diff for modified file");
    assert_eq!(diff_path(&diff.expect("diff exists")), Some("README.md"));
}

#[tokio::test]
async fn test_diff_file_staged() {
    let (tmp, ops) = setup_test_repo();

    // Setup: stage specific file
    std::fs::write(tmp.path().join("staged.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "staged.txt"]);

    // Action: get diff for specific file (staged)
    let diff = ops
        .diff_file("staged.txt", true, &DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: has diff for the file
    assert!(diff.is_some(), "Should have diff for staged file");
    assert_eq!(diff_path(&diff.expect("diff exists")), Some("staged.txt"));
}

#[tokio::test]
async fn test_diff_file_nonexistent_returns_none() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get diff for non-existent file
    let diff = ops
        .diff_file("nonexistent.txt", false, &DiffOptions::default())
        .await
        .expect("should complete");

    // Verify: returns None
    assert!(diff.is_none(), "Should return None for unchanged file");
}

// ==================== get_file_history Tests ====================

#[tokio::test]
async fn test_get_file_history_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple commits modifying same file
    for i in 1..=3 {
        std::fs::write(tmp.path().join("tracked.txt"), format!("content v{i}"))
            .expect("should write");
        git_cmd(tmp.path(), &["add", "tracked.txt"]);
        git_cmd(tmp.path(), &["commit", "-m", &format!("Update v{i}")]);
    }

    // Get CLI file log
    let cli_log = git_file_log(tmp.path(), "tracked.txt");
    assert_eq!(cli_log.len(), 3, "CLI should show 3 commits");

    // Action: RepoOperations gets file history
    let options = FileLogOptions {
        paths: vec!["tracked.txt".to_string()],
        ..Default::default()
    };
    let result = ops
        .get_file_history(options)
        .await
        .expect("should get history");

    // Verify: matches CLI count
    assert_eq!(
        result.commits.len(),
        cli_log.len(),
        "Should match CLI commit count"
    );
}

#[tokio::test]
async fn test_get_file_history_with_limit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple commits
    for i in 1..=5 {
        std::fs::write(tmp.path().join("tracked.txt"), format!("content v{i}"))
            .expect("should write");
        git_cmd(tmp.path(), &["add", "tracked.txt"]);
        git_cmd(tmp.path(), &["commit", "-m", &format!("Update v{i}")]);
    }

    // Action: get file history with limit
    let options = FileLogOptions {
        paths: vec!["tracked.txt".to_string()],
        limit: Some(2),
        ..Default::default()
    };
    let result = ops
        .get_file_history(options)
        .await
        .expect("should get history");

    // Verify: limited to 2
    assert_eq!(result.commits.len(), 2, "Should be limited to 2 commits");
}

#[tokio::test]
async fn test_get_file_history_cli_commits_appear() {
    let (tmp, ops) = setup_test_repo();

    // Setup: CLI creates commits for file
    std::fs::write(tmp.path().join("history.txt"), "v1").expect("should write");
    git_cmd(tmp.path(), &["add", "history.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "History v1"]);

    std::fs::write(tmp.path().join("history.txt"), "v2").expect("should write");
    git_cmd(tmp.path(), &["add", "history.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "History v2"]);

    let cli_log = git_file_log(tmp.path(), "history.txt");

    // Action: RepoOperations gets file history
    let options = FileLogOptions {
        paths: vec!["history.txt".to_string()],
        ..Default::default()
    };
    let result = ops
        .get_file_history(options)
        .await
        .expect("should get history");

    // Verify: CLI commits appear in ops result
    for cli_oid in &cli_log {
        assert!(
            result.commits.iter().any(|c| c.oid == *cli_oid),
            "CLI commit {cli_oid} should appear in ops result"
        );
    }
}

// ==================== get_file_diff_in_commit Tests ====================

#[tokio::test]
async fn test_get_file_diff_in_commit_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit with specific file change
    std::fs::write(tmp.path().join("specific.txt"), "specific content").expect("should write");
    git_cmd(tmp.path(), &["add", "specific.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add specific file"]);

    let commit_oid = git_head_oid(tmp.path());

    // Verify: CLI shows file in commit
    let cli_diff = git_diff_commit(tmp.path(), &commit_oid);
    assert!(cli_diff.contains("specific.txt"));

    // Action: RepoOperations gets file diff in commit
    let diff = ops
        .get_file_diff_in_commit(&commit_oid, "specific.txt", &DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: has diff
    assert!(diff.is_some(), "Should have diff for file in commit");
    assert_eq!(diff_path(&diff.expect("diff exists")), Some("specific.txt"));
}

#[tokio::test]
async fn test_get_file_diff_in_commit_file_not_in_commit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit with different file
    std::fs::write(tmp.path().join("other.txt"), "other").expect("should write");
    git_cmd(tmp.path(), &["add", "other.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add other file"]);

    let commit_oid = git_head_oid(tmp.path());

    // Action: get diff for file not in commit
    let diff = ops
        .get_file_diff_in_commit(&commit_oid, "README.md", &DiffOptions::default())
        .await
        .expect("should complete");

    // Verify: returns None (README.md wasn't changed in this commit)
    assert!(
        diff.is_none(),
        "Should return None for file not changed in commit"
    );
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_diff_with_binary_file() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create binary file
    let binary_content: Vec<u8> = vec![0x00, 0x01, 0x02, 0xFF, 0xFE];
    std::fs::write(tmp.path().join("binary.bin"), &binary_content).expect("should write");
    git_cmd(tmp.path(), &["add", "binary.bin"]);

    // Action: get staged diff
    let diff = ops
        .diff_staged(&DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: binary file appears in diff
    assert!(
        diff_has_file(&diff, "binary.bin"),
        "Binary file should appear in diff"
    );
}

#[tokio::test]
async fn test_diff_with_file_in_subdirectory() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file in subdirectory
    std::fs::create_dir_all(tmp.path().join("subdir")).expect("should create dir");
    std::fs::write(tmp.path().join("subdir/nested.txt"), "nested content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);

    // Action: get staged diff
    let diff = ops
        .diff_staged(&DiffOptions::default())
        .await
        .expect("should get diff");

    // Verify: nested file appears with correct path
    assert!(
        diff_has_file(&diff, "subdir/nested.txt"),
        "Nested file should appear with full path"
    );
}
