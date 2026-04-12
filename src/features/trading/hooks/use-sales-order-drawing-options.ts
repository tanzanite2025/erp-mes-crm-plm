import { useMemo } from 'react'
export interface DrawingOption {
  label: string
  value: string
}

interface DrawingPlanItem {
  id: string
  name: string
}

export function useSalesOrderDrawingOptions(items?: DrawingPlanItem[]): DrawingOption[] {
  return useMemo(() => (items ?? []).map((item) => ({ label: item.name, value: item.id })), [items])
}
