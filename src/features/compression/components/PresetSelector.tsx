import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/button';
import { useSettings } from '../store';
import type { PresetId, SavedPreset } from '../types';

const BUILT_IN_PRESETS: {
  id: PresetId;
  label: string;
  desc: string;
  icon: string;
  badge?: string;
  color?: string;
}[] = [
  {
    id: 'maximum',
    label: 'Maximum',
    desc: 'Smallest file',
    icon: 'icon-[material-symbols--bolt]',
    badge: 'Best',
    color: 'text-amber-500',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    desc: 'Good compression',
    icon: 'icon-[material-symbols--tune]',
  },
  {
    id: 'quality',
    label: 'High Quality',
    desc: 'Near-original',
    icon: 'icon-[material-symbols--star]',
    color: 'text-violet-500',
  },
  {
    id: 'gaming',
    label: 'Gaming',
    desc: '60fps, crisp',
    icon: 'icon-[material-symbols--sports-esports]',
    color: 'text-green-500',
  },
  {
    id: 'education',
    label: 'Education',
    desc: 'Clear text, 60fps',
    icon: 'icon-[material-symbols--school]',
    color: 'text-blue-500',
  },
  {
    id: 'custom',
    label: 'Custom',
    desc: 'Fine-tune all',
    icon: 'icon-[material-symbols--settings]',
  },
];

export function PresetSelector() {
  const { settings, savedPresets, setPreset, savePreset, deletePreset, applyPreset } =
    useSettings();
  const [saveName, setSaveName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSaveInput) inputRef.current?.focus();
  }, [showSaveInput]);

  const handleSave = () => {
    if (!saveName.trim()) return;
    savePreset(saveName);
    setSaveName('');
    setShowSaveInput(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preset</p>

      {/* 3-column built-in preset grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {BUILT_IN_PRESETS.map((p) => {
          const active = settings.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                'group relative flex flex-col gap-1 rounded-xl border p-2.5 text-left transition-all duration-150',
                active
                  ? 'border-primary bg-primary/8 text-primary shadow-sm'
                  : 'border-border bg-card text-foreground hover:border-border/80 hover:bg-muted/50',
              )}
            >
              {p.badge && (
                <span
                  className={cn(
                    'absolute -right-1 -top-1 z-10 rounded-full px-1.5 py-0.5 text-[8px] font-bold leading-none',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
                  )}
                >
                  {p.badge}
                </span>
              )}
              <span
                className={cn(
                  'size-3.5',
                  p.icon,
                  active ? 'text-primary' : (p.color ?? 'text-muted-foreground'),
                )}
              />
              <span className="text-[11px] font-semibold leading-tight">{p.label}</span>
              <span
                className={cn(
                  'text-[10px] leading-snug',
                  active ? 'text-primary/70' : 'text-muted-foreground',
                )}
              >
                {p.desc}
              </span>
              {active && (
                <motion.div
                  layoutId="preset-indicator"
                  className="absolute inset-0 rounded-xl border-2 border-primary"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Save current custom settings as a named preset */}
      <AnimatePresence>
        {settings.preset === 'custom' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {showSaveInput ? (
              <div className="flex gap-1.5">
                <input
                  ref={inputRef}
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                      setShowSaveInput(false);
                      setSaveName('');
                    }
                  }}
                  placeholder="Preset name…"
                  maxLength={32}
                  className="h-7 min-w-0 flex-1 rounded-lg border border-input bg-background px-2.5 text-xs outline-none ring-ring/20 transition focus:border-ring focus:ring-2 placeholder:text-muted-foreground/60"
                />
                <Button size="xs" onClick={handleSave} disabled={!saveName.trim()}>
                  Save
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setShowSaveInput(false);
                    setSaveName('');
                  }}
                >
                  <span className="icon-[material-symbols--close] size-3" />
                </Button>
              </div>
            ) : (
              <Button
                size="xs"
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => setShowSaveInput(true)}
              >
                <span className="icon-[material-symbols--bookmark-add] size-3.5" />
                Save as preset
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved presets */}
      <AnimatePresence>
        {savedPresets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Saved Presets
              </p>
              <div className="space-y-1">
                {savedPresets
                  .slice()
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((p) => (
                    <SavedPresetRow
                      key={p.id}
                      preset={p}
                      onApply={() => applyPreset(p)}
                      onDelete={() => deletePreset(p.id)}
                    />
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SavedPresetRow({
  preset,
  onApply,
  onDelete,
}: {
  preset: SavedPreset;
  onApply: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="group flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 hover:border-border/80 hover:bg-muted/40"
    >
      <span className="icon-[material-symbols--bookmark] size-3 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium">{preset.name}</span>
      <button
        onClick={onApply}
        title="Apply preset"
        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold text-primary opacity-0 transition-opacity hover:bg-primary/10 group-hover:opacity-100"
      >
        Apply
      </button>
      <button
        onClick={onDelete}
        title="Delete preset"
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <span className="icon-[material-symbols--delete-outline] size-3 text-muted-foreground hover:text-destructive" />
      </button>
    </motion.div>
  );
}
