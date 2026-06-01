export const APP_NAME = 'Compify'
export const APP_TAGLINE = 'Compress smarter, not harder.'
export const APP_DESCRIPTION =
  'Free, open-source video compressor for Windows, macOS, and Linux. Smart presets, GPU acceleration, batch processing — zero uploads, runs entirely on your machine.'
export const GITHUB_REPO = 'https://github.com/taymakz/compify'
export const GITHUB_API = 'https://api.github.com/repos/taymakz/compify'
export const GITHUB_RELEASES_API = 'https://api.github.com/repos/taymakz/compify/releases/latest'
export const CURRENT_VERSION = '0.1.0'

const BASE = `https://github.com/taymakz/compify/releases/download/v${CURRENT_VERSION}`

export const DOWNLOADS = {
  windows: {
    primary: {
      url: `${BASE}/Compify-${CURRENT_VERSION}-Setup-windows-x64.exe`,
      label: 'Installer (.exe)',
      size: '15.5 MB',
    },
    portable: {
      url: `${BASE}/Compify-${CURRENT_VERSION}-portable-windows-x64.exe`,
      label: 'Portable (.exe)',
      size: '15.5 MB',
    },
  },
  mac: {
    primary: {
      url: `${BASE}/Compify-${CURRENT_VERSION}-macos-universal.dmg`,
      label: 'Universal DMG',
      size: '13.8 MB',
    },
    portable: {
      url: `${BASE}/Compify-${CURRENT_VERSION}-portable-macos-universal.zip`,
      label: 'Portable (.zip)',
      size: '12.9 MB',
    },
  },
  linux: {
    primary: {
      url: `${BASE}/Compify-${CURRENT_VERSION}-linux-x86_64.AppImage`,
      label: 'AppImage',
      size: '80.9 MB',
    },
    deb: {
      url: `${BASE}/Compify-${CURRENT_VERSION}-linux-amd64.deb`,
      label: 'Debian (.deb)',
      size: '7.33 MB',
    },
    portable: {
      url: `${BASE}/Compify-${CURRENT_VERSION}-portable-linux-x86_64`,
      label: 'Portable (binary)',
      size: '20.4 MB',
    },
  },
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: '0.1.0',
    date: '2025-06-01',
    tag: 'Initial Release',
    sections: [
      {
        title: 'Core Compression',
        items: [
          'Six built-in presets: Maximum, Balanced, High Quality, Gaming, Education, and Custom — each tuned for its specific use case',
          'Support for 10+ video codecs: H.264 (libx264), H.265/HEVC (libx265), VP9, AV1 (libaom-av1 & libsvtav1), NVIDIA NVENC (H.264/H.265), AMD AMF, Intel QuickSync, and passthrough copy',
          'Six audio codecs: AAC, MP3, Opus, Vorbis, FLAC, and passthrough copy',
          'Output containers: MP4, MKV, MOV, AVI, WebM, M4V',
        ],
      },
      {
        title: 'Compression Controls',
        items: [
          'CRF slider (0–51) for frame-accurate quality control — lower = better quality',
          'Encoding speed selector from ultrafast to veryslow, tuning encode time vs. compression ratio',
          'Resolution presets: 4K (3840×2160), 1440p, 1080p, 720p, 480p, or pass through original',
          'FPS control: lock to 24, 30, or 60 fps, or keep the source frame rate',
          'Audio bitrate from 64 kbps to 320 kbps',
          'Save and restore unlimited named custom presets',
        ],
      },
      {
        title: 'Workflow & UX',
        items: [
          'Drag-and-drop file queue — add as many files as you need and compress them all at once',
          'Real-time progress: live FPS, encoding speed (×), estimated time remaining, and current output size',
          'Pause, resume, and cancel individual compression jobs without affecting the rest of the queue',
          'Video thumbnail preview and full metadata display (resolution, codec, FPS, duration, bitrate) before compressing',
          'Automatic output filename generation — originals are never overwritten',
          'Desktop notifications on job completion',
          'Auto-updater: checks for new releases on launch and installs them in one click',
        ],
      },
      {
        title: 'Platform & Technical',
        items: [
          'Cross-platform: Windows x64, macOS Universal (Apple Silicon + Intel), Linux x86_64',
          'Built with Tauri v2 and Rust for native performance and a tiny memory footprint',
          'Automatic FFmpeg detection — works with system FFmpeg or installs its own bundled copy',
          'Zero upload — all video processing happens locally, no data leaves your machine',
          'Open source under the MIT license',
        ],
      },
    ],
  },
]

export type ChangelogRelease = {
  version: string
  date: string
  tag: string
  sections: { title: string; items: string[] }[]
}
