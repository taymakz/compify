mod compression;
mod ffmpeg_manager;
mod types;
mod settings;
mod updater;
mod notifications;

use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::ipc::Channel;
use types::{CompressionSettings, CompressionEvent, DownloadEvent, FFmpegStatus, VideoInfo};
use compression::JobMap;

struct AppState {
    jobs: JobMap,
}

// ── FFmpeg commands ──────────────────────────────────────────────────────────

#[tauri::command]
fn check_ffmpeg(app: tauri::AppHandle) -> FFmpegStatus {
    ffmpeg_manager::check_ffmpeg(&app)
}

#[tauri::command]
async fn download_ffmpeg(
    app: tauri::AppHandle,
    on_event: Channel<DownloadEvent>,
) -> Result<(), String> {
    ffmpeg_manager::download_and_install_ffmpeg(app, on_event).await
}

// ── Video info ───────────────────────────────────────────────────────────────

#[tauri::command]
async fn get_video_info(app: tauri::AppHandle, path: String) -> Result<VideoInfo, String> {
    let ffprobe = ffmpeg_manager::ffprobe_exe(&app)
        .map(|p| p.to_string_lossy().to_string())
        .or_else(|| {
            let mut cmd = std::process::Command::new("ffprobe");
            cmd.arg("-version");
            #[cfg(windows)]
            { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
            cmd.output().ok().filter(|o| o.status.success()).map(|_| "ffprobe".to_string())
        })
        .ok_or("ffprobe not found")?;

    let mut ffprobe_cmd = tokio::process::Command::new(&ffprobe);
    ffprobe_cmd.args(["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", &path]);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; ffprobe_cmd.creation_flags(0x08000000); }
    let out = ffprobe_cmd.output().await.map_err(|e| e.to_string())?;

    let json: serde_json::Value =
        serde_json::from_slice(&out.stdout).map_err(|e| e.to_string())?;

    let file_size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);

    let format = &json["format"];
    let duration: f64 = format["duration"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0.0);
    let bitrate: u64 = format["bit_rate"]
        .as_str()
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let format_name = format["format_name"]
        .as_str()
        .unwrap_or("unknown")
        .split(',')
        .next()
        .unwrap_or("unknown")
        .to_string();

    let streams = json["streams"].as_array().cloned().unwrap_or_default();

    let video = streams
        .iter()
        .find(|s| s["codec_type"].as_str() == Some("video"));

    let audio = streams
        .iter()
        .any(|s| s["codec_type"].as_str() == Some("audio"));

    let (width, height, codec, fps) = if let Some(v) = video {
        let w = v["width"].as_u64().unwrap_or(0) as u32;
        let h = v["height"].as_u64().unwrap_or(0) as u32;
        let c = v["codec_name"].as_str().unwrap_or("unknown").to_string();
        let fps_str = v["r_frame_rate"].as_str().unwrap_or("0/1");
        let fps = parse_fraction(fps_str);
        (w, h, c, fps)
    } else {
        (0, 0, "unknown".into(), 0.0)
    };

    Ok(VideoInfo {
        duration,
        width,
        height,
        codec,
        fps,
        file_size,
        bitrate,
        has_audio: audio,
        format_name,
    })
}

fn parse_fraction(s: &str) -> f64 {
    if let Some((a, b)) = s.split_once('/') {
        let a: f64 = a.trim().parse().unwrap_or(0.0);
        let b: f64 = b.trim().parse().unwrap_or(1.0);
        if b != 0.0 { a / b } else { 0.0 }
    } else {
        s.trim().parse().unwrap_or(0.0)
    }
}

// ── File dialog ──────────────────────────────────────────────────────────────

#[tauri::command]
async fn pick_video_files(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let files = app
        .dialog()
        .file()
        .add_filter("Video files", &["mp4", "mkv", "mov", "avi", "webm", "m4v"])
        .blocking_pick_files();

    Ok(files
        .unwrap_or_default()
        .into_iter()
        .filter_map(|f| f.into_path().ok())
        .map(|p| p.to_string_lossy().to_string())
        .collect())
}

#[tauri::command]
async fn pick_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let result = app
        .dialog()
        .file()
        .blocking_pick_folder();
    Ok(result
        .and_then(|fp| fp.into_path().ok())
        .map(|p| p.to_string_lossy().to_string()))
}

// ── Output path helper ───────────────────────────────────────────────────────

#[tauri::command]
fn get_output_path(input_path: String, suffix: String, format: String, output_dir: Option<String>) -> String {
    let path = std::path::Path::new(&input_path);
    let stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let parent = if let Some(dir) = output_dir {
        std::path::PathBuf::from(dir)
    } else {
        path.parent().unwrap_or(std::path::Path::new(".")).to_path_buf()
    };
    parent
        .join(format!("{}{}.{}", stem, suffix, format))
        .to_string_lossy()
        .to_string()
}

// ── Compression commands ─────────────────────────────────────────────────────

#[tauri::command]
async fn start_compression(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    job_id: String,
    input_path: String,
    output_path: String,
    settings: CompressionSettings,
    on_event: Channel<CompressionEvent>,
) -> Result<(), String> {
    let ffmpeg = ffmpeg_manager::ffmpeg_exe(&app)
        .map(|p| p.to_string_lossy().to_string())
        .or_else(|| ffmpeg_manager::validated_system_ffmpeg().map(|(path, _)| path))
        .ok_or_else(|| "FFmpeg not found. Please install FFmpeg or use the in-app installer.".to_string())?;

    let ffprobe = ffmpeg_manager::ffprobe_exe(&app)
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "ffprobe".to_string());

    let jobs = state.jobs.clone();

    compression::run_compression(
        ffmpeg,
        ffprobe,
        job_id,
        input_path,
        output_path,
        settings,
        on_event,
        jobs,
    )
    .await
}

#[tauri::command]
fn cancel_job(state: tauri::State<'_, AppState>, job_id: String) -> Result<(), String> {
    let map = state.jobs.lock().unwrap();
    if let Some(job) = map.get(&job_id) {
        job.cancel_flag
            .store(true, std::sync::atomic::Ordering::Relaxed);
        Ok(())
    } else {
        Err("Job not found".into())
    }
}

#[tauri::command]
fn pause_job(state: tauri::State<'_, AppState>, job_id: String) -> Result<(), String> {
    let map = state.jobs.lock().unwrap();
    if let Some(job) = map.get(&job_id) {
        job.pause_flag
            .store(true, std::sync::atomic::Ordering::Relaxed);
        Ok(())
    } else {
        Err("Job not found".into())
    }
}

#[tauri::command]
fn resume_job(state: tauri::State<'_, AppState>, job_id: String) -> Result<(), String> {
    let map = state.jobs.lock().unwrap();
    if let Some(job) = map.get(&job_id) {
        job.pause_flag
            .store(false, std::sync::atomic::Ordering::Relaxed);
        Ok(())
    } else {
        Err("Job not found".into())
    }
}

// ── Open helpers ─────────────────────────────────────────────────────────────

#[tauri::command]
async fn open_file(app: tauri::AppHandle, path: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn open_folder(path: String) -> Result<(), String> {
    let folder = std::path::Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or(path);

    #[cfg(target_os = "windows")]
    {
        let mut cmd = std::process::Command::new("explorer");
        cmd.arg(&folder);
        cmd.spawn().map_err(|e| e.to_string())?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        let cmd = if cfg!(target_os = "macos") { "open" } else { "xdg-open" };
        std::process::Command::new(cmd)
            .arg(&folder)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

// ── Entry point ──────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(AppState {
            jobs: Arc::new(Mutex::new(HashMap::new())),
        })
        .invoke_handler(tauri::generate_handler![
            check_ffmpeg,
            download_ffmpeg,
            get_video_info,
            pick_video_files,
            pick_directory,
            get_output_path,
            start_compression,
            cancel_job,
            pause_job,
            resume_job,
            open_file,
            open_folder,
            settings::load_settings,
            settings::save_settings,
            settings::update_setting,
            settings::get_default_install_dir,
            updater::check_for_updates,
            updater::get_current_version,
            updater::open_release_page,
            updater::check_existing_installation,
            updater::terminate_existing_instance,
            notifications::send_completion_notification,
            notifications::request_attention,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
