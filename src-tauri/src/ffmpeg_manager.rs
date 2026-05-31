use std::path::PathBuf;
use futures_util::StreamExt;
use tauri::{ipc::Channel, Manager};
use crate::types::{DownloadEvent, FFmpegStatus};

pub fn get_ffmpeg_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?;
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

fn run_version(exe: &str) -> Option<String> {
    let mut cmd = std::process::Command::new(exe);
    cmd.arg("-version");

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
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

/// Probe which video encoders are available in the given FFmpeg binary.
/// Returns the best one found, in priority order.
/// Accepts any build — even one without libx264 — as long as it can encode video.
fn detect_best_codec(ffmpeg_exe: &str) -> Option<String> {
    let mut cmd = std::process::Command::new(ffmpeg_exe);
    cmd.args(["-hide_banner", "-encoders"]);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd.output().ok()?;
    let text = String::from_utf8_lossy(&output.stdout);

    // Priority: libx264 (best compat) > libx265 (smaller) > libvpx-vp9 (open) > libsvtav1 (AV1)
    let candidates = ["libx264", "libx265", "libvpx-vp9", "libsvtav1", "libaom-av1"];
    for codec in candidates {
        if text.contains(codec) {
            return Some(codec.to_string());
        }
    }
    None
}

/// Returns the system `ffmpeg` path when it has at least one supported video encoder.
/// Accepts builds that lack libx264 (e.g. compiled with --disable-libx264) as long
/// as VP9 / AV1 / etc. are present — the detected codec is auto-applied as the default.
pub fn validated_system_ffmpeg() -> Option<(String, String)> {
    run_version("ffmpeg")?; // verify it runs
    let codec = detect_best_codec("ffmpeg")?;
    Some(("ffmpeg".into(), codec))
}

pub fn check_ffmpeg(app: &tauri::AppHandle) -> FFmpegStatus {
    // Prefer the app-managed BtbN GPL binary (always has libx264 and more)
    if let Some(path) = ffmpeg_exe(app) {
        let exe_str = path.to_str().unwrap_or("ffmpeg");
        if let Some(version) = run_version(exe_str) {
            return FFmpegStatus {
                installed: true,
                version: Some(version),
                path: Some(path.to_string_lossy().to_string()),
                preferred_codec: Some("libx264".into()),
            };
        }
    }
    // Fall back to any system FFmpeg that has at least one usable video encoder.
    if let Some((sys_path, codec)) = validated_system_ffmpeg() {
        let version = run_version("ffmpeg");
        return FFmpegStatus {
            installed: true,
            version,
            path: Some(sys_path),
            preferred_codec: Some(codec),
        };
    }
    FFmpegStatus { installed: false, version: None, path: None, preferred_codec: None }
}

fn build_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent("tauri-video-compressor/1.0")
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
        return Err(
            "Auto-install is not available on this platform. \
             Please install FFmpeg via your package manager \
             (e.g. `sudo apt install ffmpeg` on Ubuntu/Debian, \
             `sudo dnf install ffmpeg` on Fedora, \
             `sudo pacman -S ffmpeg` on Arch) and restart the app."
                .to_string(),
        );
    }

    on_event.send(DownloadEvent::Complete).ok();
    Ok(())
}

/// Download a zip, stream it to disk, then extract the ffmpeg/ffprobe binaries.
/// Used on Windows where BtbN packages both binaries in a single zip under `bin/`.
async fn download_zip_extract_bins(
    url: &str,
    ffmpeg_dir: &std::path::Path,
    on_event: &Channel<DownloadEvent>,
) -> Result<(), String> {
    use std::io::Write;

    let client = build_client()?;
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Download failed: HTTP {}", response.status()));
    }

    let total = response.content_length().unwrap_or(0);
    let zip_path = ffmpeg_dir.join("ffmpeg_tmp.zip");
    let mut file =
        std::fs::File::create(&zip_path).map_err(|e| format!("Cannot create zip: {}", e))?;

    let mut stream = response.bytes_stream();
    let mut downloaded: u64 = 0;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        let percent = if total > 0 {
            downloaded as f64 / total as f64 * 100.0
        } else {
            0.0
        };
        on_event
            .send(DownloadEvent::Progress { downloaded, total, percent })
            .ok();
    }
    drop(file);

    on_event.send(DownloadEvent::Extracting).ok();

    let zip_file =
        std::fs::File::open(&zip_path).map_err(|e| format!("Cannot open zip: {}", e))?;
    let mut archive =
        zip::ZipArchive::new(zip_file).map_err(|e| format!("Bad zip: {}", e))?;

    let ffmpeg_name  = ffmpeg_bin();
    let ffprobe_name = ffprobe_bin();

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        let target = if name.ends_with(&format!("/bin/{}", ffmpeg_name))
            || name.ends_with(&format!("\\bin\\{}", ffmpeg_name))
        {
            Some(ffmpeg_dir.join(ffmpeg_name))
        } else if name.ends_with(&format!("/bin/{}", ffprobe_name))
            || name.ends_with(&format!("\\bin\\{}", ffprobe_name))
        {
            Some(ffmpeg_dir.join(ffprobe_name))
        } else {
            None
        };

        if let Some(dest) = target {
            let mut out =
                std::fs::File::create(&dest).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
            set_executable(&dest)?;
        }
    }

    std::fs::remove_file(&zip_path).ok();
    Ok(())
}

/// macOS: download ffmpeg and ffprobe separately from evermeet.cx.
/// Each zip contains only the binary at the root.
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
    )
    .await?;

    download_evermeet(
        &client,
        "https://evermeet.cx/ffmpeg/getrelease/ffprobe/zip",
        &ffmpeg_dir.join("ffprobe"),
        on_event,
        50.0,
        100.0,
    )
    .await?;

    Ok(())
}

/// Download a single-binary zip from evermeet.cx and extract the first non-directory entry.
/// `progress_start` / `progress_end` allow mapping download progress to a sub-range (0-100).
#[cfg(target_os = "macos")]
async fn download_evermeet(
    client: &reqwest::Client,
    url: &str,
    dest: &std::path::Path,
    on_event: &Channel<DownloadEvent>,
    progress_start: f64,
    progress_end: f64,
) -> Result<(), String> {
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;

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
        on_event
            .send(DownloadEvent::Progress { downloaded, total, percent })
            .ok();
    }

    on_event.send(DownloadEvent::Extracting).ok();

    let cursor = std::io::Cursor::new(zip_bytes);
    let mut archive =
        zip::ZipArchive::new(cursor).map_err(|e| format!("Bad zip: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_string();

        // Skip directory entries and metadata files
        if name.ends_with('/') { continue; }
        let lower = name.to_lowercase();
        if lower.ends_with(".txt") || lower.ends_with(".md") { continue; }

        let mut out =
            std::fs::File::create(dest).map_err(|e| e.to_string())?;
        std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        set_executable(dest)?;
        return Ok(());
    }

    Err("No binary found in the downloaded zip".to_string())
}

/// Set the executable bit on Unix; no-op on Windows.
fn set_executable(_path: &std::path::Path) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(_path, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
