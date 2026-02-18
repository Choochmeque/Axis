use crate::models::SignatureVerification;
use parking_lot::RwLock;
use std::collections::HashMap;
use std::path::Path;

/// Cache for signature verification results.
/// Keyed by "`repo_path:commit_oid`" to support multi-repo.
/// Verification results are immutable per commit OID, so no TTL is needed.
pub struct SignatureVerificationCache {
    entries: RwLock<HashMap<String, SignatureVerification>>,
}

impl SignatureVerificationCache {
    pub fn new() -> Self {
        Self {
            entries: RwLock::new(HashMap::new()),
        }
    }

    /// Build a cache key from repo path and commit OID
    pub fn build_key(repo_path: &Path, oid: &str) -> String {
        format!("{}:{oid}", repo_path.display())
    }

    /// Get a cached verification result
    pub fn get(&self, key: &str) -> Option<SignatureVerification> {
        self.entries.read().get(key).cloned()
    }

    /// Store a verification result
    pub fn set(&self, key: String, result: SignatureVerification) {
        self.entries.write().insert(key, result);
    }

    /// Invalidate all entries for a repo (called on repo close)
    pub fn invalidate_repo(&self, repo_path: &Path) {
        let prefix = format!("{}:", repo_path.display());
        self.entries
            .write()
            .retain(|key, _| !key.starts_with(&prefix));
    }

    #[cfg(test)]
    /// Clear all entries
    pub fn clear(&self) {
        self.entries.write().clear();
    }
}

impl Default for SignatureVerificationCache {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn make_verification(verified: bool, signer: Option<&str>) -> SignatureVerification {
        SignatureVerification {
            verified,
            signer: signer.map(std::string::ToString::to_string),
        }
    }

    #[test]
    fn test_signature_cache_new_is_empty() {
        let cache = SignatureVerificationCache::new();
        assert!(cache.get("anything").is_none());
    }

    #[test]
    fn test_signature_cache_default() {
        let cache = SignatureVerificationCache::default();
        assert!(cache.get("anything").is_none());
    }

    #[test]
    fn test_signature_cache_build_key() {
        let path = PathBuf::from("/repos/myrepo");
        let key = SignatureVerificationCache::build_key(&path, "abc123");
        assert_eq!(key, "/repos/myrepo:abc123");
    }

    #[test]
    fn test_signature_cache_set_and_get() {
        let cache = SignatureVerificationCache::new();
        let key = "repo:abc123".to_string();
        let result = make_verification(true, Some("user@example.com"));

        cache.set(key.clone(), result);

        let cached = cache.get(&key).expect("should be cached");
        assert!(cached.verified);
        assert_eq!(cached.signer, Some("user@example.com".to_string()));
    }

    #[test]
    fn test_signature_cache_get_missing_returns_none() {
        let cache = SignatureVerificationCache::new();
        assert!(cache.get("nonexistent").is_none());
    }

    #[test]
    fn test_signature_cache_invalidate_repo() {
        let cache = SignatureVerificationCache::new();
        let path = PathBuf::from("/repos/myrepo");

        let key1 = SignatureVerificationCache::build_key(&path, "aaa");
        let key2 = SignatureVerificationCache::build_key(&path, "bbb");

        cache.set(key1.clone(), make_verification(true, Some("signer1")));
        cache.set(key2.clone(), make_verification(false, None));

        cache.invalidate_repo(&path);

        assert!(cache.get(&key1).is_none());
        assert!(cache.get(&key2).is_none());
    }

    #[test]
    fn test_signature_cache_invalidate_preserves_other_repos() {
        let cache = SignatureVerificationCache::new();
        let path1 = PathBuf::from("/repos/repo1");
        let path2 = PathBuf::from("/repos/repo2");

        let key1 = SignatureVerificationCache::build_key(&path1, "aaa");
        let key2 = SignatureVerificationCache::build_key(&path2, "bbb");

        cache.set(key1.clone(), make_verification(true, Some("signer1")));
        cache.set(key2.clone(), make_verification(true, Some("signer2")));

        cache.invalidate_repo(&path1);

        assert!(cache.get(&key1).is_none());
        assert!(cache.get(&key2).is_some());
    }

    #[test]
    fn test_signature_cache_clear() {
        let cache = SignatureVerificationCache::new();

        cache.set("key1".to_string(), make_verification(true, Some("s1")));
        cache.set("key2".to_string(), make_verification(false, None));

        cache.clear();

        assert!(cache.get("key1").is_none());
        assert!(cache.get("key2").is_none());
    }

    #[test]
    fn test_signature_cache_overwrite() {
        let cache = SignatureVerificationCache::new();
        let key = "repo:abc".to_string();

        cache.set(key.clone(), make_verification(false, None));
        cache.set(key.clone(), make_verification(true, Some("new-signer")));

        let cached = cache.get(&key).expect("should be cached");
        assert!(cached.verified);
        assert_eq!(cached.signer, Some("new-signer".to_string()));
    }
}
