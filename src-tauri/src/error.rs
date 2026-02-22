use serde::Serialize;
use specta::Type;
use thiserror::Error;

#[derive(Debug, Error, Serialize, Type)]
#[serde(tag = "type", content = "data")]
pub enum AxisError {
    #[error("Invalid repository path: {0}")]
    InvalidRepositoryPath(String),

    #[error("Git operation failed: {0}")]
    GitError(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),

    #[error("Invalid reference: {0}")]
    InvalidReference(String),

    #[error("No repository is currently open")]
    NoRepositoryOpen,

    #[error("Branch not found: {0}")]
    BranchNotFound(String),

    #[error("Branch not fully merged: {0}")]
    BranchNotMerged(String),

    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Cannot fast-forward, merge or rebase required")]
    CannotFastForward,

    #[error("Rebase required - use Git CLI for interactive rebase")]
    RebaseRequired,

    #[error("Merge conflict detected")]
    MergeConflict,

    #[error("Checkout conflict: uncommitted changes would be overwritten")]
    CheckoutConflict(Vec<String>),

    #[error("Stash applied with conflicts")]
    StashApplyConflict(Vec<String>),

    #[error("AI service error: {0}")]
    AiServiceError(String),

    #[error("API key not configured for {0}")]
    ApiKeyNotConfigured(String),

    #[error("Diff too large: {0} bytes")]
    DiffTooLarge(usize),

    #[error("{0}")]
    Other(String),

    #[error("Integration not connected: {0}")]
    IntegrationNotConnected(String),

    #[error("Integration error: {0}")]
    IntegrationError(String),

    #[error("OAuth error: {0}")]
    OAuthError(String),

    #[error("OAuth flow cancelled")]
    OAuthCancelled,

    #[error("SSH key error: {0}")]
    SshKeyError(String),

    #[error("SSH key already exists: {0}")]
    SshKeyAlreadyExists(String),

    #[error("ssh-keygen not found")]
    SshKeygenNotFound,

    #[error("Invalid key filename: {0}")]
    InvalidKeyFilename(String),
}

impl From<git2::Error> for AxisError {
    fn from(err: git2::Error) -> Self {
        AxisError::GitError(err.to_string())
    }
}

impl From<std::io::Error> for AxisError {
    fn from(err: std::io::Error) -> Self {
        AxisError::IoError(err.to_string())
    }
}

impl From<rusqlite::Error> for AxisError {
    fn from(err: rusqlite::Error) -> Self {
        AxisError::DatabaseError(err.to_string())
    }
}

impl From<serde_json::Error> for AxisError {
    fn from(err: serde_json::Error) -> Self {
        AxisError::SerializationError(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AxisError>;

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== Error Display Tests ====================

    #[test]
    fn test_invalid_repository_path_display() {
        let err = AxisError::InvalidRepositoryPath("/invalid/path".to_string());
        assert_eq!(err.to_string(), "Invalid repository path: /invalid/path");
    }

    #[test]
    fn test_git_error_display() {
        let err = AxisError::GitError("reference not found".to_string());
        assert_eq!(err.to_string(), "Git operation failed: reference not found");
    }

    #[test]
    fn test_io_error_display() {
        let err = AxisError::IoError("file not found".to_string());
        assert_eq!(err.to_string(), "IO error: file not found");
    }

    #[test]
    fn test_database_error_display() {
        let err = AxisError::DatabaseError("connection failed".to_string());
        assert_eq!(err.to_string(), "Database error: connection failed");
    }

    #[test]
    fn test_serialization_error_display() {
        let err = AxisError::SerializationError("invalid JSON".to_string());
        assert_eq!(err.to_string(), "Serialization error: invalid JSON");
    }

    #[test]
    fn test_invalid_reference_display() {
        let err = AxisError::InvalidReference("bad-ref".to_string());
        assert_eq!(err.to_string(), "Invalid reference: bad-ref");
    }

    #[test]
    fn test_no_repository_open_display() {
        let err = AxisError::NoRepositoryOpen;
        assert_eq!(err.to_string(), "No repository is currently open");
    }

    #[test]
    fn test_branch_not_found_display() {
        let err = AxisError::BranchNotFound("feature".to_string());
        assert_eq!(err.to_string(), "Branch not found: feature");
    }

    #[test]
    fn test_branch_not_merged_display() {
        let err = AxisError::BranchNotMerged("feature".to_string());
        assert_eq!(err.to_string(), "Branch not fully merged: feature");
    }

    #[test]
    fn test_file_not_found_display() {
        let err = AxisError::FileNotFound("src/main.rs".to_string());
        assert_eq!(err.to_string(), "File not found: src/main.rs");
    }

    #[test]
    fn test_cannot_fast_forward_display() {
        let err = AxisError::CannotFastForward;
        assert_eq!(
            err.to_string(),
            "Cannot fast-forward, merge or rebase required"
        );
    }

    #[test]
    fn test_rebase_required_display() {
        let err = AxisError::RebaseRequired;
        assert_eq!(
            err.to_string(),
            "Rebase required - use Git CLI for interactive rebase"
        );
    }

    #[test]
    fn test_merge_conflict_display() {
        let err = AxisError::MergeConflict;
        assert_eq!(err.to_string(), "Merge conflict detected");
    }

    #[test]
    fn test_checkout_conflict_display() {
        let err = AxisError::CheckoutConflict(vec!["file1.rs".to_string(), "file2.rs".to_string()]);
        assert_eq!(
            err.to_string(),
            "Checkout conflict: uncommitted changes would be overwritten"
        );
    }

    #[test]
    fn test_stash_apply_conflict_display() {
        let err = AxisError::StashApplyConflict(vec!["conflict.rs".to_string()]);
        assert_eq!(err.to_string(), "Stash applied with conflicts");
    }

    #[test]
    fn test_ai_service_error_display() {
        let err = AxisError::AiServiceError("rate limit exceeded".to_string());
        assert_eq!(err.to_string(), "AI service error: rate limit exceeded");
    }

    #[test]
    fn test_api_key_not_configured_display() {
        let err = AxisError::ApiKeyNotConfigured("OpenAI".to_string());
        assert_eq!(err.to_string(), "API key not configured for OpenAI");
    }

    #[test]
    fn test_diff_too_large_display() {
        let err = AxisError::DiffTooLarge(10_000_000);
        assert_eq!(err.to_string(), "Diff too large: 10000000 bytes");
    }

    #[test]
    fn test_other_error_display() {
        let err = AxisError::Other("Something went wrong".to_string());
        assert_eq!(err.to_string(), "Something went wrong");
    }

    #[test]
    fn test_integration_not_connected_display() {
        let err = AxisError::IntegrationNotConnected("GitHub".to_string());
        assert_eq!(err.to_string(), "Integration not connected: GitHub");
    }

    #[test]
    fn test_integration_error_display() {
        let err = AxisError::IntegrationError("API request failed".to_string());
        assert_eq!(err.to_string(), "Integration error: API request failed");
    }

    #[test]
    fn test_oauth_error_display() {
        let err = AxisError::OAuthError("token expired".to_string());
        assert_eq!(err.to_string(), "OAuth error: token expired");
    }

    #[test]
    fn test_oauth_cancelled_display() {
        let err = AxisError::OAuthCancelled;
        assert_eq!(err.to_string(), "OAuth flow cancelled");
    }

    // ==================== From Conversion Tests ====================

    #[test]
    fn test_from_git2_error() {
        let git_err = git2::Error::from_str("reference not found");
        let axis_err: AxisError = git_err.into();
        assert!(matches!(axis_err, AxisError::GitError(_)));
        assert!(axis_err.to_string().contains("reference not found"));
    }

    #[test]
    fn test_from_io_error() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
        let axis_err: AxisError = io_err.into();
        assert!(matches!(axis_err, AxisError::IoError(_)));
        assert!(axis_err.to_string().contains("file not found"));
    }

    #[test]
    fn test_from_io_error_permission_denied() {
        let io_err = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "access denied");
        let axis_err: AxisError = io_err.into();
        assert!(matches!(axis_err, AxisError::IoError(_)));
        assert!(axis_err.to_string().contains("access denied"));
    }

    #[test]
    fn test_from_serde_json_error() {
        let json_result: std::result::Result<serde_json::Value, _> =
            serde_json::from_str("invalid json");
        let json_err = json_result.expect_err("should be an error");
        let axis_err: AxisError = json_err.into();
        assert!(matches!(axis_err, AxisError::SerializationError(_)));
    }

    // ==================== Serialization Tests ====================

    #[test]
    fn test_error_serialization_simple() {
        let err = AxisError::NoRepositoryOpen;
        let json = serde_json::to_string(&err).expect("should serialize");
        assert!(json.contains("\"type\":\"NoRepositoryOpen\""));
    }

    #[test]
    fn test_error_serialization_with_string() {
        let err = AxisError::BranchNotFound("main".to_string());
        let json = serde_json::to_string(&err).expect("should serialize");
        assert!(json.contains("\"type\":\"BranchNotFound\""));
        assert!(json.contains("\"data\":\"main\""));
    }

    #[test]
    fn test_error_serialization_with_vec() {
        let err = AxisError::CheckoutConflict(vec!["file1.rs".to_string(), "file2.rs".to_string()]);
        let json = serde_json::to_string(&err).expect("should serialize");
        assert!(json.contains("\"type\":\"CheckoutConflict\""));
        assert!(json.contains("file1.rs"));
        assert!(json.contains("file2.rs"));
    }

    #[test]
    fn test_error_serialization_with_usize() {
        let err = AxisError::DiffTooLarge(5000);
        let json = serde_json::to_string(&err).expect("should serialize");
        assert!(json.contains("\"type\":\"DiffTooLarge\""));
        assert!(json.contains("5000"));
    }

    // ==================== Result Type Tests ====================

    #[test]
    fn test_result_ok() {
        let result: Result<i32> = Ok(42);
        assert!(result.is_ok());
        assert!(matches!(result, Ok(42)));
    }

    #[test]
    fn test_result_err() {
        let result: Result<i32> = Err(AxisError::NoRepositoryOpen);
        assert!(result.is_err());
        assert!(matches!(result, Err(AxisError::NoRepositoryOpen)));
    }

    // ==================== SSH Key Error Tests ====================

    #[test]
    fn test_ssh_key_error_display() {
        let err = AxisError::SshKeyError("key generation failed".to_string());
        assert_eq!(err.to_string(), "SSH key error: key generation failed");
    }

    #[test]
    fn test_ssh_key_already_exists_display() {
        let err = AxisError::SshKeyAlreadyExists("id_ed25519".to_string());
        assert_eq!(err.to_string(), "SSH key already exists: id_ed25519");
    }

    #[test]
    fn test_ssh_keygen_not_found_display() {
        let err = AxisError::SshKeygenNotFound;
        assert_eq!(err.to_string(), "ssh-keygen not found");
    }

    #[test]
    fn test_invalid_key_filename_display() {
        let err = AxisError::InvalidKeyFilename("../evil".to_string());
        assert_eq!(err.to_string(), "Invalid key filename: ../evil");
    }

    #[test]
    fn test_ssh_key_error_serialization() {
        let err = AxisError::SshKeyError("failed".to_string());
        let json = serde_json::to_string(&err).expect("should serialize");
        assert!(json.contains("\"type\":\"SshKeyError\""));
        assert!(json.contains("\"data\":\"failed\""));
    }

    #[test]
    fn test_ssh_keygen_not_found_serialization() {
        let err = AxisError::SshKeygenNotFound;
        let json = serde_json::to_string(&err).expect("should serialize");
        assert!(json.contains("\"type\":\"SshKeygenNotFound\""));
    }

    // ==================== Debug Tests ====================

    #[test]
    fn test_error_debug() {
        let err = AxisError::BranchNotFound("feature".to_string());
        let debug_str = format!("{err:?}");
        assert!(debug_str.contains("BranchNotFound"));
        assert!(debug_str.contains("feature"));
    }
}
