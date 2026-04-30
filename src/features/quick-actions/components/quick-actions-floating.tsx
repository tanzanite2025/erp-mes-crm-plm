'use client'

import { useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { QuickActionDrawer } from './quick-action-drawer'
import { QuickActionHandle } from './quick-action-handle'

interface QuickActionsFloatingProps {
  placement?: 'floating' | 'dock'
}

export function QuickActionsFloating({
  placement = 'floating',
}: QuickActionsFloatingProps) {
  const [open, setOpen] = useState(false)
  const pathname = useLocation({ select: (location) => location.pathname })

  if (pathname === '/pda-shell') {
    return null
  }

  return (
    <>
      <QuickActionHandle
        isOpen={open}
        placement={placement}
        onToggle={() => setOpen((current) => !current)}
      />
      <QuickActionDrawer open={open} onOpenChange={setOpen} />
    </>
  )
}
