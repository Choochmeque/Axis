use tauri::{
    menu::{Menu, MenuId, MenuItem, PredefinedMenuItem, Submenu},
    AppHandle, Emitter, Wry,
};

/// Menu item IDs for custom actions
pub mod menu_ids {
    pub const NEW_WINDOW: &str = "new_window";
    pub const OPEN_REPOSITORY: &str = "open_repository";
    pub const CLOSE_REPOSITORY: &str = "close_repository";
    pub const SETTINGS: &str = "settings";
    pub const REFRESH: &str = "refresh";
    pub const TOGGLE_SIDEBAR: &str = "toggle_sidebar";
    pub const FETCH: &str = "fetch";
    pub const PULL: &str = "pull";
    pub const PUSH: &str = "push";
    pub const STAGE_ALL: &str = "stage_all";
    pub const UNSTAGE_ALL: &str = "unstage_all";
    pub const COMMIT: &str = "commit";
    pub const NEW_BRANCH: &str = "new_branch";
    pub const NEW_TAG: &str = "new_tag";
    pub const STASH: &str = "stash";
    pub const POP_STASH: &str = "pop_stash";
}

/// Create the application menu
pub fn create_menu(app: &AppHandle<Wry>) -> tauri::Result<Menu<Wry>> {
    let menu = Menu::new(app)?;

    // App menu (macOS only)
    #[cfg(target_os = "macos")]
    {
        let app_menu = create_app_menu(app)?;
        menu.append(&app_menu)?;
    }

    // File menu
    let file_menu = create_file_menu(app)?;
    menu.append(&file_menu)?;

    // Edit menu
    let edit_menu = create_edit_menu(app)?;
    menu.append(&edit_menu)?;

    // View menu
    let view_menu = create_view_menu(app)?;
    menu.append(&view_menu)?;

    // Repository menu
    let repository_menu = create_repository_menu(app)?;
    menu.append(&repository_menu)?;

    // Branch menu
    let branch_menu = create_branch_menu(app)?;
    menu.append(&branch_menu)?;

    // Window menu
    let window_menu = create_window_menu(app)?;
    menu.append(&window_menu)?;

    // Help menu
    let help_menu = create_help_menu(app)?;
    menu.append(&help_menu)?;

    Ok(menu)
}

#[cfg(target_os = "macos")]
fn create_app_menu(app: &AppHandle<Wry>) -> tauri::Result<Submenu<Wry>> {
    let about = PredefinedMenuItem::about(app, Some("About Axis"), None)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(
        app,
        menu_ids::SETTINGS,
        "Settings...",
        true,
        Some("CmdOrCtrl+,"),
    )?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let services = PredefinedMenuItem::services(app, Some("Services"))?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    let hide = PredefinedMenuItem::hide(app, Some("Hide Axis"))?;
    let hide_others = PredefinedMenuItem::hide_others(app, Some("Hide Others"))?;
    let show_all = PredefinedMenuItem::show_all(app, Some("Show All"))?;
    let separator4 = PredefinedMenuItem::separator(app)?;
    let quit = PredefinedMenuItem::quit(app, Some("Quit Axis"))?;

    let submenu = Submenu::with_items(
        app,
        "Axis",
        true,
        &[
            &about,
            &separator1,
            &settings,
            &separator2,
            &services,
            &separator3,
            &hide,
            &hide_others,
            &show_all,
            &separator4,
            &quit,
        ],
    )?;

    Ok(submenu)
}

fn create_file_menu(app: &AppHandle<Wry>) -> tauri::Result<Submenu<Wry>> {
    let new_window = MenuItem::with_id(
        app,
        menu_ids::NEW_WINDOW,
        "New Window",
        true,
        Some("CmdOrCtrl+Shift+N"),
    )?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let open_repo = MenuItem::with_id(
        app,
        menu_ids::OPEN_REPOSITORY,
        "Open Repository...",
        true,
        Some("CmdOrCtrl+O"),
    )?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let close_repo = MenuItem::with_id(
        app,
        menu_ids::CLOSE_REPOSITORY,
        "Close Repository",
        true,
        Some("CmdOrCtrl+Shift+W"),
    )?;
    let close_window = PredefinedMenuItem::close_window(app, Some("Close Window"))?;

    #[cfg(target_os = "macos")]
    {
        let submenu = Submenu::with_items(
            app,
            "File",
            true,
            &[
                &new_window,
                &separator1,
                &open_repo,
                &separator2,
                &close_repo,
                &close_window,
            ],
        )?;
        Ok(submenu)
    }

    #[cfg(not(target_os = "macos"))]
    {
        let separator3 = PredefinedMenuItem::separator(app)?;
        let settings = MenuItem::with_id(
            app,
            menu_ids::SETTINGS,
            "Settings...",
            true,
            Some("CmdOrCtrl+,"),
        )?;
        let separator4 = PredefinedMenuItem::separator(app)?;
        let quit = PredefinedMenuItem::quit(app, Some("Quit"))?;
        let submenu = Submenu::with_items(
            app,
            "File",
            true,
            &[
                &new_window,
                &separator1,
                &open_repo,
                &separator2,
                &close_repo,
                &close_window,
                &separator3,
                &settings,
                &separator4,
                &quit,
            ],
        )?;
        Ok(submenu)
    }
}

fn create_edit_menu(app: &AppHandle<Wry>) -> tauri::Result<Submenu<Wry>> {
    let undo = PredefinedMenuItem::undo(app, Some("Undo"))?;
    let redo = PredefinedMenuItem::redo(app, Some("Redo"))?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let cut = PredefinedMenuItem::cut(app, Some("Cut"))?;
    let copy = PredefinedMenuItem::copy(app, Some("Copy"))?;
    let paste = PredefinedMenuItem::paste(app, Some("Paste"))?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let select_all = PredefinedMenuItem::select_all(app, Some("Select All"))?;

    let submenu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &undo,
            &redo,
            &separator1,
            &cut,
            &copy,
            &paste,
            &separator2,
            &select_all,
        ],
    )?;

    Ok(submenu)
}

fn create_view_menu(app: &AppHandle<Wry>) -> tauri::Result<Submenu<Wry>> {
    let refresh = MenuItem::with_id(app, menu_ids::REFRESH, "Refresh", true, Some("CmdOrCtrl+R"))?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let toggle_sidebar = MenuItem::with_id(
        app,
        menu_ids::TOGGLE_SIDEBAR,
        "Toggle Sidebar",
        true,
        Some("CmdOrCtrl+\\"),
    )?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let fullscreen = PredefinedMenuItem::fullscreen(app, Some("Enter Full Screen"))?;

    let submenu = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &refresh,
            &separator1,
            &toggle_sidebar,
            &separator2,
            &fullscreen,
        ],
    )?;

    Ok(submenu)
}

fn create_repository_menu(app: &AppHandle<Wry>) -> tauri::Result<Submenu<Wry>> {
    let fetch = MenuItem::with_id(
        app,
        menu_ids::FETCH,
        "Fetch",
        true,
        Some("CmdOrCtrl+Shift+F"),
    )?;
    let pull = MenuItem::with_id(app, menu_ids::PULL, "Pull", true, Some("CmdOrCtrl+Shift+P"))?;
    let push = MenuItem::with_id(app, menu_ids::PUSH, "Push", true, Some("CmdOrCtrl+Shift+U"))?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let stage_all = MenuItem::with_id(
        app,
        menu_ids::STAGE_ALL,
        "Stage All Changes",
        true,
        Some("CmdOrCtrl+Shift+S"),
    )?;
    let unstage_all = MenuItem::with_id(
        app,
        menu_ids::UNSTAGE_ALL,
        "Unstage All",
        true,
        None::<&str>,
    )?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let commit = MenuItem::with_id(
        app,
        menu_ids::COMMIT,
        "Commit...",
        true,
        Some("CmdOrCtrl+Return"),
    )?;
    let separator3 = PredefinedMenuItem::separator(app)?;
    let stash = MenuItem::with_id(
        app,
        menu_ids::STASH,
        "Stash Changes",
        true,
        Some("CmdOrCtrl+Shift+H"),
    )?;
    let pop_stash = MenuItem::with_id(
        app,
        menu_ids::POP_STASH,
        "Pop Stash",
        true,
        Some("CmdOrCtrl+Shift+Alt+H"),
    )?;

    let submenu = Submenu::with_items(
        app,
        "Repository",
        true,
        &[
            &fetch,
            &pull,
            &push,
            &separator1,
            &stage_all,
            &unstage_all,
            &separator2,
            &commit,
            &separator3,
            &stash,
            &pop_stash,
        ],
    )?;

    Ok(submenu)
}

fn create_branch_menu(app: &AppHandle<Wry>) -> tauri::Result<Submenu<Wry>> {
    let new_branch = MenuItem::with_id(
        app,
        menu_ids::NEW_BRANCH,
        "New Branch...",
        true,
        Some("CmdOrCtrl+Shift+B"),
    )?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let new_tag = MenuItem::with_id(
        app,
        menu_ids::NEW_TAG,
        "New Tag...",
        true,
        Some("CmdOrCtrl+Shift+T"),
    )?;

    let submenu = Submenu::with_items(app, "Branch", true, &[&new_branch, &separator1, &new_tag])?;

    Ok(submenu)
}

fn create_window_menu(app: &AppHandle<Wry>) -> tauri::Result<Submenu<Wry>> {
    let minimize = PredefinedMenuItem::minimize(app, Some("Minimize"))?;
    let zoom = PredefinedMenuItem::maximize(app, Some("Zoom"))?;

    let submenu = Submenu::with_items(app, "Window", true, &[&minimize, &zoom])?;

    Ok(submenu)
}

fn create_help_menu(app: &AppHandle<Wry>) -> tauri::Result<Submenu<Wry>> {
    let submenu = Submenu::new(app, "Help", true)?;
    Ok(submenu)
}

/// Handle menu events
pub fn handle_menu_event(app: &AppHandle<Wry>, id: &MenuId) {
    let id_str = id.as_ref();

    // Emit event to frontend for handling
    if let Err(e) = app.emit("menu-action", id_str) {
        log::error!("[Menu] Failed to emit menu-action event: {:?}", e);
    }

    match id_str {
        menu_ids::NEW_WINDOW => {
            // Create a new window
            let _ = tauri::WebviewWindowBuilder::new(
                app,
                format!("main-{}", uuid::Uuid::new_v4()),
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("Axis")
            .inner_size(1200.0, 800.0)
            .build();
        }
        _ => {
            // Other menu items are handled by the frontend via the event
        }
    }
}
