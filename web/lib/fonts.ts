import localFont from "next/font/local"
import { cn } from "@/lib/utils"

const geistSans = localFont({
  src: [
    {
      path: "../app/_assets/fonts/Geist[wght].woff2",
      style: "normal",
    },
    {
      path: "../app/_assets/fonts/Geist-Italic[wght].woff2",
      style: "italic",
    },
  ],
  variable: "--font-sans",
  display: "swap",
  adjustFontFallback: false,
})

const geistMono = localFont({
  src: [
    {
      path: "../app/_assets/fonts/GeistMono[wght].woff2",
      style: "normal",
    },
    {
      path: "../app/_assets/fonts/GeistMono-Italic[wght].woff2",
      style: "italic",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
  adjustFontFallback: false,
})

const vazirmatn = localFont({
  src: "../app/_assets/fonts/Vazirmatn[wght].woff2",
  variable: "--font-vazirmatn",
  display: "swap",
  adjustFontFallback: false,
})
// Decorative pixel fonts
const geistPixelCircle = localFont({
  src: "../app/_assets/fonts/GeistPixel-Circle.woff2",
  variable: "--font-geist-pixel-circle",
})
const geistPixelSquare = localFont({
  src: "../app/_assets/fonts/GeistPixel-Square.woff2",
  variable: "--font-geist-pixel-square",
})
const geistPixelGrid = localFont({
  src: "../app/_assets/fonts/GeistPixel-Grid.woff2",
  variable: "--font-geist-pixel-grid",
})
const geistPixelLine = localFont({
  src: "../app/_assets/fonts/GeistPixel-Line.woff2",
  variable: "--font-geist-pixel-line",
})
const geistPixelTriangle = localFont({
  src: "../app/_assets/fonts/GeistPixel-Triangle.woff2",
  variable: "--font-geist-pixel-triangle",
})
export const fontVariables = cn(
  vazirmatn.variable,
  geistSans.variable,
  geistMono.variable,
  geistPixelCircle.variable,
  geistPixelSquare.variable,
  geistPixelGrid.variable,
  geistPixelLine.variable,
  geistPixelTriangle.variable
)
