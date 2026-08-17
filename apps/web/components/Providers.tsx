'use client'
import React, { useState } from 'react'
import '../lib/i18n'
import { SessionProvider } from '@components/Contexts/AuthContext'
import LHSessionProvider from '@components/Contexts/LHSessionContext'
import AuthFetchInterceptor from '@components/Contexts/AuthFetchInterceptor'
import PostHogProvider from '@components/Contexts/PostHogProvider'
import I18nProvider from '@components/Contexts/I18nContext'
import DirectionProvider from '@components/Contexts/DirectionProvider'
import { BackgroundTasksProvider } from '@components/Contexts/BackgroundTasksContext'
import BackgroundTasksPanel from '@components/BackgroundTasks/BackgroundTasksPanel'
import ServiceWorkerManager from '@components/PWA/ServiceWorkerManager'
import InstallPrompt from '@components/PWA/InstallPrompt'
import OfflineIndicator from '@components/PWA/OfflineIndicator'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { makeQueryClient } from '@/lib/query/client'

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider refetchInterval={600000}>
        <AuthFetchInterceptor />
        <LHSessionProvider>
          <PostHogProvider>
            <I18nProvider>
              {/* Inside I18nProvider so it re-renders when the language changes. */}
              <DirectionProvider>
                <BackgroundTasksProvider>
                  {children}
                  <BackgroundTasksPanel />
                  {/* PWA layer. Mounted last so its fixed-position surfaces
                      stack above the app chrome, and inside I18nProvider so
                      their copy follows the active language. */}
                  <OfflineIndicator />
                  <ServiceWorkerManager />
                  <InstallPrompt />
                </BackgroundTasksProvider>
              </DirectionProvider>
            </I18nProvider>
          </PostHogProvider>
        </LHSessionProvider>
      </SessionProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
