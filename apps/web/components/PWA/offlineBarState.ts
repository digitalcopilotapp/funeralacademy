'use client'

import { useEffect, useState } from 'react'

/**
 * Height of the offline / reconnected bar, and a subscription to whether it is
 * showing.
 *
 * The bar is `position: fixed` at the very top, and so is the org header. Body
 * padding cannot move a fixed element, so the header has to be told to shift
 * down by the bar's height — otherwise the bar covers the logo, search and menu
 * at exactly the moment someone is trying to work out why the app stopped
 * responding.
 *
 * This mirrors how `OrgJoinBanner` already offsets the same header, so the two
 * stack predictably instead of fighting for the same strip of screen.
 */
export const OFFLINE_BAR_HEIGHT = 36

const EVENT = 'fa:offline-bar'

// Current value, kept alongside the event. A subscriber that mounts after the
// bar has already appeared would otherwise never learn about it until the next
// change, and would sit under the bar in the meantime.
let currentlyVisible = false

/** Broadcast a change in the bar's visibility. Called by OfflineIndicator. */
export function setOfflineBarVisible(visible: boolean) {
  if (typeof window === 'undefined') return
  if (currentlyVisible === visible) return
  currentlyVisible = visible
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { visible } }))
}

/** Subscribe to the bar's visibility from layout chrome that must move for it. */
export function useOfflineBarVisible() {
  // Always false on the first render so the server and client agree; the effect
  // below reconciles immediately if the bar is already up.
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(currentlyVisible)
    const onChange = (e: Event) => {
      setVisible(Boolean((e as CustomEvent).detail?.visible))
    }
    window.addEventListener(EVENT, onChange as EventListener)
    return () => window.removeEventListener(EVENT, onChange as EventListener)
  }, [])

  return visible
}
