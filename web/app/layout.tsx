import "./globals.css"
import type { Metadata } from "next"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { fontVariables } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { DirectionProvider } from "@/components/ui/direction"
import { AnchoredToastProvider, ToastProvider } from "@/components/ui/toast"
import { APP_NAME, APP_DESCRIPTION, GITHUB_REPO } from "@/lib/constants"

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — Free Open-Source Video Compressor`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "video compressor",
    "video compression",
    "ffmpeg gui",
    "tauri",
    "open source",
    "H.264",
    "H.265",
    "HEVC",
    "AV1",
    "VP9",
    "GPU acceleration",
    "free video converter",
    "batch compression",
    "offline video tool",
  ],
  authors: [{ name: "Taymakz", url: GITHUB_REPO }],
  creator: "Taymakz",
  openGraph: {
    title: `${APP_NAME} — Free Open-Source Video Compressor`,
    description: APP_DESCRIPTION,
    url: "https://compify-tau.vercel.app",
    siteName: APP_NAME,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${APP_NAME} — Free Open-Source Video Compressor`,
    description: APP_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  metadataBase: new URL("https://compify-tau.vercel.app"),
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en-US"
      suppressHydrationWarning
      className={cn("dark antialiased", fontVariables)}
    >
      <body>
        <ThemeProvider forcedTheme="dark">
          <DirectionProvider direction="ltr">
            <ToastProvider position="top-center">
              <AnchoredToastProvider>{children}</AnchoredToastProvider>
            </ToastProvider>
          </DirectionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
