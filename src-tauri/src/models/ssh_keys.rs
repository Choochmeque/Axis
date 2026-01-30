use secrecy::SecretString;
use serde::{Deserialize, Serialize};
use specta::Type;
use strum::{Display, EnumString};

/// SSH key algorithm
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, Type, Display, EnumString)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "lowercase")]
pub enum SshKeyAlgorithm {
    #[default]
    Ed25519,
    Rsa,
    Ecdsa,
}

/// SSH private key format / encryption status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default, Type, Display, EnumString)]
#[serde(rename_all = "PascalCase")]
#[strum(serialize_all = "PascalCase")]
pub enum SshKeyFormat {
    /// PEM format, no passphrase
    #[default]
    Unencrypted,
    /// PEM format with Proc-Type: 4,ENCRYPTED
    EncryptedPem,
    /// OpenSSH format (BEGIN OPENSSH PRIVATE KEY), no passphrase
    OpenSsh,
    /// OpenSSH format with passphrase (encrypted via bcrypt KDF)
    EncryptedOpenSsh,
    /// Unable to determine format
    Unknown,
}

/// Detailed information about an SSH key
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SshKeyInfo {
    /// Path to the private key file
    pub path: String,
    /// Path to the public key file
    pub public_key_path: String,
    /// Key algorithm type
    pub key_type: SshKeyAlgorithm,
    /// Private key format / encryption status
    pub format: SshKeyFormat,
    /// Comment from the public key (usually email)
    pub comment: Option<String>,
    /// Key fingerprint (SHA256)
    pub fingerprint: Option<String>,
    /// Key bit size (relevant for RSA/ECDSA)
    pub bits: Option<u32>,
    /// Creation timestamp (ISO 8601)
    pub created_at: Option<String>,
}

/// Options for generating a new SSH key
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GenerateSshKeyOptions {
    /// Algorithm to use
    pub algorithm: SshKeyAlgorithm,
    /// Comment for the key (usually email)
    pub comment: Option<String>,
    /// Passphrase to protect the key (empty string = no passphrase)
    pub passphrase: Option<String>,
    /// Filename for the key (without path, stored in ~/.ssh/)
    pub filename: String,
    /// Bit size (only for RSA/ECDSA, ignored for Ed25519)
    pub bits: Option<u32>,
}

/// Options for importing an SSH key
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ImportSshKeyOptions {
    /// Source path of the key file to import
    pub source_path: String,
    /// Target filename in ~/.ssh/ (without path)
    pub target_filename: String,
}

/// Options for exporting an SSH key
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportSshKeyOptions {
    /// Path to the key to export
    pub key_path: String,
    /// Target directory to export to
    pub target_dir: String,
    /// Export only the public key
    pub public_only: bool,
}

/// Resolved SSH credentials for a remote operation (internal only, not serializable)
#[derive(Debug, Clone)]
pub struct SshCredentials {
    pub key_path: String,
    pub passphrase: Option<SecretString>,
}

/// Mapping of a remote to an SSH key path
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSshKeyMapping {
    /// Remote name
    pub remote_name: String,
    /// Path to the SSH key
    pub ssh_key_path: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    // ==================== SshKeyAlgorithm Tests ====================

    #[test]
    fn test_ssh_key_algorithm_default() {
        let algo = SshKeyAlgorithm::default();
        assert_eq!(algo, SshKeyAlgorithm::Ed25519);
    }

    #[test]
    fn test_ssh_key_algorithm_equality() {
        assert_eq!(SshKeyAlgorithm::Ed25519, SshKeyAlgorithm::Ed25519);
        assert_eq!(SshKeyAlgorithm::Rsa, SshKeyAlgorithm::Rsa);
        assert_eq!(SshKeyAlgorithm::Ecdsa, SshKeyAlgorithm::Ecdsa);
        assert_ne!(SshKeyAlgorithm::Ed25519, SshKeyAlgorithm::Rsa);
    }

    #[test]
    fn test_ssh_key_algorithm_serialization() {
        let ed25519 = SshKeyAlgorithm::Ed25519;
        let json = serde_json::to_string(&ed25519).expect("should serialize");
        assert_eq!(json, "\"Ed25519\"");

        let rsa = SshKeyAlgorithm::Rsa;
        let json = serde_json::to_string(&rsa).expect("should serialize");
        assert_eq!(json, "\"Rsa\"");

        let ecdsa = SshKeyAlgorithm::Ecdsa;
        let json = serde_json::to_string(&ecdsa).expect("should serialize");
        assert_eq!(json, "\"Ecdsa\"");
    }

    #[test]
    fn test_ssh_key_algorithm_deserialization() {
        let ed25519: SshKeyAlgorithm =
            serde_json::from_str("\"Ed25519\"").expect("should deserialize");
        assert_eq!(ed25519, SshKeyAlgorithm::Ed25519);

        let rsa: SshKeyAlgorithm = serde_json::from_str("\"Rsa\"").expect("should deserialize");
        assert_eq!(rsa, SshKeyAlgorithm::Rsa);

        let ecdsa: SshKeyAlgorithm = serde_json::from_str("\"Ecdsa\"").expect("should deserialize");
        assert_eq!(ecdsa, SshKeyAlgorithm::Ecdsa);
    }

    #[test]
    fn test_ssh_key_algorithm_display() {
        assert_eq!(SshKeyAlgorithm::Ed25519.to_string(), "ed25519");
        assert_eq!(SshKeyAlgorithm::Rsa.to_string(), "rsa");
        assert_eq!(SshKeyAlgorithm::Ecdsa.to_string(), "ecdsa");
    }

    #[test]
    fn test_ssh_key_algorithm_from_str() {
        use std::str::FromStr;

        let ed25519 = SshKeyAlgorithm::from_str("ed25519").expect("should parse");
        assert_eq!(ed25519, SshKeyAlgorithm::Ed25519);

        let rsa = SshKeyAlgorithm::from_str("rsa").expect("should parse");
        assert_eq!(rsa, SshKeyAlgorithm::Rsa);

        let ecdsa = SshKeyAlgorithm::from_str("ecdsa").expect("should parse");
        assert_eq!(ecdsa, SshKeyAlgorithm::Ecdsa);
    }

    #[test]
    fn test_ssh_key_algorithm_from_str_invalid() {
        use std::str::FromStr;

        let result = SshKeyAlgorithm::from_str("invalid");
        assert!(result.is_err());
    }

    #[test]
    fn test_ssh_key_algorithm_clone() {
        let algo = SshKeyAlgorithm::Ed25519;
        let cloned = algo.clone();
        assert_eq!(algo, cloned);
    }

    // ==================== SshKeyInfo Tests ====================

    #[test]
    fn test_ssh_key_info_creation() {
        let info = SshKeyInfo {
            path: "~/.ssh/id_ed25519".to_string(),
            public_key_path: "~/.ssh/id_ed25519.pub".to_string(),
            key_type: SshKeyAlgorithm::Ed25519,
            format: SshKeyFormat::Unencrypted,
            comment: Some("user@host".to_string()),
            fingerprint: Some("SHA256:abc123".to_string()),
            bits: None,
            created_at: Some("2024-01-01T00:00:00Z".to_string()),
        };

        assert_eq!(info.path, "~/.ssh/id_ed25519");
        assert_eq!(info.public_key_path, "~/.ssh/id_ed25519.pub");
        assert_eq!(info.key_type, SshKeyAlgorithm::Ed25519);
        assert_eq!(info.format, SshKeyFormat::Unencrypted);
        assert!(info.comment.is_some());
        assert!(info.fingerprint.is_some());
        assert!(info.bits.is_none());
        assert!(info.created_at.is_some());
    }

    #[test]
    fn test_ssh_key_info_rsa() {
        let info = SshKeyInfo {
            path: "~/.ssh/id_rsa".to_string(),
            public_key_path: "~/.ssh/id_rsa.pub".to_string(),
            key_type: SshKeyAlgorithm::Rsa,
            format: SshKeyFormat::Unencrypted,
            comment: None,
            fingerprint: Some("SHA256:xyz789".to_string()),
            bits: Some(4096),
            created_at: None,
        };

        assert_eq!(info.key_type, SshKeyAlgorithm::Rsa);
        assert_eq!(info.bits, Some(4096));
        assert!(info.comment.is_none());
    }

    #[test]
    fn test_ssh_key_info_serialization() {
        let info = SshKeyInfo {
            path: "/home/user/.ssh/key".to_string(),
            public_key_path: "/home/user/.ssh/key.pub".to_string(),
            key_type: SshKeyAlgorithm::Ecdsa,
            format: SshKeyFormat::Unencrypted,
            comment: Some("test".to_string()),
            fingerprint: None,
            bits: Some(256),
            created_at: None,
        };

        let json = serde_json::to_string(&info).expect("should serialize");
        assert!(json.contains("\"keyType\":\"Ecdsa\""));
        assert!(json.contains("\"format\":\"Unencrypted\""));
        assert!(json.contains("\"publicKeyPath\":\"/home/user/.ssh/key.pub\""));
        assert!(json.contains("\"comment\":\"test\""));
        assert!(json.contains("\"bits\":256"));
    }

    #[test]
    fn test_ssh_key_info_deserialization() {
        let json = r#"{
            "path": "~/.ssh/id_ed25519",
            "publicKeyPath": "~/.ssh/id_ed25519.pub",
            "keyType": "Ed25519",
            "format": "Unencrypted",
            "comment": "user@host",
            "fingerprint": "SHA256:abc",
            "bits": null,
            "createdAt": null
        }"#;
        let info: SshKeyInfo = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(info.path, "~/.ssh/id_ed25519");
        assert_eq!(info.key_type, SshKeyAlgorithm::Ed25519);
        assert_eq!(info.comment, Some("user@host".to_string()));
    }

    #[test]
    fn test_ssh_key_info_clone() {
        let info = SshKeyInfo {
            path: "~/.ssh/key".to_string(),
            public_key_path: "~/.ssh/key.pub".to_string(),
            key_type: SshKeyAlgorithm::Ed25519,
            format: SshKeyFormat::EncryptedPem,
            comment: Some("test".to_string()),
            fingerprint: None,
            bits: None,
            created_at: None,
        };

        let cloned = info.clone();
        assert_eq!(cloned.path, info.path);
        assert_eq!(cloned.key_type, info.key_type);
    }

    // ==================== GenerateSshKeyOptions Tests ====================

    #[test]
    fn test_generate_ssh_key_options_ed25519() {
        let opts = GenerateSshKeyOptions {
            algorithm: SshKeyAlgorithm::Ed25519,
            comment: Some("test@example.com".to_string()),
            passphrase: None,
            filename: "id_test".to_string(),
            bits: None,
        };

        assert_eq!(opts.algorithm, SshKeyAlgorithm::Ed25519);
        assert!(opts.comment.is_some());
        assert!(opts.passphrase.is_none());
        assert!(opts.bits.is_none());
    }

    #[test]
    fn test_generate_ssh_key_options_rsa() {
        let opts = GenerateSshKeyOptions {
            algorithm: SshKeyAlgorithm::Rsa,
            comment: None,
            passphrase: Some("secret".to_string()),
            filename: "id_rsa_custom".to_string(),
            bits: Some(4096),
        };

        assert_eq!(opts.algorithm, SshKeyAlgorithm::Rsa);
        assert_eq!(opts.bits, Some(4096));
        assert!(opts.passphrase.is_some());
    }

    #[test]
    fn test_generate_ssh_key_options_serialization() {
        let opts = GenerateSshKeyOptions {
            algorithm: SshKeyAlgorithm::Ed25519,
            comment: Some("user@host".to_string()),
            passphrase: None,
            filename: "my_key".to_string(),
            bits: None,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"algorithm\":\"Ed25519\""));
        assert!(json.contains("\"filename\":\"my_key\""));
    }

    #[test]
    fn test_generate_ssh_key_options_clone() {
        let opts = GenerateSshKeyOptions {
            algorithm: SshKeyAlgorithm::Rsa,
            comment: Some("test".to_string()),
            passphrase: None,
            filename: "key".to_string(),
            bits: Some(2048),
        };

        let cloned = opts.clone();
        assert_eq!(cloned.algorithm, opts.algorithm);
        assert_eq!(cloned.filename, opts.filename);
    }

    // ==================== ImportSshKeyOptions Tests ====================

    #[test]
    fn test_import_ssh_key_options() {
        let opts = ImportSshKeyOptions {
            source_path: "/tmp/my_key".to_string(),
            target_filename: "imported_key".to_string(),
        };

        assert_eq!(opts.source_path, "/tmp/my_key");
        assert_eq!(opts.target_filename, "imported_key");
    }

    #[test]
    fn test_import_ssh_key_options_serialization() {
        let opts = ImportSshKeyOptions {
            source_path: "/path/to/key".to_string(),
            target_filename: "my_key".to_string(),
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"sourcePath\":\"/path/to/key\""));
        assert!(json.contains("\"targetFilename\":\"my_key\""));
    }

    #[test]
    fn test_import_ssh_key_options_clone() {
        let opts = ImportSshKeyOptions {
            source_path: "/tmp/key".to_string(),
            target_filename: "key".to_string(),
        };

        let cloned = opts.clone();
        assert_eq!(cloned.source_path, opts.source_path);
    }

    // ==================== ExportSshKeyOptions Tests ====================

    #[test]
    fn test_export_ssh_key_options() {
        let opts = ExportSshKeyOptions {
            key_path: "~/.ssh/id_ed25519".to_string(),
            target_dir: "/tmp/export".to_string(),
            public_only: true,
        };

        assert_eq!(opts.key_path, "~/.ssh/id_ed25519");
        assert_eq!(opts.target_dir, "/tmp/export");
        assert!(opts.public_only);
    }

    #[test]
    fn test_export_ssh_key_options_serialization() {
        let opts = ExportSshKeyOptions {
            key_path: "~/.ssh/key".to_string(),
            target_dir: "/tmp".to_string(),
            public_only: false,
        };

        let json = serde_json::to_string(&opts).expect("should serialize");
        assert!(json.contains("\"keyPath\":\"~/.ssh/key\""));
        assert!(json.contains("\"publicOnly\":false"));
    }

    #[test]
    fn test_export_ssh_key_options_clone() {
        let opts = ExportSshKeyOptions {
            key_path: "~/.ssh/key".to_string(),
            target_dir: "/tmp".to_string(),
            public_only: true,
        };

        let cloned = opts.clone();
        assert_eq!(cloned.key_path, opts.key_path);
        assert_eq!(cloned.public_only, opts.public_only);
    }

    // ==================== RemoteSshKeyMapping Tests ====================

    #[test]
    fn test_remote_ssh_key_mapping() {
        let mapping = RemoteSshKeyMapping {
            remote_name: "origin".to_string(),
            ssh_key_path: "~/.ssh/id_ed25519".to_string(),
        };

        assert_eq!(mapping.remote_name, "origin");
        assert_eq!(mapping.ssh_key_path, "~/.ssh/id_ed25519");
    }

    #[test]
    fn test_remote_ssh_key_mapping_serialization() {
        let mapping = RemoteSshKeyMapping {
            remote_name: "upstream".to_string(),
            ssh_key_path: "~/.ssh/work_key".to_string(),
        };

        let json = serde_json::to_string(&mapping).expect("should serialize");
        assert!(json.contains("\"remoteName\":\"upstream\""));
        assert!(json.contains("\"sshKeyPath\":\"~/.ssh/work_key\""));
    }

    #[test]
    fn test_remote_ssh_key_mapping_deserialization() {
        let json = r#"{"remoteName":"origin","sshKeyPath":"~/.ssh/key"}"#;
        let mapping: RemoteSshKeyMapping = serde_json::from_str(json).expect("should deserialize");
        assert_eq!(mapping.remote_name, "origin");
        assert_eq!(mapping.ssh_key_path, "~/.ssh/key");
    }

    #[test]
    fn test_remote_ssh_key_mapping_clone() {
        let mapping = RemoteSshKeyMapping {
            remote_name: "origin".to_string(),
            ssh_key_path: "~/.ssh/key".to_string(),
        };

        let cloned = mapping.clone();
        assert_eq!(cloned.remote_name, mapping.remote_name);
        assert_eq!(cloned.ssh_key_path, mapping.ssh_key_path);
    }

    // ==================== SshKeyFormat Tests ====================

    #[test]
    fn test_ssh_key_format_default() {
        let format = SshKeyFormat::default();
        assert_eq!(format, SshKeyFormat::Unencrypted);
    }

    #[test]
    fn test_ssh_key_format_equality() {
        assert_eq!(SshKeyFormat::Unencrypted, SshKeyFormat::Unencrypted);
        assert_eq!(SshKeyFormat::EncryptedPem, SshKeyFormat::EncryptedPem);
        assert_eq!(SshKeyFormat::OpenSsh, SshKeyFormat::OpenSsh);
        assert_eq!(
            SshKeyFormat::EncryptedOpenSsh,
            SshKeyFormat::EncryptedOpenSsh
        );
        assert_eq!(SshKeyFormat::Unknown, SshKeyFormat::Unknown);
        assert_ne!(SshKeyFormat::Unencrypted, SshKeyFormat::EncryptedPem);
        assert_ne!(SshKeyFormat::OpenSsh, SshKeyFormat::Unknown);
        assert_ne!(SshKeyFormat::OpenSsh, SshKeyFormat::EncryptedOpenSsh);
    }

    #[test]
    fn test_ssh_key_format_serialization() {
        let json = serde_json::to_string(&SshKeyFormat::Unencrypted).expect("should serialize");
        assert_eq!(json, "\"Unencrypted\"");

        let json = serde_json::to_string(&SshKeyFormat::EncryptedPem).expect("should serialize");
        assert_eq!(json, "\"EncryptedPem\"");

        let json = serde_json::to_string(&SshKeyFormat::OpenSsh).expect("should serialize");
        assert_eq!(json, "\"OpenSsh\"");

        let json =
            serde_json::to_string(&SshKeyFormat::EncryptedOpenSsh).expect("should serialize");
        assert_eq!(json, "\"EncryptedOpenSsh\"");

        let json = serde_json::to_string(&SshKeyFormat::Unknown).expect("should serialize");
        assert_eq!(json, "\"Unknown\"");
    }

    #[test]
    fn test_ssh_key_format_deserialization() {
        let f: SshKeyFormat = serde_json::from_str("\"Unencrypted\"").expect("should deserialize");
        assert_eq!(f, SshKeyFormat::Unencrypted);

        let f: SshKeyFormat = serde_json::from_str("\"EncryptedPem\"").expect("should deserialize");
        assert_eq!(f, SshKeyFormat::EncryptedPem);

        let f: SshKeyFormat = serde_json::from_str("\"OpenSsh\"").expect("should deserialize");
        assert_eq!(f, SshKeyFormat::OpenSsh);

        let f: SshKeyFormat =
            serde_json::from_str("\"EncryptedOpenSsh\"").expect("should deserialize");
        assert_eq!(f, SshKeyFormat::EncryptedOpenSsh);

        let f: SshKeyFormat = serde_json::from_str("\"Unknown\"").expect("should deserialize");
        assert_eq!(f, SshKeyFormat::Unknown);
    }

    #[test]
    fn test_ssh_key_format_display() {
        assert_eq!(SshKeyFormat::Unencrypted.to_string(), "Unencrypted");
        assert_eq!(SshKeyFormat::EncryptedPem.to_string(), "EncryptedPem");
        assert_eq!(SshKeyFormat::OpenSsh.to_string(), "OpenSsh");
        assert_eq!(
            SshKeyFormat::EncryptedOpenSsh.to_string(),
            "EncryptedOpenSsh"
        );
        assert_eq!(SshKeyFormat::Unknown.to_string(), "Unknown");
    }

    #[test]
    fn test_ssh_key_format_from_str() {
        use std::str::FromStr;

        assert_eq!(
            SshKeyFormat::from_str("Unencrypted").expect("should parse"),
            SshKeyFormat::Unencrypted
        );
        assert_eq!(
            SshKeyFormat::from_str("EncryptedPem").expect("should parse"),
            SshKeyFormat::EncryptedPem
        );
        assert_eq!(
            SshKeyFormat::from_str("OpenSsh").expect("should parse"),
            SshKeyFormat::OpenSsh
        );
        assert_eq!(
            SshKeyFormat::from_str("EncryptedOpenSsh").expect("should parse"),
            SshKeyFormat::EncryptedOpenSsh
        );
        assert_eq!(
            SshKeyFormat::from_str("Unknown").expect("should parse"),
            SshKeyFormat::Unknown
        );
    }

    #[test]
    fn test_ssh_key_format_from_str_invalid() {
        use std::str::FromStr;
        assert!(SshKeyFormat::from_str("invalid").is_err());
    }

    #[test]
    fn test_ssh_key_format_clone() {
        let format = SshKeyFormat::EncryptedPem;
        let cloned = format.clone();
        assert_eq!(format, cloned);

        let format = SshKeyFormat::EncryptedOpenSsh;
        let cloned = format.clone();
        assert_eq!(format, cloned);
    }
}
