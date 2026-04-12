'use client'

import { useMemo, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { getAvailableQuickActions } from '../services/quick-action-access'
import { QuickActionDrawer } from './quick-action-drawer'
import { QuickActionHandle } from './quick-action-handle'

export function QuickActionsFloating() {
  const [open, setOpen] = useState(false)
  const pathname = useLocation({ select: (location) => location.pathname })
  const user = useAuthStore((state) => state.user)
  const actions = useMemo(() => getAvailableQuickActions(user), [user])

  if (pathname === '/pda-shell' || actions.length === 0) {
    return null
  }

  return (
    <>
      <QuickActionHandle isOpen={open} onToggle={() => setOpen((current) => !current)} />
      <QuickActionDrawer open={open} onOpenChange={setOpen} />
    </>
  )
}
