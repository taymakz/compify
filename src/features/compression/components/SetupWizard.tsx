import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { invoke } from '@tauri-apps/api/core';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import logoSrc from '@/assets/logo-128.png';
import { useFFmpegSetup } from '../hooks/use-ffmpeg-setup';

export const SETUP_DONE_KEY = 'compify_setup_done';
export const OUTPUT_DIR_KEY = 'compify_output_dir';

const STEP_LABELS = ['Welcome', 'Output Folder', 'Setup', 'Ready'];

export function SetupWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [outputDir, setOutputDir] = useState('');
  const { ffmpegStatus, isInstalling, installProgress, installPhase, install } = useFFmpegSetup();

  // Auto-advance from FFmpeg step when ready
  useEffect(() => {
    if (step === 2 && ffmpegStatus?.installed && !isInstalling) {
      const t = setTimeout(() => setStep(3), 900);
      return () => clearTimeout(t);
    }
  }, [step, ffmpegStatus, isInstalling]);

  const handlePickFolder = async () => {
    try {
      const dir = await invoke<string | null>('pick_directory');
      if (dir) setOutputDir(dir);
    } catch {}
  };

  const handleFinish = () => {
    if (outputDir) localStorage.setItem(OUTPUT_DIR_KEY, outputDir);
    localStorage.setItem(SETUP_DONE_KEY, 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/3 top-1/4 size-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute right-1/4 bottom-1/3 size-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-primary/4 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-[460px] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl shadow-black/25"
      >
        {/* Top gradient bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-70" />

        {/* Header */}
        <div className="flex flex-col items-center gap-5 px-8 pt-8">
          <motion.div
            animate={
              step === 2 && isInstalling
                ? { scale: [1, 1.06, 1], opacity: [1, 0.8, 1] }
                : { scale: 1, opacity: 1 }
            }
            transition={
              step === 2 && isInstalling
                ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.3 }
            }
          >
            <img
              src={logoSrc}
              alt="Compify"
              className="size-[72px] rounded-2xl object-contain shadow-lg shadow-black/20"
            />
          </motion.div>

          <div className="text-center">
            <h1 className="text-[22px] font-bold tracking-tight text-foreground">Compify</h1>
            <p className="text-sm text-muted-foreground">Video Compressor</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-5 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-300',
                    i < step
                      ? 'size-5 bg-primary text-primary-foreground'
                      : i === step
                        ? 'min-w-[52px] bg-primary/15 px-2 text-primary'
                        : 'size-5 bg-muted text-muted-foreground',
                  )}
                >
                  {i < step ? (
                    <span className="icon-[material-symbols--check] size-3" />
                  ) : i === step ? (
                    label
                  ) : (
                    i + 1
                  )}
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className={cn(
                      'h-px w-4 transition-colors duration-300',
                      i < step ? 'bg-primary/50' : 'bg-border',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepWelcome key="welcome" onNext={() => setStep(1)} />
            )}
            {step === 1 && (
              <StepOutputFolder
                key="folder"
                outputDir={outputDir}
                onPick={handlePickFolder}
                onNext={() => setStep(2)}
              />
            )}
            {step === 2 && (
              <StepFFmpeg
                key="ffmpeg"
                ffmpegStatus={ffmpegStatus}
                isInstalling={isInstalling}
                installProgress={installProgress}
                installPhase={installPhase}
                onInstall={install}
              />
            )}
            {step === 3 && (
              <StepDone key="done" onFinish={handleFinish} />
            )}
          </AnimatePresence>
        </div>

        {/* Bottom padding */}
        <div className="h-2" />
      </motion.div>
    </div>
  );
}

// ── Step: Welcome ─────────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  const features = [
    {
      icon: 'icon-[material-symbols--bolt]',
      label: 'Blazing fast',
      desc: 'FFmpeg-powered compression with hardware acceleration',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      icon: 'icon-[material-symbols--tune]',
      label: 'Smart presets',
      desc: 'Gaming, education, quality & more — or go fully custom',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      icon: 'icon-[material-symbols--folder-copy]',
      label: 'Batch processing',
      desc: 'Drop multiple videos and compress them all at once',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
  ];

  return (
    <StepPane>
      <div className="space-y-1 text-center">
        <h2 className="text-lg font-bold">Welcome to Compify</h2>
        <p className="text-sm text-muted-foreground">
          The fastest way to compress and convert videos — no quality compromise.
        </p>
      </div>

      <div className="space-y-2">
        {features.map((f) => (
          <div
            key={f.label}
            className="flex items-start gap-3 rounded-xl border border-border bg-background/50 p-3"
          >
            <div className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg', f.bg)}>
              <span className={cn('size-4', f.icon, f.color)} />
            </div>
            <div>
              <p className="text-sm font-semibold">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button size="lg" className="w-full gap-2" onClick={onNext}>
        Get Started
        <span className="icon-[material-symbols--arrow-forward] size-4" />
      </Button>
    </StepPane>
  );
}

// ── Step: Output Folder ───────────────────────────────────────────────────────

function StepOutputFolder({
  outputDir,
  onPick,
  onNext,
}: {
  outputDir: string;
  onPick: () => void;
  onNext: () => void;
}) {
  return (
    <StepPane>
      <div className="space-y-1 text-center">
        <h2 className="text-lg font-bold">Default Output Folder</h2>
        <p className="text-sm text-muted-foreground">
          Choose where compressed videos are saved by default.
        </p>
      </div>

      <div
        onClick={onPick}
        className="group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border bg-background/50 p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
          <span className="icon-[material-symbols--folder-open] size-5 text-muted-foreground group-hover:text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          {outputDir ? (
            <>
              <p className="text-xs font-semibold text-foreground">Selected folder</p>
              <p className="truncate text-xs text-muted-foreground" title={outputDir}>
                {outputDir}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold">Click to select folder</p>
              <p className="text-xs text-muted-foreground">Default: same folder as original video</p>
            </>
          )}
        </div>
        <span className="icon-[material-symbols--chevron-right] size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1" onClick={onNext}>
          Skip for now
        </Button>
        <Button size="sm" className="flex-1 gap-1.5" onClick={onNext}>
          {outputDir ? 'Continue' : 'Use default'}
          <span className="icon-[material-symbols--arrow-forward] size-3.5" />
        </Button>
      </div>
    </StepPane>
  );
}

// ── Step: FFmpeg ──────────────────────────────────────────────────────────────

function StepFFmpeg({
  ffmpegStatus,
  isInstalling,
  installProgress,
  installPhase,
  onInstall,
}: {
  ffmpegStatus: ReturnType<typeof useFFmpegSetup>['ffmpegStatus'];
  isInstalling: boolean;
  installProgress: number;
  installPhase: string;
  onInstall: () => void;
}) {
  const checking = ffmpegStatus === null;
  const installed = ffmpegStatus?.installed ?? false;

  return (
    <StepPane>
      <div className="space-y-1 text-center">
        <h2 className="text-lg font-bold">Video Processing Engine</h2>
        <p className="text-sm text-muted-foreground">
          FFmpeg powers all video compression. Let&apos;s get it ready.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-background/50 p-4">
        {checking ? (
          <div className="flex items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
            <div>
              <p className="text-sm font-semibold">Checking system…</p>
              <p className="text-xs text-muted-foreground">Looking for FFmpeg installation</p>
            </div>
          </div>
        ) : installed && !isInstalling ? (
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-green-500/15">
              <span className="icon-[material-symbols--check-circle] size-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-500">FFmpeg is ready</p>
              {ffmpegStatus?.version && (
                <p className="text-xs text-muted-foreground">Version {ffmpegStatus.version}</p>
              )}
            </div>
          </div>
        ) : isInstalling ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <p className="text-sm font-semibold">Installing FFmpeg…</p>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                animate={{ width: `${installProgress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{installPhase}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                <span className="icon-[material-symbols--warning] size-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold">FFmpeg not found</p>
                <p className="text-xs text-muted-foreground">
                  ~120 MB · GitHub release · Stored locally
                </p>
              </div>
            </div>
            <Button size="sm" className="w-full gap-2" onClick={onInstall}>
              <span className="icon-[material-symbols--download] size-4" />
              Install FFmpeg automatically
            </Button>
          </div>
        )}
      </div>

      {installed && !isInstalling && (
        <p className="text-center text-xs text-muted-foreground/70">Continuing automatically…</p>
      )}
    </StepPane>
  );
}

// ── Step: Done ────────────────────────────────────────────────────────────────

function StepDone({ onFinish }: { onFinish: () => void }) {
  return (
    <StepPane>
      <div className="flex flex-col items-center gap-4 py-2">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="flex size-16 items-center justify-center rounded-full border-2 border-green-500/30 bg-green-500/15"
        >
          <span className="icon-[material-symbols--check-circle] size-9 text-green-500" />
        </motion.div>

        <div className="space-y-1 text-center">
          <h2 className="text-lg font-bold">You&apos;re all set!</h2>
          <p className="text-sm text-muted-foreground">
            Compify is ready. Drop your videos and start saving space.
          </p>
        </div>
      </div>

      <Button size="lg" className="w-full gap-2" onClick={onFinish}>
        <span className="icon-[material-symbols--play-arrow] size-5" />
        Start Compressing
      </Button>
    </StepPane>
  );
}

// ── Shared layout ─────────────────────────────────────────────────────────────

function StepPane({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="space-y-4"
    >
      {children}
    </motion.div>
  );
}
