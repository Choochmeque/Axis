mod commands;
mod error;
mod events;
mod menu;
mod models;
mod services;
mod state;
mod storage;

use state::AppState;
use storage::Database;
use tauri::Manager;

use tauri_specta::{collect_commands, collect_events};

fn get_specta_builder() -> tauri_specta::Builder {
    tauri_specta::Builder::new()
        .commands(collect_commands![
            // Repository commands
            crate::commands::open_repository,
            crate::commands::init_repository,
            crate::commands::clone_repository,
            crate::commands::close_repository,
            crate::commands::switch_active_repository,
            crate::commands::close_repository_path,
            crate::commands::get_repository_info,
            crate::commands::get_repository_status,
            crate::commands::get_commit_history,
            crate::commands::get_branches,
            crate::commands::get_commit,
            crate::commands::get_recent_repositories,
            crate::commands::remove_recent_repository,
            crate::commands::show_in_folder,
            crate::commands::open_url,
            crate::commands::open_terminal,
            // Staging commands
            crate::commands::stage_file,
            crate::commands::stage_files,
            crate::commands::stage_all,
            crate::commands::unstage_file,
            crate::commands::unstage_files,
            crate::commands::unstage_all,
            crate::commands::discard_file,
            crate::commands::discard_unstaged,
            crate::commands::create_commit,
            crate::commands::amend_commit,
            crate::commands::get_user_signature,
            crate::commands::stage_hunk,
            crate::commands::unstage_hunk,
            crate::commands::discard_hunk,
            crate::commands::delete_file,
            // Diff commands
            crate::commands::get_diff,
            crate::commands::get_diff_workdir,
            crate::commands::get_diff_staged,
            crate::commands::get_diff_head,
            crate::commands::get_diff_commit,
            crate::commands::get_diff_commits,
            crate::commands::get_file_diff,
            // Branch commands
            crate::commands::create_branch,
            crate::commands::delete_branch,
            crate::commands::delete_remote_branch,
            crate::commands::rename_branch,
            crate::commands::checkout_branch,
            crate::commands::checkout_remote_branch,
            crate::commands::get_branch,
            crate::commands::set_branch_upstream,
            crate::commands::compare_branches,
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
            crate::commands::get_file_history,
            crate::commands::get_file_diff_in_commit,
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
            crate::commands::get_interactive_rebase_preview,
            crate::commands::interactive_rebase,
            // Cherry-pick commands
            crate::commands::cherry_pick,
            crate::commands::cherry_pick_abort,
            crate::commands::cherry_pick_continue,
            crate::commands::cherry_pick_skip,
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
            // Bisect commands
            crate::commands::bisect_start,
            crate::commands::bisect_mark,
            crate::commands::bisect_reset,
            crate::commands::bisect_state,
            crate::commands::bisect_log,
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
            // Reflog commands
            crate::commands::reflog_list,
            crate::commands::reflog_refs,
            crate::commands::reflog_checkout,
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
            // Worktree commands
            crate::commands::worktree_list,
            crate::commands::worktree_add,
            crate::commands::worktree_remove,
            crate::commands::worktree_lock,
            crate::commands::worktree_unlock,
            crate::commands::worktree_prune,
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
            // Repository settings commands
            crate::commands::get_repository_settings,
            crate::commands::save_repository_user_config,
            // Hook commands
            crate::commands::list_hooks,
            crate::commands::get_hook,
            crate::commands::create_hook,
            crate::commands::update_hook,
            crate::commands::delete_hook,
            crate::commands::toggle_hook,
            crate::commands::get_hook_templates,
            crate::commands::get_hook_templates_for_type,
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
            // AI commands
            crate::commands::generate_commit_message,
            crate::commands::set_ai_api_key,
            crate::commands::has_ai_api_key,
            crate::commands::delete_ai_api_key,
            crate::commands::test_ai_connection,
            crate::commands::list_ollama_models,
            // Gitignore commands
            crate::commands::add_to_gitignore,
            crate::commands::add_to_global_gitignore,
            crate::commands::get_ignore_options,
            // LFS commands
            crate::commands::lfs_check_installed,
            crate::commands::get_git_environment,
            crate::commands::lfs_status,
            crate::commands::lfs_install,
            crate::commands::lfs_track,
            crate::commands::lfs_untrack,
            crate::commands::lfs_list_patterns,
            crate::commands::lfs_list_files,
            crate::commands::lfs_fetch,
            crate::commands::lfs_pull,
            crate::commands::lfs_push,
            crate::commands::lfs_migrate,
            crate::commands::lfs_env,
            crate::commands::lfs_is_pointer,
            crate::commands::lfs_prune,
            // Integration commands
            crate::commands::integration_start_oauth,
            crate::commands::integration_cancel_oauth,
            crate::commands::integration_is_connected,
            crate::commands::integration_get_status,
            crate::commands::integration_disconnect,
            crate::commands::integration_detect_provider,
            crate::commands::integration_get_repo_info,
            crate::commands::integration_list_prs,
            crate::commands::integration_get_pr,
            crate::commands::integration_create_pr,
            crate::commands::integration_merge_pr,
            crate::commands::integration_list_issues,
            crate::commands::integration_get_issue,
            crate::commands::integration_create_issue,
            crate::commands::integration_list_ci_runs,
            crate::commands::integration_get_commit_status,
            crate::commands::integration_list_notifications,
            crate::commands::integration_mark_notification_read,
            crate::commands::integration_mark_all_notifications_read,
            crate::commands::integration_get_unread_count,
            // Avatar commands
            crate::commands::get_avatar,
            crate::commands::clear_avatar_cache,
            // Custom actions commands
            crate::commands::list_global_actions,
            crate::commands::save_global_action,
            crate::commands::delete_global_action,
            crate::commands::list_repo_actions,
            crate::commands::save_repo_action,
            crate::commands::delete_repo_action,
            crate::commands::get_actions_for_context,
            crate::commands::get_all_actions,
            crate::commands::execute_custom_action,
        ])
        .events(collect_events![
            crate::events::MenuActionEvent,
            crate::events::FilesChangedEvent,
            crate::events::IndexChangedEvent,
            crate::events::RefChangedEvent,
            crate::events::HeadChangedEvent,
            crate::events::WatchErrorEvent,
            crate::events::RepositoryDirtyEvent,
            crate::events::RemoteFetchedEvent,
            crate::events::OAuthCallbackEvent,
            crate::events::IntegrationStatusChangedEvent,
            crate::events::GitOperationProgressEvent
        ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    let specta_builder = get_specta_builder();
    let specta_handler = specta_builder.invoke_handler();
    let extra_handler: Box<tauri::ipc::InvokeHandler<tauri::Wry>> =
        Box::new(tauri::generate_handler![crate::commands::get_file_blob]);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notifications::init())
        .invoke_handler(move |invoke| match invoke.message.command() {
            "get_file_blob" => extra_handler(invoke),
            _ => specta_handler(invoke),
        })
        .setup(move |app| {
            specta_builder.mount_events(app);

            // Initialize database in app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory");

            let database = Database::new(&app_data_dir).expect("Failed to initialize database");

            // Get auto_fetch_interval from settings before creating AppState
            let auto_fetch_interval = database
                .get_settings()
                .map(|s| s.auto_fetch_interval)
                .unwrap_or(5);

            let app_state = AppState::new(database);

            // Set the app handle so GitService can create file watchers
            app_state.set_app_handle(app.handle().clone());

            // Start background fetch service with configured interval
            if let Err(e) = app_state.start_background_fetch(auto_fetch_interval) {
                log::warn!("Failed to start background fetch service: {e}");
            }

            app.manage(app_state);

            // Create and set the application menu
            let menu = menu::create_menu(app.handle()).expect("Failed to create menu");
            app.set_menu(menu).expect("Failed to set menu");

            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event.id());
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod specta_export {
    use tauri_specta::ErrorHandlingMode;

    #[test]
    fn export_typescript_bindings() {
        crate::get_specta_builder()
            .typ::<crate::menu::MenuAction>()
            .error_handling(ErrorHandlingMode::Throw)
            .export(
                specta_typescript::Typescript::default()
                    .header("/* eslint-disable */\n// @ts-nocheck")
                    .formatter(specta_typescript::formatter::prettier)
                    .bigint(specta_typescript::BigIntExportBehavior::Number),
                "../src/bindings/api.ts",
            )
            .expect("Failed to export typescript bindings");
    }
}
