import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/button';
import type { UpdateInfo, AppSettings } from '../types';

export function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    try {
      const settings = await invoke<AppSettings>('load_settings');
      if (!settings.check_updates_on_startup) return;

      const info = await invoke<UpdateInfo>('check_for_updates');
      if (info.available) {
        setUpdateInfo(info);
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  };

  const openReleaseUrl = async () => {
    if (updateInfo?.download_url) {
      try {
        await invoke('open_release_page', { url: updateInfo.download_url });
      } catch (error) {
        console.error('Failed to open release page:', error);
      }
    }
  };

  if (!updateInfo || !updateInfo.available || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="border-b bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-2"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="icon-[lucide--sparkles] size-5 text-blue-500" />
            <div className="text-sm">
              <span className="font-semibold">Update available:</span>{' '}
              <span className="text-muted-foreground">
                Version {updateInfo.latest_version} is ready to download
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={openReleaseUrl}>
              Download
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              <span className="icon-[lucide--x] size-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
