use serde::{Deserialize, Serialize};
use specta::Type;

/// Result of an archive operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveResult {
    pub message: String,
    pub output_path: Option<String>,
    pub size_bytes: Option<u64>,
}

/// Options for creating an archive
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ArchiveOptions {
    /// The reference to archive (commit SHA, branch name, tag)
    pub reference: String,
    /// Archive format: zip, tar, tar.gz, tar.bz2
    pub format: String,
    /// Output file path
    pub output_path: String,
    /// Optional prefix for files in the archive
    pub prefix: Option<String>,
}

/// Result of a patch operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PatchResult {
    /// Message describing the result of the operation
    pub message: String,
    /// Paths to created or applied patch files
    pub patches: Vec<String>,
}

/// Options for creating patches
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct CreatePatchOptions {
    /// The commit SHA to create patch from (None = staged changes)
    pub commit_oid: Option<String>,
    /// Output directory for patch files
    pub output_dir: String,
}

/// Options for format-patch (creating patches from commit range)
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct FormatPatchOptions {
    /// Range specification (e.g., "HEAD~3", "main..feature", "abc123")
    pub range: String,
    /// Output directory for patch files
    pub output_dir: String,
}

/// Options for applying a patch
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ApplyPatchOptions {
    /// Path to the patch file
    pub patch_path: String,
    /// Only check if patch can be applied, don't actually apply
    pub check_only: bool,
    /// Use 3-way merge if patch doesn't apply cleanly
    pub three_way: bool,
}

/// Options for applying mailbox patches (git am)
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct ApplyMailboxOptions {
    /// Paths to patch files
    pub patch_paths: Vec<String>,
    /// Use 3-way merge if patch doesn't apply cleanly
    pub three_way: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== ArchiveResult Tests ====================

    #[test]
    fn test_archive_result_success() {
        let result = ArchiveResult {
            message: "Archive created successfully".to_string(),
            output_path: Some("/tmp/repo.zip".to_string()),
            size_bytes: Some(1024 * 1024),
        };

        assert!(result.output_path.is_some());
        assert_eq!(result.size_bytes, Some(1024 * 1024));
    }

    #[test]
    fn test_archive_result_failure() {
        let result = ArchiveResult {
            message: "Failed to create archive".to_string(),
            output_path: None,
            size_bytes: None,
        };

        assert!(result.output_path.is_none());
        assert!(result.size_bytes.is_none());
    }

    #[test]
    fn test_archive_result_serialization() {
        let result = ArchiveResult {
            message: "OK".to_string(),
            output_path: Some("/tmp/out.tar.gz".to_string()),
            size_bytes: Some(5000),
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"outputPath\":\"/tmp/out.tar.gz\""));
        assert!(json.contains("\"sizeBytes\":5000"));
    }

    // ==================== ArchiveOptions Tests ====================

    #[test]
    fn test_archive_options_default() {
        let opts = ArchiveOptions::default();

        assert!(opts.reference.is_empty());
        assert!(opts.format.is_empty());
        assert!(opts.output_path.is_empty());
        assert!(opts.prefix.is_none());
    }

    #[test]
    fn test_archive_options_zip() {
        let opts = ArchiveOptions {
            reference: "HEAD".to_string(),
            format: "zip".to_string(),
            output_path: "/tmp/archive.zip".to_string(),
            prefix: Some("project/".to_string()),
        };

        assert_eq!(opts.format, "zip");
        assert_eq!(opts.prefix, Some("project/".to_string()));
    }

    #[test]
    fn test_archive_options_tar() {
        let opts = ArchiveOptions {
            reference: "v1.0.0".to_string(),
            format: "tar.gz".to_string(),
            output_path: "/tmp/release.tar.gz".to_string(),
            prefix: None,
        };

        assert_eq!(opts.format, "tar.gz");
        assert_eq!(opts.reference, "v1.0.0");
    }

    #[test]
    fn test_archive_options_serialization() {
        let opts = ArchiveOptions {
            reference: "main".to_string(),
            format: "zip".to_string(),
            output_path: "/out.zip".to_string(),
            prefix: Some("repo/".to_string()),
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"reference\":\"main\""));
        assert!(json.contains("\"format\":\"zip\""));
        assert!(json.contains("\"prefix\":\"repo/\""));
    }

    // ==================== PatchResult Tests ====================

    #[test]
    fn test_patch_result_success() {
        let result = PatchResult {
            message: "Patches created".to_string(),
            patches: vec![
                "0001-Add-feature.patch".to_string(),
                "0002-Fix-bug.patch".to_string(),
            ],
        };

        assert_eq!(result.patches.len(), 2);
    }

    #[test]
    fn test_patch_result_empty() {
        let result = PatchResult {
            message: "No patches to create".to_string(),
            patches: vec![],
        };

        assert!(result.patches.is_empty());
    }

    #[test]
    fn test_patch_result_serialization() {
        let result = PatchResult {
            message: "OK".to_string(),
            patches: vec!["patch1.patch".to_string()],
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"patches\":[\"patch1.patch\"]"));
    }

    // ==================== CreatePatchOptions Tests ====================

    #[test]
    fn test_create_patch_options_default() {
        let opts = CreatePatchOptions::default();

        assert!(opts.commit_oid.is_none());
        assert!(opts.output_dir.is_empty());
    }

    #[test]
    fn test_create_patch_options_from_commit() {
        let opts = CreatePatchOptions {
            commit_oid: Some("abc123".to_string()),
            output_dir: "/tmp/patches".to_string(),
        };

        assert_eq!(opts.commit_oid, Some("abc123".to_string()));
        assert_eq!(opts.output_dir, "/tmp/patches");
    }

    #[test]
    fn test_create_patch_options_staged() {
        let opts = CreatePatchOptions {
            commit_oid: None,
            output_dir: "./patches".to_string(),
        };

        assert!(opts.commit_oid.is_none());
    }

    // ==================== FormatPatchOptions Tests ====================

    #[test]
    fn test_format_patch_options_default() {
        let opts = FormatPatchOptions::default();

        assert!(opts.range.is_empty());
        assert!(opts.output_dir.is_empty());
    }

    #[test]
    fn test_format_patch_options_range() {
        let opts = FormatPatchOptions {
            range: "HEAD~5".to_string(),
            output_dir: "/tmp/patches".to_string(),
        };

        assert_eq!(opts.range, "HEAD~5");
    }

    #[test]
    fn test_format_patch_options_branch_range() {
        let opts = FormatPatchOptions {
            range: "main..feature".to_string(),
            output_dir: "./patches".to_string(),
        };

        assert!(opts.range.contains(".."));
    }

    // ==================== ApplyPatchOptions Tests ====================

    #[test]
    fn test_apply_patch_options_default() {
        let opts = ApplyPatchOptions::default();

        assert!(opts.patch_path.is_empty());
        assert!(!opts.check_only);
        assert!(!opts.three_way);
    }

    #[test]
    fn test_apply_patch_options_check() {
        let opts = ApplyPatchOptions {
            patch_path: "/tmp/fix.patch".to_string(),
            check_only: true,
            three_way: false,
        };

        assert!(opts.check_only);
        assert!(!opts.three_way);
    }

    #[test]
    fn test_apply_patch_options_three_way() {
        let opts = ApplyPatchOptions {
            patch_path: "changes.patch".to_string(),
            check_only: false,
            three_way: true,
        };

        assert!(opts.three_way);
    }

    #[test]
    fn test_apply_patch_options_serialization() {
        let opts = ApplyPatchOptions {
            patch_path: "test.patch".to_string(),
            check_only: true,
            three_way: true,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"patchPath\":\"test.patch\""));
        assert!(json.contains("\"checkOnly\":true"));
        assert!(json.contains("\"threeWay\":true"));
    }

    // ==================== ApplyMailboxOptions Tests ====================

    #[test]
    fn test_apply_mailbox_options_default() {
        let opts = ApplyMailboxOptions::default();

        assert!(opts.patch_paths.is_empty());
        assert!(!opts.three_way);
    }

    #[test]
    fn test_apply_mailbox_options_multiple_patches() {
        let opts = ApplyMailboxOptions {
            patch_paths: vec![
                "0001-first.patch".to_string(),
                "0002-second.patch".to_string(),
                "0003-third.patch".to_string(),
            ],
            three_way: true,
        };

        assert_eq!(opts.patch_paths.len(), 3);
        assert!(opts.three_way);
    }

    #[test]
    fn test_apply_mailbox_options_serialization() {
        let opts = ApplyMailboxOptions {
            patch_paths: vec!["a.patch".to_string()],
            three_way: false,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"patchPaths\":[\"a.patch\"]"));
        assert!(json.contains("\"threeWay\":false"));
    }
}
