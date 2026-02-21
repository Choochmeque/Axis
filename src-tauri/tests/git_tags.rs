#![cfg(feature = "integration")]

mod common;

use common::{git_cmd, setup_test_repo};

use axis_lib::models::{CreateTagOptions, ListTagsOptions};

// ==================== Helper ====================

/// List tags via CLI
fn git_tag_list(path: &std::path::Path) -> Vec<String> {
    let output = git_cmd(path, &["tag", "--list"]);
    if output.is_empty() {
        return Vec::new();
    }
    output
        .lines()
        .map(std::string::ToString::to_string)
        .collect()
}

/// Check if tag exists via CLI
fn git_tag_exists(path: &std::path::Path, tag_name: &str) -> bool {
    git_tag_list(path).contains(&tag_name.to_string())
}

/// Get tag message via CLI (for annotated tags)
fn git_tag_message(path: &std::path::Path, tag_name: &str) -> Option<String> {
    let output = git_cmd(path, &["tag", "-l", "-n1", tag_name]);
    if output.is_empty() {
        return None;
    }
    // Format: "tagname    message"
    let parts: Vec<&str> = output.splitn(2, char::is_whitespace).collect();
    parts.get(1).map(|s| s.trim().to_string())
}

// ==================== Happy Path Tests ====================

#[tokio::test]
async fn test_create_lightweight_tag_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Action: RepoOperations creates lightweight tag
    ops.tag_create("v1.0.0", &CreateTagOptions::default())
        .await
        .expect("should create tag");

    // Verify: git CLI sees the tag
    assert!(
        git_tag_exists(tmp.path(), "v1.0.0"),
        "CLI should see tag created by RepoOperations"
    );
}

#[tokio::test]
async fn test_create_annotated_tag_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();

    // Action: RepoOperations creates annotated tag
    let options = CreateTagOptions {
        annotated: true,
        message: Some("Release version 1.0.0".to_string()),
        ..Default::default()
    };
    ops.tag_create("v1.0.0", &options)
        .await
        .expect("should create annotated tag");

    // Verify: git CLI sees the tag with message
    assert!(
        git_tag_exists(tmp.path(), "v1.0.0"),
        "CLI should see annotated tag"
    );

    let message = git_tag_message(tmp.path(), "v1.0.0");
    assert!(message.is_some(), "Annotated tag should have a message");
}

#[tokio::test]
async fn test_cli_tag_read_by_ops() {
    let (tmp, ops) = setup_test_repo();

    // Setup: git CLI creates tag
    git_cmd(tmp.path(), &["tag", "cli-tag"]);

    // Verify: RepoOperations sees the tag
    let tags = ops
        .tag_list(ListTagsOptions::default())
        .await
        .expect("should list tags");
    assert!(
        tags.iter().any(|t| t.name == "cli-tag"),
        "RepoOperations should see tag created by CLI"
    );
}

#[tokio::test]
async fn test_delete_tag_verified_by_cli() {
    let (tmp, ops) = setup_test_repo();
    git_cmd(tmp.path(), &["tag", "to-delete"]);

    // Action: RepoOperations deletes tag
    ops.tag_delete("to-delete")
        .await
        .expect("should delete tag");

    // Verify: git CLI confirms tag gone
    assert!(
        !git_tag_exists(tmp.path(), "to-delete"),
        "CLI should not see tag deleted by RepoOperations"
    );
}

#[tokio::test]
async fn test_tag_at_specific_commit() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create another commit
    std::fs::write(tmp.path().join("file2.txt"), "content").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "Second commit"]);

    // Get first commit OID
    let first_commit = git_cmd(tmp.path(), &["rev-parse", "HEAD~1"]);

    // Action: create tag at first commit
    let options = CreateTagOptions {
        target: Some(first_commit.clone()),
        ..Default::default()
    };
    ops.tag_create("old-release", &options)
        .await
        .expect("should create tag at specific commit");

    // Verify: tag points to correct commit
    let tag_target = git_cmd(tmp.path(), &["rev-parse", "old-release"]);
    assert_eq!(
        tag_target, first_commit,
        "Tag should point to specified commit"
    );
}

#[tokio::test]
async fn test_list_multiple_tags() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create multiple tags via CLI
    git_cmd(tmp.path(), &["tag", "v1.0.0"]);
    git_cmd(tmp.path(), &["tag", "v1.1.0"]);
    git_cmd(tmp.path(), &["tag", "v2.0.0"]);

    // Action: list tags
    let tags = ops
        .tag_list(ListTagsOptions::default())
        .await
        .expect("should list tags");

    // Verify: all tags present
    let tag_names: Vec<&str> = tags.iter().map(|t| t.name.as_str()).collect();
    assert!(tag_names.contains(&"v1.0.0"), "Should contain v1.0.0");
    assert!(tag_names.contains(&"v1.1.0"), "Should contain v1.1.0");
    assert!(tag_names.contains(&"v2.0.0"), "Should contain v2.0.0");
}

// ==================== Edge Case Tests ====================

#[tokio::test]
async fn test_create_tag_same_name_same_target_succeeds() {
    let (tmp, ops) = setup_test_repo();

    // Create tag via CLI
    git_cmd(tmp.path(), &["tag", "existing"]);
    let original_target = git_cmd(tmp.path(), &["rev-parse", "existing"]);

    // Action: create same tag again (same target)
    let result = ops
        .tag_create("existing", &CreateTagOptions::default())
        .await;

    // Verify: succeeds (idempotent) and tag still points to same commit
    assert!(result.is_ok(), "Creating tag at same target should succeed");
    let current_target = git_cmd(tmp.path(), &["rev-parse", "existing"]);
    assert_eq!(
        original_target, current_target,
        "Tag should still point to same commit"
    );
}

#[tokio::test]
async fn test_list_empty_tags() {
    let (_tmp, ops) = setup_test_repo();

    // Action: list tags on repo with no tags
    let tags = ops
        .tag_list(ListTagsOptions::default())
        .await
        .expect("should list tags");

    // Verify: empty list
    assert!(tags.is_empty(), "New repo should have no tags");
}

#[tokio::test]
async fn test_tag_with_special_chars() {
    let (tmp, ops) = setup_test_repo();

    // Action: create tag with special characters
    ops.tag_create("release/v1.0.0-beta.1", &CreateTagOptions::default())
        .await
        .expect("should create tag with special chars");

    // Verify
    assert!(
        git_tag_exists(tmp.path(), "release/v1.0.0-beta.1"),
        "Tag with special chars should exist"
    );
}

#[tokio::test]
async fn test_force_overwrite_tag() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create tag and new commit
    git_cmd(tmp.path(), &["tag", "movable"]);
    let old_target = git_cmd(tmp.path(), &["rev-parse", "movable"]);

    std::fs::write(tmp.path().join("new.txt"), "new").expect("should write");
    git_cmd(tmp.path(), &["add", "."]);
    git_cmd(tmp.path(), &["commit", "-m", "New commit"]);

    // Action: force overwrite tag to new commit
    let options = CreateTagOptions {
        force: true,
        ..Default::default()
    };
    ops.tag_create("movable", &options)
        .await
        .expect("should force overwrite tag");

    // Verify: tag now points to new commit
    let new_target = git_cmd(tmp.path(), &["rev-parse", "movable"]);
    assert_ne!(old_target, new_target, "Tag should point to new commit");
}

#[tokio::test]
async fn test_tag_info_fields() {
    let (tmp, ops) = setup_test_repo();

    // Setup: create annotated tag
    git_cmd(
        tmp.path(),
        &["tag", "-a", "detailed", "-m", "Detailed tag message"],
    );

    // Action: list and find the tag
    let tags = ops
        .tag_list(ListTagsOptions::default())
        .await
        .expect("should list tags");
    let tag = tags
        .iter()
        .find(|t| t.name == "detailed")
        .expect("should find tag");

    // Verify: tag has expected fields
    assert_eq!(tag.name, "detailed");
    assert!(tag.full_name.contains("refs/tags/detailed"));
    assert!(tag.is_annotated, "Should be annotated");
    assert!(tag.message.is_some(), "Should have message");
}
