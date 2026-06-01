use crate::error::{AxisError, Result};
use crate::models::{OpenTarget, OpenTargetKind, OpenTargetOption};
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Copy)]
struct KnownApp {
    name: &'static str,
    bundle_id: &'static str,
}

const KNOWN_APPS: &[KnownApp] = &[
    KnownApp {
        name: "Zed",
        bundle_id: "dev.zed.Zed",
    },
    KnownApp {
        name: "Codex",
        bundle_id: "com.openai.codex",
    },
    KnownApp {
        name: "Visual Studio Code",
        bundle_id: "com.microsoft.VSCode",
    },
    KnownApp {
        name: "Cursor",
        bundle_id: "com.todesktop.230313mzl4w4u92",
    },
    KnownApp {
        name: "Xcode",
        bundle_id: "com.apple.dt.Xcode",
    },
    KnownApp {
        name: "Android Studio",
        bundle_id: "com.google.android.studio",
    },
    KnownApp {
        name: "IntelliJ IDEA",
        bundle_id: "com.jetbrains.intellij",
    },
    KnownApp {
        name: "WebStorm",
        bundle_id: "com.jetbrains.WebStorm",
    },
    KnownApp {
        name: "PyCharm",
        bundle_id: "com.jetbrains.pycharm",
    },
    KnownApp {
        name: "Sublime Text",
        bundle_id: "com.sublimetext.4",
    },
    KnownApp {
        name: "BBEdit",
        bundle_id: "com.barebones.bbedit",
    },
    KnownApp {
        name: "iTerm",
        bundle_id: "com.googlecode.iterm2",
    },
    KnownApp {
        name: "Ghostty",
        bundle_id: "com.mitchellh.ghostty",
    },
];

fn finder_option() -> OpenTargetOption {
    OpenTargetOption {
        target: OpenTarget {
            kind: OpenTargetKind::Finder,
            id: String::from("finder"),
        },
        name: String::from("Finder"),
        icon_data_url: None,
        installed: true,
    }
}

fn terminal_option() -> OpenTargetOption {
    OpenTargetOption {
        target: OpenTarget {
            kind: OpenTargetKind::Terminal,
            id: String::from("com.apple.Terminal"),
        },
        name: String::from("Terminal"),
        icon_data_url: None,
        installed: true,
    }
}

#[cfg(target_os = "macos")]
fn app_path_for_bundle_id(bundle_id: &str) -> Option<PathBuf> {
    let output = Command::new("mdfind")
        .args([
            "-onlyin",
            "/Applications",
            "-onlyin",
            "/System/Applications",
            "-onlyin",
            "/System/Applications/Utilities",
            &format!("kMDItemCFBundleIdentifier == '{bundle_id}'"),
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    String::from_utf8_lossy(&output.stdout)
        .lines()
        .map(PathBuf::from)
        .find(|path| path.extension().is_some_and(|ext| ext == "app"))
}

#[cfg(target_os = "macos")]
fn plist_string(plist: &plist::Dictionary, key: &str) -> Option<String> {
    plist.get(key)?.as_string().map(ToString::to_string)
}

#[cfg(target_os = "macos")]
fn app_info(app_path: &Path) -> Option<(String, Option<PathBuf>)> {
    let info_path = app_path.join("Contents/Info.plist");
    let plist = plist::Value::from_file(info_path).ok()?.into_dictionary()?;
    let name = plist_string(&plist, "CFBundleDisplayName")
        .or_else(|| plist_string(&plist, "CFBundleName"))
        .unwrap_or_else(|| {
            app_path
                .file_stem()
                .and_then(|name| name.to_str())
                .unwrap_or("Application")
                .to_string()
        });

    let icon_path = plist_string(&plist, "CFBundleIconFile").and_then(|icon| {
        let icon = if Path::new(&icon)
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("icns"))
        {
            icon
        } else {
            format!("{icon}.icns")
        };
        let path = app_path.join("Contents/Resources").join(icon);
        path.exists().then_some(path)
    });

    Some((name, icon_path))
}

#[cfg(target_os = "macos")]
fn icon_data_url(icon_path: &Path) -> Option<String> {
    use base64::prelude::{Engine as _, BASE64_STANDARD};

    let temp_dir = tempfile::tempdir().ok()?;
    let png_path = temp_dir.path().join("icon.png");
    let status = Command::new("sips")
        .args(["-s", "format", "png"])
        .arg(icon_path)
        .arg("--out")
        .arg(&png_path)
        .status()
        .ok()?;

    if !status.success() {
        return None;
    }

    let bytes = std::fs::read(png_path).ok()?;
    Some(format!(
        "data:image/png;base64,{}",
        BASE64_STANDARD.encode(bytes)
    ))
}

#[cfg(target_os = "macos")]
fn installed_app_option(app: KnownApp) -> Option<OpenTargetOption> {
    let app_path = app_path_for_bundle_id(app.bundle_id)?;
    let (name, icon_path) = app_info(&app_path).unwrap_or_else(|| (app.name.to_string(), None));

    Some(OpenTargetOption {
        target: OpenTarget {
            kind: OpenTargetKind::App,
            id: app.bundle_id.to_string(),
        },
        name,
        icon_data_url: icon_path.as_deref().and_then(icon_data_url),
        installed: true,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_open_target_options() -> Result<Vec<OpenTargetOption>> {
    let mut options = vec![finder_option(), terminal_option()];

    #[cfg(target_os = "macos")]
    {
        options.extend(
            KNOWN_APPS
                .iter()
                .filter_map(|app| installed_app_option(*app)),
        );
        options.sort_by(|a, b| {
            a.name
                .to_lowercase()
                .cmp(&b.name.to_lowercase())
                .then_with(|| a.target.id.cmp(&b.target.id))
        });
        options.sort_by_key(|option| match option.target.kind {
            OpenTargetKind::Finder => 0,
            OpenTargetKind::App => 1,
            OpenTargetKind::Terminal => 2,
        });
    }

    Ok(options)
}

pub fn open_target_with_system(path: &Path, target: &OpenTarget) -> Result<()> {
    match target.kind {
        OpenTargetKind::Finder => Err(AxisError::Other(
            "Finder targets must be handled by the opener plugin".to_string(),
        )),
        OpenTargetKind::Terminal => {
            #[cfg(target_os = "macos")]
            {
                Command::new("open")
                    .args(["-b", &target.id])
                    .arg(path)
                    .spawn()
                    .map_err(|e| AxisError::Other(e.to_string()))?;
                Ok(())
            }

            #[cfg(not(target_os = "macos"))]
            {
                let _ = path;
                let _ = target;
                Err(AxisError::Other(
                    "Open target selection is currently only supported on macOS".to_string(),
                ))
            }
        }
        OpenTargetKind::App => {
            #[cfg(target_os = "macos")]
            {
                Command::new("open")
                    .args(["-b", &target.id])
                    .arg(path)
                    .spawn()
                    .map_err(|e| AxisError::Other(e.to_string()))?;
                Ok(())
            }

            #[cfg(not(target_os = "macos"))]
            {
                let _ = path;
                let _ = target;
                Err(AxisError::Other(
                    "Open target selection is currently only supported on macOS".to_string(),
                ))
            }
        }
    }
}
