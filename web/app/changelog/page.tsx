import type { Metadata } from "next"
import Link from "next/link"
import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"
import { CHANGELOG, APP_NAME, GITHUB_REPO, CURRENT_VERSION } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Changelog",
  description: `Release history and feature updates for ${APP_NAME} — free open-source video compressor.`,
}

const SECTION_ICONS: Record<string, string> = {
  "Core Compression": "⚡",
  "Compression Controls": "🎚",
  "Workflow & UX": "✨",
  "Platform & Technical": "🖥",
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#080808]">
      <Header />

      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32">
        {/* Page header */}
        <div className="mb-14">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-white/30 transition-colors hover:text-white/60"
          >
            <svg className="size-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
            Back
          </Link>

          <h1 className="text-3xl font-bold text-white sm:text-4xl">Changelog</h1>
          <p className="mt-2 text-white/45">
            New features, fixes, and improvements to {APP_NAME}.
          </p>
        </div>

        {/* Releases */}
        <div className="space-y-16">
          {CHANGELOG.map((release) => (
            <article key={release.version}>
              {/* Release header */}
              <div className="mb-8 flex items-start gap-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-violet-500/20">
                    v{release.version.split(".")[0]}
                  </div>
                  <div className="w-px flex-1 bg-white/[0.06]" />
                </div>

                <div className="flex-1 pb-6">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-white">v{release.version}</h2>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      {release.tag}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-white/35">
                    Released{" "}
                    {new Date(release.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>

                  {/* Sections */}
                  <div className="mt-8 space-y-8">
                    {release.sections.map((section) => (
                      <div key={section.title}>
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                          <span>{SECTION_ICONS[section.title] ?? "•"}</span>
                          {section.title}
                        </h3>
                        <ul className="space-y-2">
                          {section.items.map((item, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-sm leading-relaxed text-white/60"
                            >
                              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-white/25" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Download link for this version */}
                  <div className="mt-8 flex flex-wrap gap-3">
                    <a
                      href={`${GITHUB_REPO}/releases/tag/v${release.version}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition-all hover:border-white/[0.18] hover:text-white"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                      </svg>
                      View on GitHub
                    </a>
                    <a
                      href={`${GITHUB_REPO}/releases/tag/v${release.version}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition-all hover:border-white/[0.18] hover:text-white"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7,10 12,15 17,10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Download v{release.version}
                    </a>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Subscribe hint */}
        <div className="mt-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-white/50">
            Watch{" "}
            <a
              href={`${GITHUB_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/70 underline underline-offset-2 transition-colors hover:text-white"
            >
              the repository
            </a>{" "}
            on GitHub to be notified of new releases.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
