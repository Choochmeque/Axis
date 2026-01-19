use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumString};

#[derive(Debug, Clone, Serialize, Deserialize, Type, Default, PartialEq, Display, EnumString)]
#[serde(rename_all = "PascalCase")]
pub enum AiProvider {
    #[default]
    OpenAi,
    Anthropic,
    Ollama,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GenerateCommitMessageResponse {
    pub message: String,
    pub model_used: String,
}
