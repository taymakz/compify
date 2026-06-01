// Prevents console window on Windows in release — DO NOT REMOVE
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri::ipc::Channel;

// Main app binary embedded at compile time.
// The build script must place Compify.exe in src-tauri/resources/ before building.
const APP_BYTES: &[u8] = include_bytes!("../resources/Compify.exe");
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");

// ── Types ─────────────────────────────────────────────────────────────────────

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
enum InstallEvent {
    Progress { percent: u32, message: String },
    Complete { exe_path: String },
    Error { message: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ExistingInstallation {
    path: String,
    version: Option<String>,
    is_running: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct InstallOptions {
    create_desktop_shortcut: bool,
    terminate_existing: bool,
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
fn get_app_version() -> &'static str {
    APP_VERSION
}

#[tauri::command]
fn get_default_install_dir() -> String {
    let base = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| {
        std::env::var("USERPROFILE").unwrap_or_else(|_| "C:\\Users\\User".into())
    });
    format!("{}\\Compify", base)
}

#[tauri::command]
fn check_existing_installation() -> Option<ExistingInstallation> {
    let default_dir = get_default_install_dir();
    let exe = std::path::Path::new(&default_dir).join("Compify.exe");
    if exe.exists() {
        Some(ExistingInstallation {
            path: default_dir,
            version: None,
            is_running: is_process_running("Compify.exe"),
        })
    } else {
        None
    }
}

#[tauri::command]
async fn install_app(
    install_dir: String,
    options: InstallOptions,
    on_event: Channel<InstallEvent>,
) -> Result<(), String> {
    use std::path::PathBuf;

    let dir = PathBuf::from(&install_dir);

    if options.terminate_existing {
        terminate_process("Compify.exe");
        tokio::time::sleep(std::time::Duration::from_millis(600)).await;
    }

    emit(&on_event, 5, "Creating folder…");
    std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create folder: {}", e))?;

    emit(&on_event, 20, "Copying files…");
    let dest_exe = dir.join("Compify.exe");
    std::fs::write(&dest_exe, APP_BYTES).map_err(|e| format!("Failed to copy app: {}", e))?;
    tokio::time::sleep(std::time::Duration::from_millis(400)).await;

    let exe_str = dest_exe.to_string_lossy().to_string();

    emit(&on_event, 55, "Creating shortcuts…");
    if options.create_desktop_shortcut {
        if let Ok(profile) = std::env::var("USERPROFILE") {
            let sc = format!("{}\\Desktop\\Compify.lnk", profile);
            create_shortcut(&sc, &exe_str, "Compify \u{2014} Video Compressor").ok();
        }
    }
    if let Ok(appdata) = std::env::var("APPDATA") {
        let sc_dir = format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", appdata);
        std::fs::create_dir_all(&sc_dir).ok();
        let sc = format!("{}\\Compify.lnk", sc_dir);
        create_shortcut(&sc, &exe_str, "Compify \u{2014} Video Compressor").ok();
    }
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    emit(&on_event, 80, "Registering…");
    register_uninstaller(&install_dir, &exe_str).ok();
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    emit(&on_event, 100, "Installation complete!");
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    on_event.send(InstallEvent::Complete { exe_path: exe_str }).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn launch_app(exe_path: String) -> Result<(), String> {
    let mut cmd = std::process::Command::new(&exe_path);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; cmd.creation_flags(0x00000008); } // DETACHED_PROCESS
    cmd.spawn().map_err(|e| format!("Failed to launch: {}", e))?;
    Ok(())
}

#[tauri::command]
fn exit_installer() {
    std::process::exit(0);
}

#[tauri::command]
async fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let result = app.dialog().file().blocking_pick_folder();
    Ok(result
        .and_then(|fp| fp.into_path().ok())
        .map(|p| p.to_string_lossy().to_string()))
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn emit(ch: &Channel<InstallEvent>, percent: u32, message: &str) {
    ch.send(InstallEvent::Progress { percent, message: message.to_string() }).ok();
}

fn create_shortcut(shortcut_path: &str, target_path: &str, description: &str) -> Result<(), String> {
    let script = format!(
        r#"$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut("{sp}"); $s.TargetPath = "{tp}"; $s.Description = "{d}"; $s.Save()"#,
        sp = shortcut_path.replace('"', r#"\""#),
        tp = target_path.replace('"', r#"\""#),
        d  = description.replace('"', r#"\""#),
    );
    let mut cmd = std::process::Command::new("powershell");
    cmd.args(["-NoProfile", "-NonInteractive", "-Command", &script]);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
    cmd.output().map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(windows)]
fn register_uninstaller(install_dir: &str, exe_path: &str) -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let path = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\Compify";
    let (key, _) = hkcu.create_subkey(path).map_err(|e| e.to_string())?;
    let uninstall = format!(r#"cmd /C "rmdir /s /q "{d}" && reg delete HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\Compify /f""#, d = install_dir);
    key.set_value("DisplayName",     &"Compify \u{2014} Video Compressor").ok();
    key.set_value("DisplayVersion",  &APP_VERSION).ok();
    key.set_value("Publisher",       &"Compify").ok();
    key.set_value("InstallLocation", &install_dir).ok();
    key.set_value("DisplayIcon",     &format!("{},0", exe_path)).ok();
    key.set_value("UninstallString", &uninstall).ok();
    key.set_value("NoModify",        &1u32).ok();
    key.set_value("NoRepair",        &1u32).ok();
    Ok(())
}
#[cfg(not(windows))]
fn register_uninstaller(_: &str, _: &str) -> Result<(), String> { Ok(()) }

fn is_process_running(name: &str) -> bool {
    let mut cmd = std::process::Command::new("tasklist");
    cmd.args(["/FI", &format!("IMAGENAME eq {}", name)]);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
    cmd.output()
        .map(|o| String::from_utf8_lossy(&o.stdout).contains(name))
        .unwrap_or(false)
}

fn terminate_process(name: &str) {
    let mut cmd = std::process::Command::new("taskkill");
    cmd.args(["/F", "/IM", name]);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
    cmd.output().ok();
}

// ── Entry point ───────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_app_version,
            get_default_install_dir,
            check_existing_installation,
            install_app,
            launch_app,
            exit_installer,
            pick_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running installer");
}
