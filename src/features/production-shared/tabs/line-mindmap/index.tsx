import { useMemo, useState } from 'react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { ForbiddenState } from '@/components/forbidden-state'
import { useHierarchyLevelLabels } from '../hierarchy-config/hooks/use-hierarchy-level-labels'
import { useHierarchyLevelOptions } from '../hierarchy-config/hooks/use-hierarchy-level-options'
import { useLineMgmtLines } from '../line-mgmt/hooks/use-line-mgmt-lines'
import { LineMindmapDialogs } from './components/line-mindmap-dialogs'
import { LineMindmapToolbar } from './components/line-mindmap-toolbar'
import { MindmapCanvas } from './components/mindmap-canvas'
import type { MindmapLevel } from './data/line-mindmap-domain'
import { useLineMindmapActions } from './hooks/use-line-mindmap-actions'
import { useLineMindmapNodeDrafts } from './hooks/use-line-mindmap-node-drafts'
import { useLineMindmapParentOptions } from './hooks/use-line-mindmap-parent-options'
import { useLineMindmapProcessPanel } from './hooks/use-line-mindmap-process-panel'
import { useLineMindmapTopologyAuth } from './hooks/use-line-mindmap-topology-auth'
import { useLineMindmapViewModel } from './hooks/use-line-mindmap-view-model'

export function LineMindmap() {
  const { t } = useLanguage()
  const [createLevel1DialogOpen, setCreateLevel1DialogOpen] = useState(false)
  const [createLevel2DialogOpen, setCreateLevel2DialogOpen] = useState(false)
  const [createLevel3DialogOpen, setCreateLevel3DialogOpen] = useState(false)
  const [nodeEditDialogOpen, setNodeEditDialogOpen] = useState(false)
  const [hierarchyConfigDialogOpen, setHierarchyConfigDialogOpen] =
    useState(false)
  const { level1Name, level2Name, level3Name } = useHierarchyLevelLabels()
  const { level1Options, level2Options } = useHierarchyLevelOptions()
  const { lines, isLoading, error, updateLineStrict } = useLineMgmtLines()
  const { nodeDraftMap, patchNodeDraft } = useLineMindmapNodeDrafts()

  const levelNames = useMemo<Record<MindmapLevel, string>>(
    () => ({
      1: level1Name,
      2: level2Name,
      3: level3Name,
    }),
    [level1Name, level2Name, level3Name]
  )
  const {
    activeLine,
    handleSelectNode,
    lineOptions,
    nodes,
    resolvedLineId,
    resolvedSelectedNodeId,
    selectedNode,
    setActiveLineId,
    settleSelection,
  } = useLineMindmapViewModel({
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
    updateLineStrict,
  })
  const {
    handleAddChild,
    handleAddRoot,
    handleDeleteSelected,
    handleRebindSelected,
    handleRenameSelected,
  } = useLineMindmapActions({
    activeLine,
    nodes,
    requestTopologyAuth,
    selectedNode,
    settleSelection,
    updateLineStrict,
  })
  const rebindOptions =
    selectedNode?.sourceType === 'segment'
      ? level1Options
      : selectedNode?.sourceType === 'jobCategory'
        ? level2Options
        : []
  const {
    handleAssignProcess,
    handleCreateProcessForJobCategory,
    handleDeleteProcessEntity,
    handleRemoveProcess,
    handleSaveProcessEntity,
    processOptions,
  } = useLineMindmapProcessPanel(selectedNode)
  const handleOpenHierarchyConfig = () => setHierarchyConfigDialogOpen(true)
  const {
    defaultLevel2ParentId,
    defaultLevel3ParentId,
    jobCategoryParentNodeOptions,
    rootParentNodeOptions,
  } = useLineMindmapParentOptions({
    nodes,
    selectedNode,
  })

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading) {
    return (
      <div className='flex min-h-[calc(100dvh-9rem)] animate-in flex-col gap-2 duration-700 fade-in md:min-h-[calc(100dvh-10rem)]'>
        <Skeleton className='h-12 rounded-[24px]' />
        <Skeleton className='min-h-[calc(100dvh-14rem)] flex-1 rounded-[24px] md:min-h-[calc(100dvh-15rem)]' />
      </div>
    )
  }

  return (
    <div className='flex min-h-[calc(100dvh-9rem)] animate-in flex-col gap-2 duration-700 fade-in md:min-h-[calc(100dvh-10rem)]'>
      <LineMindmapToolbar
        activeLine={Boolean(activeLine)}
        level1Name={level1Name}
        level2Name={level2Name}
        level3Name={level3Name}
        lineOptions={lineOptions}
        resolvedLineId={resolvedLineId}
        selectedNode={Boolean(selectedNode)}
        title={t('productionArchitecture.mindmap.header.title')}
        onCreateLevel1={() => setCreateLevel1DialogOpen(true)}
        onCreateLevel2={() => setCreateLevel2DialogOpen(true)}
        onCreateLevel3={() => setCreateLevel3DialogOpen(true)}
        onEditNode={() => setNodeEditDialogOpen(true)}
        onSelectLine={setActiveLineId}
      />

      <div className='min-h-0 flex-1'>
        <MindmapCanvas
          nodes={nodes}
          selectedNodeId={resolvedSelectedNodeId}
          levelNames={levelNames}
          onSelect={handleSelectNode}
          onOpenHierarchyConfig={handleOpenHierarchyConfig}
        />
      </div>

      <LineMindmapDialogs
        authDialogOpen={authDialogOpen}
        createLevel1DialogOpen={createLevel1DialogOpen}
        createLevel2DialogOpen={createLevel2DialogOpen}
        createLevel3DialogOpen={createLevel3DialogOpen}
        defaultLevel2ParentId={defaultLevel2ParentId}
        defaultLevel3ParentId={defaultLevel3ParentId}
        handleAuthConfirm={handleAuthConfirm}
        handleAuthOpenChange={handleAuthOpenChange}
        hierarchyConfigDialogOpen={hierarchyConfigDialogOpen}
        jobCategoryParentNodeOptions={jobCategoryParentNodeOptions}
        level1Name={level1Name}
        level1Options={activeLine ? level1Options : []}
        level2Name={level2Name}
        level2Options={activeLine ? level2Options : []}
        level3Name={level3Name}
        levelNames={levelNames}
        nodeEditDialogOpen={nodeEditDialogOpen}
        onAssignProcess={handleAssignProcess}
        onChildSubmit={handleAddChild}
        onCreateLevel1DialogOpenChange={setCreateLevel1DialogOpen}
        onCreateLevel2DialogOpenChange={setCreateLevel2DialogOpen}
        onCreateLevel3DialogOpenChange={setCreateLevel3DialogOpen}
        onDeleteProcessEntity={handleDeleteProcessEntity}
        onDeleteSelected={handleDeleteSelected}
        onEditDialogOpenChange={setNodeEditDialogOpen}
        onHierarchyConfigDialogOpenChange={setHierarchyConfigDialogOpen}
        onOpenHierarchyConfig={handleOpenHierarchyConfig}
        onPatchNode={patchNodeDraft}
        onProcessSubmit={handleCreateProcessForJobCategory}
        onRebindSelected={handleRebindSelected}
        onRemoveProcess={handleRemoveProcess}
        onRenameSelected={handleRenameSelected}
        onRootSubmit={handleAddRoot}
        onSaveProcessEntity={handleSaveProcessEntity}
        processOptions={processOptions}
        rebindOptions={rebindOptions}
        rootParentNodeOptions={rootParentNodeOptions}
        selectedNode={selectedNode}
      />
    </div>
  )
}
