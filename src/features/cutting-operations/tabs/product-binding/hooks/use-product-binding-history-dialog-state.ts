import { useState } from 'react'
import type { ProductBindingHistoryQuery } from '../services/product-binding-service'
import {
  useProductBindingHistoryCountQuery,
  useProductBindingHistoryQuery,
} from './use-product-binding-history-query'

type UseProductBindingHistoryDialogStateOptions = {
  defaultFilters?: ProductBindingHistoryQuery
  prefetchRecordCount?: boolean
  hasRenderTrigger: boolean
}

export function useProductBindingHistoryDialogState(
  options: UseProductBindingHistoryDialogStateOptions
) {
  const { defaultFilters, prefetchRecordCount, hasRenderTrigger } = options
  const [open, setOpen] = useState(false)

  const shouldPrefetchRecordCount = prefetchRecordCount ?? hasRenderTrigger

  const historyQuery = useProductBindingHistoryQuery(defaultFilters, {
    enabled: open,
  })

  const historyCountQuery = useProductBindingHistoryCountQuery(defaultFilters, {
    enabled: shouldPrefetchRecordCount && !open,
  })

  const recordCount = historyQuery.data?.total ?? historyCountQuery.data ?? 0

  return {
    open,
    setOpen,
    historyQuery,
    recordCount,
  }
}
