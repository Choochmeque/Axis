#![cfg(feature = "integration")]

//! Integration tests for gitignore operations.
//!
//! Pattern: `RepoOperations` performs actions → git CLI/filesystem verifies (source of truth)
//!          git CLI/filesystem sets up state → `RepoOperations` reads/verifies

mod common;

use common::*;

// ==================== Local Helper Functions ====================

/// Read .gitignore file content
fn read_gitignore(path: &std::path::Path, gitignore_rel: &str) -> String {
    let gitignore_path = path.join(gitignore_rel);
    std::fs::read_to_string(gitignore_path).unwrap_or_default()
}

/// Check if pattern exists in .gitignore
fn gitignore_has_pattern(path: &std::path::Path, gitignore_rel: &str, pattern: &str) -> bool {
    let content = read_gitignore(path, gitignore_rel);
    content.lines().any(|line| line.trim() == pattern.trim())
}

/// Write content to .gitignore file
fn write_gitignore(path: &std::path::Path, gitignore_rel: &str, content: &str) {
    let gitignore_path = path.join(gitignore_rel);
    if let Some(parent) = gitignore_path.parent() {
        std::fs::create_dir_all(parent).expect("should create parent dirs");
    }
    std::fs::write(gitignore_path, content).expect("should write gitignore");
}

/// Check if file is ignored by git
fn git_is_ignored(path: &std::path::Path, file: &str) -> bool {
    let output = std::process::Command::new("git")
        .args(["check-ignore", "-q", file])
        .current_dir(path)
        .output()
        .expect("should execute git");
    output.status.success()
}

// ==================== add_to_gitignore Tests ====================

#[tokio::test]
async fn test_add_to_gitignore_verified_by_filesystem() {
    let (tmp, ops) = setup_test_repo();

    // Action: RepoOperations adds pattern to .gitignore
    let result = ops
        .add_to_gitignore("*.log", ".gitignore")
        .await
        .expect("should add to gitignore");

    // Verify: filesystem shows pattern in .gitignore
    assert!(
        gitignore_has_pattern(tmp.path(), ".gitignore", "*.log"),
        "Filesystem should have pattern added by RepoOperations"
    );
    assert!(!result.already_existed, "Pattern should be new");
    assert_eq!(result.pattern, "*.log");
}

#[tokio::test]
async fn test_add_to_gitignore_git_respects_pattern() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a file to be ignored
    std::fs::write(tmp.path().join("debug.log"), "log content").expect("should write log");

    // Action: add pattern to .gitignore
    ops.add_to_gitignore("*.log", ".gitignore")
        .await
        .expect("should add to gitignore");

    // Verify: git check-ignore confirms file is ignored
    assert!(
        git_is_ignored(tmp.path(), "debug.log"),
        "git should ignore file after pattern added by RepoOperations"
    );
}

#[tokio::test]
async fn test_add_to_gitignore_in_subdirectory() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create subdirectory structure
    std::fs::create_dir_all(tmp.path().join("src/utils")).expect("should create dirs");
    std::fs::write(tmp.path().join("src/utils/temp.txt"), "temp").expect("should write file");

    // Action: add pattern to subdirectory .gitignore
    ops.add_to_gitignore("temp.txt", "src/.gitignore")
        .await
        .expect("should add to subdirectory gitignore");

    // Verify: filesystem shows pattern in src/.gitignore
    assert!(
        gitignore_has_pattern(tmp.path(), "src/.gitignore", "temp.txt"),
        "Subdirectory .gitignore should have pattern"
    );

    // Verify: git ignores the file
    assert!(
        git_is_ignored(tmp.path(), "src/utils/temp.txt"),
        "git should ignore file in subdirectory"
    );
}

#[tokio::test]
async fn test_add_to_gitignore_already_exists() {
    let (tmp, ops) = setup_test_repo();

    // Setup: pre-create .gitignore with pattern
    write_gitignore(tmp.path(), ".gitignore", "*.log\n");

    // Action: try to add same pattern
    let result = ops
        .add_to_gitignore("*.log", ".gitignore")
        .await
        .expect("should succeed even if pattern exists");

    // Verify: already_existed flag is true
    assert!(result.already_existed, "Pattern should already exist");
    assert_eq!(result.pattern, "*.log");
}

#[tokio::test]
async fn test_add_to_gitignore_appends_to_existing() {
    let (tmp, ops) = setup_test_repo();

    // Setup: pre-create .gitignore with existing pattern
    write_gitignore(tmp.path(), ".gitignore", "*.tmp\n");

    // Action: add new pattern
    ops.add_to_gitignore("*.log", ".gitignore")
        .await
        .expect("should add to gitignore");

    // Verify: both patterns exist
    assert!(
        gitignore_has_pattern(tmp.path(), ".gitignore", "*.tmp"),
        "Original pattern should still exist"
    );
    assert!(
        gitignore_has_pattern(tmp.path(), ".gitignore", "*.log"),
        "New pattern should be added"
    );
}

#[tokio::test]
async fn test_add_to_gitignore_creates_file_if_not_exists() {
    let (tmp, ops) = setup_test_repo();

    // Verify: no .gitignore exists initially (might exist from setup, so create fresh subdir)
    std::fs::create_dir_all(tmp.path().join("newdir")).expect("should create dir");
    assert!(
        !tmp.path().join("newdir/.gitignore").exists(),
        "Subdirectory should not have .gitignore initially"
    );

    // Action: add pattern to non-existent .gitignore
    ops.add_to_gitignore("*.cache", "newdir/.gitignore")
        .await
        .expect("should create and add to gitignore");

    // Verify: .gitignore was created with pattern
    assert!(
        tmp.path().join("newdir/.gitignore").exists(),
        ".gitignore should be created"
    );
    assert!(
        gitignore_has_pattern(tmp.path(), "newdir/.gitignore", "*.cache"),
        "New .gitignore should have pattern"
    );
}

#[tokio::test]
async fn test_add_to_gitignore_directory_pattern() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create directory with files
    std::fs::create_dir_all(tmp.path().join("node_modules/pkg")).expect("should create dir");
    std::fs::write(tmp.path().join("node_modules/pkg/index.js"), "code").expect("should write");

    // Action: add directory pattern
    ops.add_to_gitignore("node_modules/", ".gitignore")
        .await
        .expect("should add directory pattern");

    // Verify: git ignores files in directory
    assert!(
        git_is_ignored(tmp.path(), "node_modules/pkg/index.js"),
        "git should ignore files in ignored directory"
    );
}

#[tokio::test]
async fn test_add_to_gitignore_negation_pattern() {
    let (tmp, ops) = setup_test_repo();

    // Setup: add ignore all then exception
    write_gitignore(tmp.path(), ".gitignore", "*.txt\n");

    // Action: add negation pattern
    ops.add_to_gitignore("!important.txt", ".gitignore")
        .await
        .expect("should add negation pattern");

    // Verify: pattern exists
    assert!(
        gitignore_has_pattern(tmp.path(), ".gitignore", "!important.txt"),
        "Negation pattern should be added"
    );
}

// ==================== CLI sets up → RepoOperations reads ====================

#[tokio::test]
async fn test_gitignore_created_by_cli_read_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create .gitignore via direct write
    write_gitignore(tmp.path(), ".gitignore", "*.bak\n*.tmp\nbuild/\n");

    // Action: get ignore options for a file
    let options = ops
        .get_ignore_options("src/file.txt")
        .await
        .expect("should get ignore options");

    // Verify: RepoOperations sees the root .gitignore
    assert!(
        options.gitignore_files.contains(&".gitignore".to_string()),
        "RepoOperations should see root .gitignore"
    );
}

// ==================== get_ignore_options Tests ====================

#[tokio::test]
async fn test_get_ignore_options_returns_root_gitignore() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file in subdirectory
    std::fs::create_dir_all(tmp.path().join("src/lib")).expect("should create dirs");
    std::fs::write(tmp.path().join("src/lib/mod.rs"), "// code").expect("should write");

    // Action: get ignore options
    let options = ops
        .get_ignore_options("src/lib/mod.rs")
        .await
        .expect("should get ignore options");

    // Verify: root .gitignore is always included
    assert!(
        options.gitignore_files.contains(&".gitignore".to_string()),
        "Root .gitignore should always be an option"
    );
}

#[tokio::test]
async fn test_get_ignore_options_finds_ancestor_gitignores() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create nested .gitignore files
    std::fs::create_dir_all(tmp.path().join("src/deep/nested")).expect("should create dirs");
    write_gitignore(tmp.path(), "src/.gitignore", "*.o\n");

    // Action: get ignore options for deeply nested file
    let options = ops
        .get_ignore_options("src/deep/nested/file.txt")
        .await
        .expect("should get ignore options");

    // Verify: finds ancestor .gitignore
    assert!(
        options
            .gitignore_files
            .contains(&"src/.gitignore".to_string()),
        "Should find ancestor .gitignore in src/"
    );
}

#[tokio::test]
async fn test_get_ignore_options_default_is_closest() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple ancestor .gitignore files
    std::fs::create_dir_all(tmp.path().join("a/b/c")).expect("should create dirs");
    write_gitignore(tmp.path(), ".gitignore", "*.log\n");
    write_gitignore(tmp.path(), "a/.gitignore", "*.tmp\n");
    write_gitignore(tmp.path(), "a/b/.gitignore", "*.bak\n");

    // Action: get ignore options for file in c/
    let options = ops
        .get_ignore_options("a/b/c/file.txt")
        .await
        .expect("should get ignore options");

    // Verify: default is the closest ancestor
    assert_eq!(
        options.default_gitignore, "a/b/.gitignore",
        "Default should be closest ancestor .gitignore"
    );
}

#[tokio::test]
async fn test_get_ignore_options_generates_suggestions() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get ignore options for a file
    let options = ops
        .get_ignore_options("src/utils/helper.js")
        .await
        .expect("should get ignore options");

    // Verify: suggestions are generated
    assert!(
        !options.suggestions.is_empty(),
        "Should generate suggestions for ignoring the file"
    );

    // Should have various suggestion types
    let patterns: Vec<&str> = options
        .suggestions
        .iter()
        .map(|s| s.pattern.as_str())
        .collect();

    // Should suggest the exact file path
    assert!(
        patterns.iter().any(|p| p.contains("helper.js")),
        "Should suggest pattern containing filename"
    );
}

#[tokio::test]
async fn test_get_ignore_options_extension_suggestion() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get ignore options for file with extension
    let options = ops
        .get_ignore_options("data/cache.json")
        .await
        .expect("should get ignore options");

    // Verify: should suggest extension pattern
    let has_extension_pattern = options.suggestions.iter().any(|s| s.pattern == "*.json");
    assert!(
        has_extension_pattern,
        "Should suggest extension pattern *.json"
    );
}

#[tokio::test]
async fn test_get_ignore_options_directory_suggestion() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get ignore options for file in directory
    let options = ops
        .get_ignore_options("build/output/bundle.js")
        .await
        .expect("should get ignore options");

    // Verify: should suggest directory pattern
    let has_dir_pattern = options.suggestions.iter().any(|s| s.pattern.ends_with('/'));
    assert!(has_dir_pattern, "Should suggest directory pattern");
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_add_multiple_patterns_sequentially() {
    let (tmp, ops) = setup_test_repo();

    // Action: add multiple patterns one by one
    ops.add_to_gitignore("*.log", ".gitignore")
        .await
        .expect("should add first");
    ops.add_to_gitignore("*.tmp", ".gitignore")
        .await
        .expect("should add second");
    ops.add_to_gitignore("*.bak", ".gitignore")
        .await
        .expect("should add third");

    // Verify: all patterns exist
    let content = read_gitignore(tmp.path(), ".gitignore");
    assert!(content.contains("*.log"), "Should have *.log");
    assert!(content.contains("*.tmp"), "Should have *.tmp");
    assert!(content.contains("*.bak"), "Should have *.bak");
}

#[tokio::test]
async fn test_add_to_gitignore_special_characters() {
    let (tmp, ops) = setup_test_repo();

    // Action: add pattern with special regex characters
    ops.add_to_gitignore("[Bb]uild/", ".gitignore")
        .await
        .expect("should add pattern with brackets");

    // Verify: pattern is preserved exactly
    assert!(
        gitignore_has_pattern(tmp.path(), ".gitignore", "[Bb]uild/"),
        "Pattern with special chars should be preserved"
    );
}

#[tokio::test]
async fn test_add_to_gitignore_path_with_spaces() {
    let (tmp, ops) = setup_test_repo();

    // Action: add pattern with spaces in path
    ops.add_to_gitignore("My Documents/", ".gitignore")
        .await
        .expect("should add pattern with spaces");

    // Verify: pattern is preserved
    assert!(
        gitignore_has_pattern(tmp.path(), ".gitignore", "My Documents/"),
        "Pattern with spaces should be preserved"
    );
}

#[tokio::test]
async fn test_get_ignore_options_root_file() {
    let (_tmp, ops) = setup_test_repo();

    // Action: get ignore options for file at root
    let options = ops
        .get_ignore_options("config.json")
        .await
        .expect("should get ignore options");

    // Verify: root .gitignore is default
    assert_eq!(
        options.default_gitignore, ".gitignore",
        "Default should be root .gitignore for root-level file"
    );
}

#[tokio::test]
async fn test_add_to_gitignore_deeply_nested_file() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create deep directory structure
    std::fs::create_dir_all(tmp.path().join("a/b/c/d/e")).expect("should create dirs");

    // Action: add pattern to deeply nested .gitignore
    ops.add_to_gitignore("*.cache", "a/b/c/d/.gitignore")
        .await
        .expect("should add to deeply nested gitignore");

    // Verify: .gitignore was created
    assert!(
        tmp.path().join("a/b/c/d/.gitignore").exists(),
        "Deeply nested .gitignore should be created"
    );
    assert!(
        gitignore_has_pattern(tmp.path(), "a/b/c/d/.gitignore", "*.cache"),
        "Pattern should be in deeply nested .gitignore"
    );
}

#[tokio::test]
async fn test_add_to_gitignore_preserves_comments() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create .gitignore with comments
    write_gitignore(
        tmp.path(),
        ".gitignore",
        "# Build artifacts\n*.o\n*.a\n\n# Editor files\n*.swp\n",
    );

    // Action: add new pattern
    ops.add_to_gitignore("*.log", ".gitignore")
        .await
        .expect("should add pattern");

    // Verify: comments are preserved
    let content = read_gitignore(tmp.path(), ".gitignore");
    assert!(
        content.contains("# Build artifacts"),
        "Comments should be preserved"
    );
    assert!(
        content.contains("# Editor files"),
        "Comments should be preserved"
    );
}

#[tokio::test]
async fn test_add_to_gitignore_handles_no_trailing_newline() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create .gitignore without trailing newline
    std::fs::write(tmp.path().join(".gitignore"), "*.tmp").expect("should write");

    // Action: add new pattern
    ops.add_to_gitignore("*.log", ".gitignore")
        .await
        .expect("should add pattern");

    // Verify: both patterns on separate lines
    let content = read_gitignore(tmp.path(), ".gitignore");
    let lines: Vec<&str> = content.lines().collect();
    assert!(lines.contains(&"*.tmp"), "Original pattern should exist");
    assert!(lines.contains(&"*.log"), "New pattern should exist");
}
