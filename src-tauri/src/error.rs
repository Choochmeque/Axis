use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AxisError {
    #[error("Repository not found: {0}")]
    RepositoryNotFound(String),

    #[error("Repository already open: {0}")]
    RepositoryAlreadyOpen(String),

    #[error("Invalid repository path: {0}")]
    InvalidRepositoryPath(String),

    #[error("Git operation failed: {0}")]
    GitError(#[from] git2::Error),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Database error: {0}")]
    DatabaseError(#[from] rusqlite::Error),

    #[error("Serialization error: {0}")]
    SerializationError(#[from] serde_json::Error),

    #[error("Invalid reference: {0}")]
    InvalidReference(String),

    #[error("No repository is currently open")]
    NoRepositoryOpen,

    #[error("{0}")]
    Other(String),
}

// Make AxisError serializable for Tauri IPC
impl Serialize for AxisError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AxisError>;
