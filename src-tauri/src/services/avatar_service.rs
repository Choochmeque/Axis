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
                } else {
                    let _ = fs::remove_file(&path);
                    return None;
                }
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
        format!("{:x}", result)
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
