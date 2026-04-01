use serde::{Deserialize, Serialize};
use specta::Type;
use strum::AsRefStr;

#[derive(Debug, Clone, Serialize, Deserialize, Type, AsRefStr)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "lowercase")]
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
