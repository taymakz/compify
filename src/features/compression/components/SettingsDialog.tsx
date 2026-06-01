import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { Switch } from '@/components/switch';
import { Label } from '@/components/label';
import { Separator } from '@/components/separator';
import {
  Dialog,
  DialogPopup,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/dialog';
import { useFFmpegSetup } from '../hooks/use-ffmpeg-setup';
import { OUTPUT_DIR_KEY } from './SetupWizard';
import type { AppSettings, UpdateInfo } from '../types';

export type Theme = 'system' | 'dark' | 'light';
export const THEME_KEY = 'compify_theme';

type Section = 'general' | 'appearance' | 'notifications' | 'updates' | 'ffmpeg';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'general',       label: 'General',       icon: 'icon-[material-symbols--folder-open]' },
  { id: 'appearance',    label: 'Appearance',     icon: 'icon-[material-symbols--palette]' },
  { id: 'notifications', label: 'Notifications',  icon: 'icon-[material-symbols--notifications]' },
  { id: 'updates',       label: 'Updates',        icon: 'icon-[material-symbols--system-update-alt]' },
  { id: 'ffmpeg',        label: 'FFmpeg',         icon: 'icon-[material-symbols--video-settings]' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}

export function SettingsDialog({ open, onOpenChange, theme, onThemeChange }: Props) {
  const [section, setSection] = useState<Section>('general');
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [outputDir, setOutputDir] = useState('');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const { ffmpegStatus, isInstalling, installProgress, installPhase, install, recheck } = useFFmpegSetup();

  useEffect(() => {
    if (open) {
      setOutputDir(localStorage.getItem(OUTPUT_DIR_KEY) || '');
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const s = await invoke<AppSettings>('load_settings');
      setSettings(s);
    } catch {}
  };

  const updateSetting = async (key: string, value: boolean | string | null) => {
    try {
      const updated = await invoke<AppSettings>('update_setting', { key, value });
      setSettings(updated);
    } catch {}
  };

  const pickOutputDir = async () => {
    try {
      const dir = await invoke<string | null>('pick_directory');
      if (dir) { localStorage.setItem(OUTPUT_DIR_KEY, dir); setOutputDir(dir); }
    } catch {}
  };

  const clearOutputDir = () => {
    localStorage.removeItem(OUTPUT_DIR_KEY);
    setOutputDir('');
  };

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      setUpdateInfo(await invoke<UpdateInfo>('check_for_updates'));
    } catch {
      setUpdateInfo({ available: false, current_version: '0.1.0', latest_version: null, download_url: null, release_notes: null });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const openRelease = async () => {
    if (updateInfo?.download_url) {
      try { await invoke('open_release_page', { url: updateInfo.download_url }); } catch {}
    }
  };

  const sectionLabel = NAV.find(n => n.id === section)?.label ?? '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="max-w-[680px] w-full p-0 overflow-hidden" showCloseButton={false}>
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">Manage application preferences</DialogDescription>

        <div className="flex h-[520px] overflow-hidden">
          {/* ── Sidebar ─────────────────────────────────────────── */}
          <aside className="w-44 shrink-0 border-r bg-muted/20 p-2 flex flex-col">
            <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              Settings
            </p>
            {NAV.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors text-left w-full',
                  section === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                <span className={cn('size-3.5 shrink-0', item.icon)} />
                {item.label}
              </button>
            ))}
          </aside>

          {/* ── Content ─────────────────────────────────────────── */}
          <div className="relative flex flex-1 min-w-0 flex-col overflow-hidden">
            {/* header */}
            <div className="flex items-center justify-between border-b px-5 py-3.5 shrink-0">
              <h2 className="text-sm font-semibold">{sectionLabel}</h2>
              <DialogClose render={<Button size="icon" variant="ghost" className="size-7 -mr-1" />}>
                <span className="icon-[material-symbols--close] size-4" />
              </DialogClose>
            </div>

            {/* scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={section}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {section === 'general' && (
                    <GeneralSection outputDir={outputDir} onPick={pickOutputDir} onClear={clearOutputDir} />
                  )}
                  {section === 'appearance' && (
                    <AppearanceSection theme={theme} onThemeChange={onThemeChange} />
                  )}
                  {section === 'notifications' && (
                    <NotificationsSection settings={settings} onUpdate={updateSetting} />
                  )}
                  {section === 'updates' && (
                    <UpdatesSection
                      settings={settings}
                      onUpdate={updateSetting}
                      updateInfo={updateInfo}
                      checking={checkingUpdate}
                      onCheck={checkForUpdates}
                      onOpenRelease={openRelease}
                    />
                  )}
                  {section === 'ffmpeg' && (
                    <FFmpegSection
                      ffmpegStatus={ffmpegStatus}
                      isInstalling={isInstalling}
                      installProgress={installProgress}
                      installPhase={installPhase}
                      onInstall={install}
                      onRecheck={recheck}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

// ── General ───────────────────────────────────────────────────────────────────

function GeneralSection({ outputDir, onPick, onClear }: {
  outputDir: string;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <SettingGroup title="Output Location" desc="Where compressed files are saved by default.">
        <button
          type="button"
          onClick={onPick}
          className="group flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-3.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card">
            <span className="icon-[material-symbols--folder-open] size-4.5 text-muted-foreground group-hover:text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            {outputDir ? (
              <>
                <p className="text-xs font-semibold text-foreground">Custom folder</p>
                <p className="truncate text-[11px] text-muted-foreground" title={outputDir}>{outputDir}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold">Same folder as source</p>
                <p className="text-[11px] text-muted-foreground">Click to choose a custom output folder</p>
              </>
            )}
          </div>
          <span className="icon-[material-symbols--chevron-right] size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>

        {outputDir && (
          <Button size="sm" variant="ghost" className="w-full text-muted-foreground gap-1.5" onClick={onClear}>
            <span className="icon-[material-symbols--close] size-3.5" />
            Reset to default (same folder as source)
          </Button>
        )}
      </SettingGroup>
    </div>
  );
}

// ── Appearance ────────────────────────────────────────────────────────────────

const THEMES: { value: Theme; label: string; icon: string; desc: string }[] = [
  { value: 'system', label: 'System',  icon: 'icon-[material-symbols--computer]',    desc: 'Follows your OS setting' },
  { value: 'dark',   label: 'Dark',    icon: 'icon-[material-symbols--dark-mode]',   desc: 'Always dark' },
  { value: 'light',  label: 'Light',   icon: 'icon-[material-symbols--light-mode]',  desc: 'Always light' },
];

function AppearanceSection({ theme, onThemeChange }: { theme: Theme; onThemeChange: (t: Theme) => void }) {
  return (
    <SettingGroup title="Theme" desc="Choose how Compify looks on your screen.">
      <div className="grid grid-cols-3 gap-2">
        {THEMES.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => onThemeChange(t.value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border p-3.5 text-center transition-all',
              theme === t.value
                ? 'border-primary bg-primary/8 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground',
            )}
          >
            <span className={cn('size-5', t.icon, theme === t.value ? 'text-primary' : '')} />
            <div>
              <p className="text-xs font-semibold leading-none">{t.label}</p>
              <p className={cn('mt-0.5 text-[10px] leading-tight', theme === t.value ? 'text-primary/70' : 'text-muted-foreground/70')}>
                {t.desc}
              </p>
            </div>
            {theme === t.value && (
              <span className="icon-[material-symbols--check-circle] size-3 text-primary" />
            )}
          </button>
        ))}
      </div>
    </SettingGroup>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

function NotificationsSection({ settings, onUpdate }: {
  settings: AppSettings | null;
  onUpdate: (k: string, v: boolean | string | null) => void;
}) {
  if (!settings) return <LoadingPlaceholder />;
  return (
    <SettingGroup title="Desktop Notifications" desc="Get system notifications when compression finishes.">
      <SettingRow
        id="notif-enabled"
        label="Compression complete notification"
        desc="Shows a desktop notification when all queued jobs finish"
        checked={settings.notifications_enabled}
        onCheckedChange={v => onUpdate('notifications_enabled', v)}
      />
    </SettingGroup>
  );
}

// ── Updates ───────────────────────────────────────────────────────────────────

function UpdatesSection({ settings, onUpdate, updateInfo, checking, onCheck, onOpenRelease }: {
  settings: AppSettings | null;
  onUpdate: (k: string, v: boolean | string | null) => void;
  updateInfo: UpdateInfo | null;
  checking: boolean;
  onCheck: () => void;
  onOpenRelease: () => void;
}) {
  if (!settings) return <LoadingPlaceholder />;
  return (
    <div className="space-y-5">
      <SettingGroup title="Automatic Checks">
        <SettingRow
          id="auto-update"
          label="Check for updates on startup"
          desc="Silently checks GitHub for new releases when the app launches"
          checked={settings.check_updates_on_startup}
          onCheckedChange={v => onUpdate('check_updates_on_startup', v)}
        />
      </SettingGroup>

      <Separator />

      <SettingGroup title="Check Now">
        <Button variant="outline" className="w-full gap-2" onClick={onCheck} disabled={checking}>
          {checking ? (
            <><span className="icon-[lucide--loader-2] size-3.5 animate-spin" />Checking…</>
          ) : (
            <><span className="icon-[lucide--refresh-cw] size-3.5" />Check for Updates</>
          )}
        </Button>

        {updateInfo && (
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            {updateInfo.available ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-500">
                  <span className="icon-[material-symbols--new-releases] size-4" />
                  <span className="font-semibold">Update available — v{updateInfo.latest_version}</span>
                </div>
                <Button size="sm" className="w-full gap-1.5" onClick={onOpenRelease}>
                  <span className="icon-[material-symbols--download] size-3.5" />
                  Download v{updateInfo.latest_version}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="icon-[material-symbols--check-circle] size-4 text-green-500" />
                <span>You&apos;re up to date — v{updateInfo.current_version}</span>
              </div>
            )}
          </div>
        )}
      </SettingGroup>
    </div>
  );
}

// ── FFmpeg ────────────────────────────────────────────────────────────────────

function FFmpegSection({ ffmpegStatus, isInstalling, installProgress, installPhase, onInstall, onRecheck }: {
  ffmpegStatus: ReturnType<typeof useFFmpegSetup>['ffmpegStatus'];
  isInstalling: boolean;
  installProgress: number;
  installPhase: string;
  onInstall: () => void;
  onRecheck: () => void;
}) {
  const installed = ffmpegStatus?.installed ?? false;

  return (
    <div className="space-y-5">
      <SettingGroup title="Status">
        <div className="rounded-xl border bg-card p-4">
          {ffmpegStatus === null ? (
            <div className="flex items-center gap-3">
              <div className="size-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
              <p className="text-sm text-muted-foreground">Checking…</p>
            </div>
          ) : isInstalling ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-7 animate-spin rounded-full border-2 border-muted border-t-primary" />
                <p className="text-sm font-medium">Installing FFmpeg…</p>
              </div>
              <div className="relative h-1 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  animate={{ width: `${installProgress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">{installPhase}</p>
            </div>
          ) : installed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-green-500/15">
                  <span className="icon-[material-symbols--check-circle] size-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-500">FFmpeg installed</p>
                  {ffmpegStatus.version && (
                    <p className="text-[11px] text-muted-foreground">Version {ffmpegStatus.version}</p>
                  )}
                </div>
              </div>
              {ffmpegStatus.path && (
                <p className="truncate text-[10px] text-muted-foreground/60" title={ffmpegStatus.path}>
                  {ffmpegStatus.path}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/15">
                <span className="icon-[material-symbols--error] size-4 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive">FFmpeg not found</p>
            </div>
          )}
        </div>
      </SettingGroup>

      <Separator />

      <SettingGroup title="Actions">
        <div className="flex gap-2">
          {!installed && (
            <Button className="flex-1 gap-1.5" onClick={onInstall} disabled={isInstalling}>
              <span className="icon-[material-symbols--download] size-3.5" />
              Install FFmpeg
            </Button>
          )}
          {installed && (
            <Button variant="outline" className="flex-1 gap-1.5" onClick={onInstall} disabled={isInstalling}>
              <span className="icon-[material-symbols--refresh] size-3.5" />
              Reinstall
            </Button>
          )}
          <Button variant="ghost" className="gap-1.5" onClick={onRecheck} disabled={isInstalling}>
            <span className="icon-[lucide--refresh-cw] size-3.5" />
            Recheck
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          FFmpeg is downloaded from GitHub (~120 MB) and stored locally in the app data folder.
          No PATH modification needed.
        </p>
      </SettingGroup>
    </div>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function SettingGroup({ title, desc, children }: {
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        {desc && <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function SettingRow({ id, label, desc, checked, onCheckedChange }: {
  id: string;
  label: string;
  desc?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border bg-card p-3.5">
      <div className="min-w-0 flex-1 space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">{label}</Label>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5 shrink-0" />
    </div>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}
