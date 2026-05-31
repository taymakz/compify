use crate::types::{DownloadEvent, FFmpegStatus};
use futures_util::StreamExt;
use std::path::PathBuf;
use tauri::{ipc::Channel, Manager};

pub fn get_ffmpeg_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app.path().app_local_data_dir().map_err(|e| e.to_string())?;
    Ok(data_dir.join("ffmpeg"))
}

fn ffmpeg_bin() -> &'static str {
    if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" }
}

fn ffprobe_bin() -> &'static str {
    if cfg!(windows) { "ffprobe.exe" } else { "ffprobe" }
}

pub fn ffmpeg_exe(app: &tauri::AppHandle) -> Option<PathBuf> {
    let dir = get_ffmpeg_dir(app).ok()?;
    let path = dir.join(ffmpeg_bin());
    if path.exists() { Some(path) } else { None }
}

pub fn ffprobe_exe(app: &tauri::AppHandle) -> Option<PathBuf> {
    let dir = get_ffmpeg_dir(app).ok()?;
    let path = dir.join(ffprobe_bin());
    if path.exists() { Some(path) } else { None }
}

/// تست واقعی انکودر (synchronous)
fn test_encoder(ffmpeg_exe: &str, encoder: &str) -> bool {
    let result = std::process::Command::new(ffmpeg_exe)
        .args([
            "-f", "lavfi",
            "-i", "color=c=black:s=192x108:d=0.1",
            "-c:v", encoder,
            "-t", "0.1",
            "-f", "null",
            "-",
        ])
        .output();

    match result {
        Ok(output) => output.status.success(),
        Err(_) => false,
    }
}

fn run_version(exe: &str) -> Option<String> {
    let mut cmd = std::process::Command::new(exe);
    cmd.arg("-version");

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    cmd.output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| {
            String::from_utf8(o.stdout).ok().and_then(|s| {
                s.lines()
                    .next()
                    .and_then(|l| l.strip_prefix("ffmpeg version "))
                    .and_then(|l| l.split_whitespace().next())
                    .map(String::from)
            })
        })
}

/// تشخیص بهترین کدک (اولویت نرم‌افزاری قوی)
pub fn detect_best_codec(ffmpeg_exe: &str) -> Option<String> {
    let output = std::process::Command::new(ffmpeg_exe)
        .args(["-hide_banner", "-encoders"])
        .output()
        .ok()?;

    let text = String::from_utf8_lossy(&output.stdout);

    let candidates = [
        ("libx264", true),
        ("libsvtav1", true),
        ("libvpx-vp9", true),
        ("libaom-av1", true),
        ("h264_nvenc", false),
        ("h264_amf", false),
        ("h264_qsv", false),
    ];

    for (codec, is_software) in candidates {
        if text.contains(codec) {
            if is_software {
                return Some(codec.to_string());
            } else if test_encoder(ffmpeg_exe, codec) {
                return Some(codec.to_string());
            }
        }
    }
    None
}

pub fn validated_system_ffmpeg() -> Option<(String, String)> {
    run_version("ffmpeg")?;
    let codec = detect_best_codec("ffmpeg")?;
    Some(("ffmpeg".into(), codec))
}

pub fn check_ffmpeg(app: &tauri::AppHandle) -> FFmpegStatus {
    // اولویت اول: نسخه داخل اپ
    if let Some(path) = ffmpeg_exe(app) {
        let exe_str = path.to_str().unwrap_or("ffmpeg");

        if let Some(version) = run_version(exe_str) {
            let codec = detect_best_codec(exe_str);

            return FFmpegStatus {
                installed: true,
                version: Some(version),
                path: Some(path.to_string_lossy().to_string()),
                preferred_codec: codec,
            };
        }
    }

    // اولویت دوم: سیستم
    if let Some((sys_path, codec)) = validated_system_ffmpeg() {
        let version = run_version("ffmpeg");
        return FFmpegStatus {
            installed: true,
            version,
            path: Some(sys_path),
            preferred_codec: Some(codec),
        };
    }

    FFmpegStatus {
        installed: false,
        version: None,
        path: None,
        preferred_codec: None,
    }
}

// ====================== دانلود و نصب ======================

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("compify-video-compressor/1.0")
        .build()
        .map_err(|e| e.to_string())
}

pub async fn download_and_install_ffmpeg(
    app: tauri::AppHandle,
    on_event: Channel<DownloadEvent>,
) -> Result<(), String> {
    let ffmpeg_dir = get_ffmpeg_dir(&app)?;
    std::fs::create_dir_all(&ffmpeg_dir).map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        let url = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";
        download_zip_extract_bins(url, &ffmpeg_dir, &on_event).await?;
    }

    #[cfg(target_os = "macos")]
    {
        download_macos_binaries(&ffmpeg_dir, &on_event).await?;
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    {
        return Err("Auto-install is not supported on this platform.".to_string());
    }

    on_event.send(DownloadEvent::Complete).ok();
    Ok(())
}

async fn download_zip_extract_bins(
    url: &str,
    ffmpeg_dir: &std::path::Path,
    on_event: &Channel<DownloadEvent>,
) -> Result<(), String> {
    use std::io::Write;

    let client = build_client()?;
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Download failed: HTTP {}", response.status()));
    }

    let total = response.content_length().unwrap_or(0);
    let zip_path = ffmpeg_dir.join("ffmpeg_tmp.zip");
    let mut file = std::fs::File::create(&zip_path).map_err(|e| e.to_string())?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;

        let percent = if total > 0 { (downloaded as f64 / total as f64) * 100.0 } else { 0.0 };
        on_event.send(DownloadEvent::Progress { downloaded, total, percent }).ok();
    }

    drop(file);
    on_event.send(DownloadEvent::Extracting).ok();

    let zip_file = std::fs::File::open(&zip_path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(zip_file).map_err(|e| e.to_string())?;

    let ffmpeg_name = ffmpeg_bin();
    let ffprobe_name = ffprobe_bin();

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        let target = if name.ends_with(&format!("/bin/{}", ffmpeg_name)) || 
                       name.ends_with(&format!("\\bin\\{}", ffmpeg_name)) {
            Some(ffmpeg_dir.join(ffmpeg_name))
        } else if name.ends_with(&format!("/bin/{}", ffprobe_name)) || 
                  name.ends_with(&format!("\\bin\\{}", ffprobe_name)) {
            Some(ffmpeg_dir.join(ffprobe_name))
        } else {
            None
        };

        if let Some(dest) = target {
            let mut out = std::fs::File::create(&dest).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
            set_executable(&dest)?;
        }
    }

    std::fs::remove_file(&zip_path).ok();
    Ok(())
}

// macOS Support
#[cfg(target_os = "macos")]
async fn download_macos_binaries(
    ffmpeg_dir: &std::path::Path,
    on_event: &Channel<DownloadEvent>,
) -> Result<(), String> {
    let client = build_client()?;

    download_evermeet(
        &client,
        "https://evermeet.cx/ffmpeg/getrelease/ffmpeg/zip",
        &ffmpeg_dir.join("ffmpeg"),
        on_event,
        0.0,
        50.0,
    ).await?;

    download_evermeet(
        &client,
        "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip",
        &ffmpeg_dir.join("ffprobe"),
        on_event,
        50.0,
        100.0,
    ).await?;

    Ok(())
}

#[cfg(target_os = "macos")]
async fn download_evermeet(
    client: &reqwest::Client,
    url: &str,
    dest: &std::path::Path,
    on_event: &Channel<DownloadEvent>,
    progress_start: f64,
    progress_end: f64,
) -> Result<(), String> {
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Download failed: HTTP {}", response.status()));
    }

    let total = response.content_length().unwrap_or(0);
    let mut zip_bytes: Vec<u8> = Vec::new();
    let mut downloaded: u64 = 0;

    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        zip_bytes.extend_from_slice(&chunk);
        downloaded += chunk.len() as u64;

        let raw = if total > 0 { downloaded as f64 / total as f64 } else { 0.0 };
        let percent = progress_start + raw * (progress_end - progress_start);
        on_event.send(DownloadEvent::Progress { downloaded, total, percent }).ok();
    }

    on_event.send(DownloadEvent::Extracting).ok();

    let cursor = std::io::Cursor::new(zip_bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        if name.ends_with('/') || 
           name.to_lowercase().ends_with(".txt") || 
           name.to_lowercase().ends_with(".md") {
            continue;
        }

        let mut out = std::fs::File::create(dest).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        set_executable(dest)?;
        return Ok(());
    }

    Err("No binary found in the downloaded zip".to_string())
}

fn set_executable(_path: &std::path::Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(_path, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
