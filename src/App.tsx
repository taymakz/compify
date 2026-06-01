import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './globals.css';
import logoSrc from '@/assets/logo-128.png';
import { Button } from '@/components/button';
import { Badge } from '@/components/badge';
import { Separator } from '@/components/separator';
import { CompressionProvider, useStore } from '@/features/compression/store';
import { useFFmpegSetup } from '@/features/compression/hooks/use-ffmpeg-setup';
import { FFmpegInstaller } from '@/features/compression/components/FFmpegInstaller';
import { DropZone } from '@/features/compression/components/DropZone';
import { CompressionQueue } from '@/features/compression/components/CompressionQueue';
import { PresetSelector } from '@/features/compression/components/PresetSelector';
import { CustomSettings } from '@/features/compression/components/CustomSettings';
import { FormatConverter } from '@/features/compression/components/FormatConverter';
import { SetupWizard, SETUP_DONE_KEY } from '@/features/compression/components/SetupWizard';
import { SettingsDialog, THEME_KEY, type Theme } from '@/features/compression/components/SettingsDialog';
import { UpdateBanner } from '@/features/compression/components/UpdateBanner';

function getSystemDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolveIsDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return getSystemDark();
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem(THEME_KEY) as Theme) || 'dark';
  });
  const [isDark, setIsDark] = useState(() => resolveIsDark((localStorage.getItem(THEME_KEY) as Theme) || 'dark'));
  const [setupDone, setSetupDone] = useState(() => !!localStorage.getItem(SETUP_DONE_KEY));

  // Apply dark class to documentElement
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setIsDark(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const handleThemeChange = (t: Theme) => {
    localStorage.setItem(THEME_KEY, t);
    setTheme(t);
    setIsDark(resolveIsDark(t));
  };

  return (
    <CompressionProvider>
      <div className={isDark ? 'dark' : ''}>
        <AnimatePresence mode="wait">
          {!setupDone ? (
            <motion.div
              key="wizard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <SetupWizard onComplete={() => setSetupDone(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="app"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AppShell theme={theme} onThemeChange={handleThemeChange} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CompressionProvider>
  );
}

function AppShell({ theme, onThemeChange }: { theme: Theme; onThemeChange: (t: Theme) => void }) {
  const { ffmpegStatus, isInstalling } = useFFmpegSetup();
  const loading = ffmpegStatus === null;
  const needsInstall = !loading && (!ffmpegStatus.installed || isInstalling);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground antialiased">
      <Header ffmpegVersion={ffmpegStatus?.version} onOpenSettings={() => setSettingsOpen(true)} />

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 items-center justify-center"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <p className="text-sm text-muted-foreground">Checking FFmpeg…</p>
            </div>
          </motion.div>
        ) : needsInstall ? (
          <motion.div
            key="installer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <FFmpegInstaller />
          </motion.div>
        ) : (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 overflow-hidden"
          >
            <MainContent />
          </motion.div>
        )}
      </AnimatePresence>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        theme={theme}
        onThemeChange={onThemeChange}
      />
    </div>
  );
}

function Header({ onOpenSettings }: {
  ffmpegVersion?: string | null;
  onOpenSettings: () => void;
}) {
  return (
    <>
      <UpdateBanner />
      <header className="flex h-12 shrink-0 items-center justify-between border-b bg-background/80 px-5 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <img src={logoSrc} alt="Compify" className="size-7 rounded-lg object-contain" />
          <span className="text-sm font-bold tracking-tight">Compify</span>
          <Badge variant="secondary" className="text-[10px]">v0.1</Badge>

        </div>

        <Button size="icon-sm" variant="ghost" onClick={onOpenSettings} title="Settings">
          <span className="icon-[lucide--settings] size-4" />
        </Button>
      </header>
    </>
  );
}

function MainContent() {
  const { state } = useStore();
  const hasFiles = state.files.length > 0;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-5">
        <DropZone />
        <AnimatePresence>
          {hasFiles && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <CompressionQueue />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Separator orientation="vertical" />

      <div className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto p-5">
        <PresetSelector />
        <CustomSettings />
        <Separator />
        <FormatConverter />
        {hasFiles && <QueueSummary />}
      </div>
    </div>
  );
}

function QueueSummary() {
  const { state } = useStore();
  const { files } = state;
  const done = files.filter((f) => f.status === 'completed').length;
  const saved = files
    .filter((f) => f.result)
    .reduce((acc, f) => acc + (f.result!.original_size - f.result!.output_size), 0);

  if (done === 0) return null;

  const savedMB = (saved / 1024 / 1024).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border bg-card p-4 space-y-3"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Session Stats
      </p>
      <div className="space-y-2">
        <StatRow label="Completed" value={`${done} / ${files.length}`} />
        {saved > 0 && <StatRow label="Total saved" value={`${savedMB} MB`} accent />}
      </div>
    </motion.div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${accent ? 'text-green-500' : ''}`}>
        {value}
      </span>
    </div>
  );
}
