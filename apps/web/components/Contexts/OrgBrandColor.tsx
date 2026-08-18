'use client'

import { useEffect } from 'react'

/**
 * Publishes the organisation's brand colour into the CSS custom properties the
 * auth screens and primary buttons are styled from.
 *
 * The org colour already existed, but only ever reached the top navigation as
 * an inline `backgroundColor`. Everything else — the auth panels, the primary
 * buttons — was hardcoded neutral black, so signing in looked like a different
 * product from the one you were signing in to.
 *
 * Writing it to `--brand` on <html> means the whole cascade picks it up without
 * threading the value through every component, and a tenant with its own colour
 * gets its own login for free.
 */

/** Relative luminance, for deciding whether text on the brand should be white or near-black. */
function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const int = parseInt(m[1], 16)
  const srgb = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]
}

/** Shift a hex colour toward white (amount > 0) or black (amount < 0). */
function shift(hex: string, amount: number): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const int = parseInt(m[1], 16)
  const out = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((v) => {
    const target = amount > 0 ? 255 : 0
    return Math.round(v + (target - v) * Math.abs(amount))
  })
  return '#' + out.map((v) => v.toString(16).padStart(2, '0')).join('')
}

export default function OrgBrandColor({ color }: { color?: string | null }) {
  useEffect(() => {
    const root = document.documentElement
    const lum = color ? luminance(color) : null

    // An unparseable or absent colour leaves the stylesheet defaults in place
    // rather than blanking the brand.
    if (!color || lum === null) return

    const hover = shift(color, lum < 0.5 ? 0.14 : -0.12)
    root.style.setProperty('--brand', color)
    if (hover) root.style.setProperty('--brand-hover', hover)
    // Contrast is computed, not assumed: a tenant with a pale brand colour would
    // otherwise get white text on a light button.
    root.style.setProperty('--brand-contrast', lum < 0.5 ? '#ffffff' : '#111113')

    return () => {
      root.style.removeProperty('--brand')
      root.style.removeProperty('--brand-hover')
      root.style.removeProperty('--brand-contrast')
    }
  }, [color])

  return null
}
