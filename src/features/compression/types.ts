export type PresetId = 'maximum' | 'balanced' | 'quality' | 'gaming' | 'education' | 'custom';

export interface SavedPreset {
  id: string;
  name: string;
  settings: Omit<CompressionSettings, 'preset'>;
  createdAt: number;
}
export type VideoFormat = 'mp4' | 'mkv' | 'mov' | 'avi' | 'webm' | 'm4v';
export type JobStatus =
  | 'pending'
  | 'analyzing'
  | 'compressing'
  | 'paused'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  codec: string;
  fps: number;
  file_size: number;
  bitrate: number;
  has_audio: boolean;
  format_name: string;
}

export interface CompressionSettings {
  preset: PresetId;
  video_codec: string;
  audio_codec: string;
  crf: number;
  preset_speed: string;
  resolution: string | null;
  fps: number | null;
  audio_bitrate: number;
  output_format: VideoFormat;
}

export interface CompressionResult {
  original_size: number;
  output_size: number;
  output_path: string;
  duration_secs: number;
}

export interface ProgressData {
  percent: number;
  fps: number;
  speed: string;
  current_size: number;
  eta: number;
  frame: number;
  total_frames: number;
}

export interface FileItem {
  id: string;
  path: string;
  name: string;
  thumbnailUrl: string | null;
  info: VideoInfo | null;
  status: JobStatus;
  progress: ProgressData | null;
  error: string | null;
  result: CompressionResult | null;
}

export interface FFmpegStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
  /** Best available video encoder detected in this FFmpeg build. */
  preferred_codec?: string | null;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
}

// ── Preset configurations ────────────────────────────────────────────────────

export const PRESET_CONFIGS: Record<PresetId, Omit<CompressionSettings, 'preset'>> = {
  maximum: {
    video_codec: 'libx264',
    audio_codec: 'aac',
    crf: 28,
    preset_speed: 'medium',
    resolution: null,
    fps: null,
    audio_bitrate: 128,
    output_format: 'mp4',
  },
  balanced: {
    video_codec: 'libx264',
    audio_codec: 'aac',
    crf: 23,
    preset_speed: 'medium',
    resolution: null,
    fps: null,
    audio_bitrate: 160,
    output_format: 'mp4',
  },
  quality: {
    video_codec: 'libx264',
    audio_codec: 'aac',
    crf: 18,
    preset_speed: 'slow',
    resolution: null,
    fps: null,
    audio_bitrate: 192,
    output_format: 'mp4',
  },
  gaming: {
    video_codec: 'libx264',
    audio_codec: 'aac',
    crf: 20,
    preset_speed: 'fast',
    resolution: null,
    fps: 60,
    audio_bitrate: 192,
    output_format: 'mp4',
  },
  education: {
    video_codec: 'libx264',
    audio_codec: 'aac',
    crf: 18,
    preset_speed: 'slow',
    resolution: null,
    fps: 60,
    audio_bitrate: 192,
    output_format: 'mp4',
  },
  custom: {
    video_codec: 'libx264',
    audio_codec: 'aac',
    crf: 23,
    preset_speed: 'medium',
    resolution: null,
    fps: null,
    audio_bitrate: 128,
    output_format: 'mp4',
  },
};

export const DEFAULT_SETTINGS: CompressionSettings = {
  preset: 'maximum',
  ...PRESET_CONFIGS.maximum,
};

export const FORMAT_LABELS: Record<VideoFormat, string> = {
  mp4: 'MP4',
  mkv: 'MKV',
  mov: 'MOV',
  avi: 'AVI',
  webm: 'WebM',
  m4v: 'M4V',
};

export const CODEC_LABELS: Record<string, string> = {
  libx264: 'H.264 (AVC)',
  libx265: 'H.265 (HEVC)',
  'libvpx-vp9': 'VP9',
  copy: 'Copy (no re-encode)',
};

export const AUDIO_CODEC_LABELS: Record<string, string> = {
  aac: 'AAC',
  libmp3lame: 'MP3',
  libopus: 'Opus',
  copy: 'Copy (no re-encode)',
};

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatEta(secs: number): string {
  if (secs <= 0) return '—';
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}m ${s}s`;
}
