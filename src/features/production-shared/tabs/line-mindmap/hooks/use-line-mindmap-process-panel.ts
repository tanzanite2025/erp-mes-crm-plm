import type {
  ProductionBOMBranchOperation,
  ProductionLine,
} from '../../../data/production-line'
import { useProductionProcessesQuery } from '../../../hooks/use-production-resources'
import { productionBOMBranchOperationSelectionService } from '../../../services/production-bom-branch-operation-selection-service'
import { productionBOMBranchOperationsService } from '../../../services/production-bom-branch-operations-service'
import { productionResourceSync } from '../../../services/production-resource-sync'
import type { LineMindmapProcessDraft } from '../types'

interface UseLineMindmapProcessPanelOptions {
  activeLine: ProductionLine | null
}

function getBranchOperationForSegment(
  activeLine: ProductionLine,
  segmentId: string,
  draft: LineMindmapProcessDraft
): ProductionBOMBranchOperation | null {
  const segment = activeLine.segments.find((item) => item.id === segmentId)
  if (!segment) {
    return null
  }

  return {
    id: '',
    productId: segment.productId,
    bomOwnerType: segment.bomOwnerType === 'CUSTOMER' ? 'CUSTOMER' : 'INTERNAL',
    bomOwnerCustomerId: segment.bomOwnerCustomerId ?? '',
    bomVersionLevel: segment.bomVersionLevel ?? '',
    name: draft.name.trim(),
    description: draft.description.trim(),
    sortOrder: segment.branchOperations?.length ?? 0,
    isActive: draft.isActive,
    processLibraryId: draft.processLibraryId,
  }
}

export function useLineMindmapProcessPanel({
  activeLine,
}: UseLineMindmapProcessPanelOptions) {
  const { data: standardProcesses = [] } = useProductionProcessesQuery()
  const handleCreateProcessForSegment = async (
    draft: LineMindmapProcessDraft,
    segmentId: string
  ) => {
    if (!activeLine) {
      return null
    }

    const operation = getBranchOperationForSegment(activeLine, segmentId, draft)
    if (!operation) {
      return null
    }

    const saved = await productionBOMBranchOperationsService.save(operation)
    productionResourceSync.emitLinesUpdated()
    return saved
  }

  const handleSaveProcessEntity = async (
    operation: ProductionBOMBranchOperation
  ) => {
    const saved = await productionBOMBranchOperationsService.save({
      ...operation,
      name: operation.name.trim(),
      description: operation.description.trim(),
    })
    productionResourceSync.emitLinesUpdated()
    return saved
  }

  const handleSaveProcessSelection = async (
    segmentId: string,
    processLibraryIds: string[]
  ) => {
    if (!activeLine) {
      return []
    }
    const segment = activeLine.segments.find((item) => item.id === segmentId)
    if (!segment) {
      return []
    }
    const saved = await productionBOMBranchOperationSelectionService.replace({
      productId: segment.productId,
      bomOwnerType:
        segment.bomOwnerType === 'CUSTOMER' ? 'CUSTOMER' : 'INTERNAL',
      bomOwnerCustomerId: segment.bomOwnerCustomerId ?? '',
      bomVersionLevel: segment.bomVersionLevel ?? '',
      processLibraryIds,
    })
    productionResourceSync.emitLinesUpdated()
    return saved
  }

  return {
    handleCreateProcessForSegment,
    handleSaveProcessEntity,
    handleSaveProcessSelection,
    standardProcesses,
  }
}
