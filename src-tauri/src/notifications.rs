use tauri::Manager;

#[tauri::command]
pub fn send_completion_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn request_attention(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "windows")]
        {
            window.set_focus().map_err(|e| e.to_string())?;
        }
        
        #[cfg(target_os = "macos")]
        {
            window.set_focus().map_err(|e| e.to_string())?;
        }
        
        #[cfg(not(any(target_os = "windows", target_os = "macos")))]
        {
            window.set_focus().map_err(|e| e.to_string())?;
        }
    }
    
    Ok(())
}
