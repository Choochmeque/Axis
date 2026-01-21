use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "PascalCase")]
pub enum AvatarSource {
    Integration,
    Gravatar,
    Default,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AvatarResponse {
    pub source: AvatarSource,
    pub path: Option<String>,
}
