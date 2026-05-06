import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getNextMindmapLevel, type LineMindmapNode, type MindmapLevel, type MindmapNodeActionType } from '../data/sample-mindmap'
import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import type { ProductionProcessStep } from '../../../data/production-process'

interface ProcessLibraryDraft {
  description: string
  isActive: boolean
  name: string
}

interface MindmapDetailPanelProps {
  selectedNode: LineMindmapNode | null
  levelNames: Record<MindmapLevel, string>
  onPatchNode: (
    nodeId: string,
    patch: Partial<Pick<LineMindmapNode, 'actionType' | 'dialogKey' | 'note'>>,
  ) => void
  readonlyMode?: boolean
  rootOptions?: HierarchyLevelOptionItem[]
  childOptions?: HierarchyLevelOptionItem[]
  processOptions?: Array<{ id: string; label: string; code?: string }>
  processLibraryDraft?: ProcessLibraryDraft
  onAddRoot?: (option: HierarchyLevelOptionItem) => void
  onAddChild?: (parentId: string, option: HierarchyLevelOptionItem) => void
  onDeleteSelected?: () => void
  rebindOptions?: HierarchyLevelOptionItem[]
  onAssignProcess?: (processId: string) => void
  onCreateProcess?: (draft: ProcessLibraryDraft) => void
  onDeleteProcessEntity?: (process: ProductionProcessStep) => void
  onPatchProcessLibraryDraft?: (patch: Partial<ProcessLibraryDraft>) => void
  onRebindSelected?: (option: HierarchyLevelOptionItem) => void
  onRemoveProcess?: () => void
  onSaveProcessEntity?: (process: ProductionProcessStep) => void
  onRenameSelected?: (name: string) => void
}

export function MindmapDetailPanel({
  selectedNode,
  levelNames,
  onPatchNode,
  readonlyMode = false,
  rootOptions = [],
  childOptions = [],
  processOptions = [],
  processLibraryDraft,
  onAddRoot,
  onAddChild,
  onDeleteSelected,
  rebindOptions = [],
  onAssignProcess,
  onCreateProcess,
  onDeleteProcessEntity,
  onPatchProcessLibraryDraft,
  onRebindSelected,
  onRemoveProcess,
  onSaveProcessEntity,
  onRenameSelected,
}: MindmapDetailPanelProps) {
  const [rootOptionId, setRootOptionId] = useState('')
  const [childOptionId, setChildOptionId] = useState('')
  const [processOptionId, setProcessOptionId] = useState('')
  const [rebindOptionId, setRebindOptionId] = useState('')
  const [renameValue, setRenameValue] = useState(selectedNode?.nameSnapshot ?? '')
  const resolvedRootOptionId = useMemo(
    () => (rootOptions.some((option) => option.id === rootOptionId) ? rootOptionId : rootOptions[0]?.id ?? ''),
    [rootOptionId, rootOptions],
  )
  const resolvedChildOptionId = useMemo(
    () => (childOptions.some((option) => option.id === childOptionId) ? childOptionId : childOptions[0]?.id ?? ''),
    [childOptionId, childOptions],
  )

  const rootOption = useMemo(
    () => rootOptions.find((option) => option.id === resolvedRootOptionId) ?? null,
    [resolvedRootOptionId, rootOptions],
  )
  const childOption = useMemo(
    () => childOptions.find((option) => option.id === resolvedChildOptionId) ?? null,
    [childOptions, resolvedChildOptionId],
  )
  const resolvedProcessOptionId = useMemo(
    () => (processOptions.some((option) => option.id === processOptionId) ? processOptionId : processOptions[0]?.id ?? ''),
    [processOptionId, processOptions],
  )
  const processOption = useMemo(
    () => processOptions.find((option) => option.id === resolvedProcessOptionId) ?? null,
    [processOptions, resolvedProcessOptionId],
  )
  const resolvedRebindOptionId = useMemo(
    () => (rebindOptions.some((option) => option.id === rebindOptionId) ? rebindOptionId : rebindOptions[0]?.id ?? ''),
    [rebindOptionId, rebindOptions],
  )
  const rebindOption = useMemo(
    () => rebindOptions.find((option) => option.id === resolvedRebindOptionId) ?? null,
    [rebindOptions, resolvedRebindOptionId],
  )
  const nextLevel = selectedNode ? getNextMindmapLevel(selectedNode.level) : null
  const canEditStructure = selectedNode?.sourceType === 'segment' || selectedNode?.sourceType === 'jobCategory'
  const bindingStatusText = selectedNode?.hierarchyOptionId ? '当前已绑定标准候选项' : '当前为脱绑自定义节点'
  const canAssignProcess = selectedNode?.sourceType === 'jobCategory'
  const canRemoveProcess = selectedNode?.sourceType === 'process'
  const canEditProcessEntity = selectedNode?.sourceType === 'process'
  const processEntity = canEditProcessEntity
    ? {
        code: selectedNode.readonlyMeta?.code ?? '',
        description: selectedNode.readonlyMeta?.description ?? '',
        id: selectedNode.sourceId ?? '',
        isActive: selectedNode.readonlyMeta?.isActive ?? true,
        name: selectedNode.nameSnapshot,
      }
    : null
  const [processEntityDraft, setProcessEntityDraft] = useState(() =>
    processEntity
      ? {
          description: processEntity.description,
          isActive: processEntity.isActive,
          name: processEntity.name,
        }
      : {
          description: '',
          isActive: true,
          name: '',
        },
  )

  return (
    <Card className='rounded-[24px] border border-dashed border-muted/40 bg-background/90 shadow-none'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-sm font-black italic tracking-tighter text-foreground'>节点编辑</CardTitle>
      </CardHeader>
      <CardContent className='space-y-5 p-5'>
        {selectedNode ? (
          <>
            <div className='space-y-2 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
              <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>当前节点</p>
              <div className='text-sm font-black tracking-tight text-foreground'>{selectedNode.nameSnapshot}</div>
              <div className='grid gap-2 text-[10px] font-mono text-muted-foreground/70'>
                <span>LEVEL {selectedNode.level} / {levelNames[selectedNode.level]}</span>
                <span>OPTION {selectedNode.hierarchyOptionId ?? '未绑定'}</span>
                <span>SOURCE {selectedNode.sourceType ?? 'unknown'} / {selectedNode.sourceId ?? 'n/a'}</span>
              </div>
            </div>

            {readonlyMode ? (
              <div className='space-y-2'>
                <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>结构操作</p>
                <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700'>
                  当前阶段仅展示真实结构映射，新增下级与结构写回暂未接入。
                </div>
              </div>
            ) : (
              <>
                <div className='space-y-2'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>添加下级</p>
                  {nextLevel ? (
                    nextLevel === 3 ? (
                      processOptions.length > 0 ? (
                        <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
                          <Select value={resolvedProcessOptionId || undefined} onValueChange={setProcessOptionId}>
                            <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
                              <SelectValue placeholder={`选择要挂接的${levelNames[nextLevel]}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {processOptions.map((option) => (
                                <SelectItem key={option.id} value={option.id}>
                                  {option.label}{option.code ? ` · ${option.code}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            type='button'
                            className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
                            onClick={() => processOption && onAssignProcess?.(processOption.id)}
                            disabled={!canAssignProcess || !processOption || !onAssignProcess}
                          >
                            挂接{levelNames[nextLevel]}
                          </Button>
                        </div>
                      ) : (
                        <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700'>
                          当前没有可用的{levelNames[nextLevel]}可供挂接。
                        </div>
                      )
                    ) : childOptions.length > 0 ? (
                      <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
                        <Select value={resolvedChildOptionId || undefined} onValueChange={setChildOptionId}>
                          <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
                            <SelectValue placeholder={`选择${levelNames[nextLevel]}候选项`} />
                          </SelectTrigger>
                          <SelectContent>
                            {childOptions.map((option) => (
                              <SelectItem key={option.id} value={option.id}>
                                {option.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type='button'
                          className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
                          onClick={() => childOption && onAddChild?.(selectedNode.id, childOption)}
                          disabled={!childOption || !onAddChild}
                        >
                          新增{levelNames[nextLevel]}
                        </Button>
                      </div>
                    ) : (
                      <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700'>
                        当前没有可用的{levelNames[nextLevel]}候选项
                      </div>
                    )
                  ) : (
                    <div className='rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>
                      当前节点已经是末级节点
                    </div>
                  )}
                </div>

                <div className='space-y-2'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>结构写回</p>
                  {canEditStructure ? (
                    <div className='space-y-4 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
                      <div className='space-y-2'>
                        <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/55'>
                          {bindingStatusText}
                        </div>
                        {rebindOptions.length > 0 ? (
                          <>
                            <Select value={resolvedRebindOptionId || undefined} onValueChange={setRebindOptionId}>
                              <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
                                <SelectValue placeholder={`选择要重新绑定的${levelNames[selectedNode.level]}候选项`} />
                              </SelectTrigger>
                              <SelectContent>
                                {rebindOptions.map((option) => (
                                  <SelectItem key={option.id} value={option.id}>
                                    {option.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type='button'
                              variant='outline'
                              className='h-11 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'
                              onClick={() => rebindOption && onRebindSelected?.(rebindOption)}
                              disabled={!rebindOption || !onRebindSelected}
                            >
                              重新绑定候选项
                            </Button>
                          </>
                        ) : (
                          <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700'>
                            当前没有可用的{levelNames[selectedNode.level]}候选项可供重新绑定。
                          </div>
                        )}
                        <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/55'>
                          重新绑定后会恢复候选项引用，并将名称更新为候选项当前快照。
                        </div>
                      </div>

                      <div className='space-y-3 border-t border-dashed border-muted/40 pt-4'>
                        <Input
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          placeholder={`输入新的${levelNames[selectedNode.level]}名称`}
                          className='h-11 rounded-2xl border-none bg-background/80'
                        />
                        <div className='grid gap-3 sm:grid-cols-2'>
                          <Button
                            type='button'
                            className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
                            onClick={() => onRenameSelected?.(renameValue)}
                            disabled={renameValue.trim() === '' || !onRenameSelected}
                          >
                            保存重命名
                          </Button>
                          <Button
                            type='button'
                            variant='outline'
                            className='h-11 rounded-full border-dashed border-rose-300 bg-rose-500/10 px-5 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-500/15 hover:text-rose-800'
                            onClick={() => onDeleteSelected?.()}
                            disabled={!onDeleteSelected}
                          >
                            删除当前节点
                          </Button>
                        </div>
                        <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/55'>
                          手工重命名后会清空当前节点的候选项绑定引用。
                        </div>
                      </div>
                    </div>
                  ) : canRemoveProcess ? (
                    <div className='space-y-4 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
                      <div className='space-y-3'>
                        <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/55'>
                          当前第三级节点对应 jobCategory 的已挂接能力。
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          className='h-11 rounded-full border-dashed border-rose-300 bg-rose-500/10 px-5 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-500/15 hover:text-rose-800'
                          onClick={() => onRemoveProcess?.()}
                          disabled={!onRemoveProcess}
                        >
                          移除当前{levelNames[3]}
                        </Button>
                      </div>

                      {processEntity ? (
                        <div className='space-y-3 border-t border-dashed border-muted/40 pt-4'>
                          <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/55'>
                            {levelNames[3]}本体
                          </div>
                          <Input
                            value={processEntityDraft.name}
                            onChange={(event) => setProcessEntityDraft((current) => ({ ...current, name: event.target.value }))}
                            placeholder={`输入${levelNames[3]}名称`}
                            className='h-11 rounded-2xl border-none bg-background/80'
                          />
                          <Textarea
                            value={processEntityDraft.description}
                            onChange={(event) => setProcessEntityDraft((current) => ({ ...current, description: event.target.value }))}
                            placeholder={`补充${levelNames[3]}说明`}
                            className='min-h-24 rounded-[24px] border-none bg-background/80'
                          />
                          <Select
                            value={processEntityDraft.isActive ? 'active' : 'inactive'}
                            onValueChange={(value) => setProcessEntityDraft((current) => ({ ...current, isActive: value === 'active' }))}
                          >
                            <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
                              <SelectValue placeholder='选择启用状态' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='active'>启用</SelectItem>
                              <SelectItem value='inactive'>停用</SelectItem>
                            </SelectContent>
                          </Select>
                          <div className='grid gap-3 sm:grid-cols-2'>
                            <Button
                              type='button'
                              className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
                              onClick={() => onSaveProcessEntity?.({
                                id: processEntity.id,
                                code: processEntity.code,
                                description: processEntityDraft.description,
                                isActive: processEntityDraft.isActive,
                                name: processEntityDraft.name,
                              })}
                              disabled={!processEntityDraft.name.trim() || !onSaveProcessEntity}
                            >
                              保存{levelNames[3]}本体
                            </Button>
                            <Button
                              type='button'
                              variant='outline'
                              className='h-11 rounded-full border-dashed border-rose-300 bg-rose-500/10 px-5 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-500/15 hover:text-rose-800'
                              onClick={() => onDeleteProcessEntity?.({
                                id: processEntity.id,
                                code: processEntity.code,
                                description: processEntity.description,
                                isActive: processEntity.isActive,
                                name: processEntity.name,
                              })}
                              disabled={!onDeleteProcessEntity}
                            >
                              删除{levelNames[3]}本体
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700'>
                      当前节点暂未接入重命名或删除写回。
                    </div>
                  )}
                </div>
              </>
            )}

            {selectedNode.readonlyMeta ? (
              <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
                <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>只读信息</p>
                <div className='grid gap-2 text-[11px] text-muted-foreground/80'>
                  {selectedNode.readonlyMeta.lineName ? <div>所属产线：{selectedNode.readonlyMeta.lineName}</div> : null}
                  {selectedNode.readonlyMeta.code ? <div>编码：{selectedNode.readonlyMeta.code}</div> : null}
                  {selectedNode.readonlyMeta.description ? <div>说明：{selectedNode.readonlyMeta.description}</div> : null}
                  {typeof selectedNode.readonlyMeta.sortOrder === 'number' ? <div>排序：{selectedNode.readonlyMeta.sortOrder}</div> : null}
                  {typeof selectedNode.readonlyMeta.isActive === 'boolean' ? <div>启用：{selectedNode.readonlyMeta.isActive ? '是' : '否'}</div> : null}
                </div>
              </div>
            ) : null}

            <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
              <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>预埋动作</p>
              <Select
                value={selectedNode.actionType}
                onValueChange={(value) => {
                  const nextActionType = value as MindmapNodeActionType
                  onPatchNode(selectedNode.id, {
                    actionType: nextActionType,
                    dialogKey: nextActionType === 'open_dialog' ? selectedNode.dialogKey : '',
                  })
                }}
              >
                <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
                  <SelectValue placeholder='选择动作类型' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>无</SelectItem>
                  <SelectItem value='open_dialog'>打开弹窗</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={selectedNode.dialogKey}
                onChange={(event) => onPatchNode(selectedNode.id, { dialogKey: event.target.value })}
                placeholder='dialogKey，例如 capability_assign_dialog'
                className='h-11 rounded-2xl border-none bg-background/80'
                disabled={selectedNode.actionType !== 'open_dialog'}
              />
              <Textarea
                value={selectedNode.note}
                onChange={(event) => onPatchNode(selectedNode.id, { note: event.target.value })}
                placeholder='补充这个节点后续要承载的弹窗语义、上下文或备注'
                className='min-h-28 rounded-[24px] border-none bg-background/80'
              />
            </div>
          </>
        ) : (
          <div className='space-y-4'>
            <div className='rounded-[20px] border border-dashed border-muted/40 bg-muted/5 px-4 py-4'>
              <p className='text-sm font-black italic tracking-tighter text-foreground'>还没有选中节点</p>
              <p className='mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>
                {readonlyMode ? '请选择一条产线并点击左侧节点查看真实详情。' : '你可以先新增一个一级节点，或点击左侧已有节点进入编辑态。'}
              </p>
            </div>

            {readonlyMode ? null : (
              <div className='space-y-4'>
                <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>新增一级节点</p>
                  {rootOptions.length > 0 ? (
                    <>
                      <Select value={resolvedRootOptionId || undefined} onValueChange={setRootOptionId}>
                        <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
                          <SelectValue placeholder={`选择${levelNames[1]}候选项`} />
                        </SelectTrigger>
                        <SelectContent>
                          {rootOptions.map((option) => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type='button'
                        className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
                        onClick={() => rootOption && onAddRoot?.(rootOption)}
                        disabled={!rootOption || !onAddRoot}
                      >
                        新增{levelNames[1]}
                      </Button>
                    </>
                  ) : (
                    <div className='rounded-[20px] border border-dashed border-amber-300/70 bg-amber-500/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-700'>
                      当前还没有可用的{levelNames[1]}候选项，请先到层级配置维护。
                    </div>
                  )}
                </div>

                <div className='space-y-3 rounded-[20px] border border-dashed border-muted/40 bg-muted/5 p-4'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/55'>创建{levelNames[3]}本体</p>
                  <Input
                    value={processLibraryDraft?.name ?? ''}
                    onChange={(event) => onPatchProcessLibraryDraft?.({ name: event.target.value })}
                    placeholder={`输入新的${levelNames[3]}名称`}
                    className='h-11 rounded-2xl border-none bg-background/80'
                  />
                  <Textarea
                    value={processLibraryDraft?.description ?? ''}
                    onChange={(event) => onPatchProcessLibraryDraft?.({ description: event.target.value })}
                    placeholder={`补充${levelNames[3]}说明`}
                    className='min-h-24 rounded-[24px] border-none bg-background/80'
                  />
                  <Select
                    value={(processLibraryDraft?.isActive ?? true) ? 'active' : 'inactive'}
                    onValueChange={(value) => onPatchProcessLibraryDraft?.({ isActive: value === 'active' })}
                  >
                    <SelectTrigger className='h-11 rounded-2xl border-none bg-background/80'>
                      <SelectValue placeholder='选择启用状态' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='active'>启用</SelectItem>
                      <SelectItem value='inactive'>停用</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type='button'
                    className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
                    onClick={() => onCreateProcess?.({
                      description: processLibraryDraft?.description ?? '',
                      isActive: processLibraryDraft?.isActive ?? true,
                      name: processLibraryDraft?.name ?? '',
                    })}
                    disabled={!(processLibraryDraft?.name ?? '').trim() || !onCreateProcess}
                  >
                    创建{levelNames[3]}本体
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
