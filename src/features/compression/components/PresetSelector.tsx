import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useSettings } from '../store';
import type { PresetId } from '../types';

const PRESETS: { id: PresetId; label: string; desc: string; icon: string; badge?: string }[] = [
  {
    id: 'maximum',
    label: 'Maximum',
    desc: 'Smallest file, visually lossless',
    icon: 'icon-[material-symbols--bolt]',
    badge: 'Recommended',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    desc: 'Good compression, minimal quality loss',
    icon: 'icon-[material-symbols--tune]',
  },
  {
    id: 'quality',
    label: 'High Quality',
    desc: 'Near-original quality, moderate compression',
    icon: 'icon-[material-symbols--star]',
  },
  {
    id: 'custom',
    label: 'Custom',
    desc: 'Fine-tune every setting yourself',
    icon: 'icon-[material-symbols--settings]',
  },
];

export function PresetSelector() {
  const { settings, setPreset } = useSettings();

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preset</p>
      <div className="grid grid-cols-2 gap-2">
        {PRESETS.map((p) => {
          const active = settings.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={cn(
                'group relative flex flex-col gap-1 rounded-xl border p-3 text-left transition-all duration-150',
                active
                  ? 'border-primary bg-primary/8 text-primary shadow-sm'
                  : 'border-border bg-card text-foreground hover:border-border/80 hover:bg-muted/50',
              )}
            >
              {p.badge && active && (
                <span className="absolute right-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                  {p.badge}
                </span>
              )}
              <span className={cn('size-4', p.icon, active ? 'text-primary' : 'text-muted-foreground')} />
              <span className="text-sm font-semibold">{p.label}</span>
              <span className={cn('text-[11px] leading-snug', active ? 'text-primary/70' : 'text-muted-foreground')}>
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
    </div>
  );
}
