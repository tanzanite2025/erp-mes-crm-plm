import { useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'
import { createLogger } from '@/lib/logger'
import { useAuthStore } from '@/stores/auth-store'
import { recordRecentVisit, shouldTrackRecentVisit } from './recent-visits-store'

const logger = createLogger('RecentVisits')

export function useRecentVisitTracker() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const user = useAuthStore((state) => state.user)
  const lastRecordedRef = useRef<string>('')

  useEffect(() => {
    if (!user || !shouldTrackRecentVisit(pathname) || lastRecordedRef.current === pathname) return

    lastRecordedRef.current = pathname
    recordRecentVisit(user, pathname).catch((error: unknown) => {
      logger.warn('Failed to record recent visit', error)
    })
  }, [pathname, user])
}

