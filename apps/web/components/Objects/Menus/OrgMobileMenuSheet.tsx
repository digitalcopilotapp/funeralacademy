'use client'

import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { X } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'

/**
 * The learner-side mobile menu.
 *
 * Replaces a panel that was permanently mounted at `-top-full`: its links stayed
 * in the tab order while "closed", so keyboard and screen-reader users walked
 * through a menu that was not on screen. It also never locked page scroll and
 * never returned focus.
 *
 * This is a real dismissible surface — mounted only while open, scroll-locked,
 * focus-trapped, Escape-closable, and it hands focus back to the trigger on
 * close. It renders into a portal so the fixed positioning cannot be trapped by
 * a transformed ancestor in the header.
 */
export default function OrgMobileMenuSheet({
  open,
  onClose,
  triggerRef,
  children,
}: {
  open: boolean
  onClose: () => void
  triggerRef?: React.RefObject<HTMLButtonElement | null>
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const panelRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = React.useState(false)

  useEffect(() => setMounted(true), [])

  // Scroll lock
  useEffect(() => {
    if (!open) return
    const { body } = document
    const prev = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prev
    }
  }, [open])

  // Escape to close, and return focus to whatever opened the sheet so keyboard
  // users are not dumped at the top of the document.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
        triggerRef?.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, triggerRef])

  // Focus trap. A menu that lets Tab escape into the page behind it is worse
  // than no menu, because the page behind is inert to the eye but not to focus.
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return

    const SELECTOR =
      'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

    const first = panel.querySelector<HTMLElement>(SELECTOR)
    first?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (el) => el.offsetParent !== null
      )
      if (items.length === 0) return
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    panel.addEventListener('keydown', onKeyDown)
    return () => panel.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[var(--z-modal-backdrop)] bg-black/40 backdrop-blur-[2px] md:hidden"
          />
          <motion.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('common.menu', { defaultValue: 'Menu' })}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            // Exponential ease-out: fast to arrive, settling rather than bouncing.
            transition={{ type: 'spring', damping: 34, stiffness: 380 }}
            className="fixed inset-y-0 end-0 z-[var(--z-modal)] flex w-[86%] max-w-sm flex-col bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.12)] md:hidden"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
              paddingInlineEnd: 'env(safe-area-inset-right)',
            }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3">
              <span className="text-[15px] font-semibold text-black/85">
                {t('common.menu', { defaultValue: 'Menu' })}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close', { defaultValue: 'Fechar' })}
                className="-me-2 rounded-full p-2.5 text-black/45 transition-colors active:bg-black/[0.05]"
              >
                <X size={20} weight="bold" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}
