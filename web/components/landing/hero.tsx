"use client"

import { useEffect, useState } from "react"
import { motion } from "motion/react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DOWNLOADS, GITHUB_REPO, GITHUB_RELEASES_API } from "@/lib/constants"

type OS = "windows" | "mac" | "linux"

function detectOS(): OS {
  if (typeof navigator === "undefined") return "windows"
  const ua = navigator.userAgent
  if (/Mac/i.test(ua)) return "mac"
  if (/Linux/i.test(ua)) return "linux"
  return "windows"
}

function WindowsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
  )
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function LinuxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a4.46 4.46 0 001.032 2.31c1.056 1.708 2.926 2.963 4.512 3.29.443.074 1.048.146 1.618.146.89 0 1.77-.152 2.38-.46 2.537-1.151 4.164-3.455 3.984-5.869-.15-2.084-1.67-3.99-3.44-5.014-.24-.143-1.035-.563-.976-1.025.058-.437.663-.677 1.05-.83.392-.155.773-.236 1.09-.347 1.12-.39 1.928-1.228 2.09-2.264.14-.936-.177-1.925-.652-2.846-.41-.798-.956-1.527-1.508-2.196-.282-.337-.564-.676-.834-1.025-.194-.255-.5-.614-.66-.849-.41-.61-1.045-.808-1.707-.808z" />
    </svg>
  )
}

const OS_META: Record<OS, { label: string; icon: React.FC<{ className?: string }> }> = {
  windows: { label: "Windows", icon: WindowsIcon },
  mac: { label: "macOS", icon: AppleIcon },
  linux: { label: "Linux", icon: LinuxIcon },
}

type DownloadEntry = { url: string; label: string; size: string }

function getLatestDownloads(assets: { name: string; browser_download_url: string }[]) {
  const find = (pattern: RegExp) =>
    assets.find((a) => pattern.test(a.name))?.browser_download_url

  return {
    windows: {
      primary: { url: find(/Setup-windows-x64\.exe$/) ?? DOWNLOADS.windows.primary.url, label: DOWNLOADS.windows.primary.label, size: "" },
      portable: { url: find(/portable-windows-x64\.exe$/) ?? DOWNLOADS.windows.portable.url, label: DOWNLOADS.windows.portable.label, size: "" },
    },
    mac: {
      primary: { url: find(/macos-universal\.dmg$/) ?? DOWNLOADS.mac.primary.url, label: DOWNLOADS.mac.primary.label, size: "" },
      portable: { url: find(/portable-macos-universal\.zip$/) ?? DOWNLOADS.mac.portable.url, label: DOWNLOADS.mac.portable.label, size: "" },
    },
    linux: {
      primary: { url: find(/linux-x86_64\.AppImage$/) ?? DOWNLOADS.linux.primary.url, label: DOWNLOADS.linux.primary.label, size: "" },
      deb: { url: find(/linux-amd64\.deb$/) ?? DOWNLOADS.linux.deb.url, label: DOWNLOADS.linux.deb.label, size: "" },
      portable: { url: find(/portable-linux-x86_64$/) ?? DOWNLOADS.linux.portable.url, label: DOWNLOADS.linux.portable.label, size: "" },
    },
  }
}

type Downloads = typeof DOWNLOADS

function PlatformSection({
  icon: Icon,
  label,
  items,
}: {
  icon: React.FC<{ className?: string }>
  label: string
  items: DownloadEntry[]
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
        <Icon className="size-3" />
        {label}
      </p>
      {items.map((d) => (
        <a
          key={d.label}
          href={d.url}
          className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-white/[0.06]"
        >
          <span className="text-white/70">{d.label}</span>
          {d.size && <span className="text-white/30">{d.size}</span>}
        </a>
      ))}
    </div>
  )
}

export function Hero() {
  const [os, setOS] = useState<OS>("windows")
  const [downloads, setDownloads] = useState<Downloads>(DOWNLOADS)

  useEffect(() => {
    setOS(detectOS())
  }, [])

  useEffect(() => {
    fetch(GITHUB_RELEASES_API)
      .then((r) => r.json())
      .then((d) => {
        if (!Array.isArray(d.assets)) return
        setDownloads(getLatestDownloads(d.assets) as Downloads)
      })
      .catch(() => {})
  }, [])

  const { label: osLabel, icon: OsIcon } = OS_META[os]
  const primaryDownload =
    os === "windows"
      ? downloads.windows.primary
      : os === "mac"
      ? downloads.mac.primary
      : downloads.linux.primary

  return (
    <section className="relative overflow-hidden pb-0 pt-28">
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px]" />
      {/* Radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_40%_at_50%_-5%,rgba(99,102,241,0.18),transparent)]" />

      <div className="relative mx-auto max-w-4xl px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.05] px-3.5 py-1.5 text-xs font-medium text-white/60"
        >
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Free &amp; Open Source · v0.1.0 Now Available
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="mb-5 text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-[5rem] lg:leading-[1.05]"
        >
          Compress any video.{" "}
          <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Upload nothing.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/50"
        >
          Compify is a free, open-source desktop video compressor with smart presets,
          GPU acceleration, and real-time progress — all running locally.
        </motion.p>

        {/* Download CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mb-4 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href={primaryDownload.url}
            className="group flex items-center gap-2.5 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-black shadow-lg shadow-white/10 transition-all hover:bg-white/90 active:scale-[0.98]"
          >
            <OsIcon className="size-4" />
            Download for {osLabel}
            {primaryDownload.size && (
              <span className="text-black/40 text-xs">{primaryDownload.size}</span>
            )}
          </a>

          <Popover>
            <PopoverTrigger className="cursor-pointer rounded-xl border border-white/[0.1] bg-white/[0.05] px-4 py-3 text-sm font-medium text-white/60 transition-all hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white data-[popup-open]:border-white/[0.2] data-[popup-open]:bg-white/[0.1] data-[popup-open]:text-white">
              Other platforms
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="center"
              sideOffset={8}
              className="w-auto min-w-[480px] rounded-2xl border border-white/[0.08] bg-[#0f0f0f] p-5 shadow-2xl shadow-black/60 ring-0 gap-0"
            >
              <div className="grid grid-cols-3 gap-4">
                <PlatformSection
                  icon={WindowsIcon}
                  label="Windows"
                  items={[downloads.windows.primary, downloads.windows.portable]}
                />
                <PlatformSection
                  icon={AppleIcon}
                  label="macOS"
                  items={[downloads.mac.primary, downloads.mac.portable]}
                />
                <PlatformSection
                  icon={LinuxIcon}
                  label="Linux"
                  items={[downloads.linux.primary, downloads.linux.deb, downloads.linux.portable]}
                />
              </div>
              <p className="mt-4 border-t border-white/[0.05] pt-3 text-center text-[11px] text-white/25">
                All releases on{" "}
                <a
                  href={`${GITHUB_REPO}/releases`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 transition-colors hover:text-white"
                >
                  GitHub Releases
                </a>
              </p>
            </PopoverContent>
          </Popover>
        </motion.div>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.36 }}
          className="mb-16 text-xs text-white/25"
        >
          Free forever · Open source on{" "}
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 underline-offset-2 transition-colors hover:text-white hover:underline"
          >
            GitHub
          </a>
        </motion.p>

        {/* App GIF */}
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto"
        >
          <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-gradient-to-b from-violet-500/15 via-blue-500/10 to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] shadow-2xl shadow-black/70">
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] bg-[#0d0d0d] px-4 py-2.5">
              <div className="size-3 rounded-full bg-red-500/60" />
              <div className="size-3 rounded-full bg-yellow-500/60" />
              <div className="size-3 rounded-full bg-green-500/60" />
              <span className="ml-3 text-[11px] text-white/20">Compify</span>
            </div>
            <img
              src="/app.gif"
              alt="Compify video compression app in action — drag, drop, compress"
              className="w-full"
              loading="eager"
            />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
