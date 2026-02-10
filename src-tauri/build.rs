fn main() {
    #[allow(unused_mut)]
    let mut attributes = tauri_build::Attributes::new();

    #[cfg(windows)]
    {
        // Disable tauri_build's manifest embedding so we can embed our own
        // This allows the manifest to apply to ALL targets including tests
        // Fixes STATUS_ENTRYPOINT_NOT_FOUND error on Windows
        // See: https://github.com/tauri-apps/tauri/issues/13419#issuecomment-3398457618
        attributes =
            attributes.windows_attributes(tauri_build::WindowsAttributes::new_without_app_manifest());
        add_manifest();
    }

    tauri_build::try_build(attributes).expect("failed to run tauri_build");
}

#[cfg(windows)]
fn add_manifest() {
    static WINDOWS_MANIFEST_FILE: &str = "manifest.xml";

    let manifest = std::env::current_dir()
        .expect("failed to get current dir")
        .join(WINDOWS_MANIFEST_FILE);

    println!("cargo:rerun-if-changed={}", manifest.display());
    println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
    println!(
        "cargo:rustc-link-arg=/MANIFESTINPUT:{}",
        manifest.to_str().expect("manifest path is not valid UTF-8")
    );
}
