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
    GitError(
        #[serde(skip)]
        #[from]
        git2::Error,
    ),

    #[error("IO error: {0}")]
    IoError(
        #[serde(skip)]
        #[from]
        std::io::Error,
    ),

    #[error("Database error: {0}")]
    DatabaseError(
        #[serde(skip)]
        #[from]
        rusqlite::Error,
    ),

    #[error("Serialization error: {0}")]
    SerializationError(
        #[serde(skip)]
        #[from]
        serde_json::Error,
    ),

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
}

pub type Result<T> = std::result::Result<T, AxisError>;
