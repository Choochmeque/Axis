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
