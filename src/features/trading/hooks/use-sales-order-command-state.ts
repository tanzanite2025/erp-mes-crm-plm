import { useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'

import { useCommands } from '@/features/system-mgmt/workflow-core/hooks/use-commands'

export function useSalesOrderCommandState() {
  const { commands } = useCommands()
  const search = useSearch({ from: '/_authenticated/trading/sales-orders' })
  const activeCommand = useMemo(
    () => commands.find((command) => command.id === search?.activeCommandId),
    [commands, search?.activeCommandId]
  )
  const activeCommandTitle = activeCommand?.title ?? ''
  const activeCommandContent = activeCommand?.content ?? ''
  const isClaimAction = Boolean(
    activeCommand?.actionType === 'CLAIM' ||
      activeCommandTitle.toLowerCase().includes('claim') ||
      activeCommandTitle.includes('认领')
  )

  return {
    activeCommand,
    activeCommandContent,
    activeCommandTitle,
    isClaimAction,
  }
}
