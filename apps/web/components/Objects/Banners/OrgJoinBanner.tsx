'use client'
import { useOrgMembership } from '@components/Contexts/OrgContext'
import { useLHSession } from '@components/Contexts/LHSessionContext'
import { getUriWithOrg } from '@services/config/config'
import { UserPlus } from 'lucide-react'
import React, { createContext, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useOfflineBarVisible, OFFLINE_BAR_HEIGHT } from '@components/PWA/offlineBarState'

// Height of the banner in pixels
export const JOIN_BANNER_HEIGHT = 48

// Context to share banner visibility state
const JoinBannerContext = createContext<{ isVisible: boolean }>({ isVisible: false })

export function useJoinBannerVisible() {
  return useContext(JoinBannerContext)
}

export function OrgJoinBannerProvider({ children }: { children: React.ReactNode }) {
  const { isUserPartOfTheOrg } = useOrgMembership()
  const session = useLHSession() as any

  const shouldShow = session.status === 'authenticated' && !isUserPartOfTheOrg

  return (
    <JoinBannerContext.Provider value={{ isVisible: shouldShow }}>
      {children}
    </JoinBannerContext.Provider>
  )
}

export function OrgJoinBanner() {
  const { t } = useTranslation()
  const { org, isUserPartOfTheOrg, orgslug } = useOrgMembership()
  const session = useLHSession() as any
  // Called before the early return below — hooks must run on every render.
  const isOfflineBarVisible = useOfflineBarVisible()

  // Only show banner for authenticated users who are not part of the org
  if (session.status !== 'authenticated' || isUserPartOfTheOrg) {
    return null
  }

  return (
    <div
      className="fixed start-0 end-0 bg-gradient-to-r from-yellow-500 to-amber-500 text-white"
      // Sits below the offline bar when that is up, so the two fixed strips
      // stack instead of covering each other.
      style={{
        zIndex: 'var(--z-nav-menu)',
        height: JOIN_BANNER_HEIGHT,
        top: isOfflineBarVisible ? OFFLINE_BAR_HEIGHT : 0,
      }}
    >
      <div className="w-full max-w-(--breakpoint-2xl) mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-full">
        <div className="flex items-center space-x-3">
          <UserPlus size={20} className="flex-shrink-0" />
          <p className="text-sm font-medium">
            {t('banner.viewing_as_guest', { name: org?.name })}{' '}
            {/* Login, not signup: this banner shows to people already signed in
                to the platform but not yet part of this org, so an account
                almost always exists. The login screen links onward to signup. */}
            <a
              href={getUriWithOrg(orgslug, '/login')}
              className="underline hover:no-underline font-bold"
            >
              {t('banner.join_organization')}
            </a>{' '}
            {t('banner.to_access_features')}
          </p>
        </div>
      </div>
    </div>
  )
}
