import { useCallback, useRef } from 'react';
import { invoke, Channel, convertFileSrc } from '@tauri-apps/api/core';
import { useStore } from '../store';
import { type CompressionResult, type ProgressData, type VideoInfo } from '../types';

interface CompressionEventPayload {
  event:
    | 'Progress'
    | 'Complete'
    | 'Error';
  data: {
    job_id?: string;
    percent?: number;
    fps?: number;
    speed?: string;
    current_size?: number;
    eta?: number;
    frame?: number;
    total_frames?: number;
    original_size?: number;
    output_size?: number;
    output_path?: string;
    duration_secs?: number;
    message?: string;
  };
}

export function useCompression() {
  const { state, dispatch } = useStore();
  const processingRef = useRef(false);

  const analyzeFile = useCallback(
    async (id: string, path: string, srcUrl: string | null) => {
      dispatch({ type: 'SET_FILE_STATUS', id, status: 'analyzing' });
      try {
        const info = await invoke<VideoInfo>('get_video_info', { path });
        dispatch({ type: 'SET_FILE_INFO', id, info, thumbnailUrl: srcUrl });
      } catch (e) {
        dispatch({ type: 'SET_FILE_STATUS', id, status: 'error', error: String(e) });
      }
    },
    [dispatch],
  );

  const addFiles = useCallback(
    async (paths: string[], srcUrls?: Map<string, string>) => {
      const items = paths.map((path) => ({
        id: crypto.randomUUID(),
        path,
        name: path.split('\\').pop() ?? path.split('/').pop() ?? path,
        thumbnailUrl: convertFileSrc(path),
        info: null,
        status: 'analyzing' as const,
        progress: null,
        error: null,
        result: null,
      }));
      dispatch({ type: 'ADD_FILES', payload: items });
      for (const item of items) {
        const srcUrl = srcUrls?.get(item.path) ?? null;
        analyzeFile(item.id, item.path, srcUrl);
      }
    },
    [dispatch, analyzeFile],
  );

  const removeFile = useCallback(
    (id: string) => dispatch({ type: 'REMOVE_FILE', id }),
    [dispatch],
  );

  const clearCompleted = useCallback(
    () => dispatch({ type: 'CLEAR_COMPLETED' }),
    [dispatch],
  );

  const compressFile = useCallback(
    async (fileId: string) => {
      const file = state.files.find((f) => f.id === fileId);
      if (!file || file.status === 'compressing') return;

      const { settings } = state;
      const jobId = crypto.randomUUID();

      // VP9 and AV1 must go into a WebM or MKV container — never MP4.
      // Auto-correct the output format when the chosen codec is incompatible.
      const codec = settings.video_codec;
      let outputFormat = settings.output_format;
      if ((codec === 'libvpx-vp9' || codec === 'libsvtav1' || codec === 'libaom-av1') &&
          (outputFormat === 'mp4' || outputFormat === 'm4v' || outputFormat === 'mov')) {
        outputFormat = 'webm';
        console.log(`[Compify] Auto-corrected output format to webm for codec ${codec}`);
      }

      const outputPath = await invoke<string>('get_output_path', {
        inputPath: file.path,
        suffix: '_compressed',
        format: outputFormat,
      });

      dispatch({ type: 'SET_FILE_STATUS', id: fileId, status: 'compressing' });
      dispatch({ type: 'SET_PROCESSING', active: true, jobId });

      const channel = new Channel<CompressionEventPayload>();
      channel.onmessage = (msg) => {
        if (msg.event === 'Progress') {
          const d = msg.data;
          const progress: ProgressData = {
            percent: d.percent ?? 0,
            fps: d.fps ?? 0,
            speed: d.speed ?? '0x',
            current_size: d.current_size ?? 0,
            eta: d.eta ?? 0,
            frame: d.frame ?? 0,
            total_frames: d.total_frames ?? 0,
          };
          dispatch({ type: 'SET_FILE_PROGRESS', id: fileId, progress });
        } else if (msg.event === 'Complete') {
          const d = msg.data;
          const result: CompressionResult = {
            original_size: d.original_size ?? 0,
            output_size: d.output_size ?? 0,
            output_path: d.output_path ?? outputPath,
            duration_secs: d.duration_secs ?? 0,
          };
          dispatch({ type: 'SET_FILE_RESULT', id: fileId, result });
          dispatch({ type: 'SET_PROCESSING', active: false, jobId: null });
        } else if (msg.event === 'Error') {
          const msg_ = msg.data.message ?? 'Unknown error';
          if (msg_ !== 'cancelled') {
            dispatch({
              type: 'SET_FILE_STATUS',
              id: fileId,
              status: 'error',
              error: msg_,
            });
          }
          dispatch({ type: 'SET_PROCESSING', active: false, jobId: null });
        }
      };

      const rustSettings = {
        video_codec: settings.video_codec,
        audio_codec: settings.audio_codec,
        crf: settings.crf,
        preset_speed: settings.preset_speed,
        resolution: settings.resolution,
        fps: settings.fps,
        audio_bitrate: settings.audio_bitrate,
        output_format: outputFormat,  // use corrected format
      };

      try {
        await invoke('start_compression', {
          jobId,
          inputPath: file.path,
          outputPath,
          settings: rustSettings,
          onEvent: channel,
        });
      } catch (e) {
        const err = String(e);
        if (err !== 'cancelled') {
          dispatch({ type: 'SET_FILE_STATUS', id: fileId, status: 'error', error: err });
        }
        dispatch({ type: 'SET_PROCESSING', active: false, jobId: null });
      }
    },
    [state, dispatch],
  );

  const compressAll = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    const pending = state.files.filter((f) => f.status === 'pending');
    for (const file of pending) {
      await compressFile(file.id);
    }
    processingRef.current = false;
  }, [state.files, compressFile]);

  const pauseJob = useCallback(async () => {
    if (!state.activeJobId) return;
    const file = state.files.find((f) => f.status === 'compressing');
    if (file) dispatch({ type: 'SET_FILE_STATUS', id: file.id, status: 'paused' });
    try {
      await invoke('pause_job', { jobId: state.activeJobId });
    } catch {}
  }, [state.activeJobId, state.files, dispatch]);

  const resumeJob = useCallback(async () => {
    if (!state.activeJobId) return;
    const file = state.files.find((f) => f.status === 'paused');
    if (file) dispatch({ type: 'SET_FILE_STATUS', id: file.id, status: 'compressing' });
    try {
      await invoke('resume_job', { jobId: state.activeJobId });
    } catch {}
  }, [state.activeJobId, state.files, dispatch]);

  const cancelJob = useCallback(async () => {
    if (!state.activeJobId) return;
    const file = state.files.find(
      (f) => f.status === 'compressing' || f.status === 'paused',
    );
    if (file) dispatch({ type: 'SET_FILE_STATUS', id: file.id, status: 'cancelled' });
    try {
      await invoke('cancel_job', { jobId: state.activeJobId });
    } catch {}
    dispatch({ type: 'SET_PROCESSING', active: false, jobId: null });
  }, [state.activeJobId, state.files, dispatch]);

  const openFile = useCallback(async (path: string) => {
    await invoke('open_file', { path });
  }, []);

  const openFolder = useCallback(async (path: string) => {
    await invoke('open_folder', { path });
  }, []);

  return {
    addFiles,
    removeFile,
    clearCompleted,
    compressFile,
    compressAll,
    pauseJob,
    resumeJob,
    cancelJob,
    openFile,
    openFolder,
  };
}
