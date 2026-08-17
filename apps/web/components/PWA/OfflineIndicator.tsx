'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudSlash, CheckCircle } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'
import { OFFLINE_BAR_HEIGHT, setOfflineBarVisible } from './offlineBarState'

/**
 * Connection state, surfaced as a slim bar under the status bar.
 *
 * This exists specifically because of `display: standalone`. In a browser tab a
 * dropped connection is legible from the browser's own chrome — the reload
 * spinner, the error page, the address bar. An installed PWA has none of that:
 * taps simply stop doing anything and the app looks broken rather than offline.
 *
 * `navigator.onLine` only proves a network interface exists, not that the
 * internet is reachable, so it is treated as a hint. Going *offline* is trusted
 * immediately (false negatives are harmless); coming back *online* is verified
 * against a real same-origin request before the recovery message is shown.
 */
export default function OfflineIndicator() {
  const { t } = useTranslation()
  const [offline, setOffline] = useState(false)
  const [justReconnected, setJustReconnected] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let reconnectTimer: ReturnType<typeof setTimeout>
    let cancelled = false

    const goOffline = () => {
      setJustReconnected(false)
      setOffline(true)
    }

    const goOnline = async () => {
      // Verify before celebrating: captive portals and half-open wifi report
      // onLine === true while nothing actually resolves. /api/health is in the
      // service worker's never-cache list, so this always reaches the network.
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!res.ok) return
      } catch {
        return
      }
      if (cancelled) return
      setOffline((wasOffline) => {
        if (wasOffline) {
          setJustReconnected(true)
          reconnectTimer = setTimeout(() => setJustReconnected(false), 2600)
        }
        return false
      })
    }

    setOffline(!navigator.onLine)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)

    return () => {
      cancelled = true
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      clearTimeout(reconnectTimer)
    }
  }, [])

  const showing = offline || justReconnected

  // The bar and the org header are both `position: fixed` at the top, so the
  // bar would otherwise cover the logo, search and menu — precisely when
  // someone is trying to work out why the app stopped responding. Broadcasting
  // the state lets the header offset itself, the same way it already does for
  // the join banner.
  useEffect(() => {
    setOfflineBarVisible(showing)
    return () => setOfflineBarVisible(false)
  }, [showing])

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          initial={{ y: '-100%' }}
          animate={{ y: 0 }}
          exit={{ y: '-100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 400 }}
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 top-0 z-[var(--z-critical)]"
          // Paints under the translucent iOS status bar rather than starting
          // below it, so the bar reads as part of the app frame.
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div
            // Fixed height, matching the offset the header applies. A bar that
            // measures differently from the space reserved for it leaves either
            // a gap or an overlap.
            style={{ height: OFFLINE_BAR_HEIGHT }}
            className={
              offline
                ? 'flex items-center justify-center gap-2 bg-[#111113] text-white'
                : 'flex items-center justify-center gap-2 bg-emerald-600 text-white'
            }
          >
            {offline ? (
              <>
                <CloudSlash size={15} weight="fill" className="shrink-0 opacity-80" />
                <span className="text-[13px] font-medium">
                  {t('pwa.offline', { defaultValue: 'Sem conexão com a internet' })}
                </span>
              </>
            ) : (
              <>
                <CheckCircle size={15} weight="fill" className="shrink-0" />
                <span className="text-[13px] font-medium">
                  {t('pwa.back_online', { defaultValue: 'Conexão restabelecida' })}
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
