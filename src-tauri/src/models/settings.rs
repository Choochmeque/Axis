use crate::models::{AiProvider, SigningFormat};
use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumString};

// Allow excessive bools: this is a configuration struct where each bool represents
// an independent user preference. Grouping into enums would reduce usability.
#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    // Appearance
    pub theme: Theme,
    pub language: String,
    pub font_size: u32,
    pub show_line_numbers: bool,

    // Git
    pub auto_fetch_interval: u32, // in minutes, 0 = disabled
    pub confirm_before_discard: bool,
    pub sign_commits: bool,
    pub bypass_hooks: bool, // Skip git hooks by default

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
    pub conventional_commits_enabled: bool,
    pub conventional_commits_scopes: Option<Vec<String>>,

    // AI
    pub ai_enabled: bool,
    pub ai_provider: AiProvider,
    pub ai_model: Option<String>,
    pub ai_ollama_url: Option<String>,

    // SSH
    pub default_ssh_key: Option<String>,

    // Notifications
    pub notification_history_capacity: u32,

    // Avatars
    pub gravatar_enabled: bool,

    // Updates
    pub auto_update_enabled: bool,

    // Large files
    pub large_binary_warning_enabled: bool,
    pub large_binary_threshold: u64, // in bytes, default 10MB
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
            language: String::from("system"),
            font_size: 13,
            show_line_numbers: true,

            // Git
            auto_fetch_interval: 5,
            confirm_before_discard: true,
            sign_commits: false,
            bypass_hooks: false,

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
            conventional_commits_enabled: false,
            conventional_commits_scopes: None,

            // AI
            ai_enabled: false,
            ai_provider: AiProvider::default(),
            ai_model: None,
            ai_ollama_url: None,

            // SSH
            default_ssh_key: None,

            // Notifications
            notification_history_capacity: 50,

            // Avatars
            gravatar_enabled: false,

            // Updates
            auto_update_enabled: true,

            // Large files
            large_binary_warning_enabled: true,
            large_binary_threshold: 10_485_760, // 10MB
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== Theme Tests ====================

    #[test]
    fn test_theme_default() {
        let theme = Theme::default();
        assert_eq!(theme, Theme::System);
    }

    #[test]
    fn test_theme_equality() {
        assert_eq!(Theme::Light, Theme::Light);
        assert_eq!(Theme::Dark, Theme::Dark);
        assert_eq!(Theme::System, Theme::System);
        assert_ne!(Theme::Light, Theme::Dark);
        assert_ne!(Theme::Light, Theme::System);
    }

    #[test]
    fn test_theme_serialization() {
        let light = Theme::Light;
        let json = serde_json::to_string(&light).expect("should serialize");
        assert_eq!(json, "\"Light\"");

        let dark = Theme::Dark;
        let json = serde_json::to_string(&dark).expect("should serialize");
        assert_eq!(json, "\"Dark\"");

        let system = Theme::System;
        let json = serde_json::to_string(&system).expect("should serialize");
        assert_eq!(json, "\"System\"");
    }

    #[test]
    fn test_theme_deserialization() {
        let light: Theme = serde_json::from_str("\"Light\"").expect("should deserialize");
        assert_eq!(light, Theme::Light);

        let dark: Theme = serde_json::from_str("\"Dark\"").expect("should deserialize");
        assert_eq!(dark, Theme::Dark);

        let system: Theme = serde_json::from_str("\"System\"").expect("should deserialize");
        assert_eq!(system, Theme::System);
    }

    #[test]
    fn test_theme_display() {
        assert_eq!(Theme::Light.to_string(), "light");
        assert_eq!(Theme::Dark.to_string(), "dark");
        assert_eq!(Theme::System.to_string(), "system");
    }

    #[test]
    fn test_theme_from_string() {
        use std::str::FromStr;

        let light = Theme::from_str("light").expect("should parse");
        assert_eq!(light, Theme::Light);

        let dark = Theme::from_str("dark").expect("should parse");
        assert_eq!(dark, Theme::Dark);

        let system = Theme::from_str("system").expect("should parse");
        assert_eq!(system, Theme::System);
    }

    // ==================== AppSettings Tests ====================

    #[test]
    fn test_app_settings_default() {
        let settings = AppSettings::default();

        // Appearance
        assert_eq!(settings.theme, Theme::System);
        assert_eq!(settings.language, "system");
        assert_eq!(settings.font_size, 13);
        assert!(settings.show_line_numbers);

        // Git
        assert_eq!(settings.auto_fetch_interval, 5);
        assert!(settings.confirm_before_discard);
        assert!(!settings.sign_commits);
        assert!(!settings.bypass_hooks);

        // Signing
        assert_eq!(settings.signing_format, SigningFormat::default());
        assert!(settings.signing_key.is_none());
        assert!(settings.gpg_program.is_none());
        assert!(settings.ssh_program.is_none());

        // Diff
        assert_eq!(settings.diff_context_lines, 3);
        assert!(!settings.diff_word_wrap);
        assert!(!settings.diff_side_by_side);

        // Commit
        assert!(!settings.spell_check_commit_messages);
        assert!(!settings.conventional_commits_enabled);
        assert!(settings.conventional_commits_scopes.is_none());

        // AI
        assert!(!settings.ai_enabled);
        assert_eq!(settings.ai_provider, AiProvider::default());
        assert!(settings.ai_model.is_none());
        assert!(settings.ai_ollama_url.is_none());

        // SSH
        assert!(settings.default_ssh_key.is_none());

        // Notifications
        assert_eq!(settings.notification_history_capacity, 50);

        // Avatars
        assert!(!settings.gravatar_enabled);

        // Updates
        assert!(settings.auto_update_enabled);

        // Large files
        assert!(settings.large_binary_warning_enabled);
        assert_eq!(settings.large_binary_threshold, 10_485_760);
    }

    #[test]
    fn test_app_settings_custom() {
        let settings = AppSettings {
            theme: Theme::Dark,
            language: "en".to_string(),
            font_size: 14,
            show_line_numbers: false,
            auto_fetch_interval: 10,
            confirm_before_discard: false,
            sign_commits: true,
            bypass_hooks: true,
            signing_format: SigningFormat::Ssh,
            signing_key: Some("~/.ssh/id_ed25519".to_string()),
            gpg_program: None,
            ssh_program: Some("/usr/bin/ssh".to_string()),
            diff_context_lines: 5,
            diff_word_wrap: true,
            diff_side_by_side: true,
            spell_check_commit_messages: true,
            conventional_commits_enabled: true,
            conventional_commits_scopes: Some(vec!["ui".to_string(), "api".to_string()]),
            ai_enabled: true,
            ai_provider: AiProvider::OpenAi,
            ai_model: Some("gpt-4".to_string()),
            ai_ollama_url: None,
            default_ssh_key: Some("~/.ssh/id_work".to_string()),
            notification_history_capacity: 100,
            gravatar_enabled: true,
            auto_update_enabled: false,
            large_binary_warning_enabled: false,
            large_binary_threshold: 52_428_800,
        };

        assert_eq!(settings.theme, Theme::Dark);
        assert_eq!(settings.language, "en");
        assert_eq!(settings.font_size, 14);
        assert!(!settings.show_line_numbers);
        assert_eq!(settings.auto_fetch_interval, 10);
        assert!(settings.sign_commits);
        assert!(settings.bypass_hooks);
        assert_eq!(settings.signing_format, SigningFormat::Ssh);
        assert!(settings.signing_key.is_some());
        assert_eq!(settings.diff_context_lines, 5);
        assert!(settings.diff_word_wrap);
        assert!(settings.diff_side_by_side);
        assert!(settings.conventional_commits_enabled);
        assert!(settings.conventional_commits_scopes.is_some());
        assert!(settings.ai_enabled);
        assert_eq!(settings.ai_provider, AiProvider::OpenAi);
        assert!(settings.gravatar_enabled);
        assert!(!settings.large_binary_warning_enabled);
        assert_eq!(settings.large_binary_threshold, 52_428_800);
    }

    #[test]
    fn test_app_settings_serialization_roundtrip() {
        let settings = AppSettings::default();

        let json = serde_json::to_string(&settings).expect("should serialize");
        let deserialized: AppSettings = serde_json::from_str(&json).expect("should deserialize");

        assert_eq!(deserialized.theme, settings.theme);
        assert_eq!(deserialized.language, settings.language);
        assert_eq!(deserialized.font_size, settings.font_size);
        assert_eq!(
            deserialized.auto_fetch_interval,
            settings.auto_fetch_interval
        );
        assert_eq!(deserialized.diff_context_lines, settings.diff_context_lines);
        assert_eq!(deserialized.ai_enabled, settings.ai_enabled);
        assert_eq!(
            deserialized.large_binary_warning_enabled,
            settings.large_binary_warning_enabled
        );
        assert_eq!(
            deserialized.large_binary_threshold,
            settings.large_binary_threshold
        );
    }

    #[test]
    fn test_app_settings_with_conventional_commits() {
        let settings = AppSettings {
            conventional_commits_enabled: true,
            conventional_commits_scopes: Some(vec![
                "feat".to_string(),
                "fix".to_string(),
                "docs".to_string(),
            ]),
            ..AppSettings::default()
        };

        assert!(settings.conventional_commits_enabled);
        let scopes = settings
            .conventional_commits_scopes
            .expect("should have scopes");
        assert_eq!(scopes.len(), 3);
        assert!(scopes.contains(&"feat".to_string()));
        assert!(scopes.contains(&"fix".to_string()));
        assert!(scopes.contains(&"docs".to_string()));
    }

    #[test]
    fn test_app_settings_with_ai_config() {
        let settings = AppSettings {
            ai_enabled: true,
            ai_provider: AiProvider::Ollama,
            ai_model: Some("llama2".to_string()),
            ai_ollama_url: Some("http://localhost:11434".to_string()),
            ..AppSettings::default()
        };

        assert!(settings.ai_enabled);
        assert_eq!(settings.ai_provider, AiProvider::Ollama);
        assert_eq!(settings.ai_model, Some("llama2".to_string()));
        assert_eq!(
            settings.ai_ollama_url,
            Some("http://localhost:11434".to_string())
        );
    }

    #[test]
    fn test_app_settings_auto_fetch_disabled() {
        let settings = AppSettings {
            auto_fetch_interval: 0,
            ..AppSettings::default()
        };

        assert_eq!(settings.auto_fetch_interval, 0);
    }
}
