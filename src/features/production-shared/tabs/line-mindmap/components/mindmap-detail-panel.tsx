import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProductionProcessStep } from '../../../data/production-process'
import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import type { LineMindmapNode, MindmapLevel } from '../data/sample-mindmap'
import type { LineMindmapProcessOption } from '../types'
import { MindmapDetailEmbeddedActions } from './mindmap-detail-embedded-actions'
import { MindmapDetailProcessActions } from './mindmap-detail-process-actions'
import { MindmapDetailStructureActions } from './mindmap-detail-structure-actions'
import { MindmapDetailSummary } from './mindmap-detail-summary'

export interface MindmapDetailPanelProps {
  selectedNode: LineMindmapNode | null
  levelNames: Record<MindmapLevel, string>
  onPatchNode: (
    nodeId: string,
    patch: Partial<Pick<LineMindmapNode, 'actionType' | 'dialogKey' | 'note'>>
  ) => void
  readonlyMode?: boolean
  processOptions?: LineMindmapProcessOption[]
  onDeleteSelected?: () => void | Promise<void>
  rebindOptions?: HierarchyLevelOptionItem[]
  onAssignProcess?: (processId: string) => void | Promise<void>
  onDeleteProcessEntity?: (
    process: ProductionProcessStep
  ) => void | Promise<void>
  onRebindSelected?: (option: HierarchyLevelOptionItem) => void | Promise<void>
  onRemoveProcess?: () => void | Promise<void>
  onSaveProcessEntity?: (process: ProductionProcessStep) => void | Promise<void>
  onRenameSelected?: (name: string) => void | Promise<void>
}

export function MindmapDetailPanel({
  selectedNode,
  levelNames,
  onPatchNode,
  readonlyMode = false,
  processOptions = [],
  onDeleteSelected,
  rebindOptions = [],
  onAssignProcess,
  onDeleteProcessEntity,
  onRebindSelected,
  onRemoveProcess,
  onSaveProcessEntity,
  onRenameSelected,
}: MindmapDetailPanelProps) {
  const canEditStructure =
    selectedNode?.sourceType === 'segment' ||
    selectedNode?.sourceType === 'jobCategory'
  const canRemoveProcess = selectedNode?.sourceType === 'process'

  return (
    <Card className='rounded-[24px] border border-dashed border-muted/40 bg-background/90 shadow-none'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm font-black tracking-tighter text-foreground italic'>
          节点编辑
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-5 p-5'>
        {selectedNode ? (
          <>
            <MindmapDetailSummary
              selectedNode={selectedNode}
              levelNames={levelNames}
            />

            {readonlyMode ? (
              <div className='space-y-2'>
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
                  结构操作
                </p>
                <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black tracking-widest text-amber-700 uppercase'>
                  当前阶段仅展示真实结构映射，新增下级与结构写回暂未接入。
                </div>
              </div>
            ) : (
              <>
                <MindmapDetailStructureActions
                  key={`structure-${selectedNode.id}-${selectedNode.nameSnapshot}-${selectedNode.hierarchyOptionId ?? 'none'}`}
                  selectedNode={selectedNode}
                  levelNames={levelNames}
                  processOptions={processOptions}
                  rebindOptions={rebindOptions}
                  onAssignProcess={onAssignProcess}
                  onDeleteSelected={onDeleteSelected}
                  onRebindSelected={onRebindSelected}
                  onRenameSelected={onRenameSelected}
                />

                {canRemoveProcess ? (
                  <MindmapDetailProcessActions
                    key={`process-${selectedNode.id}-${selectedNode.nameSnapshot}-${selectedNode.readonlyMeta?.description ?? ''}-${selectedNode.readonlyMeta?.isActive ? '1' : '0'}`}
                    selectedNode={selectedNode}
                    levelNames={levelNames}
                    onDeleteProcessEntity={onDeleteProcessEntity}
                    onRemoveProcess={onRemoveProcess}
                    onSaveProcessEntity={onSaveProcessEntity}
                  />
                ) : !canEditStructure ? (
                  <div className='space-y-2'>
                    <p className='text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
                      结构写回
                    </p>
                    <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black tracking-widest text-amber-700 uppercase'>
                      当前节点暂未接入重命名或删除写回。
                    </div>
                  </div>
                ) : null}

                <MindmapDetailEmbeddedActions
                  selectedNode={selectedNode}
                  onPatchNode={onPatchNode}
                />
              </>
            )}
          </>
        ) : (
          <div className='space-y-4'>
            <div className='rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-4 py-4'>
              <p className='text-sm font-black tracking-tighter text-foreground italic'>
                还没有选中节点
              </p>
              <p className='mt-2 text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
                {readonlyMode
                  ? '请选择一条产线并点击左侧节点查看真实详情。'
                  : '请先使用脑图上方工具条新增节点，或点击左侧已有节点进入编辑态。'}
              </p>
            </div>

            {readonlyMode ? null : (
              <div className='rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-4 py-4 text-[10px] font-black tracking-widest text-muted-foreground/55 uppercase'>
                顶部三按钮负责快速新增，编辑弹窗继续承接节点详情、重命名、重绑、删除与第三级复杂编辑。
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
