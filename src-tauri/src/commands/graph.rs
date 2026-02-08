use crate::error::Result;
use crate::models::{
    BlameResult, DiffOptions, FileDiff, FileLogOptions, FileLogResult, GraphOptions, GraphResult,
    SearchOptions, SearchResult,
};
use crate::services::{CommitCache, CommitCacheEntry, PREFETCH_BUFFER, PREFETCH_THRESHOLD};
use crate::state::AppState;
use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tauri::State;

/// Build commit graph with lane assignments for visualization
#[tauri::command]
#[specta::specta]
pub async fn build_graph(
    state: State<'_, AppState>,
    options: Option<GraphOptions>,
) -> Result<GraphResult> {
    let options = options.unwrap_or_default();
    let repo_path = state.ensure_repository_open()?;
    let cache = state.commit_cache();
    let cache_key = CommitCache::build_key(&repo_path, &options);

    let skip = options.skip.unwrap_or(0);
    let limit = options.limit.unwrap_or(200);
    let requested_end = skip + limit;

    log::debug!(
        "[CommitCache] Request: skip={}, limit={}, key={}",
        skip,
        limit,
        cache_key
    );

    // Check cache first
    if let Some(entry_ref) = cache.get(&cache_key) {
        let total_fetched = entry_ref.total_fetched();
        log::debug!(
            "[CommitCache] Found entry: total_fetched={}, requested_end={}",
            total_fetched,
            requested_end
        );

        // Can we serve from cache?
        if requested_end <= total_fetched {
            // Check if we need to trigger prefetch
            let remaining = total_fetched - requested_end;
            if remaining < PREFETCH_THRESHOLD && entry_ref.has_more() && !entry_ref.is_prefetching()
            {
                // Trigger background prefetch
                let prefetch_cache = Arc::clone(&cache);
                let prefetch_key = cache_key.clone();
                let git_handle = state.get_git_service()?;
                let prefetch_options = options.clone();

                tokio::spawn(async move {
                    let _ = prefetch_cache
                        .prefetch(&git_handle, &prefetch_key, prefetch_options, total_fetched)
                        .await;
                });
            }

            // Return slice from cache
            if let Some(slice) = entry_ref.slice(skip, limit) {
                log::debug!(
                    "[CommitCache] Cache HIT: returning {} commits",
                    slice.commits.len()
                );
                return Ok(GraphResult {
                    commits: slice.commits,
                    total_count: slice.total_count,
                    max_lane: slice.max_lane,
                    has_more: slice.has_more,
                });
            }
        }
    } else {
        log::debug!("[CommitCache] No cache entry found");
    }

    // Cache miss or need more data - fetch with buffer
    log::debug!(
        "[CommitCache] Cache MISS: fetching {} commits",
        requested_end + PREFETCH_BUFFER
    );
    let fetch_limit = requested_end + PREFETCH_BUFFER;
    let fetch_options = GraphOptions {
        limit: Some(fetch_limit),
        skip: Some(0), // Always fetch from start for correct lane assignment
        ..options.clone()
    };

    let result = state
        .get_git_service()?
        .read()
        .await
        .build_graph(fetch_options)
        .await?;

    // Store in cache
    cache.set(
        cache_key,
        CommitCacheEntry {
            commits: result.commits.clone(),
            max_lane: result.max_lane,
            has_more: result.has_more,
            is_prefetching: AtomicBool::new(false),
        },
    );

    // Return only the requested slice
    let end = (skip + limit).min(result.commits.len());
    let slice = if skip < result.commits.len() {
        result.commits[skip..end].to_vec()
    } else {
        vec![]
    };

    Ok(GraphResult {
        commits: slice,
        total_count: result.total_count,
        max_lane: result.max_lane,
        has_more: end < result.commits.len() || result.has_more,
    })
}

/// Search commits by message, author, or hash
#[tauri::command]
#[specta::specta]
pub async fn search_commits(
    state: State<'_, AppState>,
    options: SearchOptions,
) -> Result<SearchResult> {
    state
        .get_git_service()?
        .read()
        .await
        .search_commits(options)
        .await
}

/// Get blame information for a file
#[tauri::command]
#[specta::specta]
pub async fn blame_file(
    state: State<'_, AppState>,
    path: String,
    commit_oid: Option<String>,
) -> Result<BlameResult> {
    state
        .get_git_service()?
        .read()
        .await
        .blame_file(&path, commit_oid.as_deref())
        .await
}

/// Get total commit count for pagination
#[tauri::command]
#[specta::specta]
pub async fn get_commit_count(
    state: State<'_, AppState>,
    from_ref: Option<String>,
) -> Result<usize> {
    state
        .get_git_service()?
        .read()
        .await
        .get_commit_count(from_ref.as_deref())
        .await
}

/// Get commit history for specific files
#[tauri::command]
#[specta::specta]
pub async fn get_file_history(
    state: State<'_, AppState>,
    options: FileLogOptions,
) -> Result<FileLogResult> {
    state
        .get_git_service()?
        .read()
        .await
        .get_file_history(options)
        .await
}

/// Get diff for a specific file in a specific commit
#[tauri::command]
#[specta::specta]
pub async fn get_file_diff_in_commit(
    state: State<'_, AppState>,
    commit_oid: String,
    path: String,
    options: Option<DiffOptions>,
) -> Result<Option<FileDiff>> {
    state
        .get_git_service()?
        .read()
        .await
        .get_file_diff_in_commit(&commit_oid, &path, &options.unwrap_or_default())
        .await
}
