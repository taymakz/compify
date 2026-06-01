use crate::types::{CompressionEvent, CompressionSettings};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

fn test_encoder_sync(ffmpeg_path: &str, encoder: &str) -> bool {
    let mut cmd = std::process::Command::new(ffmpeg_path);
    cmd.args(["-f", "lavfi", "-i", "color=c=black:s=192x108:d=0.1", "-c:v", encoder, "-t", "0.1", "-f", "null", "-"]);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
    match cmd.output() {
        Ok(output) => output.status.success(),
        Err(_) => false,
    }
}

/// Returns the first encoder that actually works on this FFmpeg binary.
/// For WebM only AV1/VP9 codecs are tried; for everything else H.264 family first.
fn resolve_fallback_codec(ffmpeg_path: &str, output_format: &str) -> String {
    let candidates: &[&str] = if output_format == "webm" {
        &["libsvtav1", "libaom-av1", "libvpx-vp9"]
    } else {
        &[
            "libx264", "libx265",
            "h264_nvenc", "h264_amf", "h264_qsv",
            "hevc_nvenc", "hevc_amf", "hevc_qsv",
            "mpeg4",
        ]
    };
    for &codec in candidates {
        if test_encoder_sync(ffmpeg_path, codec) {
            println!("[Compify] Resolved fallback encoder: {}", codec);
            return codec.to_string();
        }
    }
    println!("[Compify] No encoder available, using stream copy");
    "copy".to_string()
}

#[allow(dead_code)]
pub struct JobHandle {
    pub pid: u32,
    pub cancel_flag: Arc<AtomicBool>,
    pub pause_flag: Arc<AtomicBool>,
}

pub type JobMap = Arc<Mutex<HashMap<String, JobHandle>>>;

pub async fn run_compression(
    ffmpeg_path: String,
    ffprobe_path: String,
    job_id: String,
    input_path: String,
    output_path: String,
    mut settings: CompressionSettings,
    on_event: Channel<CompressionEvent>,
    jobs: JobMap,
) -> Result<(), String> {
    let original_size = std::fs::metadata(&input_path).map(|m| m.len()).unwrap_or(0);
    let total_frames = get_total_frames(&ffprobe_path, &input_path).await;
    let start = std::time::Instant::now();

    // ====================== Fallback انکودر ویدیو ======================
    if matches!(
        settings.video_codec.as_str(),
        "h264_nvenc" | "h264_amf" | "h264_qsv" | "hevc_nvenc" | "hevc_amf" | "hevc_qsv"
    ) {
        if !test_encoder_sync(&ffmpeg_path, &settings.video_codec) {
            println!(
                "[Compify] Hardware encoder '{}' unavailable, finding software fallback",
                settings.video_codec
            );
            settings.video_codec = resolve_fallback_codec(&ffmpeg_path, &settings.output_format);
            settings.preset_speed = "medium".to_string();
        }
    }

    // ====================== تنظیمات سازگار با WebM ======================
    let is_webm = settings.output_format == "webm";
    let _is_mkv = settings.output_format == "mkv";

    if is_webm {
        // WebM فقط AV1/VP9 + Opus پشتیبانی می‌کند
        if !matches!(
            settings.video_codec.as_str(),
            "libsvtav1" | "libvpx-vp9" | "libaom-av1"
        ) {
            let codec = resolve_fallback_codec(&ffmpeg_path, "webm");
            println!("[Compify] WebM output → switching to {}", codec);
            settings.video_codec = codec;
        }
        if !matches!(settings.audio_codec.as_str(), "libopus" | "copy") {
            println!("[Compify] WebM output → forcing libopus audio codec");
            settings.audio_codec = "libopus".to_string();
            settings.audio_bitrate = 128; // مناسب برای Opus
        }
    } else if matches!(settings.output_format.as_str(), "mp4" | "m4v" | "mov") {
        // MP4/M4V/MOV cannot contain VP9 or AV1 reliably
        if matches!(
            settings.video_codec.as_str(),
            "libvpx-vp9" | "libsvtav1" | "libaom-av1"
        ) {
            println!(
                "[Compify] {} output incompatible with {}, finding compatible encoder",
                settings.output_format, settings.video_codec
            );
            settings.video_codec = resolve_fallback_codec(&ffmpeg_path, &settings.output_format);
            settings.preset_speed = "medium".to_string();
        }
    }

    // Final safety net: verify the resolved codec actually works before spawning FFmpeg
    if settings.video_codec != "copy" && !test_encoder_sync(&ffmpeg_path, &settings.video_codec) {
        println!(
            "[Compify] Codec '{}' still unavailable after resolution, re-resolving",
            settings.video_codec
        );
        settings.video_codec = resolve_fallback_codec(&ffmpeg_path, &settings.output_format);
        settings.preset_speed = "medium".to_string();
    }

    let mut args: Vec<String> = vec!["-y".into(), "-i".into(), input_path.clone()];

    args.extend(["-map".into(), "0:v:0".into(), "-map".into(), "0:a?".into()]);

    // ====================== Video Codec ======================
    args.extend(["-c:v".into(), settings.video_codec.clone()]);

    match settings.video_codec.as_str() {
        "copy" => {},

        "libvpx-vp9" => {
            let cpu_used = match settings.preset_speed.as_str() {
                "ultrafast" | "superfast" => "8",
                "veryfast" | "faster" => "6",
                "fast" => "5",
                "slow" => "2",
                "slower" | "veryslow" | "placebo" => "0",
                _ => "4",
            };
            args.extend([
                "-crf".into(),
                settings.crf.to_string(),
                "-b:v".into(),
                "0".into(),
                "-cpu-used".into(),
                cpu_used.into(),
            ]);
        }

        "libsvtav1" | "libaom-av1" => {
            let preset = match settings.preset_speed.as_str() {
                "ultrafast" | "superfast" => "12",
                "veryfast" | "faster" => "10",
                "fast" => "8",
                "slow" => "4",
                "slower" | "veryslow" => "2",
                "placebo" => "0",
                _ => "6",
            };
            args.extend([
                "-crf".into(),
                settings.crf.to_string(),
                "-preset".into(),
                preset.into(),
            ]);
        }

        "libx265" => {
            args.extend([
                "-crf".into(),
                settings.crf.to_string(),
                "-preset".into(),
                settings.preset_speed.clone(),
                "-pix_fmt".into(),
                "yuv420p".into(),
                "-tag:v".into(),
                "hvc1".into(), // Better compatibility
            ]);
        }

        "h264_nvenc" | "hevc_nvenc" => {
            // NVENC uses p1 (fastest) – p7 (slowest/best) presets
            let preset = match settings.preset_speed.as_str() {
                "ultrafast" | "superfast" => "p1",
                "veryfast" | "faster"     => "p2",
                "fast"                    => "p3",
                "slow"                    => "p5",
                "slower"                  => "p6",
                "veryslow" | "placebo"    => "p7",
                _                         => "p4",
            };
            args.extend([
                "-cq".into(),
                settings.crf.to_string(),
                "-preset".into(),
                preset.into(),
            ]);
        }

        "h264_amf" | "hevc_amf" => {
            // AMF has no x264-style presets; use -quality and CQP mode
            let quality = match settings.preset_speed.as_str() {
                "ultrafast" | "superfast" | "veryfast" | "faster" | "fast" => "speed",
                "slow" | "slower" | "veryslow" | "placebo" => "quality",
                _ => "balanced",
            };
            args.extend([
                "-rc_mode".into(), "cqp".into(),
                "-qp_i".into(),    settings.crf.to_string(),
                "-qp_p".into(),    settings.crf.to_string(),
                "-quality".into(), quality.into(),
            ]);
        }

        "h264_qsv" | "hevc_qsv" => {
            // QSV: global_quality for CRF-like control; preset names are x264-compatible
            let preset = match settings.preset_speed.as_str() {
                "ultrafast" | "superfast" => "veryfast",
                "placebo"                 => "veryslow",
                other                     => other,
            };
            args.extend([
                "-global_quality".into(), settings.crf.to_string(),
                "-preset".into(),         preset.into(),
            ]);
        }

        _ => { // libx264 and any other encoder that speaks x264 preset names
            args.extend([
                "-crf".into(),
                settings.crf.to_string(),
                "-preset".into(),
                settings.preset_speed.clone(),
                "-pix_fmt".into(),
                "yuv420p".into(),
            ]);
        }
    }

    // Filter Chain
    if settings.video_codec != "copy" && settings.resolution.is_some() {
        let vf = if let Some(ref res) = settings.resolution {
            format!(
                "scale={}:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
                res
            )
        } else {
            "scale=trunc(iw/2)*2:trunc(ih/2)*2".to_string()
        };
        args.extend(["-vf".into(), vf]);
    } else if settings.video_codec != "copy" {
        // Ensure even dimensions even without resolution change
        args.extend([
            "-vf".into(),
            "scale=trunc(iw/2)*2:trunc(ih/2)*2".into(),
        ]);
    }

    if let Some(fps) = settings.fps {
        args.extend(["-r".into(), fps.to_string()]);
    }

    // ====================== Audio Codec ======================
    if settings.audio_codec == "copy" {
        args.extend(["-c:a".into(), "copy".into()]);
    } else {
        args.extend([
            "-c:a".into(),
            settings.audio_codec.clone(),
            "-b:a".into(),
            format!("{}k", settings.audio_bitrate),
        ]);
    }

    // Faststart + Container specific
    if matches!(settings.output_format.as_str(), "mp4" | "m4v" | "mov") {
        args.extend(["-movflags".into(), "+faststart".into()]);
    }

    // Progress
    args.extend([
        "-progress".into(),
        "pipe:2".into(),
        "-nostats".into(),
        "-loglevel".into(),
        "error".into(),
    ]);
    args.push(output_path.clone());

    // ====================== Run FFmpeg ======================
    let mut cmd = Command::new(&ffmpeg_path);
    cmd.args(&args)
        .stderr(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stdin(std::process::Stdio::null());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start FFmpeg: {}", e))?;

    let pid = child.id().unwrap_or(0);

    let cancel_flag = Arc::new(AtomicBool::new(false));
    let pause_flag = Arc::new(AtomicBool::new(false));

    {
        let mut map = jobs.lock().unwrap();
        map.insert(
            job_id.clone(),
            JobHandle {
                pid,
                cancel_flag: cancel_flag.clone(),
                pause_flag: pause_flag.clone(),
            },
        );
    }

    let stderr = child.stderr.take().expect("stderr not captured");
    let mut lines = BufReader::new(stderr).lines();
    let mut kvs: HashMap<String, String> = HashMap::new();
    let mut error_lines: Vec<String> = Vec::new();

    loop {
        if pause_flag.load(Ordering::Relaxed) {
            suspend_process(pid);
            while pause_flag.load(Ordering::Relaxed) {
                if cancel_flag.load(Ordering::Relaxed) {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(150)).await;
            }
            resume_process(pid);
        }

        if cancel_flag.load(Ordering::Relaxed) {
            child.kill().await.ok();
            std::fs::remove_file(&output_path).ok();
            jobs.lock().unwrap().remove(&job_id);
            return Err("cancelled".into());
        }

        let line_result = tokio::time::timeout(Duration::from_millis(200), lines.next_line()).await;
        let line = match line_result {
            Err(_) => continue,
            Ok(Ok(Some(l))) => l,
            _ => break,
        };

        if let Some((key, val)) = line.split_once('=') {
            let key = key.trim().to_string();
            let val = val.trim().to_string();

            if key == "progress" {
                let frame: u64 = kvs.get("frame").and_then(|v| v.parse().ok()).unwrap_or(0);
                let fps: f64 = kvs.get("fps").and_then(|v| v.parse().ok()).unwrap_or(0.0);
                let speed = kvs.get("speed").cloned().unwrap_or_else(|| "0x".into());
                let current_size: u64 = kvs
                    .get("total_size")
                    .and_then(|v| v.parse().ok())
                    .unwrap_or(0);

                let percent = if total_frames > 0 {
                    (frame as f64 / total_frames as f64 * 100.0).min(99.9)
                } else {
                    0.0
                };

                let elapsed = start.elapsed().as_secs_f64();
                let eta = if percent > 0.5 {
                    (elapsed / (percent / 100.0) - elapsed).max(0.0)
                } else {
                    0.0
                };

                on_event
                    .send(CompressionEvent::Progress {
                        job_id: job_id.clone(),
                        percent,
                        fps,
                        speed,
                        current_size,
                        eta,
                        frame,
                        total_frames,
                    })
                    .ok();

                if val == "end" {
                    break;
                }
                kvs.clear();
            } else {
                kvs.insert(key, val);
            }
        } else if !line.trim().is_empty() {
            error_lines.push(line.trim().to_string());
        }
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    jobs.lock().unwrap().remove(&job_id);

    if cancel_flag.load(Ordering::Relaxed) {
        return Err("cancelled".into());
    }

    if !status.success() {
        let detail = if error_lines.is_empty() {
            format!("exit code: {:?}", status.code())
        } else {
            error_lines.join(" | ")
        };
        return Err(format!("FFmpeg failed: {}", detail));
    }

    let output_size = std::fs::metadata(&output_path)
        .map(|m| m.len())
        .unwrap_or(0);

    on_event
        .send(CompressionEvent::Complete {
            job_id,
            original_size,
            output_size,
            output_path,
            duration_secs: start.elapsed().as_secs_f64(),
        })
        .ok();

    Ok(())
}
// Helper Functions
async fn get_total_frames(ffprobe: &str, input: &str) -> u64 {
    let mut cmd = tokio::process::Command::new(ffprobe);
    cmd.args(["-v", "quiet", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets,r_frame_rate,duration", "-print_format", "json", input]);
    #[cfg(windows)]
    { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }
    let out = cmd.output().await.ok();

    if let Some(out) = out {
        if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
            if let Some(stream) = json["streams"].get(0) {
                if let Some(n) = stream["nb_read_packets"]
                    .as_str()
                    .and_then(|s| s.parse::<u64>().ok())
                {
                    if n > 0 {
                        return n;
                    }
                }
                let duration: f64 = stream["duration"]
                    .as_str()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(0.0);
                let fps = parse_fraction(stream["r_frame_rate"].as_str().unwrap_or("0/1"));
                if duration > 0.0 && fps > 0.0 {
                    return (duration * fps).round() as u64;
                }
            }
        }
    }
    0
}

fn parse_fraction(s: &str) -> f64 {
    if let Some((a, b)) = s.split_once('/') {
        let a: f64 = a.trim().parse().unwrap_or(0.0);
        let b: f64 = b.trim().parse().unwrap_or(1.0);
        if b != 0.0 {
            a / b
        } else {
            0.0
        }
    } else {
        s.trim().parse().unwrap_or(0.0)
    }
}

// Pause / Resume
#[cfg(windows)]
pub fn suspend_process(pid: u32) {
    use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
    use windows_sys::Win32::System::Diagnostics::ToolHelp::*;
    use windows_sys::Win32::System::Threading::*;

    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
        if snap == INVALID_HANDLE_VALUE {
            return;
        }
        let mut entry: THREADENTRY32 = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;

        if Thread32First(snap, &mut entry) != 0 {
            loop {
                if entry.th32OwnerProcessID == pid {
                    let t = OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID);
                    if !t.is_null() {
                        SuspendThread(t);
                        windows_sys::Win32::Foundation::CloseHandle(t);
                    }
                }
                if Thread32Next(snap, &mut entry) == 0 {
                    break;
                }
            }
        }
        windows_sys::Win32::Foundation::CloseHandle(snap);
    }
}

#[cfg(windows)]
pub fn resume_process(pid: u32) {
    use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
    use windows_sys::Win32::System::Diagnostics::ToolHelp::*;
    use windows_sys::Win32::System::Threading::*;

    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
        if snap == INVALID_HANDLE_VALUE {
            return;
        }
        let mut entry: THREADENTRY32 = std::mem::zeroed();
        entry.dwSize = std::mem::size_of::<THREADENTRY32>() as u32;

        if Thread32First(snap, &mut entry) != 0 {
            loop {
                if entry.th32OwnerProcessID == pid {
                    let t = OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID);
                    if !t.is_null() {
                        ResumeThread(t);
                        windows_sys::Win32::Foundation::CloseHandle(t);
                    }
                }
                if Thread32Next(snap, &mut entry) == 0 {
                    break;
                }
            }
        }
        windows_sys::Win32::Foundation::CloseHandle(snap);
    }
}

#[cfg(not(windows))]
pub fn suspend_process(_pid: u32) {}

#[cfg(not(windows))]
pub fn resume_process(_pid: u32) {}
