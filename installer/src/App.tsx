import { useState, useEffect, useRef } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { motion, AnimatePresence } from "motion/react";
import logoSrc from "./assets/logo-128.png";

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = "welcome" | "location" | "installing" | "complete";

interface ExistingInstallation {
  path: string;
  version: string | null;
  is_running: boolean;
}

interface InstallEventPayload {
  event: "progress" | "complete" | "error";
  data: { percent?: number; message?: string; exe_path?: string };
}

interface InstallOptions {
  create_desktop_shortcut: boolean;
  terminate_existing: boolean;
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState<Step>("welcome");
  const [installDir, setInstallDir] = useState("");
  const [desktopShortcut, setDesktopShortcut] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Preparing…");
  const [installedExe, setInstalledExe] = useState("");
  const [existing, setExisting] = useState<ExistingInstallation | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  useEffect(() => {
    invoke<string>("get_default_install_dir").then(setInstallDir).catch(console.error);
    invoke<ExistingInstallation | null>("check_existing_installation").then(setExisting).catch(console.error);
  }, []);

  const pickFolder = async () => {
    try {
      const dir = await invoke<string | null>("pick_directory");
      if (dir) setInstallDir(dir);
    } catch {}
  };

  const startInstall = async () => {
    setStep("installing");
    setInstallError(null);
    setProgress(0);
    setStatusMsg("Preparing…");

    const channel = new Channel<InstallEventPayload>();
    channel.onmessage = (msg) => {
      if (msg.event === "progress") {
        setProgress(msg.data.percent ?? 0);
        setStatusMsg(msg.data.message ?? "");
      } else if (msg.event === "complete") {
        setInstalledExe(msg.data.exe_path ?? "");
        setTimeout(() => setStep("complete"), 500);
      } else if (msg.event === "error") {
        setInstallError(msg.data.message ?? "Installation failed");
        setStep("location");
      }
    };

    try {
      await invoke("install_app", {
        installDir,
        options: { create_desktop_shortcut: desktopShortcut, terminate_existing: existing?.is_running ?? false } satisfies InstallOptions,
        onEvent: channel,
      });
    } catch (e) {
      setInstallError(String(e));
      setStep("location");
    }
  };

  const launchAndClose = async () => {
    await invoke("launch_app", { exePath: installedExe }).catch(console.error);
    invoke("exit_installer").catch(() => getCurrentWindow().close().catch(console.error));
  };

  const closeInstaller = () => {
    invoke("exit_installer").catch(() => getCurrentWindow().close().catch(console.error));
  };

  const win = getCurrentWindow();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg)", overflow: "hidden" }}>
      {/* ── Custom titlebar ─────────────────────────────────────────────────── */}
      <div
        data-tauri-drag-region
        style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: 36, paddingInline: 8, flexShrink: 0, gap: 2 }}
      >
        <TitlebarBtn onClick={() => win.minimize().catch(console.error)} title="Minimize">
          <svg width="10" height="1.5" viewBox="0 0 10 1.5"><rect width="10" height="1.5" fill="currentColor" /></svg>
        </TitlebarBtn>
        <TitlebarBtn onClick={closeInstaller} title="Close" danger>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
          </svg>
        </TitlebarBtn>
      </div>

      {/* ── Top accent bar ──────────────────────────────────────────────────── */}
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, var(--accent), transparent)", opacity: 0.6, flexShrink: 0 }} />

      {/* ── Step content ────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        <AnimatePresence mode="wait" initial={false}>
          {step === "welcome" && (
            <StepPane key="welcome">
              <WelcomeStep onNext={() => setStep("location")} />
            </StepPane>
          )}
          {step === "location" && (
            <StepPane key="location">
              <LocationStep
                installDir={installDir}
                onDirChange={setInstallDir}
                onPickDir={pickFolder}
                desktopShortcut={desktopShortcut}
                onDesktopShortcutChange={setDesktopShortcut}
                existing={existing}
                error={installError}
                onBack={() => setStep("welcome")}
                onInstall={startInstall}
              />
            </StepPane>
          )}
          {step === "installing" && (
            <StepPane key="installing">
              <InstallingStep progress={progress} statusMsg={statusMsg} />
            </StepPane>
          )}
          {step === "complete" && (
            <StepPane key="complete">
              <CompleteStep onLaunch={launchAndClose} onClose={closeInstaller} />
            </StepPane>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Shared step wrapper ───────────────────────────────────────────────────────

function StepPane({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ height: "100%", display: "flex", flexDirection: "column", padding: "20px 32px 28px" }}
    >
      {children}
    </motion.div>
  );
}

// ── Step: Welcome ─────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  const features = [
    { color: "#f59e0b", icon: <BoltIcon />, label: "Hardware accelerated", desc: "Uses your GPU for faster compression" },
    { color: "#6366f1", icon: <TuneIcon />, label: "Smart presets", desc: "Gaming, education, quality & more" },
    { color: "#22c55e", icon: <FolderIcon />, label: "Batch processing", desc: "Drop multiple videos at once" },
  ];

  return (
    <>
      {/* Branding */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, paddingBlock: 12 }}>
        <img src={logoSrc} alt="Compify" style={{ width: 68, height: 68, borderRadius: 18, objectFit: "contain", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }} />
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px", color: "var(--text)" }}>Compify</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Professional Video Compressor · v0.1</p>
        </div>
      </div>

      <Divider />

      {/* Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {features.map(f => (
          <div key={f.label} style={{
            display: "flex", alignItems: "flex-start", gap: 12,
            padding: "11px 14px", borderRadius: "var(--r)",
            background: "var(--bg-card)", border: "1px solid var(--border)",
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: f.color + "18",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: f.color,
            }}>
              {f.icon}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.label}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Divider />

      {/* Action */}
      <PrimaryButton onClick={onNext}>
        Install Compify <ArrowIcon />
      </PrimaryButton>
    </>
  );
}

// ── Step: Location ────────────────────────────────────────────────────────────

function LocationStep({
  installDir, onDirChange, onPickDir,
  desktopShortcut, onDesktopShortcutChange,
  existing, error, onBack, onInstall,
}: {
  installDir: string;
  onDirChange: (v: string) => void;
  onPickDir: () => void;
  desktopShortcut: boolean;
  onDesktopShortcutChange: (v: boolean) => void;
  existing: ExistingInstallation | null;
  error: string | null;
  onBack: () => void;
  onInstall: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <SectionLabel>Installation location</SectionLabel>

      {/* Directory picker */}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <input
          ref={inputRef}
          value={installDir}
          onChange={e => onDirChange(e.target.value)}
          placeholder="C:\Users\...\Compify"
          style={{
            flex: 1, height: 36, paddingInline: 12,
            background: "var(--bg-input)", border: "1px solid var(--border)",
            borderRadius: "var(--r-sm)", color: "var(--text)", fontSize: 12,
            outline: "none", transition: "border-color 0.15s",
            fontFamily: "monospace",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--border-focus)")}
          onBlur={e => (e.target.style.borderColor = "var(--border)")}
        />
        <button
          onClick={onPickDir}
          style={{
            width: 36, height: 36, borderRadius: "var(--r-sm)",
            background: "var(--bg-card)", border: "1px solid var(--border)",
            color: "var(--text-muted)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; (e.currentTarget as HTMLElement).style.color = "var(--text)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--bg-card)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}
        >
          <FolderIcon size={15} />
        </button>
      </div>

      {/* Disk space note */}
      <p style={{ fontSize: 11, color: "var(--text-subtle)", marginTop: 5 }}>
        Requires approx. 50 MB of free space
      </p>

      {/* Options */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        <SectionLabel>Options</SectionLabel>
        <CheckboxRow
          checked={desktopShortcut}
          onChange={onDesktopShortcutChange}
          label="Create desktop shortcut"
        />
      </div>

      {/* Existing installation warning */}
      {existing && (
        <InfoBox color="warning">
          <WarningIcon />
          <div>
            <p style={{ fontWeight: 600, fontSize: 12 }}>Existing installation found</p>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 2 }}>{existing.path}</p>
            {existing.is_running && (
              <p style={{ color: "var(--warning)", fontSize: 11, marginTop: 2 }}>
                Compify is running — it will be closed during installation
              </p>
            )}
          </div>
        </InfoBox>
      )}

      {/* Error */}
      {error && (
        <InfoBox color="error">
          <ErrorIcon />
          <p style={{ fontSize: 12 }}>{error}</p>
        </InfoBox>
      )}

      {/* Footer */}
      <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 16 }}>
        <GhostButton onClick={onBack} style={{ width: 90 }}>
          ← Back
        </GhostButton>
        <PrimaryButton onClick={onInstall} disabled={!installDir} style={{ flex: 1 }}>
          Install
        </PrimaryButton>
      </div>
    </>
  );
}

// ── Step: Installing ──────────────────────────────────────────────────────────

function InstallingStep({ progress, statusMsg }: { progress: number; statusMsg: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 0 }}>
      {/* Pulsing logo */}
      <motion.img
        src={logoSrc}
        alt="Compify"
        animate={{ scale: [1, 1.06, 1], opacity: [1, 0.75, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: 72, height: 72, borderRadius: 20, objectFit: "contain", boxShadow: "0 0 40px rgba(99,102,241,0.18)", marginBottom: 24 }}
      />

      <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>Installing Compify</h2>
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 28, minHeight: 20 }}>{statusMsg}</p>

      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 320 }}>
        <div style={{
          height: 4, borderRadius: 99, background: "var(--bg-input)",
          overflow: "hidden", marginBottom: 10,
        }}>
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            style={{ height: "100%", borderRadius: 99, background: "var(--accent)", boxShadow: "0 0 10px var(--accent)" }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-subtle)" }}>
          <span>{statusMsg}</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

    </div>
  );
}

// ── Step: Complete ────────────────────────────────────────────────────────────

function CompleteStep({ onLaunch, onClose }: { onLaunch: () => void; onClose: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 0 }}>
      {/* Success circle */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 18 }}
        style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "var(--success-bg)",
          border: "2px solid rgba(34,197,94,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        style={{ textAlign: "center", marginBottom: 32 }}
      >
        <h2 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>Installation complete!</h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Compify is ready to compress your videos.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.25 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%", maxWidth: 260 }}
      >
        <PrimaryButton onClick={onLaunch} style={{ width: "100%" }}>
          Launch Compify <ArrowIcon />
        </PrimaryButton>
        <button
          onClick={onClose}
          style={{ fontSize: 12, color: "var(--text-subtle)", background: "none", border: "none", cursor: "pointer", padding: "4px 8px" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-muted)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-subtle)")}
        >
          Close installer
        </button>
      </motion.div>
    </div>
  );
}

// ── UI primitives ─────────────────────────────────────────────────────────────

function TitlebarBtn({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title?: string; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: hov ? (danger ? "#ef444418" : "var(--bg-card)") : "transparent",
        color: hov ? (danger ? "var(--destructive)" : "var(--text)") : "var(--text-subtle)",
        transition: "background 0.12s, color 0.12s",
      }}
    >
      {children}
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled, style }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; style?: React.CSSProperties }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 40, paddingInline: 24, borderRadius: "var(--r)",
        background: disabled ? "var(--bg-card)" : hov ? "#d4d4d8" : "var(--primary)",
        color: disabled ? "var(--text-subtle)" : "var(--primary-fg)",
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600, fontSize: 14, letterSpacing: "0.01em",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        transition: "background 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, style }: { children: React.ReactNode; onClick: () => void; style?: React.CSSProperties }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 40, paddingInline: 16, borderRadius: "var(--r)",
        background: hov ? "var(--bg-card)" : "transparent",
        color: hov ? "var(--text)" : "var(--text-muted)",
        border: "1px solid var(--border)", cursor: "pointer",
        fontWeight: 500, fontSize: 13,
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s, color 0.15s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function CheckboxRow({ checked, onChange, label, disabled }: { checked: boolean; onChange?: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: disabled ? "default" : "pointer" }}>
      <div
        onClick={() => !disabled && onChange?.(!checked)}
        style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          background: checked ? "var(--accent)" : "var(--bg-input)",
          border: `1px solid ${checked ? "var(--accent)" : "var(--border)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "background 0.15s, border-color 0.15s",
        }}
      >
        {checked && (
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
            <polyline points="1.5 4.5 3.5 6.5 7.5 2.5" />
          </svg>
        )}
      </div>
      <span style={{ fontSize: 13, color: disabled ? "var(--text-subtle)" : "var(--text-muted)" }}>{label}</span>
    </label>
  );
}

function InfoBox({ children, color }: { children: React.ReactNode; color: "warning" | "error" }) {
  const c = color === "warning" ? { bg: "var(--warning-bg)", border: "rgba(245,158,11,0.2)" } : { bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.2)" };
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, marginTop: 12,
      padding: "10px 12px", borderRadius: "var(--r)",
      background: c.bg, border: `1px solid ${c.border}`,
      color: color === "warning" ? "var(--warning)" : "var(--destructive)",
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-subtle)" }}>{children}</p>;
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)", margin: "16px 0" }} />;
}

// ── Icon components ───────────────────────────────────────────────────────────

function VideoIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <polygon points="10 8 16 12 10 16 10 8" fill="var(--text-muted)" stroke="none" />
    </svg>
  );
}

function FolderIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function BoltIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
}

function TuneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="8" cy="6" r="2" fill="currentColor" /><circle cx="16" cy="12" r="2" fill="currentColor" /><circle cx="10" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function ArrowIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
}
