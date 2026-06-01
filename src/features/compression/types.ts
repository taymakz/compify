export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatEta(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export type PresetId = 'maximum' | 'quality' | 'gaming' | 'education' | 'high' | 'balanced' | 'fast' | 'custom';

export type VideoFormat = 'mp4' | 'mkv' | 'mov' | 'avi' | 'webm' | 'm4v';

export const FORMAT_LABELS: Record<VideoFormat, string> = {
  mp4: 'MP4',
  mkv: 'MKV',
  mov: 'MOV',
  avi: 'AVI',
  webm: 'WebM',
  m4v: 'M4V',
};

export const CODEC_LABELS: Record<string, string> = {
  'libx264':    'H.264 (x264)',
  'libx265':    'H.265 / HEVC',
  'libvpx-vp9': 'VP9',
  'libsvtav1':  'AV1 (SVT)',
  'libaom-av1': 'AV1 (aom)',
  'h264_nvenc': 'H.264 NVENC',
  'hevc_nvenc': 'HEVC NVENC',
  'h264_amf':   'H.264 AMF',
  'hevc_amf':   'HEVC AMF',
  'h264_qsv':   'H.264 QSV',
  'hevc_qsv':   'HEVC QSV',
  'copy':       'Copy (no re-encode)',
};

export const AUDIO_CODEC_LABELS: Record<string, string> = {
  'aac':    'AAC',
  'mp3':    'MP3',
  'opus':   'Opus',
  'vorbis': 'Vorbis',
  'flac':   'FLAC',
  'copy':   'Copy (no re-encode)',
};

export interface CompressionSettings {
  preset: PresetId;
  video_codec: string;
  audio_codec: string;
  crf: number;
  preset_speed: string;
  resolution: string | null;
  fps: number | null;
  audio_bitrate: number;
  output_format: string;
}

export const DEFAULT_SETTINGS: CompressionSettings = {
  preset: 'maximum',
  video_codec: 'libx264',
  audio_codec: 'aac',
  crf: 23,
  preset_speed: 'medium',
  resolution: null,
  fps: null,
  audio_bitrate: 128,
  output_format: 'mp4',
};

export const PRESET_CONFIGS: Record<PresetId, Partial<CompressionSettings>> = {
  maximum:   { video_codec: 'libx264', crf: 32, preset_speed: 'veryfast', audio_bitrate: 96  },
  quality:   { video_codec: 'libx264', crf: 18, preset_speed: 'slow',     audio_bitrate: 192 },
  gaming:    { video_codec: 'libx264', crf: 20, preset_speed: 'medium',   audio_bitrate: 160, fps: 60 },
  education: { video_codec: 'libx264', crf: 22, preset_speed: 'medium',   audio_bitrate: 128, fps: 60 },
  high:      { video_codec: 'libx264', crf: 18, preset_speed: 'slow',     audio_bitrate: 192 },
  balanced:  { video_codec: 'libx264', crf: 23, preset_speed: 'medium',   audio_bitrate: 128 },
  fast:      { video_codec: 'libx264', crf: 28, preset_speed: 'veryfast', audio_bitrate: 96  },
  custom:    {},
};

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

export interface ProgressData {
  percent: number;
  fps: number;
  speed: string;
  current_size: number;
  eta: number;
  frame: number;
  total_frames: number;
}

export interface CompressionResult {
  original_size: number;
  output_size: number;
  output_path: string;
  duration_secs: number;
}

export interface FileItem {
  id: string;
  path: string;
  name: string;
  status: 'analyzing' | 'pending' | 'compressing' | 'completed' | 'error' | 'cancelled' | 'paused';
  info: VideoInfo | null;
  progress: ProgressData | null;
  result: CompressionResult | null;
  error: string | null;
  thumbnailUrl: string | null;
}

export interface FFmpegStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
  preferred_codec?: string | null;
}

export interface SavedPreset {
  id: string;
  name: string;
  settings: Omit<CompressionSettings, 'preset'>;
  createdAt: number;
}

export interface AppSettings {
  notifications_enabled: boolean;
  check_updates_on_startup: boolean;
  install_directory: string | null;
}

export interface UpdateInfo {
  available: boolean;
  current_version: string;
  latest_version: string | null;
  download_url: string | null;
  release_notes: string | null;
}

export interface ExistingInstallation {
  path: string;
  version: string | null;
  is_running: boolean;
}

export type CompressionEventData =
  | {
      event: 'Progress';
      data: {
        job_id: string;
        percent: number;
        fps: number;
        speed: string;
        current_size: number;
        eta: number;
        frame: number;
        total_frames: number;
      };
    }
  | {
      event: 'Complete';
      data: {
        job_id: string;
        original_size: number;
        output_size: number;
        output_path: string;
        duration_secs: number;
      };
    }
  | {
      event: 'Error';
      data: {
        job_id: string;
        message: string;
      };
    };

export type DownloadEventData =
  | {
      event: 'Progress';
      data: {
        downloaded: number;
        total: number;
        percent: number;
      };
    }
  | { event: 'Extracting' }
  | { event: 'Complete' }
  | { event: 'Error'; data: { message: string } };
