import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import type { LineMindmapNode, MindmapLevel } from '../data/sample-mindmap'
import type { LineMindmapProcessOption } from '../types'
import { MindmapDetailAddChildActions } from './mindmap-detail-add-child-actions'
import { MindmapDetailStructureWriteback } from './mindmap-detail-structure-writeback'

interface MindmapDetailStructureActionsProps {
  selectedNode: LineMindmapNode
  levelNames: Record<MindmapLevel, string>
  processOptions: LineMindmapProcessOption[]
  rebindOptions: HierarchyLevelOptionItem[]
  onAssignProcess?: (processId: string) => void | Promise<void>
  onDeleteSelected?: () => void | Promise<void>
  onRebindSelected?: (option: HierarchyLevelOptionItem) => void | Promise<void>
  onRenameSelected?: (name: string) => void | Promise<void>
}

export function MindmapDetailStructureActions({
  selectedNode,
  levelNames,
  processOptions,
  rebindOptions,
  onAssignProcess,
  onDeleteSelected,
  onRebindSelected,
  onRenameSelected,
}: MindmapDetailStructureActionsProps) {
  const canEditStructure =
    selectedNode.sourceType === 'segment' ||
    selectedNode.sourceType === 'jobCategory'

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
          rebindOptions={rebindOptions}
          onDeleteSelected={onDeleteSelected}
          onRebindSelected={onRebindSelected}
          onRenameSelected={onRenameSelected}
        />
      ) : null}
    </>
  )
}
