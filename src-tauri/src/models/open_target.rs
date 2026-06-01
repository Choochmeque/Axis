use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Type)]
#[serde(rename_all = "camelCase")]
pub struct OpenTargetOption {
    pub target: crate::models::OpenTarget,
    pub name: String,
    pub icon_data_url: Option<String>,
    pub installed: bool,
}
