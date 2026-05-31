import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { useStore } from '../store';
import { useCompression } from '../hooks/use-compression';
import { FileCard } from './FileCard';
import { VideoPlayer } from './VideoPlayer';
import type { FileItem } from '../types';

interface PlayingFile {
  src: string;
  name: string;
}

export function CompressionQueue() {
  const { state } = useStore();
  const { compressAll, compressFile, clearCompleted, cancelJob, pauseJob, resumeJob } =
    useCompression();

  const [playing, setPlaying] = useState<PlayingFile | null>(null);

  const { files, isProcessingQueue, activeJobId } = state;
  const pendingCount = files.filter((f) => f.status === 'pending').length;
  const completedCount = files.filter(
    (f) => f.status === 'completed' || f.status === 'error' || f.status === 'cancelled',
  ).length;
  const activeFile = files.find((f) => f.status === 'compressing' || f.status === 'paused');

  if (files.length === 0) return null;

  const handlePlay = (file: FileItem) => {
    // For completed files, play the compressed output so the user can inspect it
    if (file.status === 'completed' && file.result?.output_path) {
      setPlaying({
        src: convertFileSrc(file.result.output_path),
        name: `${file.name} (compressed)`,
      });
      return;
    }
    if (!file.thumbnailUrl) return;
    setPlaying({ src: file.thumbnailUrl, name: file.name });
  };

  return (
    <>
      {/* ── Queue ── */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        {/* Header row */}
        <div className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Queue</span>
            <Badge variant="secondary" className="text-[10px]">
              {files.length} file{files.length !== 1 ? 's' : ''}
            </Badge>
            {pendingCount > 0 && (
              <Badge variant="outline" className="text-[10px]">{pendingCount} pending</Badge>
            )}
          </div>

          <div className="flex gap-1.5">
            {completedCount > 0 && (
              <Button size="xs" variant="ghost" onClick={clearCompleted}>Clear done</Button>
            )}
            {activeFile?.status === 'compressing' && (
              <Button size="xs" variant="outline" onClick={pauseJob}>
                <span className="icon-[material-symbols--pause] size-3 mr-1" />Pause
              </Button>
            )}
            {activeFile?.status === 'paused' && (
              <Button size="xs" variant="outline" onClick={resumeJob}>
                <span className="icon-[material-symbols--play-arrow] size-3 mr-1" />Resume
              </Button>
            )}
            {isProcessingQueue && (
              <Button size="xs" variant="destructive" onClick={cancelJob}>
                <span className="icon-[material-symbols--close] size-3 mr-1" />Cancel
              </Button>
            )}
            {pendingCount > 0 && !isProcessingQueue && (
              <Button size="xs" onClick={compressAll} className="gap-1">
                <span className="icon-[material-symbols--bolt] size-3" />
                Compress All
              </Button>
            )}
          </div>
        </div>

        {/* File list */}
        <div className="flex flex-col gap-2 overflow-y-auto pr-0.5">
          <AnimatePresence initial={false}>
            {files.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isActive={activeJobId !== null && file.status === 'compressing'}
                onCompress={() => compressFile(file.id)}
                onPlay={() => handlePlay(file)}
              />
            ))}
          </AnimatePresence>
        </div>

      </div>

      {/* ── Video player portal ── */}
      <AnimatePresence>
        {playing && (
          <VideoPlayer
            src={playing.src}
            name={playing.name}
            onClose={() => setPlaying(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
