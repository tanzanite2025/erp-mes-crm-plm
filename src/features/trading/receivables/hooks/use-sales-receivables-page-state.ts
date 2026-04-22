import { useMemo, useState } from 'react'

interface ReceivableListItemLike {
  id: string
}

interface UseSalesReceivablesPageStateParams<TItem extends ReceivableListItemLike> {
  sourceType?: string
  sourceRefId?: string
  autoOpen?: boolean
  items: TItem[]
}

export function useSalesReceivablesPageState<TItem extends ReceivableListItemLike>({
  sourceType,
  sourceRefId,
  autoOpen,
  items,
}: UseSalesReceivablesPageStateParams<TItem>) {
  const [selectedReceivableId, setSelectedReceivableId] = useState<string | null>(null)
  const [dismissedAutoOpenKey, setDismissedAutoOpenKey] = useState('')
  const autoOpenKey = useMemo(
    () => `${sourceType ?? ''}:${sourceRefId ?? ''}:${autoOpen ? '1' : '0'}`,
    [autoOpen, sourceRefId, sourceType]
  )
  const autoOpenReceivableId = useMemo(() => {
    if (!autoOpen || dismissedAutoOpenKey === autoOpenKey) {
      return null
    }
    return items[0]?.id ?? null
  }, [autoOpen, autoOpenKey, dismissedAutoOpenKey, items])
  const activeReceivableId = selectedReceivableId ?? autoOpenReceivableId

  const handleSelectReceivable = (receivableId: string) => {
    setSelectedReceivableId(receivableId)
  }

  const handleDetailOpenChange = (open: boolean) => {
    if (open) {
      return
    }
    if (autoOpenReceivableId) {
      setDismissedAutoOpenKey(autoOpenKey)
    }
    setSelectedReceivableId(null)
  }

  return {
    activeReceivableId,
    handleSelectReceivable,
    handleDetailOpenChange,
  }
}
