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
            commands::remove_recent_repository,
            commands::show_in_folder,
            commands::open_terminal,
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
            commands::get_file_blob,
            // File watcher commands
            commands::start_file_watcher,
            commands::stop_file_watcher,
            commands::is_file_watcher_active,
            // Branch commands
            commands::create_branch,
            commands::delete_branch,
            commands::delete_remote_branch,
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
            commands::get_rebase_preview,
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
            // Signing commands
            commands::get_signing_config,
            commands::list_gpg_keys,
            commands::list_ssh_keys,
            commands::test_signing,
            commands::is_signing_available,
            // Archive & Patch commands
            commands::create_archive,
            commands::format_patch,
            commands::create_patch,
            commands::apply_patch,
            commands::apply_mailbox,
            commands::am_abort,
            commands::am_continue,
            commands::am_skip,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod specta_export {
    use tauri_specta::{collect_commands, Builder, ErrorHandlingMode};

    #[test]
    fn export_typescript_bindings() {
        let builder = Builder::<tauri::Wry>::new()
            .commands(collect_commands![
                // Repository commands
                crate::commands::open_repository,
                crate::commands::init_repository,
                crate::commands::clone_repository,
                crate::commands::close_repository,
                crate::commands::get_repository_info,
                crate::commands::get_repository_status,
                crate::commands::get_commit_history,
                crate::commands::get_branches,
                crate::commands::get_commit,
                crate::commands::get_recent_repositories,
                crate::commands::remove_recent_repository,
                crate::commands::show_in_folder,
                crate::commands::open_terminal,
                // Staging commands
                crate::commands::stage_file,
                crate::commands::stage_files,
                crate::commands::stage_all,
                crate::commands::unstage_file,
                crate::commands::unstage_files,
                crate::commands::unstage_all,
                crate::commands::discard_file,
                crate::commands::discard_all,
                crate::commands::create_commit,
                crate::commands::amend_commit,
                crate::commands::get_user_signature,
                crate::commands::stage_hunk,
                crate::commands::unstage_hunk,
                crate::commands::discard_hunk,
                // Diff commands
                crate::commands::get_diff_workdir,
                crate::commands::get_diff_staged,
                crate::commands::get_diff_head,
                crate::commands::get_diff_commit,
                crate::commands::get_diff_commits,
                crate::commands::get_file_diff,
                // File watcher commands
                crate::commands::start_file_watcher,
                crate::commands::stop_file_watcher,
                crate::commands::is_file_watcher_active,
                // Branch commands
                crate::commands::create_branch,
                crate::commands::delete_branch,
                crate::commands::delete_remote_branch,
                crate::commands::rename_branch,
                crate::commands::checkout_branch,
                crate::commands::checkout_remote_branch,
                crate::commands::get_branch,
                crate::commands::set_branch_upstream,
                // Remote commands
                crate::commands::list_remotes,
                crate::commands::get_remote,
                crate::commands::add_remote,
                crate::commands::remove_remote,
                crate::commands::rename_remote,
                crate::commands::set_remote_url,
                crate::commands::set_remote_push_url,
                crate::commands::fetch_remote,
                crate::commands::push_remote,
                crate::commands::push_current_branch,
                crate::commands::pull_remote,
                crate::commands::fetch_all,
                // Graph commands
                crate::commands::build_graph,
                crate::commands::search_commits,
                crate::commands::blame_file,
                crate::commands::get_commit_count,
                // Merge commands
                crate::commands::merge_branch,
                crate::commands::merge_abort,
                crate::commands::merge_continue,
                // Rebase commands
                crate::commands::rebase_branch,
                crate::commands::rebase_abort,
                crate::commands::rebase_continue,
                crate::commands::rebase_skip,
                crate::commands::get_rebase_preview,
                // Cherry-pick commands
                crate::commands::cherry_pick,
                crate::commands::cherry_pick_abort,
                crate::commands::cherry_pick_continue,
                // Revert commands
                crate::commands::revert_commits,
                crate::commands::revert_abort,
                crate::commands::revert_continue,
                // Conflict resolution commands
                crate::commands::get_conflicted_files,
                crate::commands::get_conflict_content,
                crate::commands::resolve_conflict,
                crate::commands::mark_conflict_resolved,
                // Operation state
                crate::commands::get_operation_state,
                // Reset commands
                crate::commands::reset_to_commit,
                // Stash commands
                crate::commands::stash_list,
                crate::commands::stash_save,
                crate::commands::stash_apply,
                crate::commands::stash_pop,
                crate::commands::stash_drop,
                crate::commands::stash_clear,
                crate::commands::stash_show,
                crate::commands::stash_branch,
                // Tag commands
                crate::commands::tag_list,
                crate::commands::tag_create,
                crate::commands::tag_delete,
                crate::commands::tag_push,
                crate::commands::tag_push_all,
                crate::commands::tag_delete_remote,
                // Submodule commands
                crate::commands::submodule_list,
                crate::commands::submodule_add,
                crate::commands::submodule_init,
                crate::commands::submodule_update,
                crate::commands::submodule_sync,
                crate::commands::submodule_deinit,
                crate::commands::submodule_remove,
                crate::commands::submodule_summary,
                // Git-flow commands
                crate::commands::gitflow_is_initialized,
                crate::commands::gitflow_config,
                crate::commands::gitflow_init,
                crate::commands::gitflow_feature_start,
                crate::commands::gitflow_feature_finish,
                crate::commands::gitflow_feature_publish,
                crate::commands::gitflow_feature_list,
                crate::commands::gitflow_release_start,
                crate::commands::gitflow_release_finish,
                crate::commands::gitflow_release_publish,
                crate::commands::gitflow_release_list,
                crate::commands::gitflow_hotfix_start,
                crate::commands::gitflow_hotfix_finish,
                crate::commands::gitflow_hotfix_publish,
                crate::commands::gitflow_hotfix_list,
                // Search commands
                crate::commands::grep_content,
                crate::commands::grep_commit,
                // Settings commands
                crate::commands::get_settings,
                crate::commands::save_settings,
                // Signing commands
                crate::commands::get_signing_config,
                crate::commands::list_gpg_keys,
                crate::commands::list_ssh_keys,
                crate::commands::test_signing,
                crate::commands::is_signing_available,
                // Archive & Patch commands
                crate::commands::create_archive,
                crate::commands::format_patch,
                crate::commands::create_patch,
                crate::commands::apply_patch,
                crate::commands::apply_mailbox,
                crate::commands::am_abort,
                crate::commands::am_continue,
                crate::commands::am_skip,
            ])
            .error_handling(ErrorHandlingMode::Throw);

        builder
            .export(
                specta_typescript::Typescript::default()
                    .bigint(specta_typescript::BigIntExportBehavior::BigInt),
                "../src/bindings/api.ts",
            )
            .expect("Failed to export typescript bindings");
    }
}
