import type { ProductionBOMBranchOperation } from '../../../data/production-line'
import type { LineMindmapNode, MindmapLevel } from '../data/line-mindmap-domain'
import { MindmapDetailProcessEntityEditor } from './mindmap-detail-process-entity-editor'

interface MindmapDetailProcessActionsProps {
  selectedNode: LineMindmapNode
  levelNames: Record<MindmapLevel, string>
  onSaveProcessEntity?: (
    process: ProductionBOMBranchOperation
  ) => void | Promise<unknown>
}

export function MindmapDetailProcessActions({
  selectedNode,
  levelNames,
  onSaveProcessEntity,
}: MindmapDetailProcessActionsProps) {
  const processEntity: ProductionBOMBranchOperation = {
    description: selectedNode.readonlyMeta?.description ?? '',
    id: selectedNode.sourceId ?? '',
    isActive: selectedNode.readonlyMeta?.isActive ?? true,
    name: selectedNode.nameSnapshot,
    productId: selectedNode.readonlyMeta?.productId ?? '',
    bomOwnerType:
      selectedNode.readonlyMeta?.bomOwnerType === 'CUSTOMER'
        ? 'CUSTOMER'
        : 'INTERNAL',
    bomOwnerCustomerId: selectedNode.readonlyMeta?.bomOwnerCustomerId ?? '',
    bomVersionLevel: selectedNode.readonlyMeta?.bomVersionLevel ?? '',
    sortOrder: selectedNode.readonlyMeta?.sortOrder ?? 0,
  }

  return (
    <div className='space-y-2'>
      <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
        分支工序维护
      </p>
      <div className='space-y-4 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
        <MindmapDetailProcessEntityEditor
          levelNames={levelNames}
          processEntity={processEntity}
          onSaveProcessEntity={onSaveProcessEntity}
        />
      </div>
    </div>
  )
}
