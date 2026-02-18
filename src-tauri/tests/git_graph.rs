#![cfg(feature = "integration")]

//! Integration tests for git graph, search, and blame operations.
//!
//! Pattern: `RepoOperations` performs actions → git CLI verifies (source of truth)
//!          git CLI sets up state → `RepoOperations` reads/verifies

mod common;

use axis_lib::models::{GraphOptions, SearchOptions};
use common::*;

// ==================== Local Helper Functions ====================

/// Create commits with specific messages for search testing
fn create_searchable_commits(path: &std::path::Path) {
    let commits = [
        ("file1.txt", "content1", "feat: add new feature"),
        ("file2.txt", "content2", "fix: resolve bug in parser"),
        ("file3.txt", "content3", "docs: update readme"),
        ("file4.txt", "content4", "feat: implement login"),
        ("file5.txt", "content5", "chore: update dependencies"),
    ];

    for (file, content, msg) in commits {
        std::fs::write(path.join(file), content).expect("should write");
        git_cmd(path, &["add", file]);
        git_cmd(path, &["commit", "-m", msg]);
    }
}

/// Create commits by a specific author
fn create_commits_by_author(path: &std::path::Path, author: &str, count: usize) {
    for i in 1..=count {
        std::fs::write(
            path.join(format!("{author}_{i}.txt")),
            format!("content {i}"),
        )
        .expect("should write");
        git_cmd(path, &["add", "."]);
        // Use commit with author override
        let output = std::process::Command::new("git")
            .args([
                "-c",
                &format!("user.name={author}"),
                "-c",
                &format!("user.email={author}@test.com"),
                "commit",
                "-m",
                &format!("Commit by {author} #{i}"),
            ])
            .current_dir(path)
            .output()
            .expect("should execute git");
        if !output.status.success() {
            panic!(
                "git commit failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
        }
    }
}

/// Get commit count via CLI
fn git_commit_count(path: &std::path::Path) -> usize {
    let output = git_cmd(path, &["rev-list", "--count", "HEAD"]);
    output.trim().parse().unwrap_or(0)
}

/// Get blame output via CLI
fn git_blame_line_count(path: &std::path::Path, file: &str) -> usize {
    let output = std::process::Command::new("git")
        .args(["blame", file])
        .current_dir(path)
        .output()
        .expect("should execute git");
    String::from_utf8_lossy(&output.stdout).lines().count()
}

// ==================== build_graph Tests ====================

#[tokio::test]
async fn test_build_graph_returns_commits() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create some commits
    create_searchable_commits(tmp.path());

    // Action: build graph
    let options = GraphOptions {
        limit: Some(10),
        ..Default::default()
    };
    let result = ops.build_graph(options).await.expect("should build graph");

    // Verify: has commits
    assert!(!result.commits.is_empty(), "Graph should have commits");
}

#[tokio::test]
async fn test_build_graph_respects_limit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create more commits than limit
    create_searchable_commits(tmp.path());

    // Action: build graph with limit
    let options = GraphOptions {
        limit: Some(3),
        ..Default::default()
    };
    let result = ops.build_graph(options).await.expect("should build graph");

    // Verify: respects limit
    assert!(
        result.commits.len() <= 3,
        "Should respect limit: got {}",
        result.commits.len()
    );
}

#[tokio::test]
async fn test_build_graph_has_more_flag() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commits
    create_searchable_commits(tmp.path());

    // Action: build graph with small limit
    let options = GraphOptions {
        limit: Some(2),
        ..Default::default()
    };
    let result = ops.build_graph(options).await.expect("should build graph");

    // Verify: has_more is set when more commits exist
    // We have 6 commits (initial + 5), limit is 2
    assert!(result.has_more, "Should indicate more commits available");
}

#[tokio::test]
async fn test_build_graph_with_skip() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_searchable_commits(tmp.path());

    // Get all commits first
    let all = ops
        .build_graph(GraphOptions {
            limit: Some(10),
            ..Default::default()
        })
        .await
        .expect("should get all");

    // Action: skip first 2 commits
    let options = GraphOptions {
        limit: Some(10),
        skip: Some(2),
        ..Default::default()
    };
    let result = ops.build_graph(options).await.expect("should build graph");

    // Verify: skipped commits
    assert!(
        result.commits.len() < all.commits.len(),
        "Should have fewer commits after skip"
    );
}

#[tokio::test]
async fn test_build_graph_verified_by_cli_count() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_searchable_commits(tmp.path());

    // Action: build graph
    let options = GraphOptions {
        limit: Some(100),
        ..Default::default()
    };
    let result = ops.build_graph(options).await.expect("should build graph");

    // Verify: matches CLI commit count
    let cli_count = git_commit_count(tmp.path());
    assert_eq!(
        result.commits.len(),
        cli_count,
        "Graph commit count should match CLI"
    );
}

// ==================== search_commits Tests ====================

#[tokio::test]
async fn test_search_commits_by_message() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_searchable_commits(tmp.path());

    // Action: search for "feat"
    let options = SearchOptions {
        query: "feat".to_string(),
        ..Default::default()
    };
    let result = ops.search_commits(options).await.expect("should search");

    // Verify: finds feat commits
    assert!(
        result.commits.len() >= 2,
        "Should find commits with 'feat' in message"
    );
    for commit in &result.commits {
        assert!(
            commit.message.to_lowercase().contains("feat"),
            "Found commit should contain 'feat'"
        );
    }
}

#[tokio::test]
async fn test_search_commits_by_author() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commits by different authors
    create_commits_by_author(tmp.path(), "Alice", 3);
    create_commits_by_author(tmp.path(), "Bob", 2);

    // Action: search for Alice
    let options = SearchOptions {
        query: "Alice".to_string(),
        ..Default::default()
    };
    let result = ops.search_commits(options).await.expect("should search");

    // Verify: finds Alice's commits
    assert!(
        result.commits.len() >= 3,
        "Should find Alice's commits: got {}",
        result.commits.len()
    );
}

#[tokio::test]
async fn test_search_commits_no_results() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_searchable_commits(tmp.path());

    // Action: search for something that doesn't exist
    let options = SearchOptions {
        query: "nonexistent_query_xyz123".to_string(),
        ..Default::default()
    };
    let result = ops.search_commits(options).await.expect("should search");

    // Verify: no results
    assert!(result.commits.is_empty(), "Should find no commits");
    assert_eq!(result.total_matches, 0);
}

#[tokio::test]
async fn test_search_commits_with_limit() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_searchable_commits(tmp.path());

    // Action: search with limit
    let options = SearchOptions {
        query: "commit".to_string(), // Initial commit matches
        limit: Some(2),
        ..Default::default()
    };
    let result = ops.search_commits(options).await.expect("should search");

    // Verify: respects limit
    assert!(result.commits.len() <= 2, "Should respect limit");
}

// ==================== blame_file Tests ====================

#[tokio::test]
async fn test_blame_file_returns_lines() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file with content
    std::fs::write(tmp.path().join("blame.txt"), "line1\nline2\nline3\n").expect("should write");
    git_cmd(tmp.path(), &["add", "blame.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add blame.txt"]);

    // Action: blame the file
    let result = ops
        .blame_file("blame.txt", None)
        .await
        .expect("should blame");

    // Verify: has blame lines
    assert_eq!(result.lines.len(), 3, "Should have 3 blame lines");
}

#[tokio::test]
async fn test_blame_file_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    std::fs::write(tmp.path().join("verify.txt"), "a\nb\nc\nd\ne\n").expect("should write");
    git_cmd(tmp.path(), &["add", "verify.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add file"]);

    // Action: blame via RepoOperations
    let result = ops
        .blame_file("verify.txt", None)
        .await
        .expect("should blame");

    // Verify: matches CLI line count
    let cli_lines = git_blame_line_count(tmp.path(), "verify.txt");
    assert_eq!(
        result.lines.len(),
        cli_lines,
        "Blame line count should match CLI"
    );
}

#[tokio::test]
async fn test_blame_file_has_commit_info() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    std::fs::write(tmp.path().join("info.txt"), "content\n").expect("should write");
    git_cmd(tmp.path(), &["add", "info.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Add info"]);

    // Action
    let result = ops
        .blame_file("info.txt", None)
        .await
        .expect("should blame");

    // Verify: has commit info
    let line = &result.lines[0];
    assert!(!line.commit_oid.is_empty(), "Should have commit OID");
    assert!(!line.author.is_empty(), "Should have author");
}

#[tokio::test]
async fn test_blame_file_tracks_changes() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create file, then modify it
    std::fs::write(tmp.path().join("track.txt"), "original\n").expect("should write");
    git_cmd(tmp.path(), &["add", "track.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Original"]);

    let original_sha = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);

    std::fs::write(tmp.path().join("track.txt"), "original\nmodified\n").expect("should write");
    git_cmd(tmp.path(), &["add", "track.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "Modified"]);

    let modified_sha = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);

    // Action
    let result = ops
        .blame_file("track.txt", None)
        .await
        .expect("should blame");

    // Verify: different commits for different lines
    assert_eq!(result.lines.len(), 2);
    assert!(
        result.lines[0].commit_oid.starts_with(&original_sha[..7])
            || result.lines[1].commit_oid.starts_with(&modified_sha[..7]),
        "Blame should show commits that modified each line"
    );
}

#[tokio::test]
async fn test_blame_file_at_specific_commit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create and modify file
    std::fs::write(tmp.path().join("history.txt"), "v1\n").expect("should write");
    git_cmd(tmp.path(), &["add", "history.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "v1"]);
    let v1_sha = git_cmd(tmp.path(), &["rev-parse", "HEAD"]);

    std::fs::write(tmp.path().join("history.txt"), "v1\nv2\n").expect("should write");
    git_cmd(tmp.path(), &["add", "history.txt"]);
    git_cmd(tmp.path(), &["commit", "-m", "v2"]);

    // Action: blame at v1 commit
    let result = ops
        .blame_file("history.txt", Some(&v1_sha))
        .await
        .expect("should blame at commit");

    // Verify: only shows 1 line at v1
    assert_eq!(result.lines.len(), 1, "Should show file as it was at v1");
}

// ==================== get_commit_count Tests ====================

#[tokio::test]
async fn test_get_commit_count() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_searchable_commits(tmp.path());

    // Action
    let count = ops.get_commit_count(None).await.expect("should get count");

    // Verify: matches CLI
    let cli_count = git_commit_count(tmp.path());
    assert_eq!(count, cli_count, "Commit count should match CLI");
}

#[tokio::test]
async fn test_get_commit_count_from_ref() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create commits
    create_searchable_commits(tmp.path());
    let mid_sha = git_cmd(tmp.path(), &["rev-parse", "HEAD~2"]);

    // Action: count from mid point
    let count = ops
        .get_commit_count(Some(&mid_sha))
        .await
        .expect("should get count");

    // Verify: should be less than total
    let total = git_commit_count(tmp.path());
    assert!(count < total, "Count from ref should be less than total");
}

// ==================== Edge Cases ====================

#[tokio::test]
async fn test_blame_nonexistent_file() {
    let (_tmp, ops) = setup_test_repo();

    // Action: blame non-existent file
    let result = ops.blame_file("nonexistent.txt", None).await;

    // Verify: should fail
    assert!(result.is_err(), "Blaming non-existent file should fail");
}

#[tokio::test]
async fn test_build_graph_empty_options() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_searchable_commits(tmp.path());

    // Action: use default options
    let result = ops
        .build_graph(GraphOptions::default())
        .await
        .expect("should build graph");

    // Verify: still works
    assert!(!result.commits.is_empty());
}

#[tokio::test]
async fn test_search_empty_query() {
    let (tmp, ops) = setup_test_repo();

    // Setup
    create_searchable_commits(tmp.path());

    // Action: search with empty query
    let options = SearchOptions {
        query: String::new(),
        ..Default::default()
    };
    let result = ops.search_commits(options).await;

    // Verify: either returns all or none (implementation-dependent)
    assert!(result.is_ok(), "Empty query should not crash");
}
