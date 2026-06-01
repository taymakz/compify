use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub latest_version: Option<String>,
    pub download_url: Option<String>,
    pub release_notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GithubRelease {
    pub tag_name: String,
    pub name: String,
    pub body: String,
    pub html_url: String,
    pub published_at: String,
}

#[tauri::command]
pub async fn check_for_updates(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    let current_version = app.package_info().version.to_string();

    let client = reqwest::Client::builder()
        .user_agent("Compify/1.0")
        .build()
        .map_err(|e| e.to_string())?;

    let response = client
        .get("https://api.github.com/repos/taymakz/compify/releases/latest")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch updates: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("GitHub API returned status: {}", response.status()));
    }

    let release: GithubRelease = response
        .json::<GithubRelease>()
        .await
        .map_err(|e| format!("Failed to parse release info: {}", e))?;

    let latest_version = release.tag_name.trim_start_matches('v').to_string();

    let available = is_newer_version(&current_version, &latest_version);

    Ok(UpdateInfo {
        available,
        current_version,
        latest_version: Some(latest_version),
        download_url: Some(release.html_url.clone()),
        release_notes: Some(release.body),
    })
}

#[tauri::command]
pub fn get_current_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}

#[tauri::command]
pub async fn open_release_page(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())
}

fn is_newer_version(current: &str, latest: &str) -> bool {
    let current_parsed = semver::Version::parse(current).ok();
    let latest_parsed = semver::Version::parse(latest).ok();

    match (current_parsed, latest_parsed) {
        (Some(c), Some(l)) => l > c,
        _ => false,
    }
}

#[cfg(windows)]
#[tauri::command]
pub fn check_existing_installation() -> Result<Option<ExistingInstallation>, String> {
    use std::path::PathBuf;

    let possible_paths = vec![
        PathBuf::from(format!(
            "{}\\Compify",
            std::env::var("LOCALAPPDATA").unwrap_or_default()
        )),
        PathBuf::from("C:\\Program Files\\Compify"),
        PathBuf::from("C:\\Program Files (x86)\\Compify"),
    ];

    for path in possible_paths {
        if path.exists() {
            let exe_path = path.join("Compify.exe");
            if exe_path.exists() {
                let version = get_installed_version(&exe_path);
                return Ok(Some(ExistingInstallation {
                    path: path.to_string_lossy().to_string(),
                    version,
                    is_running: is_process_running("Compify.exe"),
                }));
            }
        }
    }

    Ok(None)
}

#[cfg(not(windows))]
#[tauri::command]
pub fn check_existing_installation() -> Result<Option<ExistingInstallation>, String> {
    Ok(None)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExistingInstallation {
    pub path: String,
    pub version: Option<String>,
    pub is_running: bool,
}

#[cfg(windows)]
fn get_installed_version(_exe_path: &std::path::Path) -> Option<String> {
    // Could parse PE version info, but for now return None
    None
}

#[cfg(windows)]
fn is_process_running(process_name: &str) -> bool {
    use std::process::Command;

    let mut cmd = Command::new("tasklist");
    cmd.args(["/FI", &format!("IMAGENAME eq {}", process_name)]);
    use std::os::windows::process::CommandExt;
    cmd.creation_flags(0x08000000);
    if let Ok(output) = cmd.output() {
        String::from_utf8_lossy(&output.stdout).contains(process_name)
    } else {
        false
    }
}

#[cfg(windows)]
#[tauri::command]
pub fn terminate_existing_instance() -> Result<(), String> {
    use std::process::Command;

    use std::os::windows::process::CommandExt;
    let mut cmd = Command::new("taskkill");
    cmd.args(["/F", "/IM", "Compify.exe"]);
    cmd.creation_flags(0x08000000);
    cmd.output().map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_secs(1));
    Ok(())
}

#[cfg(not(windows))]
#[tauri::command]
pub fn terminate_existing_instance() -> Result<(), String> {
    Err("Not supported on this platform".to_string())
}
