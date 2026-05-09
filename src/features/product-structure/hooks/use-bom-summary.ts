import { useCallback, useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { failLoudly } from '@/lib/safe-catch'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'

interface UseBOMSummaryParams {
  fields: Array<{ id: string }>
  form: UseFormReturn<BOM>
  sections: BOMSectionOption[]
}

export function useBOMSummary({ fields, form, sections }: UseBOMSummaryParams) {
  const watchedItems = form.watch('items')

  const resolveItemValue = useCallback((index: number) => {
    const item = watchedItems?.[index]
    if (!item) {
      const error = new Error(`[CRITICAL] Missing BOM item at index ${index}`)
      failLoudly(error, 'useBOMSummary.item')
      throw error
    }
    if (typeof item.standardUsage !== 'number' || Number.isNaN(item.standardUsage)) {
      const error = new Error(`[CRITICAL] Missing standardUsage at index ${index}`)
      failLoudly(error, 'useBOMSummary.standardUsage')
      throw error
    }
    if (typeof item.unitPrice !== 'number' || Number.isNaN(item.unitPrice)) {
      const error = new Error(`[CRITICAL] Missing unitPrice at index ${index}`)
      failLoudly(error, 'useBOMSummary.unitPrice')
      throw error
    }
    return item
  }, [watchedItems])

  const totalCost = useMemo(() => {
    return fields.reduce((acc, _, index) => {
      const item = resolveItemValue(index)
      return acc + item.standardUsage * item.unitPrice
    }, 0)
  }, [fields, resolveItemValue])

  const stageCoverage = useMemo(() => {
    return new Set((watchedItems || []).map((item) => item?.section)).size
  }, [watchedItems])

  const sectionSummaries = useMemo(
    () =>
      sections.map((section) => {
        const sectionItems = fields.filter((_, index) => watchedItems?.[index]?.section === section.code)
        const sectionCost = sectionItems.reduce((acc, _, index) => {
          const item = fields.find((_, rowIndex) => watchedItems?.[rowIndex]?.id === sectionItems[index].id)
          if (!item) return acc

          const actualIndex = fields.indexOf(item)
          const value = resolveItemValue(actualIndex)
          return acc + value.standardUsage * value.unitPrice
        }, 0)

        return {
          section,
          itemCount: sectionItems.length,
          sectionCost,
        }
      }),
    [fields, resolveItemValue, sections, watchedItems]
  )

  return {
    totalItems: fields.length,
    totalCost,
    stageCoverage,
    sectionSummaries,
  }
}
