import { useCallback, useEffect } from 'react';
import { invoke, Channel } from '@tauri-apps/api/core';
import { useStore } from '../store';

interface DownloadEventPayload {
  event: 'Progress' | 'Extracting' | 'Complete' | 'Error';
  data: { downloaded?: number; total?: number; percent?: number; message?: string };
}

export function useFFmpegSetup() {
  const { state, dispatch } = useStore();

  const check = useCallback(async () => {
    try {
      const status = await invoke<{ installed: boolean; version: string | null; path: string | null; preferred_codec?: string | null }>(
        'check_ffmpeg',
      );
      dispatch({ type: 'SET_FFMPEG', payload: status });
      if (status.installed && status.preferred_codec) {
        dispatch({ type: 'SET_SETTINGS', payload: { video_codec: status.preferred_codec } });
      }
    } catch (e) {
      dispatch({
        type: 'SET_FFMPEG',
        payload: { installed: false, version: null, path: null },
      });
    }
  }, [dispatch]);

  const install = useCallback(async () => {
    dispatch({ type: 'SET_INSTALLING', payload: true });
    dispatch({
      type: 'SET_INSTALL_PROGRESS',
      progress: 0,
      phase: 'Preparing download…',
    });

    const channel = new Channel<DownloadEventPayload>();
    channel.onmessage = (msg) => {
      if (msg.event === 'Progress') {
        const { percent = 0 } = msg.data;
        dispatch({
          type: 'SET_INSTALL_PROGRESS',
          progress: percent * 0.9,
          phase: `Downloading FFmpeg… ${Math.round(percent)}%`,
        });
      } else if (msg.event === 'Extracting') {
        dispatch({
          type: 'SET_INSTALL_PROGRESS',
          progress: 92,
          phase: 'Extracting binaries…',
        });
      } else if (msg.event === 'Complete') {
        dispatch({
          type: 'SET_INSTALL_PROGRESS',
          progress: 100,
          phase: 'Done!',
        });
      }
    };

    try {
      await invoke('download_ffmpeg', { onEvent: channel });
      await check();
    } catch (e) {
      console.error('FFmpeg install failed:', e);
    } finally {
      dispatch({ type: 'SET_INSTALLING', payload: false });
    }
  }, [dispatch, check]);

  useEffect(() => {
    check();
  }, [check]);

  return {
    ffmpegStatus: state.ffmpegStatus,
    isInstalling: state.isInstalling,
    installProgress: state.installProgress,
    installPhase: state.installPhase,
    install,
    recheck: check,
  };
}
