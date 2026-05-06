import { useMemo } from 'react'
import { GitBranchPlus, Workflow } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { useLineMgmtLines } from '../line-mgmt/hooks/use-line-mgmt-lines'
import { SecurityAuthDialog } from '../line-mgmt/components/topology/security-auth-dialog'
import { useHierarchyLevelLabels } from '../hierarchy-config/hooks/use-hierarchy-level-labels'
import { useHierarchyLevelOptions } from '../hierarchy-config/hooks/use-hierarchy-level-options'
import { MindmapCanvas } from './components/mindmap-canvas'
import { MindmapDetailPanel } from './components/mindmap-detail-panel'
import type { MindmapLevel } from './data/sample-mindmap'
import { useLineMindmapActions } from './hooks/use-line-mindmap-actions'
import { useLineMindmapNodeDrafts } from './hooks/use-line-mindmap-node-drafts'
import { useLineMindmapProcessPanel } from './hooks/use-line-mindmap-process-panel'
import { useLineMindmapTopologyAuth } from './hooks/use-line-mindmap-topology-auth'
import { useLineMindmapViewModel } from './hooks/use-line-mindmap-view-model'

export function LineMindmap() {
  const { t } = useLanguage()
  const { level1Name, level2Name, level3Name } = useHierarchyLevelLabels()
  const { level1Options, level2Options } = useHierarchyLevelOptions()
  const { lines, isLoading, error, updateLine } = useLineMgmtLines()
  const { nodeDraftMap, patchNodeDraft } = useLineMindmapNodeDrafts()

  const levelNames = useMemo<Record<MindmapLevel, string>>(
    () => ({
      1: level1Name,
      2: level2Name,
      3: level3Name,
    }),
    [level1Name, level2Name, level3Name],
  )
  const {
    activeLine,
    childOptions,
    enterRootInsertMode,
    handleSelectNode,
    lineOptions,
    nodes,
    resolvedLineId,
    resolvedSelectedNodeId,
    selectedNode,
    setActiveLineId,
    settleSelection,
  } = useLineMindmapViewModel({
    level2Options,
    lines,
    nodeDraftMap,
  })
  const {
    authDialogOpen,
    handleAuthConfirm,
    handleAuthOpenChange,
    requestTopologyAuth,
  } = useLineMindmapTopologyAuth({
    settleSelection,
    updateLine,
  })
  const { handleAddChild, handleAddRoot, handleDeleteSelected, handleRebindSelected, handleRenameSelected } = useLineMindmapActions({
    activeLine,
    requestTopologyAuth,
    selectedNode,
    settleSelection,
    updateLine,
  })
  const rebindOptions = selectedNode?.sourceType === 'segment'
    ? level1Options
    : selectedNode?.sourceType === 'jobCategory'
      ? level2Options
      : []
  const {
    handleAssignProcess,
    handleCreateProcess,
    handleDeleteProcessEntity,
    handlePatchProcessLibraryDraft,
    handleRemoveProcess,
    handleSaveProcessEntity,
    processLibraryDraft,
    processOptions,
  } = useLineMindmapProcessPanel(selectedNode)

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading) {
    return (
      <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
        <div className='space-y-3'>
          <Skeleton className='h-24 rounded-[32px]' />
          <Skeleton className='h-10 w-72 rounded-full' />
        </div>
        <div className='grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]'>
          <Skeleton className='h-[520px] rounded-[24px]' />
          <Skeleton className='h-[520px] rounded-[24px]' />
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Workflow}
        title={t('productionArchitecture.mindmap.header.title')}
        description={t('productionArchitecture.mindmap.header.subtitle', {
          level1Name,
          level2Name,
          level3Name,
        })}
        statusBadge={
          <Button
            type='button'
            variant='outline'
            className='h-11 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'
            onClick={enterRootInsertMode}
            disabled={!activeLine}
          >
            <GitBranchPlus className='mr-2 size-4' /> 新增{level1Name}
          </Button>
        }
      />

      <div className='grid gap-4 px-1 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center'>
        <p className='max-w-3xl text-[11px] leading-relaxed text-muted-foreground/75'>
          当前阶段已接入一级与二级节点完整结构写回，并为第三级开放 process 能力挂接、移除以及 process library 本体创建 / 编辑 / 删除。
        </p>
        <div className='space-y-1.5'>
          <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/55'>当前产线</p>
          <Select value={resolvedLineId || undefined} onValueChange={setActiveLineId}>
            <SelectTrigger className='h-12 w-full rounded-2xl border-none bg-muted/40 px-4 text-[11px] font-black shadow-none'>
              <SelectValue placeholder='选择要查看的产线' />
            </SelectTrigger>
            <SelectContent>
              {lineOptions.map((lineOption) => (
                <SelectItem key={lineOption.id} value={lineOption.id} className='text-[11px] font-black'>
                  {lineOption.label} · {lineOption.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.95fr)]'>
        <MindmapCanvas
          nodes={nodes}
          selectedNodeId={resolvedSelectedNodeId}
          levelNames={levelNames}
          onSelect={handleSelectNode}
        />

        <MindmapDetailPanel
          key={selectedNode?.id ?? 'mindmap-detail-empty'}
          selectedNode={selectedNode}
          levelNames={levelNames}
          onPatchNode={patchNodeDraft}
          readonlyMode={false}
          rootOptions={level1Options}
          childOptions={childOptions}
          processOptions={processOptions}
          processLibraryDraft={processLibraryDraft}
          rebindOptions={rebindOptions}
          onAddRoot={handleAddRoot}
          onAddChild={handleAddChild}
          onAssignProcess={handleAssignProcess}
          onCreateProcess={handleCreateProcess}
          onDeleteProcessEntity={handleDeleteProcessEntity}
          onPatchProcessLibraryDraft={handlePatchProcessLibraryDraft}
          onRenameSelected={handleRenameSelected}
          onDeleteSelected={handleDeleteSelected}
          onRemoveProcess={handleRemoveProcess}
          onRebindSelected={handleRebindSelected}
          onSaveProcessEntity={handleSaveProcessEntity}
        />
      </div>

      <SecurityAuthDialog
        open={authDialogOpen}
        onOpenChange={handleAuthOpenChange}
        onConfirm={handleAuthConfirm}
        title={t('orgPersonnel.lineMgmt.topology.authGenericTitle')}
        description={t('orgPersonnel.lineMgmt.topology.authGenericDesc')}
      />
    </div>
  )
}
