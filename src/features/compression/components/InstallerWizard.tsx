import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/button';
import { Input } from '@/components/input';
import { Label } from '@/components/label';
import logoSrc from '@/assets/logo-128.png';
import type { ExistingInstallation } from '../types';

interface InstallerWizardProps {
  onComplete: () => void;
}

type Step = 'welcome' | 'location' | 'installing' | 'complete';

export function InstallerWizard({ onComplete }: InstallerWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [installDir, setInstallDir] = useState('');
  const [existingInstall, setExistingInstall] = useState<ExistingInstallation | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDefaults();
  }, []);

  const loadDefaults = async () => {
    try {
      const defaultDir = await invoke<string>('get_default_install_dir');
      setInstallDir(defaultDir);

      const existing = await invoke<ExistingInstallation | null>('check_existing_installation');
      if (existing) {
        setExistingInstall(existing);
      }
    } catch (error) {
      console.error('Failed to load defaults:', error);
    }
  };

  const pickDirectory = async () => {
    try {
      const selected = await invoke<string | null>('pick_directory');
      if (selected) {
        setInstallDir(selected);
      }
    } catch (error) {
      console.error('Failed to pick directory:', error);
    }
  };

  const startInstallation = async () => {
    setStep('installing');
    setError(null);

    try {
      // If existing installation is running, terminate it
      if (existingInstall?.is_running) {
        await invoke('terminate_existing_instance');
      }

      // Simulate installation progress
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Save installation directory to settings
      await invoke('update_setting', {
        key: 'install_directory',
        value: installDir,
      });

      setStep('complete');
    } catch (error) {
      setError(String(error));
      setStep('location');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <WelcomeStep
            key="welcome"
            existingInstall={existingInstall}
            onNext={() => setStep('location')}
            onUpgrade={() => setStep('location')}
          />
        )}

        {step === 'location' && (
          <LocationStep
            key="location"
            installDir={installDir}
            onDirChange={setInstallDir}
            onPickDir={pickDirectory}
            onBack={() => setStep('welcome')}
            onNext={startInstallation}
          />
        )}

        {step === 'installing' && (
          <InstallingStep key="installing" progress={progress} error={error} />
        )}

        {step === 'complete' && (
          <CompleteStep key="complete" onFinish={onComplete} />
        )}
      </AnimatePresence>
    </div>
  );
}

function WelcomeStep({
  existingInstall,
  onNext,
  onUpgrade,
}: {
  existingInstall: ExistingInstallation | null;
  onNext: () => void;
  onUpgrade: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-md space-y-8 rounded-2xl border bg-card p-8 shadow-2xl"
    >
      <div className="flex flex-col items-center gap-4">
        <img src={logoSrc} alt="Compify" className="size-20 rounded-2xl" />
        <h1 className="text-2xl font-bold">Welcome to Compify</h1>
        <p className="text-center text-sm text-muted-foreground">
          Professional video compression made simple
        </p>
      </div>

      {existingInstall && (
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <span className="icon-[lucide--alert-circle] size-5 text-yellow-500" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold">Existing Installation Detected</p>
              <p className="text-xs text-muted-foreground">
                Found at: {existingInstall.path}
              </p>
              {existingInstall.is_running && (
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  The application is currently running and will be closed during upgrade.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {existingInstall ? (
          <Button className="w-full" size="lg" onClick={onUpgrade}>
            Upgrade Installation
          </Button>
        ) : (
          <Button className="w-full" size="lg" onClick={onNext}>
            Get Started
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function LocationStep({
  installDir,
  onDirChange,
  onPickDir,
  onBack,
  onNext,
}: {
  installDir: string;
  onDirChange: (dir: string) => void;
  onPickDir: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-2xl"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Choose Installation Location</h2>
        <p className="text-sm text-muted-foreground">
          Select where Compify will be installed
        </p>
      </div>

      <div className="space-y-3">
        <Label htmlFor="install-dir">Installation Directory</Label>
        <div className="flex gap-2">
          <Input
            id="install-dir"
            value={installDir}
            onChange={(e) => onDirChange(e.target.value)}
            placeholder="Select installation directory"
            className="flex-1"
          />
          <Button variant="outline" onClick={onPickDir}>
            <span className="icon-[lucide--folder] size-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Recommended: Use the default location for best compatibility
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button className="flex-1" onClick={onNext} disabled={!installDir}>
          Install
        </Button>
      </div>
    </motion.div>
  );
}

function InstallingStep({ progress, error }: { progress: number; error: string | null }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-2xl"
    >
      <div className="space-y-2 text-center">
        <h2 className="text-xl font-bold">
          {error ? 'Installation Failed' : 'Installing Compify'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {error ? error : 'Please wait while we set everything up...'}
        </p>
      </div>

      {!error && (
        <div className="space-y-3">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground">{progress}%</p>
        </div>
      )}
    </motion.div>
  );
}

function CompleteStep({ onFinish }: { onFinish: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 shadow-2xl"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-500/20">
          <span className="icon-[lucide--check] size-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold">Installation Complete!</h2>
        <p className="text-center text-sm text-muted-foreground">
          Compify is ready to compress your videos
        </p>
      </div>

      <Button className="w-full" size="lg" onClick={onFinish}>
        Launch Compify
      </Button>
    </motion.div>
  );
}
