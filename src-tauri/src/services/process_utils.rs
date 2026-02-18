/// Cross-platform process spawning utilities.
///
/// On Windows, console applications (like `git.exe`, `gpg.exe`, `ssh-keygen.exe`)
/// create a visible console window by default when spawned. This module provides
/// a helper that sets the `CREATE_NO_WINDOW` creation flag to suppress that.
///
/// On macOS, GUI apps don't inherit the shell's PATH, so we extend it to include
/// common installation paths for tools like GPG, Git, etc.
use std::env;
use tokio::process::Command;

/// Windows flag to prevent spawning a visible console window.
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Get extended PATH that includes common tool installation directories.
/// This is needed because GUI apps on macOS don't inherit shell PATH.
fn get_extended_path() -> String {
    let current_path = env::var("PATH").unwrap_or_default();

    #[cfg(target_os = "macos")]
    {
        let extra_paths = [
            "/opt/homebrew/bin", // Homebrew on Apple Silicon
            "/opt/homebrew/sbin",
            "/usr/local/bin", // Homebrew on Intel, MacPorts
            "/usr/local/sbin",
            "/usr/local/MacGPG2/bin", // GPG Suite
            "/usr/bin",
            "/bin",
            "/usr/sbin",
            "/sbin",
        ];

        let mut paths: Vec<&str> = current_path.split(':').collect();
        for extra in extra_paths {
            if !paths.contains(&extra) {
                paths.push(extra);
            }
        }
        paths.join(":")
    }

    #[cfg(target_os = "windows")]
    {
        let extra_paths = [
            r"C:\Program Files\Git\bin",
            r"C:\Program Files\Git\usr\bin",
            r"C:\Program Files\GnuPG\bin",
            r"C:\Program Files (x86)\GnuPG\bin",
            r"C:\Windows\System32\OpenSSH",
        ];

        let mut paths: Vec<&str> = current_path.split(';').collect();
        for extra in extra_paths {
            if !paths.contains(&extra) {
                paths.push(extra);
            }
        }
        paths.join(";")
    }

    #[cfg(target_os = "linux")]
    {
        let extra_paths = ["/usr/local/bin", "/usr/bin", "/bin"];

        let mut paths: Vec<&str> = current_path.split(':').collect();
        for extra in extra_paths {
            if !paths.contains(&extra) {
                paths.push(extra);
            }
        }
        paths.join(":")
    }
}

/// Create a [`Command`] that will not flash a console window on Windows
/// and has an extended PATH to find tools like GPG on macOS.
///
/// On non-Windows platforms this is similar to [`Command::new`] but with PATH extended.
pub fn create_command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(program);

    // Extend PATH to include common tool installation directories
    cmd.env("PATH", get_extended_path());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    cmd
}
