'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowClockwise } from '@phosphor-icons/react'

/**
 * Registers the service worker and surfaces the one moment the user has to know
 * about: a new version is ready.
 *
 * Auto-reloading on update is the wrong default for an LMS — it can discard a
 * half-written assignment or drop someone out of a video mid-lesson. So the new
 * worker waits, and the user chooses when to take it.
 *
 * Registration is deliberately delayed until after `load`: the worker is not
 * needed for first paint, and registering during hydration competes with the
 * app's own bootstrap requests on a slow phone.
 */
export default function ServiceWorkerManager() {
  const { t } = useTranslation()
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [reloading, setReloading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    // The worker caches build output keyed by URL. In dev, Next serves
    // uncompiled, frequently-changing assets from the same paths, so a worker
    // here produces stale-module errors that look like app bugs.
    if (process.env.NODE_ENV !== 'production') {
      // Clean up any worker left behind by a previous production build served
      // on the same origin (a very common localhost foot-gun).
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister())
      })
      return
    }

    let registration: ServiceWorkerRegistration | undefined

    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        // A worker already waiting means the user loaded the page with an
        // update pending from a previous visit.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting)
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration?.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            // `controller` is null on the very first install — that is not an
            // update, so it must not raise the banner.
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(installing)
            }
          })
        })
      } catch {
        // A failed registration must be silent: the app works without it.
      }
    }

    // `controllerchange` fires once the new worker takes over after
    // skipWaiting. Guarded so it reloads only for a user-initiated update.
    let refreshing = false
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const applyUpdate = () => {
    if (!waitingWorker) return
    setReloading(true)
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  if (!waitingWorker) return null

  return (
    <div
      className="fixed inset-x-0 z-[var(--z-notification)] mx-auto flex w-fit max-w-[calc(100vw-2rem)] justify-center px-4"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
    >
      <div className="flex items-center gap-3 rounded-full bg-[#111113]/95 py-2 ps-4 pe-2 shadow-[0_4px_16px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <p className="truncate text-sm font-medium text-white">
          {t('pwa.update_available', { defaultValue: 'Nova versão disponível' })}
        </p>
        <button
          type="button"
          onClick={applyUpdate}
          disabled={reloading}
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-sm font-medium text-[#111113] transition-transform duration-200 active:scale-[0.97] disabled:opacity-60"
        >
          <ArrowClockwise size={14} weight="bold" className={reloading ? 'animate-spin' : undefined} />
          {reloading
            ? t('pwa.updating', { defaultValue: 'Atualizando…' })
            : t('pwa.update_now', { defaultValue: 'Atualizar' })}
        </button>
      </div>
    </div>
  )
}
