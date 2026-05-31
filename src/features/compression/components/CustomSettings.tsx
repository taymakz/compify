import { AnimatePresence, motion } from 'motion/react';
import { Label } from '@/components/label';
import { Slider } from '@/components/slider';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/select';
import { useSettings } from '../store';
import { CODEC_LABELS, AUDIO_CODEC_LABELS } from '../types';

const VIDEO_CODECS = Object.entries(CODEC_LABELS).filter(([k]) => k !== 'copy') as [string, string][];
const AUDIO_CODECS = Object.entries(AUDIO_CODEC_LABELS).filter(([k]) => k !== 'copy') as [string, string][];

const SPEEDS: [string, string][] = [
  ['ultrafast', 'Ultrafast'],
  ['superfast', 'Superfast'],
  ['veryfast', 'Very Fast'],
  ['faster', 'Faster'],
  ['fast', 'Fast'],
  ['medium', 'Medium'],
  ['slow', 'Slow'],
  ['slower', 'Slower'],
  ['veryslow', 'Very Slow'],
];

const RESOLUTIONS: [string, string][] = [
  ['', 'Original'],
  ['3840:2160', '4K (3840×2160)'],
  ['2560:1440', '2K (2560×1440)'],
  ['1920:1080', '1080p'],
  ['1280:720', '720p'],
  ['854:480', '480p'],
];

export function CustomSettings() {
  const { settings, setSettings } = useSettings();
  const isCustom = settings.preset === 'custom';

  return (
    <AnimatePresence>
      {isCustom && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden"
        >
          <div className="space-y-4 rounded-xl border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Custom Settings
            </p>

            {/* CRF */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Quality (CRF)</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {settings.crf} — {crfLabel(settings.crf)}
                </span>
              </div>
              <Slider
                min={0}
                max={51}
                value={[settings.crf]}
                onValueChange={(v) => setSettings({ crf: (v as number[])[0] })}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Best quality</span>
                <span>Smallest file</span>
              </div>
            </div>

            <SettingsSelect
              label="Video Codec"
              value={settings.video_codec}
              onChange={(v) => setSettings({ video_codec: v })}
              options={VIDEO_CODECS}
            />

            <SettingsSelect
              label="Encoding Speed"
              value={settings.preset_speed}
              onChange={(v) => setSettings({ preset_speed: v })}
              options={SPEEDS}
            />

            <SettingsSelect
              label="Resolution"
              value={settings.resolution ?? ''}
              onChange={(v) => setSettings({ resolution: v || null })}
              options={RESOLUTIONS}
            />

            <SettingsSelect
              label="Audio Codec"
              value={settings.audio_codec}
              onChange={(v) => setSettings({ audio_codec: v })}
              options={AUDIO_CODECS}
            />

            {/* Audio Bitrate */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Audio Bitrate</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {settings.audio_bitrate} kbps
                </span>
              </div>
              <Slider
                min={64}
                max={320}
                step={16}
                value={[settings.audio_bitrate]}
                onValueChange={(v) => setSettings({ audio_bitrate: (v as number[])[0] })}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SettingsSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v ?? '')}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map(([val, lbl]) => (
              <SelectItem key={val} value={val}>
                {lbl}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}

function crfLabel(crf: number): string {
  if (crf <= 18) return 'Lossless';
  if (crf <= 23) return 'High';
  if (crf <= 28) return 'Medium';
  if (crf <= 35) return 'Low';
  return 'Very Low';
}
