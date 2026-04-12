import { useMemo } from 'react'
import { type ProductionPlanOption } from '@/features/engineering-db/data/schema'

export interface DrawingOption {
  label: string
  value: string
}

export function useSalesOrderDrawingOptions(items?: ProductionPlanOption[]): DrawingOption[] {
  return useMemo(() => (items ?? []).map((item) => ({ label: item.name, value: item.id })), [items])
}
