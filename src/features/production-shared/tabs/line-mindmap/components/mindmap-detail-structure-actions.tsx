import type { LineMindmapNode, MindmapLevel } from '../data/line-mindmap-domain'
import type { LineMindmapProcessOption } from '../types'
import { MindmapDetailAddChildActions } from './mindmap-detail-add-child-actions'
import { MindmapDetailStructureWriteback } from './mindmap-detail-structure-writeback'

interface MindmapDetailStructureActionsProps {
  selectedNode: LineMindmapNode
  levelNames: Record<MindmapLevel, string>
  processOptions: LineMindmapProcessOption[]
  onAssignProcess?: (processId: string) => void | Promise<void>
  onDeleteSelected?: () => void | Promise<void>
  onRenameSelected?: (name: string) => void | Promise<void>
}

export function MindmapDetailStructureActions({
  selectedNode,
  levelNames,
  processOptions,
  onAssignProcess,
  onDeleteSelected,
  onRenameSelected,
}: MindmapDetailStructureActionsProps) {
  const canEditStructure = selectedNode.sourceType === 'segment'

  return (
    <>
      <MindmapDetailAddChildActions
        selectedNode={selectedNode}
        levelNames={levelNames}
        processOptions={processOptions}
        onAssignProcess={onAssignProcess}
      />

      {canEditStructure ? (
        <MindmapDetailStructureWriteback
          selectedNode={selectedNode}
          levelNames={levelNames}
          onDeleteSelected={onDeleteSelected}
          onRenameSelected={onRenameSelected}
        />
      ) : null}
    </>
  )
}
