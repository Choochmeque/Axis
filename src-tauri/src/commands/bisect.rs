use crate::error::Result;
use crate::models::{BisectMarkType, BisectResult, BisectStartOptions, BisectState};
use crate::state::AppState;
use tauri::State;

/// Start a bisect session
#[tauri::command]
#[specta::specta]
pub async fn bisect_start(
    state: State<'_, AppState>,
    options: BisectStartOptions,
) -> Result<BisectResult> {
    let handle = state.get_git_service()?;
    let guard = handle.lock();
    let cli = guard.git_cli();

    let result = cli.bisect_start(options.bad_commit.as_deref(), &options.good_commit)?;

    if result.success {
        let bisect_state = cli.get_bisect_state()?;
        Ok(BisectResult {
            success: true,
            state: bisect_state,
            message: result.stdout.trim().to_string(),
        })
    } else {
        Ok(BisectResult {
            success: false,
            state: BisectState::default(),
            message: result.stderr.trim().to_string(),
        })
    }
}

/// Mark a commit during bisect
#[tauri::command]
#[specta::specta]
pub async fn bisect_mark(
    state: State<'_, AppState>,
    mark: BisectMarkType,
    commit: Option<String>,
) -> Result<BisectResult> {
    let handle = state.get_git_service()?;
    let guard = handle.lock();
    let cli = guard.git_cli();

    let result = match mark {
        BisectMarkType::Good => cli.bisect_good(commit.as_deref())?,
        BisectMarkType::Bad => cli.bisect_bad(commit.as_deref())?,
        BisectMarkType::Skip => cli.bisect_skip(commit.as_deref())?,
    };

    // Check if bisect is complete (found the first bad commit)
    let output = format!("{}{}", result.stdout, result.stderr);
    let first_bad = if output.contains("is the first bad commit") {
        // Parse the commit from the output
        output
            .lines()
            .find(|l| l.ends_with("is the first bad commit"))
            .and_then(|l| l.split_whitespace().next())
            .map(|s| s.to_string())
    } else {
        None
    };

    let mut bisect_state = cli.get_bisect_state()?;
    bisect_state.first_bad_commit = first_bad;

    Ok(BisectResult {
        success: result.success || bisect_state.first_bad_commit.is_some(),
        state: bisect_state,
        message: output.trim().to_string(),
    })
}

/// Reset/end the bisect session
#[tauri::command]
#[specta::specta]
pub async fn bisect_reset(
    state: State<'_, AppState>,
    commit: Option<String>,
) -> Result<BisectResult> {
    let handle = state.get_git_service()?;
    let guard = handle.lock();
    let cli = guard.git_cli();

    let result = cli.bisect_reset(commit.as_deref())?;

    Ok(BisectResult {
        success: result.success,
        state: BisectState::default(),
        message: if result.success {
            "Bisect session ended".to_string()
        } else {
            result.stderr.trim().to_string()
        },
    })
}

/// Get current bisect state
#[tauri::command]
#[specta::specta]
pub async fn bisect_state(state: State<'_, AppState>) -> Result<BisectState> {
    let handle = state.get_git_service()?;
    let guard = handle.lock();
    let cli = guard.git_cli();
    cli.get_bisect_state()
}

/// Get bisect log
#[tauri::command]
#[specta::specta]
pub async fn bisect_log(state: State<'_, AppState>) -> Result<String> {
    let handle = state.get_git_service()?;
    let guard = handle.lock();
    let cli = guard.git_cli();

    let result = cli.bisect_log()?;
    Ok(result.stdout)
}
