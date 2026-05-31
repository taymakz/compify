import { motion } from 'motion/react';
import { Button } from '@/components/button';
import { useFFmpegSetup } from '../hooks/use-ffmpeg-setup';
import logoSrc from '@/assets/logo-128.png';

export function FFmpegInstaller() {
  const { isInstalling, installProgress, installPhase, install } = useFFmpegSetup();

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex max-w-md flex-col items-center gap-8 px-8 text-center"
      >
        <motion.img
          src={logoSrc}
          alt="Compify"
          animate={isInstalling ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={isInstalling ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
          className="size-24 rounded-2xl object-contain shadow-lg"
        />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Compify</h1>
          <p className="text-muted-foreground">
            FFmpeg is required to compress and convert videos. It will be downloaded and installed
            automatically — no manual setup needed.
          </p>
        </div>

        {isInstalling ? (
          <div className="w-full space-y-3">
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-primary"
                animate={{ width: `${installProgress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{installPhase}</p>
          </div>
        ) : (
          <Button size="lg" onClick={install} className="w-full gap-2">
            <span className="icon-[material-symbols--download] size-4" />
            Install FFmpeg &amp; Continue
          </Button>
        )}

        <p className="text-xs text-muted-foreground/60">
          ~120 MB · Downloaded from github.com/BtbN/FFmpeg-Builds · Stored locally
        </p>
      </motion.div>
    </div>
  );
}
