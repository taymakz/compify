import * as React from 'react';

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
import { AUDIO_CODEC_LABELS, CODEC_LABELS } from '../types';

const VIDEO_CODECS = Object.entries(CODEC_LABELS).filter(
  ([k]) => k !== 'copy',
) as [string, string][];

const AUDIO_CODECS = Object.entries(AUDIO_CODEC_LABELS).filter(
  ([k]) => k !== 'copy',
) as [string, string][];

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

const ORIGINAL_VALUE = 'Original';

function getSliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function CustomSettings() {
  const { settings, setSettings } = useSettings();

  const isCustom = settings.preset === 'custom';

  const [crf, setCrf] = React.useState(settings.crf);
  const [audioBitrate, setAudioBitrate] = React.useState(
    settings.audio_bitrate,
  );

  React.useEffect(() => {
    setCrf(settings.crf);
  }, [settings.crf]);

  React.useEffect(() => {
    setAudioBitrate(settings.audio_bitrate);
  }, [settings.audio_bitrate]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: isCustom ? '1fr' : '0fr',
        transition: 'grid-template-rows 250ms ease',
      }}
    >
      <div className="overflow-hidden">
        <div className="space-y-4 rounded-xl border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Custom Settings
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Quality (CRF)</Label>

              <span className="text-xs font-mono text-muted-foreground">
                {crf} — {crfLabel(crf)}
              </span>
            </div>

            <Slider
              min={0}
              max={51}
              step={1}
              value={[crf]}
              onValueChange={(value) => {
                setCrf(getSliderValue(value));
              }}
              onValueCommitted={(value) => {
                setSettings({
                  crf: getSliderValue(value),
                });
              }}
            />

            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Best quality</span>
              <span>Smallest file</span>
            </div>
          </div>

          <SettingsSelect
            label="Video Codec"
            value={settings.video_codec}
            options={VIDEO_CODECS}
            onChange={(value) =>
              setSettings({
                video_codec: value,
              })
            }
          />

          <SettingsSelect
            label="Encoding Speed"
            value={settings.preset_speed}
            options={SPEEDS}
            onChange={(value) =>
              setSettings({
                preset_speed: value,
              })
            }
          />

          <SettingsSelect
            label="Resolution"
            value={settings.resolution ?? ORIGINAL_VALUE}
            options={[
              [ORIGINAL_VALUE, 'Original'],
              ...RESOLUTIONS.filter(([v]) => v !== ''),
            ]}
            onChange={(value) =>
              setSettings({
                resolution: value === ORIGINAL_VALUE ? null : value,
              })
            }
          />

          <SettingsSelect
            label="Audio Codec"
            value={settings.audio_codec}
            options={AUDIO_CODECS}
            onChange={(value) =>
              setSettings({
                audio_codec: value,
              })
            }
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Audio Bitrate</Label>

              <span className="text-xs font-mono text-muted-foreground">
                {audioBitrate} kbps
              </span>
            </div>

            <Slider
              min={64}
              max={320}
              step={16}
              value={[audioBitrate]}
              onValueChange={(value) => {
                setAudioBitrate(getSliderValue(value));
              }}
              onValueCommitted={(value) => {
                setSettings({
                  audio_bitrate: getSliderValue(value),
                });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type SettingsSelectProps = {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (value: string) => void;
};

function SettingsSelect({
  label,
  value,
  options,
  onChange,
}: SettingsSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>

      <Select
        value={value}
        onValueChange={(value) => {
          onChange(value ?? '');
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>

        <SelectContent>
          <SelectGroup>
            {options.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
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
