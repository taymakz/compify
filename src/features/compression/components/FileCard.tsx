import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { formatBytes, formatDuration, formatEta, type FileItem } from '../types';
import { useCompression } from '../hooks/use-compression';

const STATUS_BADGE: Record<
  FileItem['status'],
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' }
> = {
  pending:     { label: 'Ready',       variant: 'secondary'   },
  analyzing:   { label: 'Analyzing…',  variant: 'outline'     },
  compressing: { label: 'Compressing', variant: 'default'     },
  paused:      { label: 'Paused',      variant: 'outline'     },
  completed:   { label: 'Done',        variant: 'success'   },
  error:       { label: 'Error',       variant: 'destructive' },
  cancelled:   { label: 'Cancelled',   variant: 'outline'     },
};

interface Props {
  file: FileItem;
  isActive: boolean;
  onCompress: () => void;
  onPlay: () => void;
}

export function FileCard({ file, isActive, onCompress, onPlay }: Props) {
  const { removeFile, pauseJob, resumeJob, cancelJob, openFile, openFolder } = useCompression();
  const badge = STATUS_BADGE[file.status];
  const pct = file.progress?.percent ?? 0;
  const isBusy = file.status === 'compressing' || file.status === 'paused';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, scale: 0.97 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card transition-all',
        isActive && 'border-primary/40 ring-1 ring-primary/20',
      )}
    >
      <div className="flex gap-3 p-3 relative">
        <Thumbnail file={file} onPlay={onPlay} />

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start gap-6">
            <p className="truncate text-sm font-medium leading-tight">{file.name}</p>
            <Badge variant={badge.variant} className="shrink-0 text-[10px]">
              {badge.label} 
            </Badge>
          </div>

          {file.info && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              <Stat label="Size"     value={formatBytes(file.info.file_size)} />
              <Stat label="Res"      value={`${file.info.width}×${file.info.height}`} />
              <Stat label="Duration" value={formatDuration(file.info.duration)} />
              <Stat label="Codec"    value={file.info.codec.toUpperCase()} />
              <Stat label="FPS"      value={file.info.fps.toFixed(0)} />
            </div>
          )}

          {isBusy && (
            <div className="mt-1 space-y-1">
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{Math.round(pct)}%</span>
                <span>{file.progress?.speed} · ETA {formatEta(file.progress?.eta ?? 0)}</span>
                {file.progress && <span>{formatBytes(file.progress.current_size)}</span>}
              </div>
            </div>
          )}

          {file.status === 'completed' && file.result && (
            <ResultRow file={file} openFile={openFile} openFolder={openFolder} /> 
          )}

          {file.status === 'error' && file.error && (
            <p className="mt-1 truncate text-[11px] text-destructive">{file.error}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-3 right-3 flex  gap-1">
          {file.status === 'pending' && (
            <Button size="icon-sm" variant="outline" onClick={onCompress} title="Compress">
              <span className="icon-[material-symbols--play-arrow] size-3.5" />
            </Button>
          )}
          {file.status === 'compressing' && (
            <Button size="icon-sm" variant="outline" onClick={pauseJob} title="Pause">
              <span className="icon-[material-symbols--pause] size-3.5" />
            </Button>
          )}
          {file.status === 'paused' && (
            <Button size="icon-sm" variant="outline" onClick={resumeJob} title="Resume">
              <span className="icon-[material-symbols--play-arrow] size-3.5" />
            </Button>
          )}
          {isBusy && (
            <Button size="icon-sm" variant="outline" onClick={cancelJob} title="Cancel" className="text-destructive">
              <span className="icon-[material-symbols--close] size-3.5" />
            </Button>
          )}
          {!isBusy && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => removeFile(file.id)}
              title="Remove"
              className="opacity-0 transition-opacity group-hover:opacity-100"
            >
              <span className="icon-[material-symbols--delete] size-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function Thumbnail({ file, onPlay }: { file: FileItem; onPlay: () => void }) {
  const [thumbDataUrl, setThumbDataUrl] = useState<string | null>(null);
  const tried = useRef(false);

  useEffect(() => {
    if (tried.current || !file.thumbnailUrl) return;
    tried.current = true;

    const video = document.createElement('video');
    video.src = file.thumbnailUrl;
    video.muted = true;
    video.preload = 'metadata';

    const cleanup = () => video.remove();

    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(1, video.duration * 0.15 || 1);
    });

    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbDataUrl(canvas.toDataURL('image/jpeg', 0.65));
      } catch {
        // tainted canvas (CORS) — fall through to placeholder
      } finally {
        cleanup();
      }
    });

    video.addEventListener('error', cleanup);
  }, [file.thumbnailUrl]);

  const hasVideo = !!file.thumbnailUrl;

  return (
    <div
      className={cn(
        'group/thumb relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-muted',
        hasVideo && 'cursor-pointer',
      )}
      onClick={hasVideo ? onPlay : undefined}
    >
      {thumbDataUrl ? (
        <img src={thumbDataUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <span className="icon-[material-symbols--movie] size-5 text-muted-foreground/40" />
        </div>
      )}

      {/* Hover play overlay */}
      {hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover/thumb:bg-black/40">
          <span className="icon-[material-symbols--play-circle] size-7 text-white opacity-0 transition-opacity group-hover/thumb:opacity-100" />
        </div>
      )}

      {/* Duration badge */}
      {file.info && (
        <div className="absolute bottom-0.5 right-0.5 rounded bg-black/65 px-1 py-px text-[9px] leading-tight text-white">
          {formatDuration(file.info.duration)}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[11px] text-muted-foreground">
      <span className="text-foreground/40">{label} </span>{value}
    </span>
  );
}

function ResultRow({
  file, openFile, openFolder,
}: {
  file: FileItem;
  openFile: (p: string) => void;
  openFolder: (p: string) => void;
}) {
  const r = file.result!;
  const saved = r.original_size - r.output_size;
  const pct = r.original_size > 0 ? (saved / r.original_size) * 100 : 0;

  return (
    <div className="mt-1 flex items-center gap-2 text-[11px]">
      <span className="font-medium text-green-500">
        -{pct.toFixed(1)}% · {formatBytes(saved)} saved
      </span>
      <span className="text-muted-foreground">
        {formatBytes(r.original_size)} → {formatBytes(r.output_size)}
      </span>
      <div className="ml-auto flex gap-1">
        <Button size="icon-xs" variant="ghost" onClick={() => openFile(r.output_path)} title="Open file">
          <span className="icon-[material-symbols--open-in-new] size-3" />
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={() => openFolder(r.output_path)} title="Show in folder">
          <span className="icon-[material-symbols--folder-open] size-3" />
        </Button>
      </div>
    </div>
  );
}
