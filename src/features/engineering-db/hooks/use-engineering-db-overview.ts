import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY,
  ENGINEERING_DB_DRILLING_QUERY_KEY,
  ENGINEERING_DB_LABELING_QUERY_KEY,
  ENGINEERING_DB_SPECS_QUERY_KEY,
} from '../query-keys'
import { type DrillingPlan, type LabelingDraft, type TechnicalSpec } from '../data/schema'
import { type CuttingPlan } from '../data/cutting-plan-schema'
import { ProductionDBService } from '../services/production-db-service'
import { SpecsService } from '../services/specs-service'
import { CuttingPlanService } from '../services/cutting-plan-service'
import { useEngineeringDbProductLookup } from './use-engineering-db-product-lookup'

export type UnifiedEntry = {
  id: string
  name: string
  category: 'SPEC' | 'DRILLING' | 'CUTTING' | 'LABELING'
  subType: string
  relationId?: string
  fileExtension?: string
  fileUrl?: string
  createdAt: string
}

type OverviewStats = {
  specCount: number
  drillingCount: number
  cuttingCount: number
  labelingCount: number
  excelCount: number
  cadCount: number
}

const EXCEL_FILE_EXTENSIONS = new Set(['xlsx', 'xls', 'csv'])
const CAD_FILE_EXTENSIONS = new Set(['dwg', 'dxf', 'stp', 'step'])

function toSpecEntry(item: TechnicalSpec): UnifiedEntry {
  return {
    id: item.id,
    name: item.name,
    category: 'SPEC',
    subType: item.category || 'SOP',
    relationId: undefined,
    fileExtension: item.fileExtension,
    fileUrl: item.fileUrl,
    createdAt: item.createdAt,
  }
}

function toDrillingEntry(item: DrillingPlan): UnifiedEntry {
  return {
    id: item.id,
    name: item.name,
    category: 'DRILLING',
    subType: 'DRILLING_PLAN',
    relationId: item.productId,
    fileExtension: item.fileExtension,
    fileUrl: item.fileUrl,
    createdAt: item.createdAt,
  }
}

function toLabelingEntry(item: LabelingDraft): UnifiedEntry {
  return {
    id: item.id,
    name: item.name,
    category: 'LABELING',
    subType: 'LABELING_DRAFT',
    relationId: item.productId || undefined,
    fileExtension: item.fileExtension,
    fileUrl: item.fileUrl,
    createdAt: item.createdAt,
  }
}

function toCuttingEntry(item: CuttingPlan): UnifiedEntry {
  return {
    id: item.id,
    name: item.name,
    category: 'CUTTING',
    subType: 'CUTTING_PLAN',
    relationId: undefined,
    fileExtension: 'xlsx',
    fileUrl: undefined,
    createdAt: item.createdAt || new Date().toISOString(),
  }
}

export function useEngineeringDbOverview(searchTerm: string) {
  const { productMap } = useEngineeringDbProductLookup()
  const { data: specs = [], isLoading: isSpecsLoading } = useQuery<TechnicalSpec[]>({
    queryKey: ENGINEERING_DB_SPECS_QUERY_KEY,
    queryFn: () => SpecsService.getSpecs(),
  })
  const { data: drilling = [], isLoading: isDrillingLoading } = useQuery<DrillingPlan[]>({
    queryKey: ENGINEERING_DB_DRILLING_QUERY_KEY,
    queryFn: () => ProductionDBService.getDrilling(),
  })
  const { data: labeling = [], isLoading: isLabelingLoading } = useQuery<LabelingDraft[]>({
    queryKey: ENGINEERING_DB_LABELING_QUERY_KEY,
    queryFn: () => ProductionDBService.getLabeling(),
  })
  const { data: cuttingPlans = [], isLoading: isCuttingLoading } = useQuery<CuttingPlan[]>({
    queryKey: ENGINEERING_DB_CUTTING_PLANS_QUERY_KEY,
    queryFn: () => CuttingPlanService.list(),
  })

  const data = useMemo(() => {
    return [...specs.map(toSpecEntry), ...drilling.map(toDrillingEntry), ...cuttingPlans.map(toCuttingEntry), ...labeling.map(toLabelingEntry)].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    )
  }, [cuttingPlans, drilling, labeling, specs])

  const filteredData = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()
    if (!normalizedSearch) {
      return data
    }

    return data.filter((item) => {
      return (
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.subType.toLowerCase().includes(normalizedSearch) ||
        item.id.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [data, searchTerm])

  const stats = useMemo<OverviewStats>(() => {
    return data.reduce<OverviewStats>(
      (result, item) => {
        if (item.category === 'SPEC') {
          result.specCount += 1
        } else if (item.category === 'DRILLING') {
          result.drillingCount += 1
        } else if (item.category === 'CUTTING') {
          result.cuttingCount += 1
        } else if (item.category === 'LABELING') {
          result.labelingCount += 1
        }

        const normalizedExtension = item.fileExtension?.toLowerCase()
        if (normalizedExtension && EXCEL_FILE_EXTENSIONS.has(normalizedExtension)) {
          result.excelCount += 1
        }
        if (normalizedExtension && CAD_FILE_EXTENSIONS.has(normalizedExtension)) {
          result.cadCount += 1
        }

        return result
      },
      {
        specCount: 0,
        drillingCount: 0,
        cuttingCount: 0,
        labelingCount: 0,
        excelCount: 0,
        cadCount: 0,
      },
    )
  }, [data])

  return {
    data,
    filteredData,
    productMap,
    stats,
    isLoading: isSpecsLoading || isDrillingLoading || isCuttingLoading || isLabelingLoading,
  }
}
