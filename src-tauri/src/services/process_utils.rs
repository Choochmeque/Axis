/// Cross-platform process spawning utilities.
///
/// On Windows, console applications (like `git.exe`, `gpg.exe`, `ssh-keygen.exe`)
/// create a visible console window by default when spawned. This module provides
/// a helper that sets the `CREATE_NO_WINDOW` creation flag to suppress that.
use tokio::process::Command;

/// Windows flag to prevent spawning a visible console window.
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// Create a [`Command`] that will not flash a console window on Windows.
///
/// On non-Windows platforms this is identical to [`Command::new`].
pub fn create_command<S: AsRef<std::ffi::OsStr>>(program: S) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}
