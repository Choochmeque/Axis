use std::collections::HashMap;
use std::sync::RwLock;
use std::time::{Duration, Instant};

/// A simple TTL-based cache for API responses
pub struct TtlCache<T> {
    entries: RwLock<HashMap<String, CacheEntry<T>>>,
    default_ttl: Duration,
}

struct CacheEntry<T> {
    value: T,
    expires_at: Instant,
}

impl<T: Clone> TtlCache<T> {
    /// Create a new cache with the given default TTL
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            entries: RwLock::new(HashMap::new()),
            default_ttl,
        }
    }

    /// Get a value from the cache if it exists and hasn't expired
    pub fn get(&self, key: &str) -> Option<T> {
        let entries = self.entries.read().ok()?;
        let entry = entries.get(key)?;

        if Instant::now() < entry.expires_at {
            Some(entry.value.clone())
        } else {
            None
        }
    }

    /// Set a value in the cache with the default TTL
    pub fn set(&self, key: String, value: T) {
        self.set_with_ttl(key, value, self.default_ttl);
    }

    /// Set a value in the cache with a custom TTL
    pub fn set_with_ttl(&self, key: String, value: T, ttl: Duration) {
        if let Ok(mut entries) = self.entries.write() {
            entries.insert(
                key,
                CacheEntry {
                    value,
                    expires_at: Instant::now() + ttl,
                },
            );
        }
    }

    #[cfg(test)]
    /// Remove a value from the cache
    pub fn remove(&self, key: &str) {
        if let Ok(mut entries) = self.entries.write() {
            entries.remove(key);
        }
    }

    /// Remove all entries with keys starting with the given prefix
    pub fn remove_by_prefix(&self, prefix: &str) {
        if let Ok(mut entries) = self.entries.write() {
            entries.retain(|key, _| !key.starts_with(prefix));
        }
    }

    /// Clear all entries from the cache
    pub fn clear(&self) {
        if let Ok(mut entries) = self.entries.write() {
            entries.clear();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;

    #[test]
    fn test_cache_get_set() {
        let cache: TtlCache<String> = TtlCache::new(Duration::from_secs(60));
        cache.set("key1".to_string(), "value1".to_string());

        assert_eq!(cache.get("key1"), Some("value1".to_string()));
        assert_eq!(cache.get("key2"), None);
    }

    #[test]
    fn test_cache_expiry() {
        let cache: TtlCache<String> = TtlCache::new(Duration::from_millis(50));
        cache.set("key1".to_string(), "value1".to_string());

        assert_eq!(cache.get("key1"), Some("value1".to_string()));

        sleep(Duration::from_millis(100));

        assert_eq!(cache.get("key1"), None);
    }

    #[test]
    fn test_cache_remove() {
        let cache: TtlCache<String> = TtlCache::new(Duration::from_secs(60));
        cache.set("key1".to_string(), "value1".to_string());

        assert_eq!(cache.get("key1"), Some("value1".to_string()));

        cache.remove("key1");

        assert_eq!(cache.get("key1"), None);
    }
}
