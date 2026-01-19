use crate::models::SigningFormat;
use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumString};

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    // Appearance
    pub theme: Theme,
    pub font_size: u32,
    pub show_line_numbers: bool,

    // Git
    pub auto_fetch_interval: u32, // in minutes, 0 = disabled
    pub confirm_before_discard: bool,
    pub sign_commits: bool,

    // Signing
    pub signing_format: SigningFormat,
    pub signing_key: Option<String>,
    pub gpg_program: Option<String>,
    pub ssh_program: Option<String>,

    // Diff
    pub diff_context_lines: u32,
    pub diff_word_wrap: bool,
    pub diff_side_by_side: bool,

    // Commit
    pub spell_check_commit_messages: bool,

    // Notifications
    pub notification_history_capacity: u32,
}

#[derive(Debug, Clone, Display, EnumString, Serialize, Deserialize, PartialEq, Default, Type)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "lowercase")]
pub enum Theme {
    Light,
    Dark,
    #[default]
    System,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            // Appearance
            theme: Theme::default(),
            font_size: 13,
            show_line_numbers: true,

            // Git
            auto_fetch_interval: 0,
            confirm_before_discard: true,
            sign_commits: false,

            // Signing
            signing_format: SigningFormat::default(),
            signing_key: None,
            gpg_program: None,
            ssh_program: None,

            // Diff
            diff_context_lines: 3,
            diff_word_wrap: false,
            diff_side_by_side: false,

            // Commit
            spell_check_commit_messages: false,

            // Notifications
            notification_history_capacity: 50,
        }
    }
}
