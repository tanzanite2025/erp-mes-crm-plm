import type { ProductionProcessStep } from '../../../data/production-process'
import type { LineMindmapNode, MindmapLevel } from '../data/sample-mindmap'
import { MindmapDetailProcessCapabilityActions } from './mindmap-detail-process-capability-actions'
import { MindmapDetailProcessEntityEditor } from './mindmap-detail-process-entity-editor'

interface MindmapDetailProcessActionsProps {
  selectedNode: LineMindmapNode
  levelNames: Record<MindmapLevel, string>
  onDeleteProcessEntity?: (process: ProductionProcessStep) => void | Promise<void>
  onRemoveProcess?: () => void | Promise<void>
  onSaveProcessEntity?: (process: ProductionProcessStep) => void | Promise<void>
}

export function MindmapDetailProcessActions({
  selectedNode,
  levelNames,
  onDeleteProcessEntity,
  onRemoveProcess,
  onSaveProcessEntity,
}: MindmapDetailProcessActionsProps) {
  const processEntity = {
    code: selectedNode.readonlyMeta?.code ?? '',
    description: selectedNode.readonlyMeta?.description ?? '',
    id: selectedNode.sourceId ?? '',
    isActive: selectedNode.readonlyMeta?.isActive ?? true,
    name: selectedNode.nameSnapshot,
  }

  return (
    <div className='space-y-2'>
      <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>结构写回</p>
      <div className='space-y-4 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
        <MindmapDetailProcessCapabilityActions
          levelNames={levelNames}
          onRemoveProcess={onRemoveProcess}
        />

        <MindmapDetailProcessEntityEditor
          levelNames={levelNames}
          processEntity={processEntity}
          onDeleteProcessEntity={onDeleteProcessEntity}
          onSaveProcessEntity={onSaveProcessEntity}
        />
      </div>
    </div>
  )
}
