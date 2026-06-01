"use client"

import { useRouter } from "next/navigation"
import { ArrowLeftIcon, HomeIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <Grid />
      <div className="relative mx-auto flex min-h-svh max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 font-mono text-[10px] tracking-[0.4em] text-muted-foreground uppercase">
          وضعیت · ۴۰۴
        </div>

        <BigNumerals />

        <h1 className="mt-10 max-w-md text-2xl leading-tight font-semibold md:text-3xl">
          این صفحه پیدا نشد.
        </h1>
        <p className="mt-2 max-w-sm text-sm text-balance text-muted-foreground">
          شاید لینک قدیمی شده یا صفحه جابه‌جا شده است. آدرس را بررسی کن یا به
          صفحه اصلی برگرد.
        </p>

        <div className="mt-8 flex items-center gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon />
            بازگشت
          </Button>
          <Button size="default" onClick={() => router.push("/")}>
            <HomeIcon />
            صفحه اصلی
          </Button>
        </div>
      </div>
    </div>
  )
}

function BigNumerals() {
  return (
    <div className="relative text-[clamp(8rem,22vw,16rem)] leading-none font-bold tracking-tighter">
      <span className="bg-gradient-to-b from-foreground to-foreground/30 bg-clip-text text-transparent">
        ۴۰۴
      </span>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-2 h-1/2"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, color-mix(in srgb, var(--background) 80%, transparent) 50%, transparent 100%)",
        }}
      />
    </div>
  )
}

function Grid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-[0.35]"
      style={{
        backgroundImage:
          "linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage:
          "radial-gradient(ellipse at center, black 35%, transparent 75%)",
      }}
    />
  )
}
