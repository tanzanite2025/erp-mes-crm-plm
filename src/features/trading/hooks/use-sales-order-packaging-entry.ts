import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  packagingRulesService,
  type PackagingProfile,
} from '@/features/logistics-config/packaging-rules-service'
import type {
  SalesOrder,
  SalesOrderLine,
  SalesOrderLinePackagingSelection,
} from '../data/schema'
import { useSalesOrderPackagingPreview } from './use-sales-order-packaging-preview'
import {
  getPackagingProfilesForProduct,
  resolveSalesOrderLinePackagingSelection,
} from '../utils/sales-order-packaging-selection'

const PACKAGING_PROFILE_QUERY_KEY = ['logistics-config', 'packaging-profiles'] as const

export type SalesOrderPackagingEntryState =
  | 'no_lines'
  | 'resolved'
  | 'needs_selection'
  | 'create_new'
  | 'missing_product'

interface SalesOrderPackagingEntryLineTarget {
  lineNo: number
  productId?: string
  productDisplayTitle: string
  productDisplaySubtitle: string
  qty: number
  uom: string
  state: Exclude<SalesOrderPackagingEntryState, 'no_lines'>
  selectedPackaging?: SalesOrderLinePackagingSelection
  matchedProfiles: PackagingProfile[]
  candidateProfiles: PackagingProfile[]
}

interface SalesOrderPackagingEntryNoLinesTarget {
  state: 'no_lines'
  lineCount: 0
  resolvedLineCount: 0
  pendingSelectionLineCount: 0
  createRuleLineCount: 0
  missingProductLineCount: 0
  lines: []
}

interface SalesOrderPackagingEntryResolvedTarget {
  state: Exclude<SalesOrderPackagingEntryState, 'no_lines'>
  lineCount: number
  resolvedLineCount: number
  pendingSelectionLineCount: number
  createRuleLineCount: number
  missingProductLineCount: number
  lines: SalesOrderPackagingEntryLineTarget[]
  actionLine: SalesOrderPackagingEntryLineTarget
}

export type SalesOrderPackagingEntryTarget =
  | SalesOrderPackagingEntryNoLinesTarget
  | SalesOrderPackagingEntryResolvedTarget

function resolveLineDisplayTitle(line: SalesOrderLine): string {
  const title =
    line.productDisplayTitleSnapshot?.trim() ||
    line.productDisplayFullLabelSnapshot?.trim()

  return title || '未识别产品'
}

function resolveLineDisplaySubtitle(line: SalesOrderLine): string {
  return line.productDisplaySubtitleSnapshot?.trim() || '--'
}

function buildLineTarget(
  line: SalesOrderLine,
  profiles: PackagingProfile[]
): SalesOrderPackagingEntryLineTarget {
  const matchedProfiles = getPackagingProfilesForProduct(profiles, line.productId, true)
  const selectedPackaging = resolveSalesOrderLinePackagingSelection(line, profiles)
  const productDisplayTitle = resolveLineDisplayTitle(line)
  const productDisplaySubtitle = resolveLineDisplaySubtitle(line)

  if (!line.productId) {
    return {
      lineNo: line.lineNo,
      productId: undefined,
      productDisplayTitle,
      productDisplaySubtitle,
      qty: line.qty,
      uom: line.uom,
      state: 'missing_product',
      selectedPackaging: undefined,
      matchedProfiles: [],
      candidateProfiles: [],
    }
  }

  if (selectedPackaging) {
    return {
      lineNo: line.lineNo,
      productId: line.productId,
      productDisplayTitle,
      productDisplaySubtitle,
      qty: line.qty,
      uom: line.uom,
      state: 'resolved',
      selectedPackaging,
      matchedProfiles,
      candidateProfiles: matchedProfiles,
    }
  }

  return {
    lineNo: line.lineNo,
    productId: line.productId,
    productDisplayTitle,
    productDisplaySubtitle,
    qty: line.qty,
    uom: line.uom,
    state: matchedProfiles.length > 0 ? 'needs_selection' : 'create_new',
    selectedPackaging: undefined,
    matchedProfiles,
    candidateProfiles: matchedProfiles,
  }
}

function selectActionLine(
  lines: SalesOrderPackagingEntryLineTarget[]
): SalesOrderPackagingEntryLineTarget {
  return (
    lines.find((line) => line.state === 'missing_product') ??
    lines.find((line) => line.state === 'create_new') ??
    lines.find((line) => line.state === 'needs_selection') ??
    lines[0]
  )
}

export function useSalesOrderPackagingEntry(order: SalesOrder) {
  const preview = useSalesOrderPackagingPreview(order)
  const packagingProfilesQuery = useQuery({
    queryKey: PACKAGING_PROFILE_QUERY_KEY,
    queryFn: () => packagingRulesService.getProfiles(),
  })

  const target = useMemo<SalesOrderPackagingEntryTarget | null>(() => {
    if (order.lines.length === 0) {
      return {
        state: 'no_lines',
        lineCount: 0,
        resolvedLineCount: 0,
        pendingSelectionLineCount: 0,
        createRuleLineCount: 0,
        missingProductLineCount: 0,
        lines: [],
      }
    }

    if (!packagingProfilesQuery.data) {
      return null
    }

    const lines = order.lines.map((line) => buildLineTarget(line, packagingProfilesQuery.data))
    const resolvedLineCount = lines.filter((line) => line.state === 'resolved').length
    const pendingSelectionLineCount = lines.filter((line) => line.state === 'needs_selection').length
    const createRuleLineCount = lines.filter((line) => line.state === 'create_new').length
    const missingProductLineCount = lines.filter((line) => line.state === 'missing_product').length
    const actionLine = selectActionLine(lines)

    let state: Exclude<SalesOrderPackagingEntryState, 'no_lines'> = 'resolved'
    if (missingProductLineCount > 0) {
      state = 'missing_product'
    } else if (createRuleLineCount > 0) {
      state = 'create_new'
    } else if (pendingSelectionLineCount > 0) {
      state = 'needs_selection'
    }

    return {
      state,
      lineCount: lines.length,
      resolvedLineCount,
      pendingSelectionLineCount,
      createRuleLineCount,
      missingProductLineCount,
      lines,
      actionLine,
    }
  }, [order.lines, packagingProfilesQuery.data])

  return {
    target,
    preview,
    profiles: packagingProfilesQuery.data ?? [],
    isLoading: preview.isLoading || packagingProfilesQuery.isLoading,
    isError: preview.isError || packagingProfilesQuery.isError,
    error: preview.error ?? packagingProfilesQuery.error ?? null,
  }
}
