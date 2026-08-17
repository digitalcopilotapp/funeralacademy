'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePathname } from 'next/navigation'
import { X, DownloadSimple, Export, Plus } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'

const DISMISS_KEY = 'fa:install-prompt-dismissed-at'
// A dismissal is a "not now", not a "never". Four weeks is long enough that the
// prompt never feels like nagging, short enough that someone who has since made
// the product part of their routine gets a second chance.
const DISMISS_TTL_MS = 28 * 24 * 60 * 60 * 1000

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** iOS Safari never fires beforeinstallprompt; installing there is a manual, unguessable gesture. */
function isIosSafari() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  // Chrome/Firefox/Edge on iOS cannot install to the home screen at all, so
  // showing them the Safari instructions would be a dead end.
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
  return isIos && isSafari
}

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS exposes its own non-standard flag.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

/**
 * Invitation to install, shown as a bottom sheet on mobile only.
 *
 * Three rules keep this from being the pattern everyone hates:
 *
 *  - It never appears while the learner is inside a lesson, an editor, a board
 *    or the auth flow. Interrupting focused work to advertise an install is the
 *    single fastest way to make people distrust a prompt.
 *  - It waits for a real signal of intent (a short dwell) rather than firing on
 *    load, so it reads as an offer at a pause, not a toll gate on arrival.
 *  - Dismissal is remembered and respected.
 */
export default function InstallPrompt() {
  const { t } = useTranslation()
  const pathname = usePathname() || ''
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [iosHint, setIosHint] = useState(false)

  // Surfaces where an install offer would interrupt real work.
  const isFocusedSurface =
    pathname.includes('/activity/') ||
    pathname.includes('/editor') ||
    pathname.startsWith('/board/') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/embed')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (isStandalone()) return
    if (isFocusedSurface) return

    // Desktop installs are a different, lower-value flow with a browser-native
    // affordance already in the address bar. This prompt is for phones.
    if (!window.matchMedia('(max-width: 1024px)').matches) return

    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0)
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return

    let timer: ReturnType<typeof setTimeout>

    const onBeforeInstall = (e: Event) => {
      // Keep the browser's own mini-infobar from firing so there is exactly one
      // install affordance instead of two competing ones.
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      timer = setTimeout(() => setVisible(true), 4000)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    if (isIosSafari()) {
      setIosHint(true)
      timer = setTimeout(() => setVisible(true), 6000)
    }

    const onInstalled = () => {
      setVisible(false)
      setDeferred(null)
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    }
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
      clearTimeout(timer)
    }
  }, [isFocusedSurface])

  // Leaving a neutral surface for a lesson mid-countdown should cancel the offer.
  useEffect(() => {
    if (isFocusedSurface) setVisible(false)
  }, [isFocusedSurface])

  // Never surface on top of an open sheet, drawer or modal. The prompt is
  // portalled to the end of <body>, so it would otherwise paint over the menu
  // or the search sheet the user just deliberately opened. Body scroll-lock is
  // the shared signal every dismissible surface in this app already sets.
  useEffect(() => {
    if (!visible) return
    const check = () => {
      const blocked =
        document.body.style.overflow === 'hidden' ||
        document.querySelector('[role="dialog"][aria-modal="true"]') !== null
      if (blocked) setVisible(false)
    }
    check()
    const observer = new MutationObserver(check)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style'],
      childList: true,
      subtree: true,
    })
    return () => observer.disconnect()
  }, [visible])

  const dismiss = () => {
    setVisible(false)
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      /* private mode — a forgotten dismissal is acceptable */
    }
  }

  const install = async () => {
    if (!deferred) return
    setVisible(false)
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch {
      /* the browser withdrew the event */
    } finally {
      setDeferred(null)
      // Either way the question has been asked and answered; don't re-ask soon.
      try {
        window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 30, stiffness: 340 }}
          role="dialog"
          aria-label={t('pwa.install_title', { defaultValue: 'Instalar o aplicativo' })}
          className="fixed inset-x-3 z-[var(--z-notification)] mx-auto max-w-sm rounded-2xl bg-[#0e0e10]/95 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl"
          // Clears the floating dashboard pill so the two never stack on top of
          // each other on a small screen.
          style={{ bottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}
        >
          <div className="flex items-start gap-3 p-4">
            <img
              src="/icons/icon-192.png"
              alt=""
              width={40}
              height={40}
              className="mt-0.5 h-10 w-10 shrink-0 rounded-xl"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-white">
                {t('pwa.install_title', { defaultValue: 'Instalar o aplicativo' })}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/55">
                {iosHint
                  ? t('pwa.install_ios_body', {
                      defaultValue: 'Adicione à tela de início para abrir em tela cheia, sem a barra do navegador.',
                    })
                  : t('pwa.install_body', {
                      defaultValue: 'Acesso direto pela tela de início, em tela cheia e com abertura mais rápida.',
                    })}
              </p>

              {iosHint ? (
                // iOS cannot be triggered programmatically, so the only honest
                // thing to show is the exact gesture, with the real glyphs.
                <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] text-white/70">
                  <span>{t('pwa.install_ios_step_tap', { defaultValue: 'Toque em' })}</span>
                  <Export size={15} weight="bold" className="text-white" aria-hidden="true" />
                  <span>{t('pwa.install_ios_step_then', { defaultValue: 'e depois' })}</span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-white/[0.08] px-1.5 py-0.5 font-medium text-white">
                    <Plus size={11} weight="bold" aria-hidden="true" />
                    {t('pwa.install_ios_step_add', { defaultValue: 'Adicionar à Tela de Início' })}
                  </span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={install}
                  className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white px-4 text-sm font-medium text-[#111113] transition-transform duration-200 active:scale-[0.97]"
                >
                  <DownloadSimple size={15} weight="bold" />
                  {t('pwa.install_action', { defaultValue: 'Instalar' })}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={dismiss}
              aria-label={t('common.close', { defaultValue: 'Fechar' })}
              className="-me-1 -mt-1 shrink-0 rounded-full p-2 text-white/35 transition-colors hover:bg-white/[0.06] hover:text-white/80"
            >
              <X size={15} weight="bold" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
