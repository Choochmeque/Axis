use crate::error::Result;
use crate::models::{GraphCommit, GraphOptions};
use crate::state::GitServiceHandle;
use parking_lot::RwLock;
use std::collections::hash_map::DefaultHasher;
use std::collections::HashMap;
use std::hash::{Hash, Hasher};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

/// Buffer size: fetch this many extra commits beyond what's requested
pub const PREFETCH_BUFFER: usize = 500;

/// Threshold: trigger prefetch when within this many commits of cache end
pub const PREFETCH_THRESHOLD: usize = 100;

/// Cache for commit graph data with automatic prefetching
pub struct CommitCache {
    entries: RwLock<HashMap<String, CommitCacheEntry>>,
}

/// A cached set of commits for a specific repo and filter combination
pub struct CommitCacheEntry {
    /// The built graph commits with lane assignments
    pub commits: Vec<GraphCommit>,
    /// Maximum lane used
    pub max_lane: usize,
    /// Whether there are more commits in the repo
    pub has_more: bool,
    /// Whether a prefetch is currently in progress
    pub is_prefetching: AtomicBool,
}

impl CommitCache {
    pub fn new() -> Self {
        Self {
            entries: RwLock::new(HashMap::new()),
        }
    }

    /// Get a cache entry if it exists
    pub fn get(&self, cache_key: &str) -> Option<CacheEntryRef> {
        let entries = self.entries.read();
        if entries.contains_key(cache_key) {
            Some(CacheEntryRef {
                cache: self,
                key: cache_key.to_string(),
            })
        } else {
            None
        }
    }

    /// Read data from a cache entry
    pub fn read_entry<F, R>(&self, cache_key: &str, f: F) -> Option<R>
    where
        F: FnOnce(&CommitCacheEntry) -> R,
    {
        let entries = self.entries.read();
        entries.get(cache_key).map(f)
    }

    /// Set or update a cache entry
    pub fn set(&self, cache_key: String, entry: CommitCacheEntry) {
        self.entries.write().insert(cache_key, entry);
    }

    /// Update an existing cache entry (for appending prefetched commits)
    pub fn update<F>(&self, cache_key: &str, f: F)
    where
        F: FnOnce(&mut CommitCacheEntry),
    {
        let mut entries = self.entries.write();
        if let Some(entry) = entries.get_mut(cache_key) {
            f(entry);
        }
    }

    /// Check if prefetch is in progress for a cache key
    pub fn is_prefetching(&self, cache_key: &str) -> bool {
        self.read_entry(cache_key, |entry| {
            entry.is_prefetching.load(Ordering::Relaxed)
        })
        .unwrap_or(false)
    }

    /// Set prefetching flag
    pub fn set_prefetching(&self, cache_key: &str, value: bool) {
        self.update(cache_key, |entry| {
            entry.is_prefetching.store(value, Ordering::Relaxed);
        });
    }

    /// Invalidate all cache entries for a specific repository
    pub fn invalidate_repo(&self, repo_path: &Path) {
        let prefix = format!("{}:", repo_path.display());
        self.entries
            .write()
            .retain(|key, _| !key.starts_with(&prefix));
    }

    /// Build a cache key from repo path and options
    pub fn build_key(repo_path: &Path, options: &GraphOptions) -> String {
        let filter_hash = compute_options_hash(options);
        format!("{}:{filter_hash}", repo_path.display())
    }

    /// Prefetch more commits in the background and update the cache.
    pub async fn prefetch(
        &self,
        git_handle: &GitServiceHandle,
        cache_key: &str,
        options: GraphOptions,
        current_count: usize,
    ) -> Result<()> {
        self.set_prefetching(cache_key, true);

        let fetch_limit = current_count + PREFETCH_BUFFER;
        let fetch_options = GraphOptions {
            limit: Some(fetch_limit),
            skip: Some(0),
            ..options
        };

        let result = git_handle.read().await.build_graph(fetch_options).await?;

        self.update(cache_key, |entry| {
            entry.commits = result.commits;
            entry.max_lane = result.max_lane;
            entry.has_more = result.has_more;
            entry.is_prefetching.store(false, Ordering::Relaxed);
        });

        Ok(())
    }
}

impl Default for CommitCache {
    fn default() -> Self {
        Self::new()
    }
}

/// Reference to a cache entry for safe access
pub struct CacheEntryRef {
    cache: *const CommitCache,
    key: String,
}

impl CacheEntryRef {
    /// Get the number of cached commits
    pub fn total_fetched(&self) -> usize {
        unsafe { &*self.cache }
            .read_entry(&self.key, |e| e.commits.len())
            .unwrap_or(0)
    }

    /// Check if there are more commits to fetch
    pub fn has_more(&self) -> bool {
        unsafe { &*self.cache }
            .read_entry(&self.key, |e| e.has_more)
            .unwrap_or(false)
    }

    /// Check if prefetch is in progress
    pub fn is_prefetching(&self) -> bool {
        unsafe { &*self.cache }.is_prefetching(&self.key)
    }

    /// Get a slice of commits from the cache
    pub fn slice(&self, skip: usize, limit: usize) -> Option<CacheSlice> {
        unsafe { &*self.cache }.read_entry(&self.key, |entry| {
            let end = (skip + limit).min(entry.commits.len());
            if skip >= entry.commits.len() {
                return CacheSlice {
                    commits: vec![],
                    max_lane: entry.max_lane,
                    has_more: entry.has_more,
                    total_count: entry.commits.len(),
                };
            }
            CacheSlice {
                commits: entry.commits[skip..end].to_vec(),
                max_lane: entry.max_lane,
                has_more: end < entry.commits.len() || entry.has_more,
                total_count: entry.commits.len(),
            }
        })
    }
}

// CacheEntryRef is safe to use because we only read through it
// and CommitCache uses RwLock internally
unsafe impl Send for CacheEntryRef {}
unsafe impl Sync for CacheEntryRef {}

/// A slice of cached commits
#[derive(Debug, Clone)]
pub struct CacheSlice {
    pub commits: Vec<GraphCommit>,
    pub max_lane: usize,
    pub has_more: bool,
    pub total_count: usize,
}

/// Compute a hash of `GraphOptions` for cache key
fn compute_options_hash(options: &GraphOptions) -> u64 {
    let mut hasher = DefaultHasher::new();

    // Hash the branch filter
    match &options.branch_filter {
        crate::models::BranchFilterType::All => "all".hash(&mut hasher),
        crate::models::BranchFilterType::Current => "current".hash(&mut hasher),
        crate::models::BranchFilterType::Specific(name) => {
            "specific".hash(&mut hasher);
            name.hash(&mut hasher);
        }
    }

    // Hash other relevant options
    options.include_remotes.hash(&mut hasher);
    match options.sort_order {
        crate::models::SortOrder::DateOrder => "date".hash(&mut hasher),
        crate::models::SortOrder::AncestorOrder => "ancestor".hash(&mut hasher),
    }
    options.include_uncommitted.hash(&mut hasher);

    hasher.finish()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{BranchFilterType, SortOrder};
    use std::path::PathBuf;

    #[test]
    fn test_cache_key_generation() {
        let path = PathBuf::from("/test/repo");
        let options = GraphOptions {
            branch_filter: BranchFilterType::All,
            include_remotes: true,
            sort_order: SortOrder::DateOrder,
            ..Default::default()
        };

        let key = CommitCache::build_key(&path, &options);
        assert!(key.starts_with("/test/repo:"));
    }

    #[test]
    fn test_options_hash_differs() {
        let options1 = GraphOptions {
            branch_filter: BranchFilterType::All,
            ..Default::default()
        };
        let options2 = GraphOptions {
            branch_filter: BranchFilterType::Current,
            ..Default::default()
        };

        let hash1 = compute_options_hash(&options1);
        let hash2 = compute_options_hash(&options2);
        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_invalidate_repo() {
        let cache = CommitCache::new();
        let path = PathBuf::from("/test/repo");

        // Add some entries
        let key1 = format!("{}:123", path.display());
        let key2 = format!("{}:456", path.display());
        let key3 = "/other/repo:789".to_string();

        cache.set(
            key1.clone(),
            CommitCacheEntry {
                commits: vec![],
                max_lane: 0,
                has_more: false,
                is_prefetching: AtomicBool::new(false),
            },
        );
        cache.set(
            key2.clone(),
            CommitCacheEntry {
                commits: vec![],
                max_lane: 0,
                has_more: false,
                is_prefetching: AtomicBool::new(false),
            },
        );
        cache.set(
            key3.clone(),
            CommitCacheEntry {
                commits: vec![],
                max_lane: 0,
                has_more: false,
                is_prefetching: AtomicBool::new(false),
            },
        );

        // Invalidate repo
        cache.invalidate_repo(&path);

        // Check that only the other repo's entry remains
        assert!(cache.get(&key1).is_none());
        assert!(cache.get(&key2).is_none());
        assert!(cache.get(&key3).is_some());
    }
}
