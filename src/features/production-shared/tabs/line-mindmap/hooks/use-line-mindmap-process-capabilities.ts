import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  ProductionJobCategory,
  ProductionLine,
} from '../../../data/production-line'
import type { ProductionProcessStep } from '../../../data/production-process'
import { productionResourceQueryKeys } from '../../../data/production-resource-query-keys'
import { productionJobCategoryCapabilitiesService } from '../../../services/production-job-category-capabilities-service'
import { productionResourceSync } from '../../../services/production-resource-sync'
import { useHierarchyLevelLabels } from '../../hierarchy-config/hooks/use-hierarchy-level-labels'

function appendUniqueProcess(
  current: ProductionProcessStep[],
  process: ProductionProcessStep
): ProductionProcessStep[] {
  if (current.some((item) => item.id === process.id)) {
    return current
  }

  return [...current, process]
}

function removeProcess(
  current: ProductionProcessStep[],
  processId: string
): ProductionProcessStep[] {
  return current.filter((process) => process.id !== processId)
}

function updateJobCategoryInLines(
  lines: ProductionLine[],
  jobCategoryId: string,
  updater: (jobCategory: ProductionJobCategory) => ProductionJobCategory
): ProductionLine[] {
  return lines.map((line) => ({
    ...line,
    segments: (line.segments || []).map((segment) => ({
      ...segment,
      jobCategories: (segment.jobCategories || []).map((jobCategory) =>
        jobCategory.id === jobCategoryId ? updater(jobCategory) : jobCategory
      ),
    })),
  }))
}

export function useLineMindmapProcessCapabilities() {
  const queryClient = useQueryClient()
  const { level3Name } = useHierarchyLevelLabels()

  const patchLines = (
    updater: (current: ProductionLine[]) => ProductionLine[]
  ) => {
    queryClient.setQueryData<ProductionLine[]>(
      productionResourceQueryKeys.lines(),
      (current) => updater(current ?? [])
    )
  }

  const assignProcessCapability = async (
    jobCategoryId: string,
    processId: string
  ) => {
    await productionJobCategoryCapabilitiesService.assignProcessCapability(
      jobCategoryId,
      processId
    )

    const process = (
      queryClient.getQueryData<ProductionProcessStep[]>(
        productionResourceQueryKeys.processes()
      ) ?? []
    ).find((item) => item.id === processId)

    if (process) {
      patchLines((current) =>
        updateJobCategoryInLines(current, jobCategoryId, (jobCategory) => ({
          ...jobCategory,
          processes: appendUniqueProcess(jobCategory.processes || [], process),
        }))
      )
    }

    productionResourceSync.emitLinesUpdated({ invalidate: true })
    toast.success(`${level3Name}能力已添加`)
  }

  const removeProcessCapability = async (
    jobCategoryId: string,
    processId: string
  ) => {
    await productionJobCategoryCapabilitiesService.removeProcessCapability(
      jobCategoryId,
      processId
    )

    patchLines((current) =>
      updateJobCategoryInLines(current, jobCategoryId, (jobCategory) => ({
        ...jobCategory,
        processes: removeProcess(jobCategory.processes || [], processId),
      }))
    )

    productionResourceSync.emitLinesUpdated({ invalidate: true })
    toast.success(`${level3Name}能力已移除`)
  }

  return {
    assignProcessCapability,
    removeProcessCapability,
  }
}
