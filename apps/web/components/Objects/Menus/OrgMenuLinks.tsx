import { useOrg } from '@components/Contexts/OrgContext'
import { getUriWithOrg } from '@services/config/config'
import { Books, FolderSimple, ChatsCircle, Headphones, Cube, ShoppingBag } from '@phosphor-icons/react'
import { menuIcon } from '@components/Objects/Menus/menuIcons'
import Link from 'next/link'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { getMenuColorClasses } from '@services/utils/ts/colorUtils'

type Builtin = { feature: string; link: string; labelKey: string; Icon: any }

const BUILTIN: Record<string, Builtin> = {
  courses: { feature: 'courses', link: '/courses', labelKey: 'courses.courses', Icon: Books },
  library: { feature: 'folders', link: '/library', labelKey: 'library.library', Icon: FolderSimple },
  podcasts: { feature: 'podcasts', link: '/podcasts', labelKey: 'podcasts.podcasts', Icon: Headphones },
  communities: { feature: 'communities', link: '/communities', labelKey: 'communities.title', Icon: ChatsCircle },
  playgrounds: { feature: 'playgrounds', link: '/playgrounds', labelKey: 'common.playgrounds', Icon: Cube },
  store: { feature: 'payments', link: '/store', labelKey: 'common.store', Icon: ShoppingBag },
}

// Default order when an org has no custom menu config.
const DEFAULT_ORDER = ['courses', 'library', 'podcasts', 'communities', 'playgrounds', 'store']

function MenuLinks(props: {
  orgslug: string
  primaryColor?: string
  /**
   * 'bar' is the desktop header row. 'stack' is the mobile menu sheet: the same
   * links, but laid out vertically on a light ground with touch-sized rows.
   * The header's colour classes are tuned for the org's (often dark) brand bar
   * and would render white-on-white inside the sheet.
   */
  variant?: 'bar' | 'stack'
}) {
  const { t } = useTranslation()
  const org = useOrg() as any
  const colors = getMenuColorClasses(props.primaryColor || '')
  const isStack = props.variant === 'stack'

  const rf = org?.config?.config?.resolved_features
  const isEnabled = (feature: string) => rf?.[feature]?.enabled === true

  const configItems: any[] | undefined =
    org?.config?.config?.customization?.menu?.items ?? org?.config?.config?.general?.menu?.items

  // Build the items to render (config-driven, else feature-driven defaults)
  const source =
    configItems && configItems.length
      ? [...configItems].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      : DEFAULT_ORDER.map((type, i) => ({ type, enabled: true, order: i, label: '', url: '' }))

  const rendered = source
    .map((item: any) => {
      if (item.type === 'custom') {
        if (!item.enabled || !item.url) return null
        const external = /^https?:\/\//i.test(item.url)
        return {
          key: `custom-${item.url}`,
          label: item.label || item.url,
          Icon: menuIcon(item.icon),
          href: external ? item.url : getUriWithOrg(props.orgslug, item.url),
          external,
        }
      }
      const meta = BUILTIN[item.type]
      if (!meta) return null
      if (!item.enabled) return null
      if (!isEnabled(meta.feature)) return null // plan/feature gating
      return {
        key: item.type,
        label: item.label || t(meta.labelKey),
        Icon: meta.Icon,
        href: getUriWithOrg(props.orgslug, meta.link),
        external: false,
      }
    })
    .filter(Boolean) as any[]

  if (isStack) {
    return (
      <ul className="flex flex-col">
        {rendered.map((it) => {
          const content = (
            // min-h-12 puts every row past the 44px touch floor; the icon is
            // muted so the label carries the scan.
            <span className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-[15px] font-medium text-black/75 transition-colors active:bg-black/[0.05]">
              <it.Icon size={18} weight="fill" className="shrink-0 text-black/45" />
              <span className="truncate">{it.label}</span>
            </span>
          )
          return (
            <li key={it.key}>
              {it.external ? (
                <a href={it.href} target="_blank" rel="noopener noreferrer" className="block">
                  {content}
                </a>
              ) : (
                <Link href={it.href} className="block">
                  {content}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <div className="ps-1">
      <ul className="flex space-x-5">
        {rendered.map((it) => {
          const content = (
            <li className={`flex space-x-2 items-center ${colors.text} font-semibold`}>
              <it.Icon size={20} weight="fill" /> <span>{it.label}</span>
            </li>
          )
          return it.external ? (
            <a key={it.key} href={it.href} target="_blank" rel="noopener noreferrer">{content}</a>
          ) : (
            <Link key={it.key} href={it.href}>{content}</Link>
          )
        })}
      </ul>
    </div>
  )
}

export default MenuLinks
