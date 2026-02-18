use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

use md5::{Digest, Md5};

use crate::error::{AxisError, Result};
use crate::models::AvatarSource;

const AVATAR_TTL_HOURS: u64 = 24;

pub struct AvatarService {
    cache_dir: PathBuf,
    client: reqwest::Client,
}

impl AvatarService {
    pub fn new(app_data_dir: &Path) -> Self {
        let cache_dir = app_data_dir.join("avatars");

        if let Err(e) = fs::create_dir_all(&cache_dir) {
            log::error!("Failed to create avatar cache directory: {e}");
        }

        Self {
            cache_dir,
            client: reqwest::Client::new(),
        }
    }

    /// Get the source prefix for cache filenames
    fn source_prefix(source: &AvatarSource) -> &'static str {
        match source {
            AvatarSource::Integration => "integration",
            AvatarSource::Gravatar => "gravatar",
            AvatarSource::Default => "default",
        }
    }

    /// Check cache for a specific source and key
    /// Returns the file path if found and not expired
    pub fn get_cached(&self, source: &AvatarSource, cache_key: &str) -> Option<String> {
        let prefix = Self::source_prefix(source);
        let pattern = format!("{prefix}_{cache_key}.");

        let entries = fs::read_dir(&self.cache_dir).ok()?;

        for entry in entries.flatten() {
            let file_name = entry.file_name();
            let file_name_str = file_name.to_string_lossy();

            if file_name_str.starts_with(&pattern) {
                let path = entry.path();

                if self.is_cache_valid(&path) {
                    return Some(path.to_string_lossy().to_string());
                }
                let _ = fs::remove_file(&path);
                return None;
            }
        }

        None
    }

    /// Check if a cached file is still valid (within TTL)
    fn is_cache_valid(&self, path: &Path) -> bool {
        let Ok(metadata) = fs::metadata(path) else {
            return false;
        };

        let Ok(modified) = metadata.modified() else {
            return false;
        };

        let ttl = Duration::from_secs(AVATAR_TTL_HOURS * 3600);
        let now = SystemTime::now();

        match now.duration_since(modified) {
            Ok(age) => age < ttl,
            Err(_) => true,
        }
    }

    /// Fetch avatar from URL and cache it
    pub async fn fetch_and_cache(
        &self,
        source: &AvatarSource,
        url: &str,
        cache_key: &str,
    ) -> Result<String> {
        let response = self
            .client
            .get(url)
            .send()
            .await
            .map_err(|e| AxisError::Other(format!("Failed to fetch avatar: {e}")))?;

        if !response.status().is_success() {
            return Err(AxisError::Other(format!(
                "Avatar fetch failed with status: {}",
                response.status()
            )));
        }

        let content_type = response
            .headers()
            .get(reqwest::header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("image/png");

        let ext = Self::extension_from_content_type(content_type);

        let bytes = response
            .bytes()
            .await
            .map_err(|e| AxisError::Other(format!("Failed to read avatar bytes: {e}")))?;

        let prefix = Self::source_prefix(source);
        let file_name = format!("{prefix}_{cache_key}.{ext}");
        let file_path = self.cache_dir.join(&file_name);

        fs::write(&file_path, &bytes)
            .map_err(|e| AxisError::Other(format!("Failed to write avatar cache: {e}")))?;

        Ok(file_path.to_string_lossy().to_string())
    }

    /// Get file extension from content type
    fn extension_from_content_type(content_type: &str) -> &'static str {
        if content_type.contains("jpeg") || content_type.contains("jpg") {
            "jpg"
        } else if content_type.contains("gif") {
            "gif"
        } else if content_type.contains("webp") {
            "webp"
        } else {
            "png"
        }
    }

    /// Generate Gravatar URL from email
    pub fn gravatar_url(email: &str, size: u32) -> String {
        let hash = Self::md5_hash(email.to_lowercase().trim());
        format!("https://www.gravatar.com/avatar/{hash}?s={size}&d=404")
    }

    /// Compute MD5 hash of a string (for Gravatar and cache keys)
    pub fn md5_hash(input: &str) -> String {
        let mut hasher = Md5::new();
        hasher.update(input.as_bytes());
        let result = hasher.finalize();
        format!("{result:x}")
    }

    /// Clear all cached avatars
    pub fn clear_cache(&self) -> Result<()> {
        if self.cache_dir.exists() {
            for entry in fs::read_dir(&self.cache_dir)
                .map_err(|e| AxisError::Other(format!("Failed to read cache dir: {e}")))?
                .flatten()
            {
                let _ = fs::remove_file(entry.path());
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    // ==================== MD5 Hash Tests ====================

    #[test]
    fn test_md5_hash_email() {
        // Known MD5 hash for "test@example.com"
        let hash = AvatarService::md5_hash("test@example.com");
        assert_eq!(hash.len(), 32); // MD5 produces 32 hex characters
        assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_md5_hash_consistency() {
        let hash1 = AvatarService::md5_hash("hello@world.com");
        let hash2 = AvatarService::md5_hash("hello@world.com");
        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_md5_hash_different_inputs() {
        let hash1 = AvatarService::md5_hash("user1@example.com");
        let hash2 = AvatarService::md5_hash("user2@example.com");
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_md5_hash_empty_string() {
        let hash = AvatarService::md5_hash("");
        assert_eq!(hash.len(), 32);
        // Known MD5 of empty string: d41d8cd98f00b204e9800998ecf8427e
        assert_eq!(hash, "d41d8cd98f00b204e9800998ecf8427e");
    }

    #[test]
    fn test_md5_hash_case_sensitive() {
        let hash_lower = AvatarService::md5_hash("test@example.com");
        let hash_upper = AvatarService::md5_hash("TEST@EXAMPLE.COM");
        assert_ne!(hash_lower, hash_upper);
    }

    // ==================== Gravatar URL Tests ====================

    #[test]
    fn test_gravatar_url_format() {
        let url = AvatarService::gravatar_url("test@example.com", 80);
        assert!(url.starts_with("https://www.gravatar.com/avatar/"));
        assert!(url.contains("?s=80"));
        assert!(url.contains("&d=404"));
    }

    #[test]
    fn test_gravatar_url_size() {
        let url_small = AvatarService::gravatar_url("test@example.com", 40);
        let url_large = AvatarService::gravatar_url("test@example.com", 200);

        assert!(url_small.contains("?s=40"));
        assert!(url_large.contains("?s=200"));
    }

    #[test]
    fn test_gravatar_url_lowercases_email() {
        let url_lower = AvatarService::gravatar_url("test@example.com", 80);
        let url_mixed = AvatarService::gravatar_url("Test@Example.COM", 80);

        // Both should produce the same hash since email is lowercased
        assert_eq!(url_lower, url_mixed);
    }

    #[test]
    fn test_gravatar_url_trims_email() {
        let url_trimmed = AvatarService::gravatar_url("test@example.com", 80);
        let url_with_spaces = AvatarService::gravatar_url("  test@example.com  ", 80);

        assert_eq!(url_trimmed, url_with_spaces);
    }

    // ==================== Extension from Content Type Tests ====================

    #[test]
    fn test_extension_from_content_type_jpeg() {
        assert_eq!(
            AvatarService::extension_from_content_type("image/jpeg"),
            "jpg"
        );
        assert_eq!(
            AvatarService::extension_from_content_type("image/jpg"),
            "jpg"
        );
    }

    #[test]
    fn test_extension_from_content_type_gif() {
        assert_eq!(
            AvatarService::extension_from_content_type("image/gif"),
            "gif"
        );
    }

    #[test]
    fn test_extension_from_content_type_webp() {
        assert_eq!(
            AvatarService::extension_from_content_type("image/webp"),
            "webp"
        );
    }

    #[test]
    fn test_extension_from_content_type_png() {
        assert_eq!(
            AvatarService::extension_from_content_type("image/png"),
            "png"
        );
    }

    #[test]
    fn test_extension_from_content_type_default() {
        assert_eq!(
            AvatarService::extension_from_content_type("image/unknown"),
            "png"
        );
        assert_eq!(
            AvatarService::extension_from_content_type("application/octet-stream"),
            "png"
        );
        assert_eq!(AvatarService::extension_from_content_type(""), "png");
    }

    // ==================== Source Prefix Tests ====================

    #[test]
    fn test_source_prefix_integration() {
        assert_eq!(
            AvatarService::source_prefix(&AvatarSource::Integration),
            "integration"
        );
    }

    #[test]
    fn test_source_prefix_gravatar() {
        assert_eq!(
            AvatarService::source_prefix(&AvatarSource::Gravatar),
            "gravatar"
        );
    }

    #[test]
    fn test_source_prefix_default() {
        assert_eq!(
            AvatarService::source_prefix(&AvatarSource::Default),
            "default"
        );
    }

    // ==================== AvatarService Creation Tests ====================

    #[test]
    fn test_avatar_service_new() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service = AvatarService::new(tmp.path());

        // Should create avatars subdirectory
        let avatars_dir = tmp.path().join("avatars");
        assert!(avatars_dir.exists());
        assert!(avatars_dir.is_dir());

        // Cache dir should be set correctly
        assert_eq!(service.cache_dir, avatars_dir);
    }

    // ==================== Cache Tests ====================

    #[test]
    fn test_get_cached_nonexistent() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service = AvatarService::new(tmp.path());

        let result = service.get_cached(&AvatarSource::Gravatar, "nonexistent");
        assert!(result.is_none());
    }

    #[test]
    fn test_get_cached_existing_file() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service = AvatarService::new(tmp.path());

        // Create a cached file
        let cache_key = "testkey123";
        let file_path = service.cache_dir.join(format!("gravatar_{cache_key}.png"));
        fs::write(&file_path, b"fake image data").expect("should write test file");

        let result = service.get_cached(&AvatarSource::Gravatar, cache_key);
        assert!(result.is_some());
        assert!(result.expect("should have cached path").contains(cache_key));
    }

    #[test]
    fn test_get_cached_wrong_source() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service = AvatarService::new(tmp.path());

        // Create a cached file for gravatar
        let cache_key = "testkey123";
        let file_path = service.cache_dir.join(format!("gravatar_{cache_key}.png"));
        fs::write(&file_path, b"fake image data").expect("should write test file");

        // Try to get with integration source
        let result = service.get_cached(&AvatarSource::Integration, cache_key);
        assert!(result.is_none());
    }

    #[test]
    fn test_clear_cache() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service = AvatarService::new(tmp.path());

        // Create some cached files
        fs::write(service.cache_dir.join("gravatar_test1.png"), b"data1")
            .expect("should write file");
        fs::write(service.cache_dir.join("integration_test2.jpg"), b"data2")
            .expect("should write file");

        // Verify files exist
        assert!(service.cache_dir.join("gravatar_test1.png").exists());
        assert!(service.cache_dir.join("integration_test2.jpg").exists());

        // Clear cache
        service.clear_cache().expect("should clear cache");

        // Verify files are removed
        let entries: Vec<_> = fs::read_dir(&service.cache_dir)
            .expect("should read dir")
            .collect();
        assert!(entries.is_empty());
    }

    #[test]
    fn test_clear_cache_empty_dir() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service = AvatarService::new(tmp.path());

        // Should not error on empty directory
        service.clear_cache().expect("should clear empty cache");
    }

    // ==================== Cache Validity Tests ====================

    #[test]
    fn test_is_cache_valid_recent_file() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service = AvatarService::new(tmp.path());

        let file_path = service.cache_dir.join("test.png");
        fs::write(&file_path, b"data").expect("should write file");

        // File just created should be valid
        assert!(service.is_cache_valid(&file_path));
    }

    #[test]
    fn test_is_cache_valid_nonexistent_file() {
        let tmp = TempDir::new().expect("should create temp directory");
        let service = AvatarService::new(tmp.path());

        let file_path = service.cache_dir.join("nonexistent.png");
        assert!(!service.is_cache_valid(&file_path));
    }
}
