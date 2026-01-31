use serde::{Deserialize, Serialize};
use specta::Type;

/// Status of Git LFS in the repository
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsStatus {
    /// Whether git-lfs is installed on the system
    pub is_installed: bool,
    /// Version of git-lfs if installed
    pub version: Option<String>,
    /// Whether LFS is initialized in the repository
    pub is_initialized: bool,
    /// Number of tracked patterns
    pub tracked_patterns_count: usize,
    /// Number of LFS files in the repository
    pub lfs_files_count: usize,
}

/// A tracked LFS pattern
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsTrackedPattern {
    /// The pattern (e.g., "*.psd", "assets/*.png")
    pub pattern: String,
    /// Source file where the pattern is defined (usually .gitattributes)
    pub source_file: String,
}

/// Status of an LFS file
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum LfsFileStatus {
    /// File content is downloaded locally
    Downloaded,
    /// File is a pointer (content not downloaded)
    Pointer,
    /// File is not tracked by LFS
    NotLfs,
    /// Status unknown
    Unknown,
}

/// An LFS-tracked file
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsFile {
    /// Path to the file relative to repository root
    pub path: String,
    /// LFS object ID (SHA-256)
    pub oid: String,
    /// File size in bytes
    pub size: u64,
    /// Whether the file content is downloaded
    pub is_downloaded: bool,
    /// File status
    pub status: LfsFileStatus,
}

/// Options for LFS fetch operation
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsFetchOptions {
    /// Fetch LFS objects for all refs
    pub all: bool,
    /// Fetch only recent LFS objects
    pub recent: bool,
    /// Include objects for the specified remote
    pub remote: Option<String>,
    /// Specific refs to fetch (branches, tags)
    pub refs: Vec<String>,
}

/// Options for LFS pull operation
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsPullOptions {
    /// Remote to pull from
    pub remote: Option<String>,
}

/// Options for LFS push operation
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsPushOptions {
    /// Remote to push to
    pub remote: Option<String>,
    /// Push all local LFS objects
    pub all: bool,
    /// Dry run - don't actually push
    pub dry_run: bool,
}

/// Options for LFS migrate operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsMigrateOptions {
    /// Migration mode: import or export
    pub mode: LfsMigrateMode,
    /// File patterns to include
    pub include: Vec<String>,
    /// File patterns to exclude
    pub exclude: Vec<String>,
    /// Include all refs
    pub everything: bool,
    /// Specific refs to migrate
    pub refs: Vec<String>,
    /// Rewrite history (use with caution)
    pub above: Option<u64>,
}

/// LFS migration mode
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "PascalCase")]
pub enum LfsMigrateMode {
    /// Import files into LFS
    Import,
    /// Export files from LFS to regular Git
    Export,
    /// Show migration info without making changes
    Info,
}

/// Result of an LFS operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// Message describing the result
    pub message: String,
    /// Files affected by the operation
    pub affected_files: Vec<String>,
}

/// LFS environment information
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsEnvironment {
    /// LFS version
    pub version: String,
    /// Git LFS endpoint URL
    pub endpoint: Option<String>,
    /// Local LFS storage path
    pub storage_path: Option<String>,
    /// Whether SSH is used for transfers
    pub uses_ssh: bool,
}

/// Git environment information for settings display
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GitEnvironment {
    /// Git CLI version
    pub git_version: Option<String>,
    /// Path to Git executable
    pub git_path: Option<String>,
    /// libgit2 version used by the application
    pub libgit2_version: String,
    /// Whether Git LFS is installed
    pub lfs_installed: bool,
    /// Git LFS version if installed
    pub lfs_version: Option<String>,
}

/// Options for LFS prune operation
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsPruneOptions {
    /// Dry run - show what would be pruned
    pub dry_run: bool,
    /// Verify remote copies before pruning
    pub verify_remote: bool,
}

/// Result of LFS prune operation
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsPruneResult {
    /// Whether the operation succeeded
    pub success: bool,
    /// Message describing the result
    pub message: String,
    /// Number of objects pruned
    pub objects_pruned: usize,
    /// Space reclaimed in bytes
    pub space_reclaimed: u64,
}

/// Information about a large binary file detected during staging
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LargeBinaryFileInfo {
    /// File path relative to repository root
    pub path: String,
    /// File size in bytes
    pub size: u64,
    /// Whether the file is detected as binary
    pub is_binary: bool,
    /// Whether the file is already tracked by LFS
    pub is_lfs_tracked: bool,
    /// Suggested LFS tracking pattern (e.g., "*.psd")
    pub suggested_pattern: String,
}

/// Result of checking files for LFS eligibility before staging
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct LfsCheckResult {
    /// Large binary files that should be tracked with LFS
    pub files: Vec<LargeBinaryFileInfo>,
    /// Whether Git LFS is installed on the system
    pub lfs_installed: bool,
    /// Whether LFS is initialized in this repository
    pub lfs_initialized: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== LfsStatus Tests ====================

    #[test]
    fn test_lfs_status_installed() {
        let status = LfsStatus {
            is_installed: true,
            version: Some("3.4.0".to_string()),
            is_initialized: true,
            tracked_patterns_count: 5,
            lfs_files_count: 100,
        };

        assert!(status.is_installed);
        assert_eq!(status.version, Some("3.4.0".to_string()));
        assert!(status.is_initialized);
        assert_eq!(status.tracked_patterns_count, 5);
        assert_eq!(status.lfs_files_count, 100);
    }

    #[test]
    fn test_lfs_status_not_installed() {
        let status = LfsStatus {
            is_installed: false,
            version: None,
            is_initialized: false,
            tracked_patterns_count: 0,
            lfs_files_count: 0,
        };

        assert!(!status.is_installed);
        assert!(status.version.is_none());
    }

    #[test]
    fn test_lfs_status_serialization() {
        let status = LfsStatus {
            is_installed: true,
            version: Some("3.0.0".to_string()),
            is_initialized: true,
            tracked_patterns_count: 3,
            lfs_files_count: 50,
        };

        let json = serde_json::to_string(&status).expect("should serialize");
        assert!(json.contains("\"isInstalled\":true"));
        assert!(json.contains("\"isInitialized\":true"));
        assert!(json.contains("\"trackedPatternsCount\":3"));
    }

    // ==================== LfsTrackedPattern Tests ====================

    #[test]
    fn test_lfs_tracked_pattern() {
        let pattern = LfsTrackedPattern {
            pattern: "*.psd".to_string(),
            source_file: ".gitattributes".to_string(),
        };

        assert_eq!(pattern.pattern, "*.psd");
        assert_eq!(pattern.source_file, ".gitattributes");
    }

    #[test]
    fn test_lfs_tracked_pattern_serialization() {
        let pattern = LfsTrackedPattern {
            pattern: "assets/*.png".to_string(),
            source_file: ".gitattributes".to_string(),
        };

        let json = serde_json::to_string(&pattern).expect("should serialize");
        assert!(json.contains("\"pattern\":\"assets/*.png\""));
        assert!(json.contains("\"sourceFile\":\".gitattributes\""));
    }

    // ==================== LfsFileStatus Tests ====================

    #[test]
    fn test_lfs_file_status_equality() {
        assert_eq!(LfsFileStatus::Downloaded, LfsFileStatus::Downloaded);
        assert_eq!(LfsFileStatus::Pointer, LfsFileStatus::Pointer);
        assert_eq!(LfsFileStatus::NotLfs, LfsFileStatus::NotLfs);
        assert_eq!(LfsFileStatus::Unknown, LfsFileStatus::Unknown);
        assert_ne!(LfsFileStatus::Downloaded, LfsFileStatus::Pointer);
    }

    #[test]
    fn test_lfs_file_status_serialization() {
        let status = LfsFileStatus::Downloaded;
        let json = serde_json::to_string(&status).expect("should serialize");
        assert_eq!(json, "\"Downloaded\"");

        let status = LfsFileStatus::Pointer;
        let json = serde_json::to_string(&status).expect("should serialize");
        assert_eq!(json, "\"Pointer\"");
    }

    #[test]
    fn test_lfs_file_status_deserialization() {
        let status: LfsFileStatus =
            serde_json::from_str("\"Downloaded\"").expect("should deserialize");
        assert_eq!(status, LfsFileStatus::Downloaded);

        let status: LfsFileStatus = serde_json::from_str("\"NotLfs\"").expect("should deserialize");
        assert_eq!(status, LfsFileStatus::NotLfs);
    }

    // ==================== LfsFile Tests ====================

    #[test]
    fn test_lfs_file_downloaded() {
        let file = LfsFile {
            path: "assets/image.psd".to_string(),
            oid: "abc123def456".to_string(),
            size: 1024 * 1024,
            is_downloaded: true,
            status: LfsFileStatus::Downloaded,
        };

        assert_eq!(file.path, "assets/image.psd");
        assert!(file.is_downloaded);
        assert_eq!(file.status, LfsFileStatus::Downloaded);
    }

    #[test]
    fn test_lfs_file_pointer() {
        let file = LfsFile {
            path: "large-video.mp4".to_string(),
            oid: "sha256hash".to_string(),
            size: 1024 * 1024 * 100,
            is_downloaded: false,
            status: LfsFileStatus::Pointer,
        };

        assert!(!file.is_downloaded);
        assert_eq!(file.status, LfsFileStatus::Pointer);
    }

    #[test]
    fn test_lfs_file_serialization() {
        let file = LfsFile {
            path: "test.bin".to_string(),
            oid: "oid123".to_string(),
            size: 5000,
            is_downloaded: true,
            status: LfsFileStatus::Downloaded,
        };

        let json = serde_json::to_string(&file).expect("should serialize");
        assert!(json.contains("\"path\":\"test.bin\""));
        assert!(json.contains("\"size\":5000"));
        assert!(json.contains("\"isDownloaded\":true"));
    }

    // ==================== LfsFetchOptions Tests ====================

    #[test]
    fn test_lfs_fetch_options_default() {
        let opts = LfsFetchOptions::default();

        assert!(!opts.all);
        assert!(!opts.recent);
        assert!(opts.remote.is_none());
        assert!(opts.refs.is_empty());
    }

    #[test]
    fn test_lfs_fetch_options_custom() {
        let opts = LfsFetchOptions {
            all: true,
            recent: false,
            remote: Some("origin".to_string()),
            refs: vec!["main".to_string(), "develop".to_string()],
        };

        assert!(opts.all);
        assert_eq!(opts.remote, Some("origin".to_string()));
        assert_eq!(opts.refs.len(), 2);
    }

    // ==================== LfsPullOptions Tests ====================

    #[test]
    fn test_lfs_pull_options_default() {
        let opts = LfsPullOptions::default();
        assert!(opts.remote.is_none());
    }

    #[test]
    fn test_lfs_pull_options_with_remote() {
        let opts = LfsPullOptions {
            remote: Some("upstream".to_string()),
        };
        assert_eq!(opts.remote, Some("upstream".to_string()));
    }

    // ==================== LfsPushOptions Tests ====================

    #[test]
    fn test_lfs_push_options_default() {
        let opts = LfsPushOptions::default();

        assert!(opts.remote.is_none());
        assert!(!opts.all);
        assert!(!opts.dry_run);
    }

    #[test]
    fn test_lfs_push_options_dry_run() {
        let opts = LfsPushOptions {
            remote: Some("origin".to_string()),
            all: false,
            dry_run: true,
        };

        assert!(opts.dry_run);
    }

    // ==================== LfsMigrateMode Tests ====================

    #[test]
    fn test_lfs_migrate_mode_equality() {
        assert_eq!(LfsMigrateMode::Import, LfsMigrateMode::Import);
        assert_eq!(LfsMigrateMode::Export, LfsMigrateMode::Export);
        assert_eq!(LfsMigrateMode::Info, LfsMigrateMode::Info);
        assert_ne!(LfsMigrateMode::Import, LfsMigrateMode::Export);
    }

    #[test]
    fn test_lfs_migrate_mode_serialization() {
        let mode = LfsMigrateMode::Import;
        let json = serde_json::to_string(&mode).expect("should serialize");
        assert_eq!(json, "\"Import\"");

        let mode = LfsMigrateMode::Export;
        let json = serde_json::to_string(&mode).expect("should serialize");
        assert_eq!(json, "\"Export\"");
    }

    // ==================== LfsMigrateOptions Tests ====================

    #[test]
    fn test_lfs_migrate_options_import() {
        let opts = LfsMigrateOptions {
            mode: LfsMigrateMode::Import,
            include: vec!["*.psd".to_string(), "*.ai".to_string()],
            exclude: vec![],
            everything: true,
            refs: vec![],
            above: Some(10 * 1024 * 1024),
        };

        assert_eq!(opts.mode, LfsMigrateMode::Import);
        assert_eq!(opts.include.len(), 2);
        assert!(opts.everything);
        assert_eq!(opts.above, Some(10 * 1024 * 1024));
    }

    // ==================== LfsResult Tests ====================

    #[test]
    fn test_lfs_result_success() {
        let result = LfsResult {
            success: true,
            message: "LFS fetch complete".to_string(),
            affected_files: vec!["file1.bin".to_string(), "file2.bin".to_string()],
        };

        assert!(result.success);
        assert_eq!(result.affected_files.len(), 2);
    }

    #[test]
    fn test_lfs_result_failure() {
        let result = LfsResult {
            success: false,
            message: "Network error".to_string(),
            affected_files: vec![],
        };

        assert!(!result.success);
        assert!(result.affected_files.is_empty());
    }

    #[test]
    fn test_lfs_result_serialization() {
        let result = LfsResult {
            success: true,
            message: "OK".to_string(),
            affected_files: vec!["test.bin".to_string()],
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"affectedFiles\":[\"test.bin\"]"));
    }

    // ==================== LfsEnvironment Tests ====================

    #[test]
    fn test_lfs_environment() {
        let env = LfsEnvironment {
            version: "3.4.0".to_string(),
            endpoint: Some("https://example.com/lfs".to_string()),
            storage_path: Some("/home/user/.git/lfs".to_string()),
            uses_ssh: false,
        };

        assert_eq!(env.version, "3.4.0");
        assert!(env.endpoint.is_some());
        assert!(!env.uses_ssh);
    }

    #[test]
    fn test_lfs_environment_serialization() {
        let env = LfsEnvironment {
            version: "3.0.0".to_string(),
            endpoint: None,
            storage_path: None,
            uses_ssh: true,
        };

        let json = serde_json::to_string(&env).expect("should serialize");
        assert!(json.contains("\"version\":\"3.0.0\""));
        assert!(json.contains("\"usesSsh\":true"));
    }

    // ==================== GitEnvironment Tests ====================

    #[test]
    fn test_git_environment() {
        let env = GitEnvironment {
            git_version: Some("2.42.0".to_string()),
            git_path: Some("/usr/bin/git".to_string()),
            libgit2_version: "1.7.0".to_string(),
            lfs_installed: true,
            lfs_version: Some("3.4.0".to_string()),
        };

        assert_eq!(env.git_version, Some("2.42.0".to_string()));
        assert!(env.lfs_installed);
    }

    #[test]
    fn test_git_environment_no_lfs() {
        let env = GitEnvironment {
            git_version: Some("2.40.0".to_string()),
            git_path: Some("/usr/bin/git".to_string()),
            libgit2_version: "1.6.0".to_string(),
            lfs_installed: false,
            lfs_version: None,
        };

        assert!(!env.lfs_installed);
        assert!(env.lfs_version.is_none());
    }

    // ==================== LfsPruneOptions Tests ====================

    #[test]
    fn test_lfs_prune_options_default() {
        let opts = LfsPruneOptions::default();

        assert!(!opts.dry_run);
        assert!(!opts.verify_remote);
    }

    #[test]
    fn test_lfs_prune_options_custom() {
        let opts = LfsPruneOptions {
            dry_run: true,
            verify_remote: true,
        };

        assert!(opts.dry_run);
        assert!(opts.verify_remote);
    }

    // ==================== LfsPruneResult Tests ====================

    #[test]
    fn test_lfs_prune_result_success() {
        let result = LfsPruneResult {
            success: true,
            message: "Pruned 10 objects".to_string(),
            objects_pruned: 10,
            space_reclaimed: 1024 * 1024 * 50,
        };

        assert!(result.success);
        assert_eq!(result.objects_pruned, 10);
        assert_eq!(result.space_reclaimed, 1024 * 1024 * 50);
    }

    #[test]
    fn test_lfs_prune_result_serialization() {
        let result = LfsPruneResult {
            success: true,
            message: "Done".to_string(),
            objects_pruned: 5,
            space_reclaimed: 1000,
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"objectsPruned\":5"));
        assert!(json.contains("\"spaceReclaimed\":1000"));
    }

    // ==================== LargeBinaryFileInfo Tests ====================

    #[test]
    fn test_large_binary_file_info() {
        let info = LargeBinaryFileInfo {
            path: "assets/texture.psd".to_string(),
            size: 15_000_000,
            is_binary: true,
            is_lfs_tracked: false,
            suggested_pattern: "*.psd".to_string(),
        };

        assert_eq!(info.path, "assets/texture.psd");
        assert_eq!(info.size, 15_000_000);
        assert!(info.is_binary);
        assert!(!info.is_lfs_tracked);
        assert_eq!(info.suggested_pattern, "*.psd");
    }

    #[test]
    fn test_large_binary_file_info_serialization() {
        let info = LargeBinaryFileInfo {
            path: "video.mp4".to_string(),
            size: 104_857_600,
            is_binary: true,
            is_lfs_tracked: false,
            suggested_pattern: "*.mp4".to_string(),
        };

        let json = serde_json::to_string(&info).expect("should serialize");
        assert!(json.contains("\"path\":\"video.mp4\""));
        assert!(json.contains("\"size\":104857600"));
        assert!(json.contains("\"isBinary\":true"));
        assert!(json.contains("\"isLfsTracked\":false"));
        assert!(json.contains("\"suggestedPattern\":\"*.mp4\""));
    }

    #[test]
    fn test_large_binary_file_info_deserialization() {
        let json = r#"{"path":"model.bin","size":50000000,"isBinary":true,"isLfsTracked":true,"suggestedPattern":"*.bin"}"#;
        let info: LargeBinaryFileInfo = serde_json::from_str(json).expect("should deserialize");

        assert_eq!(info.path, "model.bin");
        assert_eq!(info.size, 50_000_000);
        assert!(info.is_binary);
        assert!(info.is_lfs_tracked);
        assert_eq!(info.suggested_pattern, "*.bin");
    }

    // ==================== LfsCheckResult Tests ====================

    #[test]
    fn test_lfs_check_result_empty() {
        let result = LfsCheckResult {
            files: vec![],
            lfs_installed: true,
            lfs_initialized: true,
        };

        assert!(result.files.is_empty());
        assert!(result.lfs_installed);
        assert!(result.lfs_initialized);
    }

    #[test]
    fn test_lfs_check_result_with_files() {
        let result = LfsCheckResult {
            files: vec![
                LargeBinaryFileInfo {
                    path: "a.psd".to_string(),
                    size: 20_000_000,
                    is_binary: true,
                    is_lfs_tracked: false,
                    suggested_pattern: "*.psd".to_string(),
                },
                LargeBinaryFileInfo {
                    path: "b.mp4".to_string(),
                    size: 100_000_000,
                    is_binary: true,
                    is_lfs_tracked: false,
                    suggested_pattern: "*.mp4".to_string(),
                },
            ],
            lfs_installed: false,
            lfs_initialized: false,
        };

        assert_eq!(result.files.len(), 2);
        assert!(!result.lfs_installed);
        assert!(!result.lfs_initialized);
    }

    #[test]
    fn test_lfs_check_result_serialization() {
        let result = LfsCheckResult {
            files: vec![LargeBinaryFileInfo {
                path: "test.bin".to_string(),
                size: 11_000_000,
                is_binary: true,
                is_lfs_tracked: false,
                suggested_pattern: "*.bin".to_string(),
            }],
            lfs_installed: true,
            lfs_initialized: false,
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"lfsInstalled\":true"));
        assert!(json.contains("\"lfsInitialized\":false"));
        assert!(json.contains("\"test.bin\""));
    }
}
