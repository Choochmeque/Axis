mod commands;
mod error;
mod menu;
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

            let database = Database::new(&app_data_dir).expect("Failed to initialize database");

            let app_state = AppState::new(database);
            app.manage(app_state);

            // Create and set the application menu
            let menu = menu::create_menu(app.handle()).expect("Failed to create menu");
            app.set_menu(menu).expect("Failed to set menu");

            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event.id());
        })
        .invoke_handler(tauri::generate_handler![
            // Repository commands
            commands::open_repository,
            commands::init_repository,
            commands::clone_repository,
            commands::close_repository,
            commands::get_repository_info,
            commands::get_repository_status,
            commands::get_commit_history,
            commands::get_branches,
            commands::get_commit,
            commands::get_recent_repositories,
            // Staging commands
            commands::stage_file,
            commands::stage_files,
            commands::stage_all,
            commands::unstage_file,
            commands::unstage_files,
            commands::unstage_all,
            commands::discard_file,
            commands::discard_all,
            commands::create_commit,
            commands::amend_commit,
            commands::get_user_signature,
            commands::stage_hunk,
            commands::unstage_hunk,
            commands::discard_hunk,
            // Diff commands
            commands::get_diff_workdir,
            commands::get_diff_staged,
            commands::get_diff_head,
            commands::get_diff_commit,
            commands::get_diff_commits,
            commands::get_file_diff,
            // File watcher commands
            commands::start_file_watcher,
            commands::stop_file_watcher,
            commands::is_file_watcher_active,
            // Branch commands
            commands::create_branch,
            commands::delete_branch,
            commands::rename_branch,
            commands::checkout_branch,
            commands::checkout_remote_branch,
            commands::get_branch,
            commands::set_branch_upstream,
            // Remote commands
            commands::list_remotes,
            commands::get_remote,
            commands::add_remote,
            commands::remove_remote,
            commands::rename_remote,
            commands::set_remote_url,
            commands::set_remote_push_url,
            commands::fetch_remote,
            commands::push_remote,
            commands::push_current_branch,
            commands::pull_remote,
            commands::fetch_all,
            // Graph commands
            commands::build_graph,
            commands::search_commits,
            commands::blame_file,
            commands::get_commit_count,
            // Merge commands
            commands::merge_branch,
            commands::merge_abort,
            commands::merge_continue,
            // Rebase commands
            commands::rebase_branch,
            commands::rebase_abort,
            commands::rebase_continue,
            commands::rebase_skip,
            // Cherry-pick commands
            commands::cherry_pick,
            commands::cherry_pick_abort,
            commands::cherry_pick_continue,
            // Revert commands
            commands::revert_commits,
            commands::revert_abort,
            commands::revert_continue,
            // Conflict resolution commands
            commands::get_conflicted_files,
            commands::get_conflict_content,
            commands::resolve_conflict,
            commands::mark_conflict_resolved,
            // Operation state
            commands::get_operation_state,
            // Reset commands
            commands::reset_to_commit,
            // Stash commands
            commands::stash_list,
            commands::stash_save,
            commands::stash_apply,
            commands::stash_pop,
            commands::stash_drop,
            commands::stash_clear,
            commands::stash_show,
            commands::stash_branch,
            // Tag commands
            commands::tag_list,
            commands::tag_create,
            commands::tag_delete,
            commands::tag_push,
            commands::tag_push_all,
            commands::tag_delete_remote,
            // Submodule commands
            commands::submodule_list,
            commands::submodule_add,
            commands::submodule_init,
            commands::submodule_update,
            commands::submodule_sync,
            commands::submodule_deinit,
            commands::submodule_remove,
            commands::submodule_summary,
            // Git-flow commands
            commands::gitflow_is_initialized,
            commands::gitflow_config,
            commands::gitflow_init,
            commands::gitflow_feature_start,
            commands::gitflow_feature_finish,
            commands::gitflow_feature_publish,
            commands::gitflow_feature_list,
            commands::gitflow_release_start,
            commands::gitflow_release_finish,
            commands::gitflow_release_publish,
            commands::gitflow_release_list,
            commands::gitflow_hotfix_start,
            commands::gitflow_hotfix_finish,
            commands::gitflow_hotfix_publish,
            commands::gitflow_hotfix_list,
            // Search commands
            commands::grep_content,
            commands::grep_commit,
            // Settings commands
            commands::get_settings,
            commands::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
