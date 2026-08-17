'use client'
import Link from 'next/link'
import React, { ReactNode } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

const ChevronDivider = () => (
  <svg
    width="8"
    height="100%"
    viewBox="0 0 8 28"
    fill="none"
    className="h-full text-gray-200"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M1 0 L7 14 L1 28" stroke="currentColor" strokeWidth="1" fill="none" />
  </svg>
)

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const scrollerRef = React.useRef<HTMLElement>(null)

  // Pin the strip to its end so the current page — the last crumb — is the one
  // on screen, rather than the org root the reader already knows they are in.
  // A layout effect keyed on the items re-runs after the labels have actually
  // measured; a ref callback fires while the trail is still empty and lands on
  // the wrong offset. Suppressed when the trail fits, so there is no jump.
  React.useLayoutEffect(() => {
    const el = scrollerRef.current
    if (!el) return
    const pin = () => {
      if (el.scrollWidth > el.clientWidth) el.scrollLeft = el.scrollWidth
    }
    pin()
    // Fonts and async labels can widen the trail after first paint.
    const ro = new ResizeObserver(pin)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [items])

  return (
    // On a phone the trail is wider than the screen, and the item it cut off
    // was the last one — the page you are actually on. The nav scrolls
    // horizontally instead of clipping, and starts scrolled to the end so the
    // current page is what you see first; `scrollbar-hide` keeps the desktop
    // appearance unchanged.
    <nav
      ref={scrollerRef}
      className="flex items-center max-w-full overflow-x-auto overscroll-x-contain scrollbar-hide"
    >
      <ol className="flex items-center text-[13px] font-medium rounded-lg bg-white overflow-hidden nice-shadow w-max shrink-0">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isFirst = index === 0

          return (
            <React.Fragment key={index}>
              {index > 0 && (
                <li className="flex items-center h-8">
                  <ChevronDivider />
                </li>
              )}
              <li className="flex items-center h-8">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className={`flex items-center h-full text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors ${
                      isFirst && item.icon ? 'gap-1.5 px-2.5' : 'px-2.5'
                    }`}
                  >
                    {item.icon}
                    <span className="truncate max-w-[150px]">{item.label}</span>
                  </Link>
                ) : (
                  <span className={`flex items-center h-full text-gray-900 ${
                    isFirst && item.icon ? 'gap-1.5 px-2.5' : 'px-2.5'
                  }`}>
                    {item.icon}
                    <span className="truncate max-w-[200px]">{item.label}</span>
                  </span>
                )}
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}

export default Breadcrumbs
