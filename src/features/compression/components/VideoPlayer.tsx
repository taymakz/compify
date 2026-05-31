import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDuration } from '../types';

interface Props {
  src: string;
  name: string;
  onClose: () => void;
}

export function VideoPlayer({ src, name, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);
  const volBarRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [loading, setLoading] = useState(true);
  const [buffered, setBuffered] = useState(0);
  const [flashIcon, setFlashIcon] = useState<'play' | 'pause' | null>(null);
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  // ── Control visibility ────────────────────────────────────────────────────

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  }, []);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  // ── Play / Pause ──────────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setFlashIcon('play');
    } else {
      v.pause();
      setFlashIcon('pause');
    }
    setTimeout(() => setFlashIcon(null), 500);
  }, []);

  // ── Seek ──────────────────────────────────────────────────────────────────

  const seekTo = useCallback((clientX: number) => {
    const bar = seekBarRef.current;
    const v = videoRef.current;
    if (!bar || !v || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    v.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  }, [duration]);

  const handleSeekMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSeek(true);
    seekTo(e.clientX);
  };

  const handleSeekMouseMove = (e: React.MouseEvent) => {
    const bar = seekBarRef.current;
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pos * duration);
    setHoverX(e.clientX - rect.left);
    if (isDraggingSeek) seekTo(e.clientX);
  };

  const handleSeekMouseLeave = () => {
    setHoverTime(null);
    if (isDraggingSeek) setIsDraggingSeek(false);
  };

  useEffect(() => {
    const up = () => setIsDraggingSeek(false);
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  useEffect(() => {
    if (!isDraggingSeek) return;
    const move = (e: MouseEvent) => seekTo(e.clientX);
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [isDraggingSeek, seekTo]);

  // ── Volume ────────────────────────────────────────────────────────────────

  const handleVolumeClick = (e: React.MouseEvent) => {
    const bar = volBarRef.current;
    const v = videoRef.current;
    if (!bar || !v) return;
    const rect = bar.getBoundingClientRect();
    const val = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  // ── Keyboard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          v.currentTime = Math.max(0, v.currentTime - 5);
          revealControls();
          break;
        case 'ArrowRight':
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
          revealControls();
          break;
        case 'm':
          toggleMute();
          break;
        case 'f':
          document.fullscreenElement
            ? document.exitFullscreen()
            : containerRef.current?.requestFullscreen();
          break;
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [onClose, togglePlay, revealControls]);

  useEffect(() => () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); }, []);

  // ── Derived ───────────────────────────────────────────────────────────────

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const volDisplay = muted ? 0 : volume;

  const VolumeIcon =
    volDisplay === 0
      ? 'icon-[material-symbols--volume-off]'
      : volDisplay < 0.5
        ? 'icon-[material-symbols--volume-down]'
        : 'icon-[material-symbols--volume-up]';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close btn */}
      <button
        onClick={onClose}
        className="absolute right-5 top-5 z-10 flex size-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20"
      >
        <span className="icon-[material-symbols--close] size-5" />
      </button>

      {/* Player */}
      <motion.div
        ref={containerRef}
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative mx-6 w-full max-w-5xl select-none"
        onMouseMove={revealControls}
        onMouseLeave={() => { if (playing) scheduleHide(); }}
        style={{ cursor: showControls ? 'default' : 'none' }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">

          {/* ── Video ── */}
          <video
            ref={videoRef}
            src={src}
            className="aspect-video w-full"
            onClick={togglePlay}
            onPlay={() => { setPlaying(true); scheduleHide(); }}
            onPause={() => { setPlaying(false); setShowControls(true); if (hideTimer.current) window.clearTimeout(hideTimer.current); }}
            onTimeUpdate={() => {
              const v = videoRef.current;
              if (!v) return;
              setCurrentTime(v.currentTime);
              if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
            }}
            onLoadedMetadata={() => { const v = videoRef.current; if (v) setDuration(v.duration); setLoading(false); }}
            onWaiting={() => setLoading(true)}
            onCanPlay={() => setLoading(false)}
          />

          {/* Loading spinner */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50"
              >
                <div className="size-12 animate-spin rounded-full border-2 border-white/15 border-t-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Flash icon on play/pause */}
          <AnimatePresence>
            {flashIcon && (
              <motion.div
                key={flashIcon}
                initial={{ scale: 0.5, opacity: 1 }}
                animate={{ scale: 1.3, opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="flex size-20 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                  <span className={`size-10 text-white ${flashIcon === 'play' ? 'icon-[material-symbols--play-arrow]' : 'icon-[material-symbols--pause]'}`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Controls overlay ── */}
          <AnimatePresence>
            {showControls && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="pointer-events-none absolute inset-0 flex flex-col justify-between"
              >
                {/* Top gradient + filename */}
                <div className="pointer-events-none bg-linear-to-b from-black/70 to-transparent px-5 py-4">
                  <p className="truncate text-sm font-medium text-white/90">{name}</p>
                </div>

                {/* Bottom gradient + controls */}
                <div className="pointer-events-auto bg-linear-to-t from-black/80 via-black/30 to-transparent px-5 pb-5 pt-10">

                  {/* ── Seek bar ── */}
                  <div
                    ref={seekBarRef}
                    className="group relative mb-4 flex h-5 cursor-pointer items-center"
                    onMouseDown={handleSeekMouseDown}
                    onMouseMove={handleSeekMouseMove}
                    onMouseLeave={handleSeekMouseLeave}
                  >
                    <div className="relative h-1 w-full rounded-full bg-white/20 transition-all group-hover:h-1.5">
                      {/* Buffered */}
                      <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${bufferedPct}%` }} />
                      {/* Progress */}
                      <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${progressPct}%` }} />
                      {/* Hover time tooltip */}
                      {hoverTime !== null && (
                        <div
                          className="absolute -top-8 -translate-x-1/2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white backdrop-blur"
                          style={{ left: hoverX }}
                        >
                          {formatDuration(hoverTime)}
                        </div>
                      )}
                      {/* Thumb */}
                      <div
                        className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-md opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ left: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* ── Bottom controls row ── */}
                  <div className="flex items-center gap-2">

                    {/* Play / pause */}
                    <CtrlBtn onClick={togglePlay} large>
                      <span className={`size-6 text-white ${playing ? 'icon-[material-symbols--pause]' : 'icon-[material-symbols--play-arrow]'}`} />
                    </CtrlBtn>

                    {/* Replay 10 */}
                    <CtrlBtn onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); }}>
                      <span className="icon-[material-symbols--replay-10] size-5 text-white/80" />
                    </CtrlBtn>

                    {/* Forward 10 */}
                    <CtrlBtn onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration || 0, v.currentTime + 10); }}>
                      <span className="icon-[material-symbols--forward-10] size-5 text-white/80" />
                    </CtrlBtn>

                    {/* Volume */}
                    <CtrlBtn onClick={toggleMute}>
                      <span className={`size-5 text-white/80 ${VolumeIcon}`} />
                    </CtrlBtn>

                    {/* Volume bar */}
                    <div
                      ref={volBarRef}
                      className="group/vol relative h-4 w-20 cursor-pointer"
                      onClick={handleVolumeClick}
                    >
                      <div className="absolute top-1/2 h-[3px] w-full -translate-y-1/2 overflow-hidden rounded-full bg-white/25">
                        <div className="h-full rounded-full bg-white" style={{ width: `${volDisplay * 100}%` }} />
                      </div>
                    </div>

                    {/* Time */}
                    <span className="ml-1 font-mono text-xs tabular-nums text-white/70">
                      {formatDuration(currentTime)}
                      <span className="mx-0.5 text-white/30">/</span>
                      {formatDuration(duration)}
                    </span>

                    <div className="flex-1" />

                    {/* Fullscreen */}
                    <CtrlBtn onClick={() => document.fullscreenElement ? document.exitFullscreen() : containerRef.current?.requestFullscreen()}>
                      <span className="icon-[material-symbols--fullscreen] size-5 text-white/80" />
                    </CtrlBtn>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Keyboard hint */}
        <p className="mt-3 text-center text-[11px] text-white/25">
          Space · K play/pause &nbsp;·&nbsp; ←→ seek 5s &nbsp;·&nbsp; M mute &nbsp;·&nbsp; F fullscreen &nbsp;·&nbsp; Esc close
        </p>
      </motion.div>
    </motion.div>
  );
}

function CtrlBtn({
  onClick,
  large,
  children,
}: {
  onClick: () => void;
  large?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 ${large ? 'size-9' : 'size-8'}`}
    >
      {children}
    </button>
  );
}
