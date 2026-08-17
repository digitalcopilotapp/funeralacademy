import '../styles/globals.css'
import React from 'react'
import type { Metadata, Viewport } from 'next'
import Providers from '@components/Providers'
import { Wix_Madefor_Text, Tajawal } from 'next/font/google'

/**
 * `viewport-fit=cover` is the switch that makes every `env(safe-area-inset-*)`
 * in the codebase resolve to a real value. Without it those insets compute to
 * 0px, so the safe-area handling already written into the mobile chrome (the
 * floating dashboard pill, the bottom bars) silently did nothing on notched
 * devices and sat under the home indicator.
 *
 * `interactiveWidget: 'resizes-content'` keeps the layout viewport shrinking
 * when the on-screen keyboard opens, so a focused input in a form is scrolled
 * into view instead of being covered by the keyboard.
 *
 * `maximumScale` and `userScalable` are deliberately left at their defaults —
 * blocking pinch-zoom is an accessibility failure, and iOS ignores it anyway.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111113' },
  ],
}

export const metadata: Metadata = {
  // Per-page `generateMetadata` still overrides all of this; these are the
  // defaults for the routes that define none of their own.
  title: {
    default: 'SINDEF Academy',
    template: '%s · SINDEF Academy',
  },
  description: 'Formação e certificação para as empresas funerárias da Bahia. Uma iniciativa do SINDEF-BA.',
  applicationName: 'SINDEF Academy',
  // Linked without an `org` param here: the apex and hub routes are not inside a
  // tenant. `app/orgs/[orgslug]/layout.tsx` re-links it with the slug so an
  // install started from within an org carries that org's name and start_url.
  manifest: '/api/manifest',
  appleWebApp: {
    capable: true,
    title: 'SINDEF Academy',
    // 'default' would paint an opaque bar; 'black-translucent' lets the app draw
    // under the status bar, which is why the safe-area insets above matter.
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/apple-touch-icon.png',
  },
  formatDetection: {
    // Stops iOS Safari from turning course codes, durations and lesson numbers
    // into blue tappable "phone numbers" inside lesson content.
    telephone: false,
  },
}

const wixMadeforText = Wix_Madefor_Text({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-default',
})

// Wix Madefor Text has no Arabic subset, so Arabic would otherwise fall back to
// whatever the OS provides — Geeza Pro, Segoe UI, Noto — and look like a
// different product on every platform.
//
// Tajawal is the Arabic face for the whole product. It is FORCED whenever the
// UI is Arabic (see globals.css), not merely offered as a fallback: Tajawal
// ships a Latin subset too, so a mixed Arabic screen renders in one typeface
// instead of switching per glyph between two designs with different
// proportions.
//
// Weights are 200-900 with no 600 — a `font-semibold` element rounds up to 700,
// which is the intended reading.
const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800'],
  display: 'swap',
  variable: '--font-arabic',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // `dir` is deliberately absent from the <html> below. React only reconciles
  // attributes present in its virtual tree, so leaving it out means React never
  // clobbers what dir-init.js wrote before paint. `lang="pt-BR"` stays as the
  // no-JS baseline for crawlers; the script overwrites it for everyone else.
  return (
    <html
      className={`${wixMadeforText.variable} ${tajawal.variable}`}
      lang="pt-BR"
      suppressHydrationWarning
    >
      <head>
        {/* Synchronous script — sets <html lang/dir> before body paints so an
            RTL locale never flashes an LTR layout. Must run first. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/dir-init.js" />
        {/* Synchronous script — blocks parsing to guarantee window.__RUNTIME_CONFIG__ exists before any JS runs.
            Next.js <Script strategy="beforeInteractive"> is not truly blocking in all browsers (Safari). */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/runtime-config.js" />
        {/* Prevent white flash on embed routes: set html+body bg before body is painted.
            Reads the optional ?bgcolor param (hex-validated) or defaults to dark. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/embed-bg.js" />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <main className="animate-fade-in">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
