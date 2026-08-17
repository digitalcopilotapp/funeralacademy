'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { MagnifyingGlass, X, ArrowRight, BookOpen, FolderSimple, User as UserIcon } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import { useDebounce } from '@/hooks/useDebounce'
import { searchOrgContent } from '@services/search/search'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { useOrg } from '@components/Contexts/OrgContext'
import { getUriWithOrg } from '@services/config/config'
import {
  getCourseThumbnailMediaDirectory,
  getUserAvatarMediaDirectory,
} from '@services/media/media'
import { removeCoursePrefix } from '../Thumbnails/CourseThumbnail'
import UserAvatar from '../UserAvatar'
import { useLHAnalytics, AnalyticsEvent } from '@services/analytics'

/**
 * Full-screen search for phones.
 *
 * The desktop SearchBar renders its results into a dropdown anchored under a
 * 36px input. On a phone that pattern fails twice over: the panel is squeezed
 * between the header and the keyboard, and the whole control was previously
 * reachable only *inside* the collapsed hamburger — two taps and a guess before
 * a learner could look for a course.
 *
 * Search on mobile is a mode, not a widget. It takes the screen, opens the
 * keyboard immediately, and returns you exactly where you were.
 */

interface SearchResults {
  courses: any[]
  folders: any[]
  users: any[]
}

const EMPTY: SearchResults = { courses: [], folders: [], users: [] }

export default function MobileSearchSheet({
  open,
  onOpenChange,
  orgslug,
}: {
  open: boolean
  onOpenChange: (_open: boolean) => void
  orgslug: string
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const org = useOrg() as any
  const session = useLHSession() as any
  const { track } = useLHAnalytics('learner')

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const debounced = useDebounce(query, 300)

  // Lock the page behind the sheet. Without this the underlying course list
  // scrolls under the overlay whenever a swipe misses the results.
  useEffect(() => {
    if (!open) return
    const { body } = document
    const prevOverflow = body.style.overflow
    const prevPaddingEnd = body.style.paddingInlineEnd
    // Compensate for the scrollbar's width so the layout doesn't jump on the
    // desktop-width edge case where this can still be mounted.
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbar > 0) body.style.paddingInlineEnd = `${scrollbar}px`
    return () => {
      body.style.overflow = prevOverflow
      body.style.paddingInlineEnd = prevPaddingEnd
    }
  }, [open])

  // Escape closes, matching every other dismissible surface in the product.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  // Focus the field on open so the keyboard is already up. The rAF defers past
  // the entry animation — focusing mid-transform makes iOS scroll the sheet.
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [open])

  // Reset on close so reopening never flashes the previous learner's query.
  useEffect(() => {
    if (open) return
    setQuery('')
    setResults(EMPTY)
    setIsLoading(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    let stale = false

    const run = async () => {
      if (debounced.trim().length === 0) {
        setResults(EMPTY)
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const response = await searchOrgContent(
          orgslug,
          debounced,
          1,
          5,
          null,
          session?.data?.tokens?.access_token
        )
        if (stale) return
        const d = response.data as any
        const next: SearchResults = {
          courses: Array.isArray(d?.courses) ? d.courses : [],
          folders: Array.isArray(d?.folders) ? d.folders : [],
          users: Array.isArray(d?.users) ? d.users : [],
        }
        setResults(next)
        track(AnalyticsEvent.SearchQuery, {
          query: debounced,
          results_count: next.courses.length + next.folders.length + next.users.length,
          surface: 'mobile_sheet',
        })
      } catch {
        if (!stale) setResults(EMPTY)
      } finally {
        if (!stale) setIsLoading(false)
      }
    }

    run()
    return () => {
      stale = true
    }
  }, [debounced, open, orgslug, session?.data?.tokens?.access_token, track])

  const total = results.courses.length + results.folders.length + results.users.length
  const hasQuery = query.trim().length > 0

  const submit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      if (!hasQuery) return
      onOpenChange(false)
      router.push(getUriWithOrg(orgslug, `/search?q=${encodeURIComponent(query)}`))
    },
    [hasQuery, onOpenChange, orgslug, query, router]
  )

  const close = useCallback(() => onOpenChange(false), [onOpenChange])

  const skeleton = useMemo(
    () => (
      <div className="px-4 pt-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-black/5" />
            <div className="flex-1">
              <div className="mb-2 h-3.5 w-2/3 animate-pulse rounded bg-black/5" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-black/5" />
            </div>
          </div>
        ))}
      </div>
    ),
    []
  )

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          role="dialog"
          aria-modal="true"
          aria-label={t('search.search_placeholder')}
          className="fixed inset-0 z-[var(--z-modal)] flex flex-col bg-white md:hidden"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingInlineStart: 'env(safe-area-inset-left)',
            paddingInlineEnd: 'env(safe-area-inset-right)',
          }}
        >
          {/* Query bar */}
          <form onSubmit={submit} className="flex items-center gap-2 border-b border-black/[0.06] px-3 py-2.5">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={18}
                weight="bold"
                className="pointer-events-none absolute inset-y-0 start-3.5 my-auto text-black/35"
              />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search.search_placeholder')}
                aria-label={t('search.search_placeholder')}
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                // 16px minimum: anything smaller makes iOS Safari zoom the
                // viewport the instant the field takes focus.
                className="h-12 w-full rounded-xl bg-black/[0.04] ps-11 pe-4 text-base text-black outline-none transition-shadow placeholder:text-black/35 focus:ring-2 focus:ring-black/10"
              />
            </div>
            <button
              type="button"
              onClick={close}
              className="-me-1 shrink-0 rounded-full p-3 text-black/45 transition-colors active:bg-black/[0.05]"
              aria-label={t('common.close', { defaultValue: 'Fechar' })}
            >
              <X size={20} weight="bold" />
            </button>
          </form>

          {/* Results */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {!hasQuery ? (
              <div className="flex flex-col items-center px-8 pt-20 text-center">
                <div className="mb-4 rounded-full bg-black/[0.04] p-4">
                  <MagnifyingGlass size={22} weight="bold" className="text-black/40" />
                </div>
                <p className="text-[15px] font-medium text-black/80">
                  {t('search.discover_next_journey')}
                </p>
                <p className="mt-1.5 max-w-[16rem] text-[13px] leading-relaxed text-black/45">
                  {t('search.start_typing_to_search')}
                </p>
              </div>
            ) : isLoading ? (
              skeleton
            ) : total === 0 ? (
              <div className="flex flex-col items-center px-8 pt-20 text-center">
                <p className="text-[15px] font-medium text-black/80">
                  {t('search.no_results', { defaultValue: 'Nenhum resultado encontrado' })}
                </p>
                <p className="mt-1.5 max-w-[17rem] text-[13px] leading-relaxed text-black/45">
                  {t('search.no_results_hint', {
                    defaultValue: 'Tente outro termo ou verifique a ortografia.',
                  })}
                </p>
              </div>
            ) : (
              <div className="pb-8">
                {results.courses.length > 0 && (
                  <Section label={t('courses.courses')} icon={<BookOpen size={13} weight="fill" />}>
                    {results.courses.map((course) => (
                      <Row
                        key={course.course_uuid}
                        href={getUriWithOrg(orgslug, `/course/${removeCoursePrefix(course.course_uuid)}`)}
                        onNavigate={close}
                        title={course.name}
                        subtitle={course.description}
                        media={
                          course.thumbnail_image ? (
                            <img
                              src={getCourseThumbnailMediaDirectory(
                                org?.org_uuid,
                                course.course_uuid,
                                course.thumbnail_image
                              )}
                              alt=""
                              className="h-12 w-12 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/[0.05]">
                              <BookOpen size={20} weight="fill" className="text-black/30" />
                            </div>
                          )
                        }
                      />
                    ))}
                  </Section>
                )}

                {results.folders.length > 0 && (
                  <Section label={t('folders.folders')} icon={<FolderSimple size={13} weight="fill" />}>
                    {results.folders.map((folder) => (
                      <Row
                        key={folder.folder_uuid}
                        href={getUriWithOrg(
                          orgslug,
                          `/library/folder/${folder.folder_uuid.replace('folder_', '')}`
                        )}
                        onNavigate={close}
                        title={folder.name}
                        subtitle={folder.description}
                        media={
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black/[0.05]">
                            <FolderSimple size={20} weight="fill" className="text-black/30" />
                          </div>
                        }
                      />
                    ))}
                  </Section>
                )}

                {results.users.length > 0 && (
                  <Section label={t('common.users')} icon={<UserIcon size={13} weight="fill" />}>
                    {results.users.map((user) => (
                      <Row
                        key={user.user_uuid}
                        href={getUriWithOrg(orgslug, `/user/${user.username}`)}
                        onNavigate={close}
                        title={`${user.first_name} ${user.last_name}`.trim() || user.username}
                        subtitle={`@${user.username}`}
                        media={
                          <UserAvatar
                            width={48}
                            avatar_url={
                              user.avatar_image
                                ? getUserAvatarMediaDirectory(user.user_uuid, user.avatar_image)
                                : ''
                            }
                            predefined_avatar={user.avatar_image ? undefined : 'empty'}
                            userId={user.id?.toString()}
                            rounded="rounded-full"
                            backgroundColor="bg-gray-100"
                          />
                        }
                      />
                    ))}
                  </Section>
                )}

                <Link
                  href={getUriWithOrg(orgslug, `/search?q=${encodeURIComponent(query)}`)}
                  onClick={close}
                  className="mx-4 mt-2 flex min-h-12 items-center justify-between rounded-xl bg-black/[0.03] px-4 text-sm font-medium text-black/70 transition-colors active:bg-black/[0.06]"
                >
                  <span>{t('search.view_all_results')}</span>
                  <ArrowRight size={15} weight="bold" data-dir-flip />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const Section = ({
  label,
  icon,
  children,
}: {
  label: string
  icon: React.ReactNode
  children: React.ReactNode
}) => (
  <section className="pt-3">
    <h2 className="flex items-center gap-1.5 px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-black/35">
      <span aria-hidden="true">{icon}</span>
      {label}
    </h2>
    {children}
  </section>
)

const Row = ({
  href,
  title,
  subtitle,
  media,
  onNavigate,
}: {
  href: string
  title: string
  subtitle?: string
  media: React.ReactNode
  onNavigate: () => void
}) => (
  <Link
    href={href}
    onClick={onNavigate}
    // min-h-16 keeps the whole row well past the 44px touch floor even when the
    // subtitle is missing and the content would otherwise collapse.
    className="flex min-h-16 items-center gap-3 px-4 py-2 transition-colors active:bg-black/[0.04]"
  >
    <span className="shrink-0">{media}</span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[15px] font-medium leading-snug text-black/85">{title}</span>
      {subtitle ? (
        <span className="mt-0.5 block truncate text-[13px] leading-snug text-black/45">{subtitle}</span>
      ) : null}
    </span>
  </Link>
)
