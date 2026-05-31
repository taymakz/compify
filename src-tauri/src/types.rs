use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub codec: String,
    pub fps: f64,
    pub file_size: u64,
    pub bitrate: u64,
    pub has_audio: bool,
    pub format_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionSettings {
    pub video_codec: String,
    pub audio_codec: String,
    pub crf: u32,
    pub preset_speed: String,
    pub resolution: Option<String>,
    pub fps: Option<f64>,
    pub audio_bitrate: u32,
    pub output_format: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FFmpegStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
    /// Best available video encoder detected in this FFmpeg build.
    /// May differ from libx264 when the build lacks GPL codecs.
    pub preferred_codec: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event", content = "data")]
pub enum DownloadEvent {
    Progress {
        downloaded: u64,
        total: u64,
        percent: f64,
    },
    Extracting,
    Complete,
    Error {
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "event", content = "data")]
pub enum CompressionEvent {
    Progress {
        job_id: String,
        percent: f64,
        fps: f64,
        speed: String,
        current_size: u64,
        eta: f64,
        frame: u64,
        total_frames: u64,
    },
    Complete {
        job_id: String,
        original_size: u64,
        output_size: u64,
        output_path: String,
        duration_secs: f64,
    },
    Error {
        job_id: String,
        message: String,
    },
}
