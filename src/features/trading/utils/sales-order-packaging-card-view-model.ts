import {
  calculatePackagingPlan,
  type PackagingCalculationResult,
} from '@/features/logistics-packaging-management/packaging-calculator'
import type { PackagingProfile } from '@/features/logistics-packaging-management/packaging-rules-service'
import {
  getActiveBOMWeight,
  type ActiveBOMWeightInfo,
} from '@/features/product-structure/hooks/use-active-bom-weight-map'
import type {
  SalesOrder,
  SalesOrderLine,
  SalesOrderLinePackagingSelection,
} from '../data/schema'
import {
  createPackagingProfileFromSelection,
  getPackagingProfilesForProduct,
  resolveSalesOrderLinePackagingSelection,
} from './sales-order-packaging-selection'

export type SalesOrderPackagingEntryState =
  | 'no_lines'
  | 'resolved'
  | 'needs_selection'
  | 'create_new'
  | 'missing_product'

export interface SalesOrderPackagingEntryLineTarget {
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

export interface SalesOrderPackagingEntryNoLinesTarget {
  state: 'no_lines'
  lineCount: 0
  resolvedLineCount: 0
  pendingSelectionLineCount: 0
  createRuleLineCount: 0
  missingProductLineCount: 0
  lines: []
}

export interface SalesOrderPackagingEntryResolvedTarget {
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

export interface SalesOrderPackagingPreviewLine {
  key: string
  lineNo: number
  productId?: string
  productDisplayTitle: string
  productDisplaySubtitle: string
  qty: number
  uom: string
  selectedPackaging?: SalesOrderLinePackagingSelection
  matchedProfileCount: number
  productWeight: number
  plan: PackagingCalculationResult
}

export interface SalesOrderPackagingPreviewSummary {
  totalLineCount: number
  packagedLineCount: number
  unpackagedLineCount: number
  totalBoxCount: number
  totalVolume: number
  totalGrossWeight: number
  warnings: string[]
}

export interface SalesOrderPackagingPreviewData {
  lines: SalesOrderPackagingPreviewLine[]
  summary: SalesOrderPackagingPreviewSummary
}

export interface SalesOrderPackagingCardViewModel {
  target: SalesOrderPackagingEntryTarget | null
  preview: SalesOrderPackagingPreviewData | null
  profiles: PackagingProfile[]
  isLoading: boolean
  isError: boolean
  error: Error | null
}

export interface BuildSalesOrderPackagingCardViewModelInput {
  order: SalesOrder
  profiles: PackagingProfile[]
  profilesReady: boolean
  productOptionsReady: boolean
  weightMap: Map<string, ActiveBOMWeightInfo>
  isLoading: boolean
  isError: boolean
  error: Error | null
}

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
  const matchedProfiles = getPackagingProfilesForProduct(
    profiles,
    line.productId,
    true
  )
  const selectedPackaging = resolveSalesOrderLinePackagingSelection(
    line,
    profiles
  )
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

export function buildSalesOrderPackagingEntryTarget(
  order: SalesOrder,
  profiles: PackagingProfile[],
  profilesReady = true
): SalesOrderPackagingEntryTarget | null {
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

  if (!profilesReady) {
    return null
  }

  const lines = order.lines.map((line) => buildLineTarget(line, profiles))
  const resolvedLineCount = lines.filter(
    (line) => line.state === 'resolved'
  ).length
  const pendingSelectionLineCount = lines.filter(
    (line) => line.state === 'needs_selection'
  ).length
  const createRuleLineCount = lines.filter(
    (line) => line.state === 'create_new'
  ).length
  const missingProductLineCount = lines.filter(
    (line) => line.state === 'missing_product'
  ).length
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
}

export function buildSalesOrderPackagingPreviewData(
  order: SalesOrder,
  profiles: PackagingProfile[],
  profilesReady: boolean,
  productOptionsReady: boolean,
  weightMap: Map<string, ActiveBOMWeightInfo>
): SalesOrderPackagingPreviewData | null {
  if (!profilesReady || !productOptionsReady) {
    return null
  }

  const lines = order.lines.map<SalesOrderPackagingPreviewLine>((line) => {
    const matchedProfiles = getPackagingProfilesForProduct(
      profiles,
      line.productId,
      true
    )
    const selectedPackaging = resolveSalesOrderLinePackagingSelection(
      line,
      profiles
    )
    const warnings: string[] = []
    const productDisplayTitle = resolveLineDisplayTitle(line)
    const productDisplaySubtitle = resolveLineDisplaySubtitle(line)

    if (!line.productId) {
      warnings.push('Order line is missing product binding.')
    }

    if (line.productId && !selectedPackaging) {
      warnings.push(
        matchedProfiles.length > 0
          ? 'Packaging selection is pending for this order line.'
          : 'No packaging profiles matched this product.'
      )
    }

    const weightInfo = getActiveBOMWeight(
      weightMap,
      line.productId,
      order.customerId
    )
    const productWeight = weightInfo.available ? weightInfo.weight : 0
    if (line.productId && !weightInfo.available) {
      warnings.push(
        'Product has no released BOM yet; weight defaults to 0 until a BOM is released.'
      )
    }

    const plan = calculatePackagingPlan({
      orderedQuantity: line.qty,
      productWeight,
      profiles: (selectedPackaging
        ? [createPackagingProfileFromSelection(selectedPackaging)]
        : []
      ).map((profile) => ({
        profileId: profile.id,
        profileName: profile.name,
        capacity: profile.capacity,
        netWeight: profile.netWeight,
        length: profile.length,
        width: profile.width,
        height: profile.height,
        dimensionUnitCode: profile.dimensionUnitCode,
        weightUnitCode: profile.weightUnitCode,
      })),
    })

    return {
      key: `${order.id}-${line.lineNo}`,
      lineNo: line.lineNo,
      productId: line.productId,
      productDisplayTitle,
      productDisplaySubtitle,
      qty: line.qty,
      uom: line.uom,
      selectedPackaging,
      matchedProfileCount: matchedProfiles.length,
      productWeight,
      plan: {
        ...plan,
        warnings: [...warnings, ...plan.warnings],
      },
    }
  })

  const warnings = lines.flatMap((line) => line.plan.warnings)
  const packagedLineCount = lines.filter(
    (line) => line.plan.boxCount > 0
  ).length

  return {
    lines,
    summary: {
      totalLineCount: lines.length,
      packagedLineCount,
      unpackagedLineCount: lines.length - packagedLineCount,
      totalBoxCount: lines.reduce((sum, line) => sum + line.plan.boxCount, 0),
      totalVolume: lines.reduce((sum, line) => sum + line.plan.totalVolume, 0),
      totalGrossWeight: lines.reduce(
        (sum, line) => sum + line.plan.totalGrossWeight,
        0
      ),
      warnings,
    },
  }
}

export function buildSalesOrderPackagingCardViewModel({
  order,
  profiles,
  profilesReady,
  productOptionsReady,
  weightMap,
  isLoading,
  isError,
  error,
}: BuildSalesOrderPackagingCardViewModelInput): SalesOrderPackagingCardViewModel {
  return {
    target: buildSalesOrderPackagingEntryTarget(order, profiles, profilesReady),
    preview: buildSalesOrderPackagingPreviewData(
      order,
      profiles,
      profilesReady,
      productOptionsReady,
      weightMap
    ),
    profiles,
    isLoading,
    isError,
    error,
  }
}
