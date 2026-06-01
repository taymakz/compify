use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub notifications_enabled: bool,
    pub check_updates_on_startup: bool,
    pub install_directory: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            notifications_enabled: true,
            check_updates_on_startup: true,
            install_directory: None,
        }
    }
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    Ok(config_dir.join("settings.json"))
}

#[tauri::command]
pub fn load_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(&app)?;
    
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    
    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<(), String> {
    let path = settings_path(&app)?;
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_setting(
    app: tauri::AppHandle,
    key: String,
    value: serde_json::Value,
) -> Result<AppSettings, String> {
    let mut settings = load_settings(app.clone())?;
    
    match key.as_str() {
        "notifications_enabled" => {
            settings.notifications_enabled = value.as_bool().unwrap_or(true);
        }
        "check_updates_on_startup" => {
            settings.check_updates_on_startup = value.as_bool().unwrap_or(true);
        }
        "install_directory" => {
            settings.install_directory = value.as_str().map(String::from);
        }
        _ => return Err(format!("Unknown setting key: {}", key)),
    }
    
    save_settings(app.clone(), settings.clone())?;
    Ok(settings)
}

#[tauri::command]
pub fn get_default_install_dir() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        Ok(format!("{}\\Compify", std::env::var("LOCALAPPDATA").unwrap_or_else(|_| "C:\\Program Files".to_string())))
    }
    
    #[cfg(target_os = "macos")]
    {
        Ok("/Applications/Compify.app".to_string())
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    Ok(dirs::home_dir().unwrap_or_default().join(".local/share/compify").to_string_lossy().to_string())
}
