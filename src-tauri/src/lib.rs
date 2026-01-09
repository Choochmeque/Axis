mod commands;
mod error;
mod models;
mod services;
mod state;
mod storage;

use state::AppState;
use storage::Database;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Initialize database in app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            let database = Database::new(&app_data_dir)
                .expect("Failed to initialize database");

            let app_state = AppState::new(database);
            app.manage(app_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::open_repository,
            commands::init_repository,
            commands::close_repository,
            commands::get_repository_info,
            commands::get_repository_status,
            commands::get_commit_history,
            commands::get_branches,
            commands::get_commit,
            commands::get_recent_repositories,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
