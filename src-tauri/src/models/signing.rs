use serde::{Deserialize, Serialize};
use specta::Type;
use strum::Display;

/// Signing format - GPG (OpenPGP) or SSH
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, Type, Display)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "lowercase")]
pub enum SigningFormat {
    #[default]
    Gpg,
    Ssh,
}

impl std::str::FromStr for SigningFormat {
    type Err = String;

    fn from_str(s: &str) -> std::result::Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "gpg" | "openpgp" => Ok(SigningFormat::Gpg),
            "ssh" => Ok(SigningFormat::Ssh),
            _ => Err(format!("Unknown signing format: {}", s)),
        }
    }
}

/// Configuration for commit signing (how to sign, not whether to sign)
#[derive(Debug, Clone, Serialize, Deserialize, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct SigningConfig {
    /// Signing format (GPG or SSH)
    pub format: SigningFormat,
    /// Signing key (GPG key ID or SSH key path)
    pub signing_key: Option<String>,
    /// Custom GPG program path
    pub gpg_program: Option<String>,
    /// Custom SSH signing program path
    pub ssh_program: Option<String>,
}

/// Represents a GPG key available for signing
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GpgKey {
    /// Key ID (short or long form)
    pub key_id: String,
    /// User ID (name and email)
    pub user_id: String,
    /// Email address extracted from user_id
    pub email: Option<String>,
    /// Whether this is the default key
    pub is_default: bool,
}

/// Represents an SSH key available for signing
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SshKey {
    /// Path to the private key file
    pub path: String,
    /// Key type (ed25519, rsa, etc.)
    pub key_type: String,
    /// Comment from the public key (usually email)
    pub comment: Option<String>,
}

/// Result of testing signing configuration
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SigningTestResult {
    /// Whether the test was successful
    pub success: bool,
    /// Error message if failed
    pub error: Option<String>,
    /// The signing program that was used
    pub program_used: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== SigningFormat Tests ====================

    #[test]
    fn test_signing_format_default() {
        let format = SigningFormat::default();
        assert_eq!(format, SigningFormat::Gpg);
    }

    #[test]
    fn test_signing_format_equality() {
        assert_eq!(SigningFormat::Gpg, SigningFormat::Gpg);
        assert_eq!(SigningFormat::Ssh, SigningFormat::Ssh);
        assert_ne!(SigningFormat::Gpg, SigningFormat::Ssh);
    }

    #[test]
    fn test_signing_format_serialization() {
        let gpg = SigningFormat::Gpg;
        let json = serde_json::to_string(&gpg).expect("should serialize");
        assert_eq!(json, "\"Gpg\"");

        let ssh = SigningFormat::Ssh;
        let json = serde_json::to_string(&ssh).expect("should serialize");
        assert_eq!(json, "\"Ssh\"");
    }

    #[test]
    fn test_signing_format_deserialization() {
        let gpg: SigningFormat = serde_json::from_str("\"Gpg\"").expect("should deserialize");
        assert_eq!(gpg, SigningFormat::Gpg);

        let ssh: SigningFormat = serde_json::from_str("\"Ssh\"").expect("should deserialize");
        assert_eq!(ssh, SigningFormat::Ssh);
    }

    #[test]
    fn test_signing_format_display() {
        assert_eq!(SigningFormat::Gpg.to_string(), "gpg");
        assert_eq!(SigningFormat::Ssh.to_string(), "ssh");
    }

    #[test]
    fn test_signing_format_from_str_gpg() {
        let gpg: SigningFormat = "gpg".parse().expect("should parse");
        assert_eq!(gpg, SigningFormat::Gpg);

        let gpg2: SigningFormat = "openpgp".parse().expect("should parse");
        assert_eq!(gpg2, SigningFormat::Gpg);

        let gpg3: SigningFormat = "GPG".parse().expect("should parse");
        assert_eq!(gpg3, SigningFormat::Gpg);
    }

    #[test]
    fn test_signing_format_from_str_ssh() {
        let ssh: SigningFormat = "ssh".parse().expect("should parse");
        assert_eq!(ssh, SigningFormat::Ssh);

        let ssh2: SigningFormat = "SSH".parse().expect("should parse");
        assert_eq!(ssh2, SigningFormat::Ssh);
    }

    #[test]
    fn test_signing_format_from_str_invalid() {
        let result: Result<SigningFormat, _> = "invalid".parse();
        assert!(result.is_err());
        let err = result.expect_err("should be error");
        assert!(err.contains("Unknown signing format"));
    }

    // ==================== SigningConfig Tests ====================

    #[test]
    fn test_signing_config_default() {
        let config = SigningConfig::default();
        assert_eq!(config.format, SigningFormat::Gpg);
        assert!(config.signing_key.is_none());
        assert!(config.gpg_program.is_none());
        assert!(config.ssh_program.is_none());
    }

    #[test]
    fn test_signing_config_gpg() {
        let config = SigningConfig {
            format: SigningFormat::Gpg,
            signing_key: Some("ABC123".to_string()),
            gpg_program: Some("/usr/bin/gpg".to_string()),
            ssh_program: None,
        };

        assert_eq!(config.format, SigningFormat::Gpg);
        assert_eq!(config.signing_key, Some("ABC123".to_string()));
        assert!(config.gpg_program.is_some());
    }

    #[test]
    fn test_signing_config_ssh() {
        let config = SigningConfig {
            format: SigningFormat::Ssh,
            signing_key: Some("~/.ssh/id_ed25519".to_string()),
            gpg_program: None,
            ssh_program: Some("/usr/bin/ssh-keygen".to_string()),
        };

        assert_eq!(config.format, SigningFormat::Ssh);
        assert!(config.ssh_program.is_some());
    }

    #[test]
    fn test_signing_config_serialization() {
        let config = SigningConfig {
            format: SigningFormat::Gpg,
            signing_key: Some("KEY123".to_string()),
            gpg_program: None,
            ssh_program: None,
        };

        let json = serde_json::to_string(&config).expect("should serialize");
        assert!(json.contains("\"format\":\"Gpg\""));
        assert!(json.contains("\"signingKey\":\"KEY123\""));
    }

    // ==================== GpgKey Tests ====================

    #[test]
    fn test_gpg_key_creation() {
        let key = GpgKey {
            key_id: "ABCD1234".to_string(),
            user_id: "John Doe <john@example.com>".to_string(),
            email: Some("john@example.com".to_string()),
            is_default: true,
        };

        assert_eq!(key.key_id, "ABCD1234");
        assert!(key.email.is_some());
        assert!(key.is_default);
    }

    #[test]
    fn test_gpg_key_without_email() {
        let key = GpgKey {
            key_id: "XYZ789".to_string(),
            user_id: "Some User".to_string(),
            email: None,
            is_default: false,
        };

        assert!(key.email.is_none());
        assert!(!key.is_default);
    }

    #[test]
    fn test_gpg_key_serialization() {
        let key = GpgKey {
            key_id: "TEST".to_string(),
            user_id: "Test User".to_string(),
            email: Some("test@example.com".to_string()),
            is_default: false,
        };

        let json = serde_json::to_string(&key).expect("should serialize");
        assert!(json.contains("\"keyId\":\"TEST\""));
        assert!(json.contains("\"userId\":\"Test User\""));
        assert!(json.contains("\"isDefault\":false"));
    }

    // ==================== SshKey Tests ====================

    #[test]
    fn test_ssh_key_creation() {
        let key = SshKey {
            path: "~/.ssh/id_ed25519".to_string(),
            key_type: "ed25519".to_string(),
            comment: Some("user@host".to_string()),
        };

        assert_eq!(key.path, "~/.ssh/id_ed25519");
        assert_eq!(key.key_type, "ed25519");
        assert!(key.comment.is_some());
    }

    #[test]
    fn test_ssh_key_rsa() {
        let key = SshKey {
            path: "~/.ssh/id_rsa".to_string(),
            key_type: "rsa".to_string(),
            comment: None,
        };

        assert_eq!(key.key_type, "rsa");
        assert!(key.comment.is_none());
    }

    #[test]
    fn test_ssh_key_serialization() {
        let key = SshKey {
            path: "/home/user/.ssh/key".to_string(),
            key_type: "ecdsa".to_string(),
            comment: Some("test key".to_string()),
        };

        let json = serde_json::to_string(&key).expect("should serialize");
        assert!(json.contains("\"keyType\":\"ecdsa\""));
        assert!(json.contains("\"comment\":\"test key\""));
    }

    // ==================== SigningTestResult Tests ====================

    #[test]
    fn test_signing_test_result_success() {
        let result = SigningTestResult {
            success: true,
            error: None,
            program_used: Some("/usr/bin/gpg".to_string()),
        };

        assert!(result.success);
        assert!(result.error.is_none());
        assert!(result.program_used.is_some());
    }

    #[test]
    fn test_signing_test_result_failure() {
        let result = SigningTestResult {
            success: false,
            error: Some("GPG not found".to_string()),
            program_used: None,
        };

        assert!(!result.success);
        assert_eq!(result.error, Some("GPG not found".to_string()));
        assert!(result.program_used.is_none());
    }

    #[test]
    fn test_signing_test_result_serialization() {
        let result = SigningTestResult {
            success: true,
            error: None,
            program_used: Some("gpg".to_string()),
        };

        let json = serde_json::to_string(&result).expect("should serialize");
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"programUsed\":\"gpg\""));
    }
}
