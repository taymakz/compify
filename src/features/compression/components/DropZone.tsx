import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { cn } from '@/lib/utils';
import { useCompression } from '../hooks/use-compression';

const VIDEO_EXTS = new Set(['mp4', 'mkv', 'mov', 'avi', 'webm', 'm4v']);

export function DropZone() {
  const { addFiles } = useCompression();
  const [isDragging, setIsDragging] = useState(false);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let mounted = true;
    getCurrentWebview()
      .onDragDropEvent(async (event) => {
        if (!mounted) return;
        const type = event.payload.type;
        if (type === 'over') {
          setIsDragging(true);
        } else if (type === 'leave') {
          setIsDragging(false);
        } else if (type === 'drop') {
          setIsDragging(false);
          const paths = (event.payload as any).paths as string[];
          const filtered = paths.filter((p) =>
            VIDEO_EXTS.has(p.split('.').pop()?.toLowerCase() ?? ''),
          );
          if (filtered.length > 0) addFiles(filtered);
        }
      })
      .then((fn) => {
        if (mounted) unlistenRef.current = fn;
      });

    return () => {
      mounted = false;
      unlistenRef.current?.();
    };
  }, [addFiles]);

  const handlePickFiles = useCallback(async () => {
    try {
      const paths = await invoke<string[]>('pick_video_files');
      if (paths.length > 0) addFiles(paths);
    } catch (e) {
      console.error(e);
    }
  }, [addFiles]);

  return (
    <motion.div
      className={cn(
        'relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all duration-200',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40',
      )}
      onClick={handlePickFiles}
      whileTap={{ scale: 0.99 }}
    >
      <AnimatePresence mode="wait">
        {isDragging ? (
          <motion.div
            key="drop"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex size-14 items-center justify-center rounded-xl bg-primary/15">
              <span className="icon-[material-symbols--download] size-7 text-primary" />
            </div>
            <p className="text-base font-semibold text-primary">Drop to add</p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
              <span className="icon-[material-symbols--movie] size-7 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                Drop video files here or{' '}
                <span className="text-primary underline underline-offset-2">browse</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                MP4 · MKV · MOV · AVI · WebM · M4V
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
