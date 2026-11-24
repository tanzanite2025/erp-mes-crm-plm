import type { ProductionBOMBranch } from '../../../data/production-bom-branch'
import type { ProductionProcessStep } from '../../../data/production-process'
import type { LineMindmapNode } from '../data/line-mindmap-domain'
import { MindmapDetailBOMBranchBinding } from './mindmap-detail-bom-branch-binding'
import { MindmapDetailProcessLibrarySelection } from './mindmap-detail-process-library-selection'

interface MindmapDetailStructureActionsProps {
  selectedNode: LineMindmapNode
  bomBranches: ProductionBOMBranch[]
  isLoadingBOMBranches: boolean
  bomBranchQueryError?: Error | null
  onBindBOMBranch?: (branch: ProductionBOMBranch) => void | Promise<void>
  onDeleteSelected?: () => void | Promise<void>
  standardProcesses: ProductionProcessStep[]
  onSaveProcessSelection?: (
    segmentId: string,
    processLibraryIds: string[]
  ) => void | Promise<unknown>
}

export function MindmapDetailStructureActions({
  selectedNode,
  bomBranches,
  isLoadingBOMBranches,
  bomBranchQueryError,
  onBindBOMBranch,
  onDeleteSelected,
  standardProcesses,
  onSaveProcessSelection,
}: MindmapDetailStructureActionsProps) {
  const canEditStructure = selectedNode.sourceType === 'segment'

  return (
    <>
      {canEditStructure ? (
        <MindmapDetailBOMBranchBinding
          selectedNode={selectedNode}
          branches={bomBranches}
          isLoadingBranches={isLoadingBOMBranches}
          branchQueryError={bomBranchQueryError}
          onBindBranch={onBindBOMBranch}
          onDeleteSelected={onDeleteSelected}
        />
      ) : null}
      {canEditStructure ? (
        <MindmapDetailProcessLibrarySelection
          selectedNode={selectedNode}
          standardProcesses={standardProcesses}
          onSaveProcessSelection={onSaveProcessSelection}
        />
      ) : null}
    </>
  )
}
