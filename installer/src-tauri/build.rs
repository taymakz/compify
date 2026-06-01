fn main() {
    // Ensure the bundled app exe exists before compiling
    let exe = std::path::Path::new("resources/Compify.exe");
    if !exe.exists() {
        panic!(
            "\n\n  ERROR: installer/src-tauri/resources/Compify.exe not found.\n\
             Run `build-installer.ps1` from the repo root to build everything,\n\
             or manually copy the built Compify.exe there first.\n\n"
        );
    }
    tauri_build::build()
}
