"use client"

import { useRef, useState } from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

const PRESETS = [
  { name: "Maximum", badge: "Best", desc: "Smallest file size" },
  { name: "Balanced", badge: null, desc: "Good compression" },
  { name: "High Quality", badge: null, desc: "Near-original" },
  { name: "Gaming", badge: null, desc: "60 fps, crisp motion" },
  { name: "Education", badge: null, desc: "Clear text, 60 fps" },
  { name: "Custom", badge: null, desc: "Fine-tune every option" },
]

const FORMATS = ["MP4", "MKV", "MOV", "AVI", "WebM", "M4V"]

const CODECS = ["H.264", "H.265", "VP9", "AV1", "NVENC", "AMF", "QSV"]

// ─── Presets Card ────────────────────────────────────────────────────────────

function PresetsCard({ className }: { className?: string }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const onEnter = () => {
    let i = 0
    intervalRef.current = setInterval(() => {
      i = (i + 1) % PRESETS.length
      setActiveIndex(i)
    }, 380)
  }
  const onLeave = () => {
    if (intervalRef.current !== null) clearInterval(intervalRef.current)
    setActiveIndex(0)
  }

  return (
    <motion.div
      className={cn(
        "group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6",
        className,
      )}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.05 }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {/* Accent glow */}
      <div className="pointer-events-none absolute right-0 top-0 size-48 translate-x-12 -translate-y-12 rounded-full bg-blue-500/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100 opacity-60" />

      <div className="relative z-10">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Built-in profiles
        </p>
        <h3 className="text-lg font-semibold text-white">Smart Presets</h3>
        <p className="mt-1 text-sm text-white/50">
          6 optimized profiles for every workflow — from streaming to archiving.
        </p>
      </div>

      <div className="relative z-10 space-y-0.5">
        {PRESETS.map((preset, i) => {
          const active = i === activeIndex
          return (
            <div
              key={preset.name}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-200",
                active ? "bg-white/[0.07]" : "opacity-40",
              )}
            >
              <div
                className={cn(
                  "size-1.5 shrink-0 rounded-full transition-all duration-200",
                  active
                    ? "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.9)]"
                    : "bg-white/20",
                )}
              />
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  active ? "text-white" : "text-white/60",
                )}
              >
                {preset.name}
              </span>
              <span className="ml-1 text-[11px] text-white/30">{preset.desc}</span>
              {preset.badge && (
                <span
                  className={cn(
                    "ml-auto rounded-full px-1.5 py-px text-[9px] font-bold transition-all duration-200",
                    active
                      ? "bg-amber-500 text-black"
                      : "bg-amber-500/20 text-amber-500/40",
                  )}
                >
                  {preset.badge}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─── GPU Card ─────────────────────────────────────────────────────────────────

function GPUCard({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6",
        className,
      )}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      whileHover="hover"
      animate="rest"
    >
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-violet-500/0 transition-all duration-500 group-hover:bg-violet-500/[0.03]" />

      {/* Chip SVG */}
      <div className="flex items-center justify-center py-2">
        <motion.svg
          viewBox="0 0 88 88"
          className="size-20"
          variants={{ rest: { opacity: 0.45 }, hover: { opacity: 1 } }}
          transition={{ duration: 0.3 }}
        >
          {/* Central chip body */}
          <rect x="22" y="22" width="44" height="44" rx="5" fill="none" stroke="rgba(139,92,246,0.9)" strokeWidth="1.5" />
          {/* Inner highlight */}
          <rect x="30" y="30" width="28" height="28" rx="3" fill="rgba(139,92,246,0.06)" stroke="rgba(139,92,246,0.3)" strokeWidth="0.8" />
          {/* Center dot */}
          <circle cx="44" cy="44" r="4" fill="rgba(139,92,246,0.4)" />

          {/* Pins — top */}
          {[30, 38, 46, 54, 62].map((x) => (
            <line key={`t${x}`} x1={x} y1="22" x2={x} y2="14" stroke="rgba(139,92,246,0.55)" strokeWidth="1.5" strokeLinecap="round" />
          ))}
          {/* Pins — bottom */}
          {[30, 38, 46, 54, 62].map((x) => (
            <line key={`b${x}`} x1={x} y1="66" x2={x} y2="74" stroke="rgba(139,92,246,0.55)" strokeWidth="1.5" strokeLinecap="round" />
          ))}
          {/* Pins — left */}
          {[30, 38, 46, 54, 62].map((y) => (
            <line key={`l${y}`} x1="22" y1={y} x2="14" y2={y} stroke="rgba(139,92,246,0.55)" strokeWidth="1.5" strokeLinecap="round" />
          ))}
          {/* Pins — right */}
          {[30, 38, 46, 54, 62].map((y) => (
            <line key={`r${y}`} x1="66" y1={y} x2="74" y2={y} stroke="rgba(139,92,246,0.55)" strokeWidth="1.5" strokeLinecap="round" />
          ))}
        </motion.svg>
      </div>

      <div>
        <h3 className="text-base font-semibold text-white">GPU Acceleration</h3>
        <p className="mt-1 text-sm text-white/50">
          NVENC, AMD AMF, Intel QuickSync for blazing-fast encoding.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {CODECS.map((codec, i) => (
          <motion.span
            key={codec}
            className="rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[10px] text-white/50"
            variants={{
              rest: { scale: 1, backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" },
              hover: {
                scale: 1.05,
                backgroundColor: "rgba(139,92,246,0.15)",
                color: "rgba(255,255,255,0.9)",
                transition: { delay: i * 0.04, duration: 0.2 },
              },
            }}
          >
            {codec}
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Zero Upload Card ─────────────────────────────────────────────────────────

function PrivacyCard({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6",
        className,
      )}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15 }}
      whileHover="hover"
      animate="rest"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/0 blur-2xl transition-all duration-500 group-hover:bg-emerald-500/10" />

      {/* Shield SVG */}
      <div className="flex items-center justify-center py-2">
        <motion.svg
          viewBox="0 0 80 80"
          className="size-16"
          variants={{ rest: { opacity: 0.5 }, hover: { opacity: 1 } }}
          transition={{ duration: 0.3 }}
        >
          {/* Shield */}
          <path
            d="M40 8 L62 18 L62 38 C62 52 52 62 40 68 C28 62 18 52 18 38 L18 18 Z"
            fill="rgba(16,185,129,0.08)"
            stroke="rgba(16,185,129,0.7)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Checkmark */}
          <motion.path
            d="M28 40 L36 48 L52 32"
            fill="none"
            stroke="rgba(16,185,129,0.9)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={{
              rest: { pathLength: 0.6, opacity: 0.5 },
              hover: { pathLength: 1, opacity: 1 },
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </motion.svg>
      </div>

      <div>
        <h3 className="text-base font-semibold text-white">Zero Upload</h3>
        <p className="mt-1 text-sm text-white/50">
          Everything runs locally. Your videos never leave your machine.
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-emerald-400/70">
        <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        100% offline processing
      </div>
    </motion.div>
  )
}

// ─── Formats Card ─────────────────────────────────────────────────────────────

function FormatsCard({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6",
        className,
      )}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.05 }}
      whileHover="hover"
      animate="rest"
    >
      <div>
        <h3 className="text-base font-semibold text-white">All Formats</h3>
        <p className="mt-1 text-sm text-white/50">Output to any container you need.</p>
      </div>

      {/* Waveform / file type illustration */}
      <div className="flex items-end justify-center gap-1 py-2 h-12">
        {[28, 44, 36, 52, 40, 32].map((h, i) => (
          <motion.div
            key={i}
            className="w-4 rounded-sm bg-gradient-to-t from-blue-500/40 to-violet-500/40"
            style={{ height: `${h}px` }}
            variants={{
              rest: { height: `${h}px`, opacity: 0.4 },
              hover: { height: `${h + 8}px`, opacity: 1, transition: { delay: i * 0.04 } },
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {FORMATS.map((fmt, i) => (
          <motion.span
            key={fmt}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 font-mono text-xs font-semibold text-white/60"
            variants={{
              rest: { y: 0, opacity: 0.6 },
              hover: {
                y: -3,
                opacity: 1,
                borderColor: "rgba(96,165,250,0.35)",
                color: "rgba(255,255,255,0.95)",
                transition: { delay: i * 0.05, type: "spring", stiffness: 260, damping: 16 },
              },
            }}
          >
            {fmt}
          </motion.span>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Progress Card ────────────────────────────────────────────────────────────

function ProgressCard({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6",
        className,
      )}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      whileHover="hover"
      animate="rest"
    >
      <div className="pointer-events-none absolute bottom-0 left-0 size-56 -translate-x-16 translate-y-20 rounded-full bg-blue-500/8 blur-3xl transition-opacity duration-500 group-hover:opacity-100 opacity-50" />

      <div className="relative z-10">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Live feedback
        </p>
        <h3 className="text-lg font-semibold text-white">Real-time Progress</h3>
        <p className="mt-1 text-sm text-white/50">
          Monitor FPS, encoding speed, ETA, and size as compression runs.
        </p>
      </div>

      {/* Progress UI mock */}
      <div className="relative z-10 rounded-xl border border-white/[0.06] bg-black/20 p-4">
        {/* File rows */}
        <div className="mb-3 space-y-2.5">
          {[
            { name: "gaming_clip_2024.mp4", pct: 72, active: true },
            { name: "tutorial_recording.mkv", pct: 100, active: false },
          ].map(({ name, pct, active }) => (
            <div key={name}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-white/60 truncate max-w-[70%]">
                  {name}
                </span>
                <motion.span
                  className={cn(
                    "text-[11px] font-semibold",
                    active ? "text-blue-400" : "text-emerald-400",
                  )}
                  variants={{
                    rest: { opacity: 0.6 },
                    hover: { opacity: 1 },
                  }}
                >
                  {active ? "72%" : "Done"}
                </motion.span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    active
                      ? "bg-gradient-to-r from-blue-500 to-violet-500"
                      : "bg-emerald-500/60",
                  )}
                  variants={
                    active
                      ? { rest: { width: "25%" }, hover: { width: "72%" } }
                      : { rest: { width: "100%" }, hover: { width: "100%" } }
                  }
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="flex gap-4 border-t border-white/[0.05] pt-3">
          {[
            { k: "fps", v: "58" },
            { k: "speed", v: "2.3×" },
            { k: "eta", v: "0:18" },
            { k: "size", v: "24 MB" },
          ].map(({ k, v }) => (
            <div key={k}>
              <p className="text-[9px] uppercase tracking-widest text-white/25">{k}</p>
              <p className="mt-0.5 text-xs font-semibold text-white/70">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Batch Card ───────────────────────────────────────────────────────────────

function BatchCard({ className }: { className?: string }) {
  return (
    <motion.div
      className={cn(
        "group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6",
        className,
      )}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.15 }}
      whileHover="hover"
      animate="rest"
    >
      <div>
        <h3 className="text-base font-semibold text-white">Batch Processing</h3>
        <p className="mt-1 text-sm text-white/50">
          Drop multiple files and compress them all at once.
        </p>
      </div>

      {/* Stacked file cards */}
      <div className="relative mx-auto h-24 w-full max-w-[160px]">
        {[
          {
            bg: "bg-white/[0.03]",
            vars: { rest: { rotate: -5, x: -20, y: 10 }, hover: { rotate: -8, x: -28, y: 16 } },
          },
          {
            bg: "bg-white/[0.05]",
            vars: { rest: { rotate: -2, x: -10, y: 5 }, hover: { rotate: -4, x: -14, y: 8 } },
          },
          {
            bg: "bg-white/[0.07]",
            vars: { rest: { rotate: 0, x: 0, y: 0 }, hover: { rotate: 0, x: 0, y: 0 } },
            isTop: true,
          },
        ].map(({ bg, vars, isTop }, i) => (
          <motion.div
            key={i}
            className={cn(
              "absolute inset-x-0 top-4 h-14 rounded-xl border border-white/[0.08]",
              bg,
            )}
            variants={{
              rest: vars.rest,
              hover: { ...vars.hover, transition: { duration: 0.3, delay: i * 0.04 } },
            }}
          >
            {isTop && (
              <div className="flex items-center gap-2 p-3">
                <div className="size-1.5 rounded-full bg-blue-400 animate-pulse" />
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div className="h-full w-3/5 rounded-full bg-blue-400/50" />
                </div>
                <span className="text-[9px] font-semibold text-white/30">4 files</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="mt-auto flex items-center gap-1.5 text-xs text-white/30">
        <div className="size-1 rounded-full bg-blue-400/60" />
        Pause · Resume · Cancel any job
      </div>
    </motion.div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function Bento() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/30">
          What&apos;s inside
        </p>
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          Everything you need to compress video
        </h2>
        <p className="mt-3 text-white/45">
          No bloat. No subscription. No cloud. Just fast, powerful local compression.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Row 1 — two large cards */}
        <PresetsCard className="md:col-span-2" />
        <ProgressCard className="md:col-span-2" />
        {/* Row 2 — four equal cards */}
        <FormatsCard />
        <GPUCard />
        <PrivacyCard />
        <BatchCard />
      </div>
    </section>
  )
}
