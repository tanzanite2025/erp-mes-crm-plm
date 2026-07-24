import type { ProductionProcessStep } from '../../../data/production-process'
import type { LineMindmapNode, MindmapLevel } from '../data/line-mindmap-domain'
import { MindmapDetailProcessEntityEditor } from './mindmap-detail-process-entity-editor'
import { MindmapDetailProcessRemoveAction } from './mindmap-detail-process-remove-action'

interface MindmapDetailProcessActionsProps {
  selectedNode: LineMindmapNode
  levelNames: Record<MindmapLevel, string>
  onDeleteProcessEntity?: (
    process: ProductionProcessStep
  ) => void | Promise<void>
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
      <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        结构写回
      </p>
      <div className='space-y-4 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
        <MindmapDetailProcessRemoveAction
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
