use serde::Serialize;
use specta::Type;
use thiserror::Error;

#[derive(Debug, Error, Serialize, Type)]
#[serde(tag = "type", content = "data")]
pub enum AxisError {
    #[error("Repository not found: {0}")]
    RepositoryNotFound(String),

    #[error("Repository already open: {0}")]
    RepositoryAlreadyOpen(String),

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

    #[error("Remote not found: {0}")]
    RemoteNotFound(String),

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

    #[error("Authentication failed: {0}")]
    AuthenticationFailed(String),

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

    #[error("Provider not detected")]
    ProviderNotDetected,

    #[error("OAuth error: {0}")]
    OAuthError(String),

    #[error("OAuth flow cancelled")]
    OAuthCancelled,
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
