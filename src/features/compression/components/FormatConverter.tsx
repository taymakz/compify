import { cn } from '@/lib/utils';
import { useSettings } from '../store';
import { FORMAT_LABELS, type VideoFormat } from '../types';

const FORMAT_COMPAT: Record<VideoFormat, string> = {
  mp4: 'Universal. Best for sharing and web.',
  mkv: 'Open standard. Supports any codec + subtitles.',
  mov: 'Apple ecosystem. High quality.',
  avi: 'Legacy. Wide compatibility but large files.',
  webm: 'Web-optimized. VP9/AV1 codecs.',
  m4v: 'iTunes/Apple devices.',
};

const FORMATS = Object.entries(FORMAT_LABELS) as [VideoFormat, string][];

export function FormatConverter() {
  const { settings, setSettings } = useSettings();

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Output Format
      </p>
      <div className="grid grid-cols-3 gap-1.5">
        {FORMATS.map(([fmt, label]) => {
          const active = settings.output_format === fmt;
          return (
            <button
              key={fmt}
              onClick={() => setSettings({ output_format: fmt })}
              className={cn(
                'rounded-lg border px-2 py-1.5 text-xs font-medium transition-all',
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-border/80 hover:text-foreground',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        {FORMAT_COMPAT[settings.output_format]}
      </p>
    </div>
  );
}
