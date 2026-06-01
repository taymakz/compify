import "./globals.css"
import { ThemeProvider } from "@/components/ui/theme-provider"
import { fontVariables } from "@/lib/fonts"
import { cn } from "@/lib/utils"
import { DirectionProvider } from "@/components/ui/direction"
import {
  AnchoredToastProvider,
  ToastProvider,
} from "@/components/ui/toast"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en-US"
      suppressHydrationWarning
      className={cn("antialiased", fontVariables)}
    >
      <body>
        <ThemeProvider>
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
