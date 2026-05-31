import {
  createContext,
  useCallback,
  useContext,
  useReducer,
  type ReactNode,
} from 'react';
import {
  DEFAULT_SETTINGS,
  PRESET_CONFIGS,
  type CompressionResult,
  type CompressionSettings,
  type FFmpegStatus,
  type FileItem,
  type PresetId,
  type ProgressData,
  type SavedPreset,
  type VideoInfo,
} from './types';

const PRESETS_STORAGE_KEY = 'compify_presets';

function loadSavedPresets(): SavedPreset[] {
  try {
    return JSON.parse(localStorage.getItem(PRESETS_STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function persistSavedPresets(presets: SavedPreset[]) {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {}
}

// ── State ─────────────────────────────────────────────────────────────────────

interface State {
  ffmpegStatus: FFmpegStatus | null;
  isInstalling: boolean;
  installProgress: number;
  installPhase: string;
  files: FileItem[];
  settings: CompressionSettings;
  savedPresets: SavedPreset[];
  isProcessingQueue: boolean;
  activeJobId: string | null;
}

const initial: State = {
  ffmpegStatus: null,
  isInstalling: false,
  installProgress: 0,
  installPhase: '',
  files: [],
  settings: DEFAULT_SETTINGS,
  savedPresets: loadSavedPresets(),
  isProcessingQueue: false,
  activeJobId: null,
};

// ── Actions ───────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_FFMPEG'; payload: FFmpegStatus }
  | { type: 'SET_INSTALLING'; payload: boolean }
  | { type: 'SET_INSTALL_PROGRESS'; progress: number; phase: string }
  | { type: 'ADD_FILES'; payload: FileItem[] }
  | { type: 'REMOVE_FILE'; id: string }
  | { type: 'CLEAR_COMPLETED' }
  | { type: 'SET_FILE_INFO'; id: string; info: VideoInfo; thumbnailUrl: string | null }
  | { type: 'SET_FILE_STATUS'; id: string; status: FileItem['status']; error?: string }
  | { type: 'SET_FILE_PROGRESS'; id: string; progress: ProgressData }
  | { type: 'SET_FILE_RESULT'; id: string; result: CompressionResult }
  | { type: 'SET_SETTINGS'; payload: Partial<CompressionSettings> }
  | { type: 'SET_PRESET'; preset: PresetId }
  | { type: 'SET_PROCESSING'; active: boolean; jobId?: string | null }
  | { type: 'SAVE_PRESET'; preset: SavedPreset }
  | { type: 'DELETE_SAVED_PRESET'; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FFMPEG':
      return { ...state, ffmpegStatus: action.payload };
    case 'SET_INSTALLING':
      return { ...state, isInstalling: action.payload };
    case 'SET_INSTALL_PROGRESS':
      return { ...state, installProgress: action.progress, installPhase: action.phase };
    case 'ADD_FILES':
      return {
        ...state,
        files: [
          ...state.files,
          ...action.payload.filter(
            (f) => !state.files.some((e) => e.path === f.path),
          ),
        ],
      };
    case 'REMOVE_FILE':
      return { ...state, files: state.files.filter((f) => f.id !== action.id) };
    case 'CLEAR_COMPLETED':
      return {
        ...state,
        files: state.files.filter(
          (f) => f.status !== 'completed' && f.status !== 'error' && f.status !== 'cancelled',
        ),
      };
    case 'SET_FILE_INFO':
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id
            ? {
                ...f,
                info: action.info,
                thumbnailUrl: action.thumbnailUrl ?? f.thumbnailUrl,
                status: 'pending',
              }
            : f,
        ),
      };
    case 'SET_FILE_STATUS':
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id
            ? { ...f, status: action.status, error: action.error ?? f.error }
            : f,
        ),
      };
    case 'SET_FILE_PROGRESS':
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id ? { ...f, progress: action.progress, status: 'compressing' } : f,
        ),
      };
    case 'SET_FILE_RESULT':
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id
            ? { ...f, result: action.result, status: 'completed', progress: null }
            : f,
        ),
      };
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_PRESET': {
      const presetConfig = PRESET_CONFIGS[action.preset];
      return {
        ...state,
        settings: { ...state.settings, preset: action.preset, ...presetConfig },
      };
    }
    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessingQueue: action.active,
        activeJobId: action.jobId !== undefined ? action.jobId : state.activeJobId,
      };
    case 'SAVE_PRESET': {
      const updated = [
        ...state.savedPresets.filter((p) => p.id !== action.preset.id),
        action.preset,
      ];
      persistSavedPresets(updated);
      return { ...state, savedPresets: updated };
    }
    case 'DELETE_SAVED_PRESET': {
      const updated = state.savedPresets.filter((p) => p.id !== action.id);
      persistSavedPresets(updated);
      return { ...state, savedPresets: updated };
    }
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface ContextValue {
  state: State;
  dispatch: React.Dispatch<Action>;
}

const Ctx = createContext<ContextValue | null>(null);

export function CompressionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStore must be used inside CompressionProvider');
  return ctx;
}

export function useSettings() {
  const { state, dispatch } = useStore();

  const setSettings = useCallback(
    (patch: Partial<CompressionSettings>) => dispatch({ type: 'SET_SETTINGS', payload: patch }),
    [dispatch],
  );

  const setPreset = useCallback(
    (preset: PresetId) => dispatch({ type: 'SET_PRESET', preset }),
    [dispatch],
  );

  const savePreset = useCallback(
    (name: string) => {
      const { preset: _preset, ...settings } = state.settings;
      dispatch({
        type: 'SAVE_PRESET',
        preset: { id: crypto.randomUUID(), name: name.trim(), settings, createdAt: Date.now() },
      });
    },
    [state.settings, dispatch],
  );

  const deletePreset = useCallback(
    (id: string) => dispatch({ type: 'DELETE_SAVED_PRESET', id }),
    [dispatch],
  );

  const applyPreset = useCallback(
    (saved: SavedPreset) =>
      dispatch({ type: 'SET_SETTINGS', payload: { ...saved.settings, preset: 'custom' } }),
    [dispatch],
  );

  return {
    settings: state.settings,
    savedPresets: state.savedPresets,
    setSettings,
    setPreset,
    savePreset,
    deletePreset,
    applyPreset,
  };
}
