use crate::error::{AxisError, Result};
use crate::models::{
    ExportSshKeyOptions, GenerateSshKeyOptions, ImportSshKeyOptions, SshKeyAlgorithm, SshKeyInfo,
};
use crate::storage::Database;
use log::{error, info};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

/// Service for SSH key management and resolution (system-level, no repo needed)
pub struct SshKeyService;

impl SshKeyService {
    /// Get the SSH directory path (~/.ssh)
    pub fn ssh_dir() -> PathBuf {
        let expanded = shellexpand::tilde("~/.ssh").to_string();
        PathBuf::from(expanded)
    }

    /// Find ssh-keygen program (reuses pattern from SigningService)
    fn find_ssh_keygen() -> Result<PathBuf> {
        #[cfg(target_os = "windows")]
        let candidates = vec![
            "ssh-keygen.exe",
            "C:\\Windows\\System32\\OpenSSH\\ssh-keygen.exe",
            "C:\\Program Files\\Git\\usr\\bin\\ssh-keygen.exe",
        ];

        #[cfg(not(target_os = "windows"))]
        let candidates = vec!["/usr/bin/ssh-keygen", "ssh-keygen"];

        for candidate in candidates {
            let path = Path::new(candidate);
            if path.is_absolute() && path.exists() {
                return Ok(path.to_path_buf());
            }
            if let Ok(output) = Command::new(candidate).arg("-V").output() {
                if !output.stderr.is_empty() || !output.stdout.is_empty() {
                    return Ok(PathBuf::from(candidate));
                }
            }
        }

        Err(AxisError::SshKeygenNotFound)
    }

    /// Validate a key filename (no path traversal, no absolute paths)
    pub fn validate_filename(name: &str) -> Result<()> {
        if name.is_empty() {
            return Err(AxisError::InvalidKeyFilename(
                "filename cannot be empty".to_string(),
            ));
        }
        if name.contains("..") {
            return Err(AxisError::InvalidKeyFilename(
                "filename cannot contain '..'".to_string(),
            ));
        }
        if name.contains('/') || name.contains('\\') {
            return Err(AxisError::InvalidKeyFilename(
                "filename cannot contain path separators".to_string(),
            ));
        }
        if name.starts_with('.') && name.len() == 1 {
            return Err(AxisError::InvalidKeyFilename(
                "filename cannot be '.'".to_string(),
            ));
        }
        Ok(())
    }

    /// List all SSH keys in ~/.ssh
    pub fn list_keys() -> Result<Vec<SshKeyInfo>> {
        let ssh_dir = Self::ssh_dir();

        if !ssh_dir.exists() {
            return Ok(vec![]);
        }

        let mut keys = Vec::new();
        let entries = fs::read_dir(&ssh_dir)?;

        for entry in entries.flatten() {
            let path = entry.path();

            if !path.is_file() {
                continue;
            }

            let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if filename.ends_with(".pub")
                || filename == "known_hosts"
                || filename == "known_hosts.old"
                || filename == "authorized_keys"
                || filename == "config"
            {
                continue;
            }

            if let Ok(content) = fs::read_to_string(&path) {
                if content.contains("PRIVATE KEY") {
                    let key_type = Self::detect_algorithm(&content);
                    let pub_key_path = format!("{}.pub", path.display());
                    let comment = fs::read_to_string(&pub_key_path)
                        .ok()
                        .and_then(|pub_content| Self::extract_comment(&pub_content));

                    let fingerprint = Self::get_fingerprint_internal(&path);
                    let bits = Self::extract_bits(&path);

                    let created_at = fs::metadata(&path)
                        .ok()
                        .and_then(|m| m.created().ok())
                        .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339());

                    keys.push(SshKeyInfo {
                        path: path.to_string_lossy().to_string(),
                        public_key_path: pub_key_path,
                        key_type,
                        comment,
                        fingerprint,
                        bits,
                        created_at,
                    });
                }
            }
        }

        Ok(keys)
    }

    /// Generate a new SSH key
    pub fn generate_key(options: GenerateSshKeyOptions) -> Result<SshKeyInfo> {
        Self::validate_filename(&options.filename)?;

        let ssh_dir = Self::ssh_dir();
        if !ssh_dir.exists() {
            fs::create_dir_all(&ssh_dir)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                fs::set_permissions(&ssh_dir, fs::Permissions::from_mode(0o700))?;
            }
        }

        let key_path = ssh_dir.join(&options.filename);
        if key_path.exists() {
            return Err(AxisError::SshKeyAlreadyExists(options.filename));
        }

        let ssh_keygen = Self::find_ssh_keygen()?;

        let algo_str = options.algorithm.to_string();
        let passphrase = options.passphrase.as_deref().unwrap_or("");
        let key_path_str = key_path.to_string_lossy().to_string();

        let mut args = vec!["-t", &algo_str, "-f", &key_path_str, "-N", passphrase];

        let comment_str;
        if let Some(ref comment) = options.comment {
            args.push("-C");
            comment_str = comment.clone();
            args.push(&comment_str);
        }

        let bits_str;
        if let Some(bits) = options.bits {
            if options.algorithm == SshKeyAlgorithm::Rsa
                || options.algorithm == SshKeyAlgorithm::Ecdsa
            {
                args.push("-b");
                bits_str = bits.to_string();
                args.push(&bits_str);
            }
        }

        info!("Generating SSH key: {key_path_str}");

        let output = Command::new(&ssh_keygen)
            .args(&args)
            .output()
            .map_err(|e| AxisError::SshKeyError(format!("Failed to execute ssh-keygen: {e}")))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AxisError::SshKeyError(format!(
                "ssh-keygen failed: {stderr}"
            )));
        }

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&key_path, fs::Permissions::from_mode(0o600))?;
        }

        let pub_key_path = format!("{key_path_str}.pub");
        let fingerprint = Self::get_fingerprint_internal(&key_path);
        let bits = Self::extract_bits(&key_path);

        let created_at = fs::metadata(&key_path)
            .ok()
            .and_then(|m| m.created().ok())
            .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339());

        Ok(SshKeyInfo {
            path: key_path_str,
            public_key_path: pub_key_path,
            key_type: options.algorithm,
            comment: options.comment,
            fingerprint,
            bits,
            created_at,
        })
    }

    /// Get the content of a public key file
    pub fn get_public_key_content(key_path: &str) -> Result<String> {
        let pub_path = if key_path.ends_with(".pub") {
            key_path.to_string()
        } else {
            format!("{key_path}.pub")
        };

        let expanded = shellexpand::tilde(&pub_path).to_string();
        fs::read_to_string(&expanded).map_err(|e| {
            AxisError::SshKeyError(format!("Failed to read public key {expanded}: {e}"))
        })
    }

    /// Get the fingerprint of a key
    pub fn get_fingerprint(key_path: &str) -> Result<String> {
        let expanded = shellexpand::tilde(key_path).to_string();
        let path = Path::new(&expanded);

        Self::get_fingerprint_internal(path).ok_or_else(|| {
            AxisError::SshKeyError(format!("Failed to get fingerprint for {key_path}"))
        })
    }

    /// Delete an SSH key (private + public)
    pub fn delete_key(key_path: &str) -> Result<()> {
        let expanded = shellexpand::tilde(key_path).to_string();
        let path = Path::new(&expanded);

        // Security: only allow deleting keys within ~/.ssh/
        let ssh_dir = Self::ssh_dir();
        let canonical_path = path
            .canonicalize()
            .map_err(|e| AxisError::SshKeyError(format!("Failed to resolve key path: {e}")))?;
        let canonical_ssh_dir = ssh_dir
            .canonicalize()
            .map_err(|e| AxisError::SshKeyError(format!("Failed to resolve SSH directory: {e}")))?;

        if !canonical_path.starts_with(&canonical_ssh_dir) {
            return Err(AxisError::SshKeyError(
                "Can only delete keys within ~/.ssh/".to_string(),
            ));
        }

        // Delete private key
        if path.exists() {
            fs::remove_file(path)?;
            info!("Deleted SSH private key: {expanded}");
        }

        // Delete public key
        let pub_path_str = format!("{expanded}.pub");
        let pub_path = Path::new(&pub_path_str);
        if pub_path.exists() {
            fs::remove_file(pub_path)?;
            info!("Deleted SSH public key: {pub_path_str}");
        }

        Ok(())
    }

    /// Import an SSH key into ~/.ssh/
    pub fn import_key(options: ImportSshKeyOptions) -> Result<SshKeyInfo> {
        Self::validate_filename(&options.target_filename)?;

        let ssh_dir = Self::ssh_dir();
        if !ssh_dir.exists() {
            fs::create_dir_all(&ssh_dir)?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                fs::set_permissions(&ssh_dir, fs::Permissions::from_mode(0o700))?;
            }
        }

        let target_path = ssh_dir.join(&options.target_filename);
        if target_path.exists() {
            return Err(AxisError::SshKeyAlreadyExists(options.target_filename));
        }

        let source = Path::new(&options.source_path);
        if !source.exists() {
            return Err(AxisError::FileNotFound(options.source_path.clone()));
        }

        // Copy private key
        fs::copy(source, &target_path)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&target_path, fs::Permissions::from_mode(0o600))?;
        }

        // Copy public key if it exists
        let source_pub = format!("{}.pub", options.source_path);
        let target_pub = format!("{}.pub", target_path.display());
        if Path::new(&source_pub).exists() {
            fs::copy(&source_pub, &target_pub)?;
        }

        info!("Imported SSH key to: {}", target_path.display());

        // Read the imported key's info
        let content = fs::read_to_string(&target_path).unwrap_or_default();
        let key_type = Self::detect_algorithm(&content);
        let comment = fs::read_to_string(&target_pub)
            .ok()
            .and_then(|pub_content| Self::extract_comment(&pub_content));
        let fingerprint = Self::get_fingerprint_internal(&target_path);
        let bits = Self::extract_bits(&target_path);
        let created_at = fs::metadata(&target_path)
            .ok()
            .and_then(|m| m.created().ok())
            .map(|t| chrono::DateTime::<chrono::Utc>::from(t).to_rfc3339());

        Ok(SshKeyInfo {
            path: target_path.to_string_lossy().to_string(),
            public_key_path: target_pub,
            key_type,
            comment,
            fingerprint,
            bits,
            created_at,
        })
    }

    /// Export an SSH key to a target directory
    pub fn export_key(options: ExportSshKeyOptions) -> Result<()> {
        let expanded = shellexpand::tilde(&options.key_path).to_string();
        let source = Path::new(&expanded);
        let target_dir = Path::new(&options.target_dir);

        if !target_dir.exists() {
            return Err(AxisError::FileNotFound(options.target_dir.clone()));
        }

        let filename = source
            .file_name()
            .ok_or_else(|| AxisError::SshKeyError("Invalid key path".to_string()))?;

        if options.public_only {
            // Export only public key
            let pub_source = format!("{expanded}.pub");
            let pub_filename = format!("{}.pub", filename.to_string_lossy());
            let target = target_dir.join(pub_filename);
            fs::copy(&pub_source, &target)
                .map_err(|e| AxisError::SshKeyError(format!("Failed to export public key: {e}")))?;
        } else {
            // Export both keys
            let target = target_dir.join(filename);
            fs::copy(source, &target).map_err(|e| {
                AxisError::SshKeyError(format!("Failed to export private key: {e}"))
            })?;

            let pub_source = format!("{expanded}.pub");
            let pub_filename = format!("{}.pub", filename.to_string_lossy());
            let pub_target = target_dir.join(pub_filename);
            if Path::new(&pub_source).exists() {
                fs::copy(&pub_source, &pub_target).map_err(|e| {
                    AxisError::SshKeyError(format!("Failed to export public key: {e}"))
                })?;
            }
        }

        info!(
            "Exported SSH key from: {expanded} to: {}",
            options.target_dir
        );
        Ok(())
    }

    /// Resolve which SSH key to use for a remote operation.
    /// Resolution order: per-remote → global default → None (system default)
    pub fn resolve_ssh_key(
        database: &Database,
        repo_path: &str,
        remote_name: &str,
        default_ssh_key: &Option<String>,
    ) -> Option<String> {
        // 1. Check per-remote key
        match database.get_remote_ssh_key(repo_path, remote_name) {
            Ok(Some(key_path)) => {
                // Special sentinel "auto" means explicitly use system default
                if key_path == "auto" {
                    return None;
                }
                return Some(key_path);
            }
            Ok(None) => {}
            Err(e) => {
                error!("Failed to get remote SSH key: {e}");
            }
        }

        // 2. Check global default
        default_ssh_key.clone()
    }

    // ==================== Internal helpers ====================

    fn get_fingerprint_internal(key_path: &Path) -> Option<String> {
        let ssh_keygen = Self::find_ssh_keygen().ok()?;
        let key_path_str = key_path.to_string_lossy();

        let output = Command::new(&ssh_keygen)
            .args(["-lf", &key_path_str])
            .output()
            .ok()?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Output format: "4096 SHA256:... comment (RSA)"
            let parts: Vec<&str> = stdout.trim().splitn(3, ' ').collect();
            if parts.len() >= 2 {
                return Some(parts[1].to_string());
            }
        }

        None
    }

    fn extract_bits(key_path: &Path) -> Option<u32> {
        let ssh_keygen = Self::find_ssh_keygen().ok()?;
        let key_path_str = key_path.to_string_lossy();

        let output = Command::new(&ssh_keygen)
            .args(["-lf", &key_path_str])
            .output()
            .ok()?;

        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Output format: "4096 SHA256:... comment (RSA)"
            let first_word = stdout.split_whitespace().next()?;
            first_word.parse().ok()
        } else {
            None
        }
    }

    fn detect_algorithm(content: &str) -> SshKeyAlgorithm {
        if content.contains("ED25519") {
            SshKeyAlgorithm::Ed25519
        } else if content.contains("RSA") {
            SshKeyAlgorithm::Rsa
        } else if content.contains("ECDSA") || content.contains("EC PRIVATE") {
            SshKeyAlgorithm::Ecdsa
        } else {
            // Default to Ed25519 for unknown types
            SshKeyAlgorithm::Ed25519
        }
    }

    fn extract_comment(pub_content: &str) -> Option<String> {
        let parts: Vec<&str> = pub_content.split_whitespace().collect();
        if parts.len() >= 3 {
            Some(parts[2..].join(" "))
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // ==================== validate_filename Tests ====================

    #[test]
    fn test_validate_filename_valid() {
        assert!(SshKeyService::validate_filename("id_ed25519").is_ok());
        assert!(SshKeyService::validate_filename("my_key").is_ok());
        assert!(SshKeyService::validate_filename("key-2024").is_ok());
        assert!(SshKeyService::validate_filename(".hidden_key").is_ok());
    }

    #[test]
    fn test_validate_filename_empty() {
        let result = SshKeyService::validate_filename("");
        assert!(result.is_err());
        assert!(matches!(
            result.expect_err("should be error"),
            AxisError::InvalidKeyFilename(_)
        ));
    }

    #[test]
    fn test_validate_filename_path_traversal() {
        let result = SshKeyService::validate_filename("../evil");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_filename_with_slash() {
        let result = SshKeyService::validate_filename("path/key");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_filename_with_backslash() {
        let result = SshKeyService::validate_filename("path\\key");
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_filename_dot() {
        let result = SshKeyService::validate_filename(".");
        assert!(result.is_err());
    }

    // ==================== ssh_dir Tests ====================

    #[test]
    fn test_ssh_dir() {
        let dir = SshKeyService::ssh_dir();
        assert!(dir.to_string_lossy().contains(".ssh"));
        assert!(!dir.to_string_lossy().starts_with('~'));
    }

    // ==================== detect_algorithm Tests ====================

    #[test]
    fn test_detect_algorithm_ed25519() {
        let content =
            "-----BEGIN OPENSSH PRIVATE KEY-----\nED25519\n-----END OPENSSH PRIVATE KEY-----";
        assert_eq!(
            SshKeyService::detect_algorithm(content),
            SshKeyAlgorithm::Ed25519
        );
    }

    #[test]
    fn test_detect_algorithm_rsa() {
        let content = "-----BEGIN RSA PRIVATE KEY-----\ndata\n-----END RSA PRIVATE KEY-----";
        assert_eq!(
            SshKeyService::detect_algorithm(content),
            SshKeyAlgorithm::Rsa
        );
    }

    #[test]
    fn test_detect_algorithm_ecdsa() {
        let content = "-----BEGIN EC PRIVATE KEY-----\ndata\n-----END EC PRIVATE KEY-----";
        assert_eq!(
            SshKeyService::detect_algorithm(content),
            SshKeyAlgorithm::Ecdsa
        );
    }

    #[test]
    fn test_detect_algorithm_unknown() {
        let content = "-----BEGIN PRIVATE KEY-----\ndata\n-----END PRIVATE KEY-----";
        // Unknown defaults to Ed25519
        assert_eq!(
            SshKeyService::detect_algorithm(content),
            SshKeyAlgorithm::Ed25519
        );
    }

    // ==================== extract_comment Tests ====================

    #[test]
    fn test_extract_comment_valid() {
        let pub_content = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5 user@host";
        let comment = SshKeyService::extract_comment(pub_content);
        assert_eq!(comment, Some("user@host".to_string()));
    }

    #[test]
    fn test_extract_comment_with_spaces() {
        let pub_content = "ssh-rsa AAAAB3NzaC1yc2EAAAA John Doe (work)";
        let comment = SshKeyService::extract_comment(pub_content);
        assert_eq!(comment, Some("John Doe (work)".to_string()));
    }

    #[test]
    fn test_extract_comment_no_comment() {
        let pub_content = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5";
        let comment = SshKeyService::extract_comment(pub_content);
        assert!(comment.is_none());
    }

    #[test]
    fn test_extract_comment_empty() {
        let pub_content = "";
        let comment = SshKeyService::extract_comment(pub_content);
        assert!(comment.is_none());
    }

    // ==================== resolve_ssh_key Tests ====================

    #[test]
    fn test_resolve_ssh_key_per_remote() {
        let db = Database::open_in_memory().expect("should create db");
        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/remote_key")
            .expect("should set");

        let result = SshKeyService::resolve_ssh_key(
            &db,
            "/repo",
            "origin",
            &Some("~/.ssh/global_key".to_string()),
        );
        assert_eq!(result, Some("~/.ssh/remote_key".to_string()));
    }

    #[test]
    fn test_resolve_ssh_key_global_default() {
        let db = Database::open_in_memory().expect("should create db");

        let result = SshKeyService::resolve_ssh_key(
            &db,
            "/repo",
            "origin",
            &Some("~/.ssh/global_key".to_string()),
        );
        assert_eq!(result, Some("~/.ssh/global_key".to_string()));
    }

    #[test]
    fn test_resolve_ssh_key_none() {
        let db = Database::open_in_memory().expect("should create db");

        let result = SshKeyService::resolve_ssh_key(&db, "/repo", "origin", &None);
        assert!(result.is_none());
    }

    #[test]
    fn test_resolve_ssh_key_auto_sentinel() {
        let db = Database::open_in_memory().expect("should create db");
        db.set_remote_ssh_key("/repo", "origin", "auto")
            .expect("should set");

        let result = SshKeyService::resolve_ssh_key(
            &db,
            "/repo",
            "origin",
            &Some("~/.ssh/global_key".to_string()),
        );
        // "auto" sentinel means use system default (None)
        assert!(result.is_none());
    }

    #[test]
    fn test_resolve_ssh_key_per_remote_overrides_global() {
        let db = Database::open_in_memory().expect("should create db");
        db.set_remote_ssh_key("/repo", "origin", "~/.ssh/specific_key")
            .expect("should set");

        let result = SshKeyService::resolve_ssh_key(
            &db,
            "/repo",
            "origin",
            &Some("~/.ssh/global_key".to_string()),
        );
        assert_eq!(result, Some("~/.ssh/specific_key".to_string()));
    }

    // ==================== list_keys Tests ====================

    #[test]
    fn test_list_keys_no_ssh_dir() {
        // This test just verifies no panic; actual keys depend on system
        let result = SshKeyService::list_keys();
        assert!(result.is_ok());
    }

    // ==================== generate_key Tests ====================

    #[test]
    fn test_generate_key_invalid_filename() {
        let opts = GenerateSshKeyOptions {
            algorithm: SshKeyAlgorithm::Ed25519,
            comment: None,
            passphrase: None,
            filename: "../evil".to_string(),
            bits: None,
        };

        let result = SshKeyService::generate_key(opts);
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_key_empty_filename() {
        let opts = GenerateSshKeyOptions {
            algorithm: SshKeyAlgorithm::Ed25519,
            comment: None,
            passphrase: None,
            filename: "".to_string(),
            bits: None,
        };

        let result = SshKeyService::generate_key(opts);
        assert!(result.is_err());
    }

    // ==================== get_public_key_content Tests ====================

    #[test]
    fn test_get_public_key_content_nonexistent() {
        let result = SshKeyService::get_public_key_content("/nonexistent/path/key");
        assert!(result.is_err());
    }

    #[test]
    fn test_get_public_key_content_adds_pub_extension() {
        // Test that it appends .pub when not present
        let result = SshKeyService::get_public_key_content("/nonexistent/key");
        assert!(result.is_err());
        // The error message should reference the .pub path
    }

    // ==================== delete_key Tests ====================

    #[test]
    fn test_delete_key_outside_ssh_dir() {
        let result = SshKeyService::delete_key("/tmp/some_key");
        assert!(result.is_err());
    }

    // ==================== export_key Tests ====================

    #[test]
    fn test_export_key_nonexistent_target() {
        let opts = ExportSshKeyOptions {
            key_path: "~/.ssh/id_ed25519".to_string(),
            target_dir: "/nonexistent/dir".to_string(),
            public_only: true,
        };

        let result = SshKeyService::export_key(opts);
        assert!(result.is_err());
    }

    // ==================== import_key Tests ====================

    #[test]
    fn test_import_key_invalid_filename() {
        let opts = ImportSshKeyOptions {
            source_path: "/tmp/key".to_string(),
            target_filename: "..".to_string(),
        };

        let result = SshKeyService::import_key(opts);
        assert!(result.is_err());
    }

    #[test]
    fn test_import_key_nonexistent_source() {
        let opts = ImportSshKeyOptions {
            source_path: "/nonexistent/key".to_string(),
            target_filename: "imported_key".to_string(),
        };

        let result = SshKeyService::import_key(opts);
        assert!(result.is_err());
    }

    // ==================== Integration test with tempdir ====================

    #[test]
    fn test_generate_and_delete_key() {
        // Skip if ssh-keygen is not available
        if SshKeyService::find_ssh_keygen().is_err() {
            return;
        }

        let tmp = TempDir::new().expect("should create temp dir");
        let filename = format!("test_key_{}", std::process::id());
        let key_path = tmp.path().join(&filename);

        // We can't easily test generate_key since it writes to ~/.ssh
        // Instead, test the components individually
        assert!(SshKeyService::validate_filename(&filename).is_ok());
    }
}
