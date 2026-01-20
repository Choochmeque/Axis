use serde::{Deserialize, Serialize};
use specta::Type;

use crate::models::Remote;

/// Repository-specific settings
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RepositorySettings {
    /// Repository user.name (from .git/config)
    pub user_name: Option<String>,
    /// Repository user.email (from .git/config)
    pub user_email: Option<String>,
    /// Global user.name (for placeholder display)
    pub global_user_name: Option<String>,
    /// Global user.email (for placeholder display)
    pub global_user_email: Option<String>,
    /// List of remotes
    pub remotes: Vec<Remote>,
}
