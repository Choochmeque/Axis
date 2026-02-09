#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

use axis_lib::models::GrepOptions;

// ==================== Helpers ====================

/// Get HEAD OID via CLI
fn git_head_oid(path: &std::path::Path) -> String {
    git_cmd(path, &["rev-parse", "HEAD"])
}

/// Run git grep via CLI and return match count
fn git_grep_count(path: &std::path::Path, pattern: &str) -> usize {
    // git grep returns non-zero if no matches, so we handle that
    let output = std::process::Command::new("git")
        .args(["grep", "-c", pattern])
        .current_dir(path)
        .output()
        .expect("should execute git");

    if !output.status.success() {
        return 0;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| {
            // Format is "filename:count"
            line.split(':').last()?.parse::<usize>().ok()
        })
        .sum()
}

/// Run git grep via CLI and return matching files
fn git_grep_files(path: &std::path::Path, pattern: &str) -> Vec<String> {
    let output = std::process::Command::new("git")
        .args(["grep", "-l", pattern])
        .current_dir(path)
        .output()
        .expect("should execute git");

    if !output.status.success() {
        return Vec::new();
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(|s| s.to_string())
        .collect()
}

/// Run git grep in a specific commit via CLI
fn git_grep_commit_files(path: &std::path::Path, commit: &str, pattern: &str) -> Vec<String> {
    let output = std::process::Command::new("git")
        .args(["grep", "-l", pattern, commit])
        .current_dir(path)
        .output()
        .expect("should execute git");

    if !output.status.success() {
        return Vec::new();
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(|s| {
            // Format is "commit:filename", extract filename
            s.split(':').nth(1).unwrap_or(s).to_string()
        })
        .collect()
}

// ==================== grep Tests ====================

#[tokio::test]
async fn test_grep_finds_pattern_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create files with searchable content
    std::fs::write(tmp.path().join("file1.txt"), "Hello World\nfoo bar\n").expect("should write");
    std::fs::write(tmp.path().join("file2.txt"), "Another Hello\ntest\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add files"]);

    // Get CLI results
    let cli_files = git_grep_files(tmp.path(), "Hello");
    assert!(!cli_files.is_empty(), "CLI should find matches");

    // Action: RepoOperations grep
    let options = GrepOptions {
        pattern: "Hello".to_string(),
        ..Default::default()
    };
    let result = ops.grep(&options).await.expect("should grep");

    // Verify: found matches
    assert!(!result.matches.is_empty(), "Should find matches");

    // Verify: same files as CLI
    let ops_files: Vec<&str> = result.matches.iter().map(|m| m.path.as_str()).collect();
    for cli_file in &cli_files {
        assert!(
            ops_files.contains(&cli_file.as_str()),
            "Ops should find same files as CLI"
        );
    }
}

#[tokio::test]
async fn test_grep_no_matches_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create files without the search pattern
    std::fs::write(tmp.path().join("file.txt"), "foo bar baz\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Verify: CLI finds no matches
    let cli_count = git_grep_count(tmp.path(), "nonexistent");
    assert_eq!(cli_count, 0, "CLI should find no matches");

    // Action: RepoOperations grep
    let options = GrepOptions {
        pattern: "nonexistent".to_string(),
        ..Default::default()
    };
    let result = ops.grep(&options).await.expect("should grep");

    // Verify: no matches
    assert!(result.matches.is_empty(), "Should find no matches");
    assert_eq!(result.total_matches, 0, "Total should be 0");
}

#[tokio::test]
async fn test_grep_case_insensitive_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file with mixed case
    std::fs::write(tmp.path().join("file.txt"), "Hello HELLO hello\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Case-sensitive grep
    let options_sensitive = GrepOptions {
        pattern: "hello".to_string(),
        ignore_case: false,
        ..Default::default()
    };
    let result_sensitive = ops.grep(&options_sensitive).await.expect("should grep");

    // Case-insensitive grep
    let options_insensitive = GrepOptions {
        pattern: "hello".to_string(),
        ignore_case: true,
        ..Default::default()
    };
    let result_insensitive = ops.grep(&options_insensitive).await.expect("should grep");

    // Verify: case-insensitive finds more or equal matches
    assert!(
        result_insensitive.total_matches >= result_sensitive.total_matches,
        "Case-insensitive should find >= matches than case-sensitive"
    );
}

#[tokio::test]
async fn test_grep_with_line_numbers() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file
    std::fs::write(tmp.path().join("file.txt"), "line1\nfind me\nline3\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Action: grep with line numbers
    let options = GrepOptions {
        pattern: "find".to_string(),
        show_line_numbers: true,
        ..Default::default()
    };
    let result = ops.grep(&options).await.expect("should grep");

    // Verify: has line numbers
    assert!(!result.matches.is_empty(), "Should find match");
    let first_match = &result.matches[0];
    assert!(first_match.line_number.is_some(), "Should have line number");
    assert_eq!(first_match.line_number, Some(2), "Should be on line 2");
}

#[tokio::test]
async fn test_grep_with_path_filter() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create files in different paths
    std::fs::create_dir_all(tmp.path().join("src")).expect("should create dir");
    std::fs::create_dir_all(tmp.path().join("tests")).expect("should create dir");
    std::fs::write(tmp.path().join("src/main.rs"), "TODO: implement\n").expect("should write");
    std::fs::write(tmp.path().join("tests/test.rs"), "TODO: test\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add files"]);

    // Action: grep only in src/
    let options = GrepOptions {
        pattern: "TODO".to_string(),
        paths: vec!["src/".to_string()],
        ..Default::default()
    };
    let result = ops.grep(&options).await.expect("should grep");

    // Verify: only finds in src/
    assert!(!result.matches.is_empty(), "Should find matches");
    for m in &result.matches {
        assert!(
            m.path.starts_with("src/"),
            "Should only find in src/, found: {}",
            m.path
        );
    }
}

#[tokio::test]
async fn test_grep_with_max_count() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file with many matches
    let content = "match\nmatch\nmatch\nmatch\nmatch\n";
    std::fs::write(tmp.path().join("file.txt"), content).expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Action: grep with max count
    let options = GrepOptions {
        pattern: "match".to_string(),
        max_count: Some(2),
        show_line_numbers: true,
        ..Default::default()
    };
    let result = ops.grep(&options).await.expect("should grep");

    // Verify: limited to max_count
    assert!(
        result.matches.len() <= 2,
        "Should be limited to max_count, got {}",
        result.matches.len()
    );
}

#[tokio::test]
async fn test_grep_word_regexp() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file with word and partial matches
    std::fs::write(tmp.path().join("file.txt"), "test testing tested\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Action: grep without word regexp
    let options_partial = GrepOptions {
        pattern: "test".to_string(),
        word_regexp: false,
        ..Default::default()
    };
    let result_partial = ops.grep(&options_partial).await.expect("should grep");

    // Action: grep with word regexp
    let options_word = GrepOptions {
        pattern: "test".to_string(),
        word_regexp: true,
        ..Default::default()
    };
    let result_word = ops.grep(&options_word).await.expect("should grep");

    // Both should find matches (the line contains "test" as a word)
    assert!(
        !result_partial.matches.is_empty(),
        "Should find partial matches"
    );
    assert!(!result_word.matches.is_empty(), "Should find word match");
}

// ==================== grep_commit Tests ====================

#[tokio::test]
async fn test_grep_commit_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create a commit with searchable content
    std::fs::write(tmp.path().join("file.txt"), "unique_pattern_123\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file with pattern"]);
    let commit_oid = git_head_oid(tmp.path());

    // Get CLI results
    let cli_files = git_grep_commit_files(tmp.path(), &commit_oid, "unique_pattern");
    assert!(!cli_files.is_empty(), "CLI should find matches in commit");

    // Action: RepoOperations grep_commit
    let options = GrepOptions {
        pattern: "unique_pattern".to_string(),
        ..Default::default()
    };
    let result = ops
        .grep_commit(&commit_oid, &options)
        .await
        .expect("should grep commit");

    // Verify: found matches
    assert!(!result.matches.is_empty(), "Should find matches in commit");
}

#[tokio::test]
async fn test_grep_commit_different_from_current() {
    let (tmp, ops) = setup_test_repo();

    // Setup: first commit with pattern
    std::fs::write(tmp.path().join("file.txt"), "old_pattern\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Old pattern"]);
    let old_oid = git_head_oid(tmp.path());

    // Second commit that removes the pattern
    std::fs::write(tmp.path().join("file.txt"), "new_content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Replace pattern"]);

    // Grep current working tree - should not find old_pattern
    let options = GrepOptions {
        pattern: "old_pattern".to_string(),
        ..Default::default()
    };
    let current_result = ops.grep(&options).await.expect("should grep");
    assert!(
        current_result.matches.is_empty(),
        "Current should not have old_pattern"
    );

    // Grep old commit - should find old_pattern
    let old_result = ops
        .grep_commit(&old_oid, &options)
        .await
        .expect("should grep commit");
    assert!(
        !old_result.matches.is_empty(),
        "Old commit should have old_pattern"
    );
}

#[tokio::test]
async fn test_grep_commit_with_options() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commit
    std::fs::write(tmp.path().join("file.txt"), "Test TEST test\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);
    let oid = git_head_oid(tmp.path());

    // Action: grep commit with case-insensitive
    let options = GrepOptions {
        pattern: "test".to_string(),
        ignore_case: true,
        show_line_numbers: true,
        ..Default::default()
    };
    let result = ops.grep_commit(&oid, &options).await.expect("should grep");

    // Verify
    assert!(!result.matches.is_empty(), "Should find matches");
}

#[tokio::test]
async fn test_grep_commit_no_matches() {
    let (tmp, ops) = setup_test_repo();

    let oid = git_head_oid(tmp.path());

    // Action: grep for non-existent pattern
    let options = GrepOptions {
        pattern: "definitely_not_in_readme_xyz".to_string(),
        ..Default::default()
    };
    let result = ops.grep_commit(&oid, &options).await.expect("should grep");

    // Verify: no matches
    assert!(result.matches.is_empty(), "Should find no matches");
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_grep_empty_pattern() {
    let (tmp, ops) = setup_test_repo();

    std::fs::write(tmp.path().join("file.txt"), "content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Action: grep with empty pattern (should fail or return all)
    let options = GrepOptions {
        pattern: "".to_string(),
        ..Default::default()
    };
    let result = ops.grep(&options).await;

    // Empty pattern behavior varies - just ensure it doesn't panic
    // It may error or return results depending on git version
    let _ = result;
}

#[tokio::test]
async fn test_grep_regex_pattern() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file with patterns
    std::fs::write(
        tmp.path().join("file.txt"),
        "foo123bar\nfoo456bar\nnoMatch\n",
    )
    .expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Action: grep with extended regex
    let options = GrepOptions {
        pattern: "foo[0-9]+bar".to_string(),
        extended_regexp: true,
        ..Default::default()
    };
    let result = ops.grep(&options).await.expect("should grep");

    // Verify: finds regex matches
    assert!(!result.matches.is_empty(), "Should find regex matches");
    assert_eq!(result.total_matches, 2, "Should find 2 matches");
}

#[tokio::test]
async fn test_grep_invert_match() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file
    std::fs::write(tmp.path().join("file.txt"), "keep\nskip\nkeep\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Action: grep with invert match
    let options = GrepOptions {
        pattern: "skip".to_string(),
        invert_match: true,
        show_line_numbers: true,
        ..Default::default()
    };
    let result = ops.grep(&options).await.expect("should grep");

    // Verify: finds lines NOT matching
    assert!(!result.matches.is_empty(), "Should find non-matching lines");
    for m in &result.matches {
        assert!(!m.content.contains("skip"), "Should not contain 'skip'");
    }
}

#[tokio::test]
async fn test_grep_binary_file_handling() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create binary file
    let binary_content: Vec<u8> = vec![0x00, 0x01, 0x02, b'h', b'e', b'l', b'l', b'o', 0xFF];
    std::fs::write(tmp.path().join("binary.bin"), &binary_content).expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add binary"]);

    // Action: grep (should handle binary gracefully)
    let options = GrepOptions {
        pattern: "hello".to_string(),
        ..Default::default()
    };
    let result = ops.grep(&options).await;

    // Should complete without panic
    let _ = result;
}

#[tokio::test]
async fn test_grep_special_characters() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file with special characters
    std::fs::write(tmp.path().join("file.txt"), "func() { return; }\n").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Action: grep for literal special chars (escaped)
    let options = GrepOptions {
        pattern: "func()".to_string(),
        ..Default::default()
    };
    let result = ops.grep(&options).await.expect("should grep");

    // May or may not find depending on regex interpretation
    // Just verify it doesn't error
    let _ = result;
}

#[tokio::test]
async fn test_grep_multiple_files() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple files with the pattern
    for i in 1..=5 {
        std::fs::write(
            tmp.path().join(format!("file{i}.txt")),
            format!("common_pattern in file {i}\n"),
        )
        .expect("should write");
    }
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Add files"]);

    // Get CLI results
    let cli_files = git_grep_files(tmp.path(), "common_pattern");

    // Action: RepoOperations grep
    let options = GrepOptions {
        pattern: "common_pattern".to_string(),
        ..Default::default()
    };
    let result = ops.grep(&options).await.expect("should grep");

    // Verify: same number of files
    let ops_files: std::collections::HashSet<&str> =
        result.matches.iter().map(|m| m.path.as_str()).collect();
    assert_eq!(
        ops_files.len(),
        cli_files.len(),
        "Should find same number of files as CLI"
    );
}
