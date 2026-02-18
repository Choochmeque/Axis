use crate::error::{AxisError, Result};
use crate::models::{GpgKey, SigningConfig, SigningFormat, SigningTestResult, SshKey};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tempfile::NamedTempFile;
use tokio::io::AsyncWriteExt;

use crate::services::create_command;

/// Service for commit signing operations (GPG and SSH)
pub struct SigningService {
    repo_path: PathBuf,
}

impl SigningService {
    pub fn new(repo_path: &Path) -> Self {
        SigningService {
            repo_path: repo_path.to_path_buf(),
        }
    }

    /// Detect signing configuration from git config
    pub fn get_config_from_git(&self) -> Result<SigningConfig> {
        let repo = git2::Repository::open(&self.repo_path)?;
        let config = repo.config()?;

        // Get signing format (gpg.format)
        let format = config
            .get_string("gpg.format")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(SigningFormat::Gpg);

        // Get signing key (user.signingkey)
        let signing_key = config.get_string("user.signingkey").ok();

        // Get custom GPG program (gpg.program)
        let gpg_program = config.get_string("gpg.program").ok();

        // Get custom SSH signing program (gpg.ssh.program)
        let ssh_program = config.get_string("gpg.ssh.program").ok();

        Ok(SigningConfig {
            format,
            signing_key,
            gpg_program,
            ssh_program,
        })
    }

    /// Find GPG program on the system (cross-platform)
    pub async fn find_gpg_program() -> Option<PathBuf> {
        #[cfg(target_os = "windows")]
        let candidates = vec![
            "gpg.exe",
            "C:\\Program Files\\GnuPG\\bin\\gpg.exe",
            "C:\\Program Files (x86)\\GnuPG\\bin\\gpg.exe",
            "C:\\Program Files\\Git\\usr\\bin\\gpg.exe",
        ];

        #[cfg(target_os = "macos")]
        let candidates = vec![
            "/opt/homebrew/bin/gpg",
            "/usr/local/bin/gpg",
            "/usr/local/MacGPG2/bin/gpg",
            "/usr/bin/gpg",
            "gpg",
        ];

        #[cfg(target_os = "linux")]
        let candidates = vec!["/usr/bin/gpg2", "/usr/bin/gpg", "gpg2", "gpg"];

        for candidate in candidates {
            let path = Path::new(candidate);
            if path.is_absolute() && path.exists() {
                return Some(path.to_path_buf());
            }
            // Try to find in PATH
            if let Ok(output) = create_command(candidate).arg("--version").output().await {
                if output.status.success() {
                    return Some(PathBuf::from(candidate));
                }
            }
        }
        None
    }

    /// Find SSH signing program (ssh-keygen)
    pub async fn find_ssh_program() -> Option<PathBuf> {
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
                return Some(path.to_path_buf());
            }
            // Try to find in PATH
            if let Ok(output) = create_command(candidate).arg("-V").output().await {
                // ssh-keygen -V returns non-zero but still outputs version info
                if !output.stderr.is_empty() || !output.stdout.is_empty() {
                    return Some(PathBuf::from(candidate));
                }
            }
        }
        None
    }

    /// Check if signing is available with the given configuration
    pub async fn is_signing_available(&self, config: &SigningConfig) -> Result<bool> {
        if config.signing_key.is_none() {
            return Ok(false);
        }

        match config.format {
            SigningFormat::Gpg => {
                let program = match config.gpg_program.as_ref() {
                    Some(p) => Some(PathBuf::from(p)),
                    None => Self::find_gpg_program().await,
                };
                Ok(program.is_some())
            }
            SigningFormat::Ssh => {
                let program = match config.ssh_program.as_ref() {
                    Some(p) => Some(PathBuf::from(p)),
                    None => Self::find_ssh_program().await,
                };

                // Also check that the SSH key file exists
                if let Some(key_path) = &config.signing_key {
                    let expanded = expand_path(key_path);
                    if !Path::new(&expanded).exists() {
                        return Ok(false);
                    }
                }

                Ok(program.is_some())
            }
        }
    }

    /// Sign a commit buffer using GPG
    pub async fn sign_with_gpg(
        &self,
        buffer: &str,
        key_id: &str,
        program: Option<&Path>,
    ) -> Result<String> {
        let gpg_program = match program {
            Some(p) => Some(p.to_path_buf()),
            None => Self::find_gpg_program().await,
        }
        .ok_or_else(|| AxisError::FileNotFound("GPG program not found".to_string()))?;

        let mut child = create_command(gpg_program.as_os_str())
            .args(["--status-fd=2", "-bsau", key_id, "--armor", "--detach-sign"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| AxisError::Other(format!("Failed to spawn GPG: {e}")))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin
                .write_all(buffer.as_bytes())
                .await
                .map_err(|e| AxisError::Other(format!("Failed to write to GPG stdin: {e}")))?;
        }

        let output = child
            .wait_with_output()
            .await
            .map_err(|e| AxisError::Other(format!("Failed to wait for GPG: {e}")))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AxisError::Other(format!("GPG signing failed: {stderr}")));
        }

        let signature = String::from_utf8(output.stdout)
            .map_err(|e| AxisError::Other(format!("Invalid GPG signature output: {e}")))?;

        Ok(signature)
    }

    /// Sign a commit buffer using SSH
    pub async fn sign_with_ssh(
        &self,
        buffer: &str,
        key_path: &str,
        program: Option<&Path>,
    ) -> Result<String> {
        let ssh_program = match program {
            Some(p) => Some(p.to_path_buf()),
            None => Self::find_ssh_program().await,
        }
        .ok_or_else(|| AxisError::FileNotFound("SSH signing program not found".to_string()))?;

        let expanded_key_path = expand_path(key_path);

        if !Path::new(&expanded_key_path).exists() {
            return Err(AxisError::Other(format!(
                "SSH key not found: {expanded_key_path}",
            )));
        }

        // Create a temporary file for the buffer (ssh-keygen requires a file)
        let mut temp_file = NamedTempFile::new()
            .map_err(|e| AxisError::Other(format!("Failed to create temp file: {e}")))?;

        temp_file
            .write_all(buffer.as_bytes())
            .map_err(|e| AxisError::Other(format!("Failed to write temp file: {e}")))?;

        let temp_path = temp_file.path();

        // ssh-keygen -Y sign -f <key> -n git <file>
        let output = create_command(ssh_program.as_os_str())
            .args([
                "-Y",
                "sign",
                "-f",
                &expanded_key_path,
                "-n",
                "git",
                temp_path
                    .to_str()
                    .ok_or_else(|| AxisError::Other("Invalid temp file path".to_string()))?,
            ])
            .output()
            .await
            .map_err(|e| AxisError::Other(format!("Failed to execute ssh-keygen: {e}")))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(AxisError::Other(format!("SSH signing failed: {stderr}")));
        }

        // Read the signature file (ssh-keygen creates <file>.sig)
        let sig_file = format!("{}.sig", temp_path.display());
        let signature = std::fs::read_to_string(&sig_file)
            .map_err(|e| AxisError::Other(format!("Failed to read SSH signature: {e}")))?;

        // Clean up signature file (temp_file auto-cleans on drop)
        let _ = std::fs::remove_file(&sig_file);

        Ok(signature)
    }

    /// Sign a buffer based on the configuration
    pub async fn sign_buffer(&self, buffer: &str, config: &SigningConfig) -> Result<String> {
        let key = config
            .signing_key
            .as_ref()
            .ok_or_else(|| AxisError::Other("No signing key configured".to_string()))?;

        match config.format {
            SigningFormat::Gpg => {
                self.sign_with_gpg(buffer, key, config.gpg_program.as_ref().map(Path::new))
                    .await
            }
            SigningFormat::Ssh => {
                self.sign_with_ssh(buffer, key, config.ssh_program.as_ref().map(Path::new))
                    .await
            }
        }
    }

    /// List available GPG secret keys
    pub async fn list_gpg_keys(&self) -> Result<Vec<GpgKey>> {
        let gpg_program = Self::find_gpg_program()
            .await
            .ok_or_else(|| AxisError::Other("GPG program not found".to_string()))?;

        let output = create_command(gpg_program.as_os_str())
            .args([
                "--list-secret-keys",
                "--keyid-format",
                "long",
                "--with-colons",
            ])
            .output()
            .await
            .map_err(|e| AxisError::Other(format!("Failed to list GPG keys: {e}")))?;

        if !output.status.success() {
            // No keys is not an error
            return Ok(vec![]);
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut keys = Vec::new();
        let mut current_key_id: Option<String> = None;

        for line in stdout.lines() {
            let fields: Vec<&str> = line.split(':').collect();
            if fields.is_empty() {
                continue;
            }

            match fields[0] {
                "sec" => {
                    // Secret key line: sec:u:4096:1:KEYID:created:expires::::
                    if fields.len() > 4 {
                        current_key_id = Some(fields[4].to_string());
                    }
                }
                "uid" => {
                    // User ID line: uid:u::::created::HASH:User Name <email@example.com>:
                    if let Some(ref key_id) = current_key_id {
                        if fields.len() > 9 {
                            let user_id = fields[9].to_string();
                            let email = extract_email(&user_id);

                            keys.push(GpgKey {
                                key_id: key_id.clone(),
                                user_id,
                                email,
                                is_default: false,
                            });
                        }
                    }
                }
                _ => {}
            }
        }

        // Mark the first key as default (or check git config)
        if let Some(first) = keys.first_mut() {
            first.is_default = true;
        }

        // Check if there's a configured default key
        if let Ok(config) = self.get_config_from_git() {
            if let Some(default_key) = config.signing_key {
                for key in &mut keys {
                    key.is_default = key.key_id.ends_with(&default_key)
                        || key.email.as_ref().is_some_and(|e| e == &default_key);
                }
            }
        }

        Ok(keys)
    }

    /// List available SSH keys from ~/.ssh
    pub fn list_ssh_keys(&self) -> Result<Vec<SshKey>> {
        let ssh_dir_str = shellexpand::tilde("~/.ssh").to_string();
        let ssh_dir = Path::new(&ssh_dir_str);

        if !ssh_dir.exists() {
            return Ok(vec![]);
        }

        let mut keys = Vec::new();
        let entries = std::fs::read_dir(ssh_dir)?;

        for entry in entries.flatten() {
            let path = entry.path();

            // Skip if not a file
            if !path.is_file() {
                continue;
            }

            // Skip public keys and known_hosts
            let filename = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
            if path
                .extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("pub"))
                || filename == "known_hosts"
                || filename == "authorized_keys"
                || filename == "config"
            {
                continue;
            }

            // Check if this looks like a private key
            if let Ok(content) = std::fs::read_to_string(&path) {
                if content.contains("PRIVATE KEY") {
                    let key_type = detect_ssh_key_type(&content);

                    // Try to get comment from public key
                    let pub_key_path = format!("{}.pub", path.display());
                    let comment = std::fs::read_to_string(&pub_key_path)
                        .ok()
                        .and_then(|pub_content| extract_ssh_comment(&pub_content));

                    keys.push(SshKey {
                        path: path.to_string_lossy().to_string(),
                        key_type,
                        comment,
                    });
                }
            }
        }

        Ok(keys)
    }

    /// Verify a GPG signature and extract signer info
    pub async fn verify_gpg_signature(signature: &str, data: &str) -> Option<String> {
        let gpg_program = Self::find_gpg_program().await?;

        let mut sig_file = NamedTempFile::new().ok()?;
        let mut data_file = NamedTempFile::new().ok()?;

        sig_file.write_all(signature.as_bytes()).ok()?;
        data_file.write_all(data.as_bytes()).ok()?;

        let output = create_command(gpg_program.as_os_str())
            .args([
                "--status-fd=1",
                "--verify",
                sig_file.path().to_str()?,
                data_file.path().to_str()?,
            ])
            .output()
            .await
            .ok()?;

        let status = String::from_utf8_lossy(&output.stdout);

        // Look for GOODSIG line: [GNUPG:] GOODSIG <keyid> <username>
        for line in status.lines() {
            if line.contains("GOODSIG") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    return Some(parts[3..].join(" "));
                }
            }
        }

        None
    }

    /// Verify an SSH signature and extract signer info
    pub async fn verify_ssh_signature(
        signature: &str,
        data: &str,
        repo_path: &Path,
    ) -> Option<String> {
        let ssh_program = Self::find_ssh_program().await?;

        // Get allowed signers file from git config
        let repo = git2::Repository::open(repo_path).ok()?;
        let config = repo.config().ok()?;
        let allowed_signers = config.get_string("gpg.ssh.allowedSignersFile").ok()?;
        let allowed_signers = expand_path(&allowed_signers);

        if !Path::new(&allowed_signers).exists() {
            return None;
        }

        let mut sig_file = NamedTempFile::new().ok()?;
        let mut data_file = NamedTempFile::new().ok()?;

        sig_file.write_all(signature.as_bytes()).ok()?;
        data_file.write_all(data.as_bytes()).ok()?;

        // ssh-keygen -Y verify -f <allowed_signers> -I <identity> -n git -s <sig> < <data>
        let output = create_command(ssh_program.as_os_str())
            .args([
                "-Y",
                "verify",
                "-f",
                &allowed_signers,
                "-I",
                "*", // Match any identity
                "-n",
                "git",
                "-s",
                sig_file.path().to_str()?,
            ])
            .stdin(std::fs::File::open(data_file.path()).ok()?)
            .output()
            .await
            .ok()?;

        if output.status.success() {
            // Extract principal from output
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.contains("Good") {
                    return Some(line.to_string());
                }
            }
            return Some("Verified".to_string());
        }

        None
    }

    /// Test signing with the given configuration
    pub async fn test_signing(&self, config: &SigningConfig) -> SigningTestResult {
        let test_content = "test signing content";

        let (success, error, program_used) = match self.sign_buffer(test_content, config).await {
            Ok(_) => {
                let program = match config.format {
                    SigningFormat::Gpg => match config.gpg_program.clone() {
                        Some(p) => Some(p),
                        None => Self::find_gpg_program()
                            .await
                            .map(|p| p.to_string_lossy().to_string()),
                    },
                    SigningFormat::Ssh => match config.ssh_program.clone() {
                        Some(p) => Some(p),
                        None => Self::find_ssh_program()
                            .await
                            .map(|p| p.to_string_lossy().to_string()),
                    },
                };
                (true, None, program)
            }
            Err(e) => (false, Some(e.to_string()), None),
        };

        SigningTestResult {
            success,
            error,
            program_used,
        }
    }
}

/// Expand ~ and environment variables in path
fn expand_path(path: &str) -> String {
    shellexpand::tilde(path).to_string()
}

/// Extract email from GPG user ID (e.g., "Name <email@example.com>")
fn extract_email(user_id: &str) -> Option<String> {
    let start = user_id.find('<')?;
    let end = user_id.find('>')?;
    if start < end {
        Some(user_id[start + 1..end].to_string())
    } else {
        None
    }
}

/// Detect SSH key type from file content
fn detect_ssh_key_type(content: &str) -> String {
    if content.contains("ED25519") {
        "ed25519".to_string()
    } else if content.contains("RSA") {
        "rsa".to_string()
    } else if content.contains("ECDSA") {
        "ecdsa".to_string()
    } else if content.contains("DSA") {
        "dsa".to_string()
    } else {
        "unknown".to_string()
    }
}

/// Extract comment from SSH public key
fn extract_ssh_comment(pub_content: &str) -> Option<String> {
    // Public key format: type base64key comment
    let parts: Vec<&str> = pub_content.split_whitespace().collect();
    if parts.len() >= 3 {
        Some(parts[2..].join(" "))
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // ==================== Helper Function Tests ====================

    #[test]
    fn test_expand_path_with_tilde() {
        let expanded = expand_path("~/.ssh/id_rsa");
        assert!(!expanded.starts_with('~'));
        assert!(expanded.contains(".ssh/id_rsa"));
    }

    #[test]
    fn test_expand_path_without_tilde() {
        let path = "/usr/bin/gpg";
        let expanded = expand_path(path);
        assert_eq!(expanded, path);
    }

    #[test]
    fn test_expand_path_relative() {
        let path = "relative/path";
        let expanded = expand_path(path);
        assert_eq!(expanded, path);
    }

    #[test]
    fn test_extract_email_valid() {
        let user_id = "John Doe <john@example.com>";
        let email = extract_email(user_id);
        assert_eq!(email, Some("john@example.com".to_string()));
    }

    #[test]
    fn test_extract_email_with_name() {
        let user_id = "Jane Smith (work) <jane.smith@work.com>";
        let email = extract_email(user_id);
        assert_eq!(email, Some("jane.smith@work.com".to_string()));
    }

    #[test]
    fn test_extract_email_no_brackets() {
        let user_id = "No Email Here";
        let email = extract_email(user_id);
        assert!(email.is_none());
    }

    #[test]
    fn test_extract_email_empty_brackets() {
        let user_id = "User <>";
        let email = extract_email(user_id);
        assert_eq!(email, Some(String::new()));
    }

    #[test]
    fn test_extract_email_malformed() {
        let user_id = "User >malformed<";
        let email = extract_email(user_id);
        assert!(email.is_none());
    }

    #[test]
    fn test_detect_ssh_key_type_ed25519() {
        let content = "-----BEGIN OPENSSH PRIVATE KEY-----\nED25519 key data\n-----END OPENSSH PRIVATE KEY-----";
        assert_eq!(detect_ssh_key_type(content), "ed25519");
    }

    #[test]
    fn test_detect_ssh_key_type_rsa() {
        let content =
            "-----BEGIN RSA PRIVATE KEY-----\nRSA key data\n-----END RSA PRIVATE KEY-----";
        assert_eq!(detect_ssh_key_type(content), "rsa");
    }

    #[test]
    fn test_detect_ssh_key_type_ecdsa() {
        let content =
            "-----BEGIN EC PRIVATE KEY-----\nECDSA key data\n-----END EC PRIVATE KEY-----";
        assert_eq!(detect_ssh_key_type(content), "ecdsa");
    }

    #[test]
    fn test_detect_ssh_key_type_dsa() {
        let content =
            "-----BEGIN DSA PRIVATE KEY-----\nDSA key data\n-----END DSA PRIVATE KEY-----";
        assert_eq!(detect_ssh_key_type(content), "dsa");
    }

    #[test]
    fn test_detect_ssh_key_type_unknown() {
        let content = "-----BEGIN PRIVATE KEY-----\nsome key data\n-----END PRIVATE KEY-----";
        assert_eq!(detect_ssh_key_type(content), "unknown");
    }

    #[test]
    fn test_extract_ssh_comment_valid() {
        let pub_content = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... user@hostname";
        let comment = extract_ssh_comment(pub_content);
        assert_eq!(comment, Some("user@hostname".to_string()));
    }

    #[test]
    fn test_extract_ssh_comment_with_spaces() {
        let pub_content = "ssh-rsa AAAAB3NzaC1yc2EAAAA... John Doe (work laptop)";
        let comment = extract_ssh_comment(pub_content);
        assert_eq!(comment, Some("John Doe (work laptop)".to_string()));
    }

    #[test]
    fn test_extract_ssh_comment_no_comment() {
        let pub_content = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...";
        let comment = extract_ssh_comment(pub_content);
        assert!(comment.is_none());
    }

    #[test]
    fn test_extract_ssh_comment_only_type() {
        let pub_content = "ssh-ed25519";
        let comment = extract_ssh_comment(pub_content);
        assert!(comment.is_none());
    }

    // ==================== SigningService Tests ====================

    #[test]
    fn test_signing_service_new() {
        let tmp = TempDir::new().expect("should create temp dir");
        let service = SigningService::new(tmp.path());
        assert_eq!(service.repo_path, tmp.path());
    }

    #[tokio::test]
    async fn test_find_gpg_program() {
        // This may or may not find GPG depending on the system
        let result = SigningService::find_gpg_program().await;
        // Just test that it doesn't panic
        if let Some(path) = result {
            assert!(!path.to_string_lossy().is_empty());
        }
    }

    #[tokio::test]
    async fn test_find_ssh_program() {
        // This may or may not find ssh-keygen depending on the system
        let result = SigningService::find_ssh_program().await;
        // Just test that it doesn't panic
        if let Some(path) = result {
            assert!(!path.to_string_lossy().is_empty());
        }
    }

    #[tokio::test]
    async fn test_is_signing_available_no_key() {
        let tmp = TempDir::new().expect("should create temp dir");

        // Initialize a git repo
        git2::Repository::init(tmp.path()).expect("should init repo");

        let service = SigningService::new(tmp.path());
        let config = SigningConfig {
            format: SigningFormat::Gpg,
            signing_key: None,
            gpg_program: None,
            ssh_program: None,
        };

        let available = service
            .is_signing_available(&config)
            .await
            .expect("should check availability");
        assert!(!available);
    }

    #[tokio::test]
    async fn test_is_signing_available_ssh_key_not_exists() {
        let tmp = TempDir::new().expect("should create temp dir");

        // Initialize a git repo
        git2::Repository::init(tmp.path()).expect("should init repo");

        let service = SigningService::new(tmp.path());
        let config = SigningConfig {
            format: SigningFormat::Ssh,
            signing_key: Some("/nonexistent/path/to/key".to_string()),
            gpg_program: None,
            ssh_program: None,
        };

        let available = service
            .is_signing_available(&config)
            .await
            .expect("should check availability");
        assert!(!available);
    }

    #[test]
    fn test_get_config_from_git_default() {
        let tmp = TempDir::new().expect("should create temp dir");

        // Initialize a git repo
        git2::Repository::init(tmp.path()).expect("should init repo");

        let service = SigningService::new(tmp.path());
        let config = service.get_config_from_git().expect("should get config");

        // Default format should be GPG (unless overridden by global config)
        // Just verify we can read config without error
        assert!(config.format == SigningFormat::Gpg || config.format == SigningFormat::Ssh);
    }

    #[tokio::test]
    async fn test_sign_buffer_no_key() {
        let tmp = TempDir::new().expect("should create temp dir");

        // Initialize a git repo
        git2::Repository::init(tmp.path()).expect("should init repo");

        let service = SigningService::new(tmp.path());
        let config = SigningConfig::default();

        let result = service.sign_buffer("test content", &config).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_test_signing_no_key() {
        let tmp = TempDir::new().expect("should create temp dir");

        // Initialize a git repo
        git2::Repository::init(tmp.path()).expect("should init repo");

        let service = SigningService::new(tmp.path());
        let config = SigningConfig::default();

        let result = service.test_signing(&config).await;
        assert!(!result.success);
        assert!(result.error.is_some());
    }

    #[test]
    fn test_list_ssh_keys_no_ssh_dir() {
        let tmp = TempDir::new().expect("should create temp dir");

        // Initialize a git repo in a temp dir (no .ssh folder)
        git2::Repository::init(tmp.path()).expect("should init repo");

        let service = SigningService::new(tmp.path());

        // This should not error, just return whatever keys exist on the system
        let result = service.list_ssh_keys();
        assert!(result.is_ok());
    }
}
