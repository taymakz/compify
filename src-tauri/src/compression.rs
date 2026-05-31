use crate::types::{CompressionEvent, CompressionSettings};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::ipc::Channel;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;

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
    settings: CompressionSettings,
    on_event: Channel<CompressionEvent>,
    jobs: JobMap,
) -> Result<(), String> {
    let original_size = std::fs::metadata(&input_path).map(|m| m.len()).unwrap_or(0);
    let total_frames = get_total_frames(&ffprobe_path, &input_path).await;
    let start = std::time::Instant::now();

    let mut args: Vec<String> = vec![
        "-y".into(),
        "-i".into(),
        input_path.clone(),
    ];

    // Map only the primary video and all audio streams — skip subtitles,
    // data tracks, and attachments that may be unsupported by the container.
    args.extend([
        "-map".into(), "0:v:0".into(),
        "-map".into(), "0:a?".into(),
    ]);

    // Video codec + quality / speed flags (codec-specific)
    args.extend(["-c:v".into(), settings.video_codec.clone()]);
    match settings.video_codec.as_str() {
        "copy" => { /* stream copy — no quality or speed flags */ }
        "libvpx-vp9" => {
            // VP9 constant-quality mode requires -b:v 0 combined with -crf;
            // it does not support -preset — use -cpu-used (0=slowest, 8=fastest).
            let cpu = match settings.preset_speed.as_str() {
                "ultrafast" | "superfast"            => "8",
                "veryfast"  | "faster"               => "6",
                "fast"                               => "5",
                "slow"                               => "2",
                "slower"    | "veryslow" | "placebo" => "0",
                _                                    => "4",
            };
            args.extend([
                "-crf".into(), settings.crf.to_string(),
                "-b:v".into(), "0".into(),
                "-cpu-used".into(), cpu.into(),
            ]);
        }
        "libsvtav1" | "libaom-av1" => {
            // AV1 encoders use -crf without -preset; SVT-AV1 uses -preset as a speed preset (0-13)
            let av1_preset = match settings.preset_speed.as_str() {
                "ultrafast" | "superfast" => "12",
                "veryfast"  | "faster"   => "10",
                "fast"                   => "8",
                "slow"                   => "4",
                "slower"   | "veryslow"  => "2",
                _                        => "6", // medium
            };
            args.extend([
                "-crf".into(), settings.crf.to_string(),
                "-preset".into(), av1_preset.into(),
            ]);
        }
        _ => {
            // H.264, H.265 and others that support -preset / -crf.
            // yuv420p gives the widest device compatibility.
            args.extend([
                "-crf".into(),     settings.crf.to_string(),
                "-preset".into(),  settings.preset_speed.clone(),
                "-pix_fmt".into(), "yuv420p".into(),
            ]);
        }
    }

    // Scale filter — only when re-encoding (copy codec must NOT have -vf)
    if settings.video_codec != "copy" {
        let vf = if let Some(ref res) = settings.resolution {
            // Scale to fit within the target box while preserving aspect ratio,
            // then round to even dimensions as required by most encoders.
            format!(
                "scale={}:force_original_aspect_ratio=decrease,\
                 scale=trunc(iw/2)*2:trunc(ih/2)*2",
                res
            )
        } else {
            // No resize — just ensure even dimensions.
            "scale=trunc(iw/2)*2:trunc(ih/2)*2".into()
        };
        args.extend(["-vf".into(), vf]);
    }

    // FPS
    if let Some(fps) = settings.fps {
        args.extend(["-r".into(), fps.to_string()]);
    }

    // Audio codec
    if settings.audio_codec == "copy" {
        args.extend(["-c:a".into(), "copy".into()]);
    } else {
        args.extend([
            "-c:a".into(), settings.audio_codec.clone(),
            "-b:a".into(), format!("{}k", settings.audio_bitrate),
        ]);
    }

    // Move moov atom to the front for instant playback in MP4-family containers.
    match settings.output_format.as_str() {
        "mp4" | "m4v" | "mov" => {
            args.extend(["-movflags".into(), "+faststart".into()]);
        }
        _ => {}
    }

    // Structured progress to stderr
    args.extend([
        "-progress".into(), "pipe:2".into(),
        "-nostats".into(),
        "-loglevel".into(), "error".into(),
    ]);
    args.push(output_path.clone());

    let mut cmd = Command::new(&ffmpeg_path);
    cmd.args(&args)
        .stderr(std::process::Stdio::piped())
        .stdout(std::process::Stdio::null())
        .stdin(std::process::Stdio::null());

    #[cfg(windows)]
    {
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
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
            JobHandle { pid, cancel_flag: cancel_flag.clone(), pause_flag: pause_flag.clone() },
        );
    }

    let stderr = child.stderr.take().expect("stderr not captured");
    let mut lines = BufReader::new(stderr).lines();
    let mut kvs: HashMap<String, String> = HashMap::new();
    // Collect non-KV lines (FFmpeg error messages)
    let mut error_lines: Vec<String> = Vec::new();

    loop {
        // Handle pause
        if pause_flag.load(Ordering::Relaxed) {
            suspend_process(pid);
            loop {
                tokio::time::sleep(Duration::from_millis(150)).await;
                if cancel_flag.load(Ordering::Relaxed) { break; }
                if !pause_flag.load(Ordering::Relaxed) {
                    resume_process(pid);
                    break;
                }
            }
        }

        // Handle cancel
        if cancel_flag.load(Ordering::Relaxed) {
            child.kill().await.ok();
            std::fs::remove_file(&output_path).ok();
            jobs.lock().unwrap().remove(&job_id);
            return Err("cancelled".into());
        }

        let line_result =
            tokio::time::timeout(Duration::from_millis(200), lines.next_line()).await;

        let line = match line_result {
            Err(_) => continue,           // timeout — re-check flags
            Ok(Ok(Some(l))) => l,
            Ok(Ok(None)) => break,        // EOF
            Ok(Err(_)) => break,
        };

        if let Some((key, val)) = line.split_once('=') {
            let key = key.trim().to_string();
            let val = val.trim().to_string();

            if key == "progress" {
                let frame: u64 = kvs.get("frame").and_then(|v| v.parse().ok()).unwrap_or(0);
                let fps: f64 = kvs.get("fps").and_then(|v| v.parse().ok()).unwrap_or(0.0);
                let speed = kvs.get("speed").cloned().unwrap_or_else(|| "0x".into());
                let current_size: u64 =
                    kvs.get("total_size").and_then(|v| v.parse().ok()).unwrap_or(0);

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

                on_event.send(CompressionEvent::Progress {
                    job_id: job_id.clone(), percent, fps, speed,
                    current_size, eta, frame, total_frames,
                }).ok();

                if val == "end" { break; }
                kvs.clear();
            } else {
                kvs.insert(key, val);
            }
        } else {
            let trimmed = line.trim().to_string();
            if !trimmed.is_empty() {
                error_lines.push(trimmed);
            }
        }
    }

    let status = child.wait().await.map_err(|e| e.to_string())?;
    jobs.lock().unwrap().remove(&job_id);

    if cancel_flag.load(Ordering::Relaxed) {
        return Err("cancelled".into());
    }

    if !status.success() {
        let detail = if error_lines.is_empty() {
            format!("exit code {:?}", status.code())
        } else {
            error_lines.join(" | ")
        };
        return Err(format!("FFmpeg failed: {}", detail));
    }

    let output_size = std::fs::metadata(&output_path).map(|m| m.len()).unwrap_or(0);

    on_event.send(CompressionEvent::Complete {
        job_id,
        original_size,
        output_size,
        output_path,
        duration_secs: start.elapsed().as_secs_f64(),
    }).ok();

    Ok(())
}

async fn get_total_frames(ffprobe: &str, input: &str) -> u64 {
    let out = tokio::process::Command::new(ffprobe)
        .args([
            "-v", "quiet",
            "-select_streams", "v:0",
            "-count_packets",
            "-show_entries", "stream=nb_read_packets,r_frame_rate,duration",
            "-print_format", "json",
            input,
        ])
        .output()
        .await
        .ok();

    if let Some(out) = out {
        if let Ok(json) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
            if let Some(stream) = json["streams"].get(0) {
                if let Some(n) = stream["nb_read_packets"]
                    .as_str()
                    .and_then(|s| s.parse::<u64>().ok())
                {
                    if n > 0 { return n; }
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
        if b != 0.0 { a / b } else { 0.0 }
    } else {
        s.trim().parse().unwrap_or(0.0)
    }
}

#[cfg(windows)]
pub fn suspend_process(pid: u32) {
    use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
    use windows_sys::Win32::System::Diagnostics::ToolHelp::*;
    use windows_sys::Win32::System::Threading::*;
    unsafe {
        let snap = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0);
        if snap == INVALID_HANDLE_VALUE { return; }
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
                if Thread32Next(snap, &mut entry) == 0 { break; }
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
        if snap == INVALID_HANDLE_VALUE { return; }
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
                if Thread32Next(snap, &mut entry) == 0 { break; }
            }
        }
        windows_sys::Win32::Foundation::CloseHandle(snap);
    }
}

#[cfg(not(windows))]
pub fn suspend_process(_pid: u32) {}
#[cfg(not(windows))]
pub fn resume_process(_pid: u32) {}
