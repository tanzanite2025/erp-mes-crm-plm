import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { requestApplicationConfirmation } from '@/lib/application-confirm-prompt-and-alert-dialog-requests'
import { buildFlattenDelta } from '@/lib/delta/flatten-delta'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { ForbiddenState } from '@/components/forbidden-state'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import { ProductionLineProfileDialog } from '../../components/production-line-profile-dialog'
import type { ProductionLineMutationPayload } from '../../contracts/production-line-mutation'
import type { ProductionLine } from '../../data/production-line'
import { useProductionLines } from '../../hooks/use-production-lines'
import { useProductionLineBOMBranchesQuery } from '../../hooks/use-production-resources'
import { useTopologyTemplates } from '../../topology/use-topology-templates'
import { TemplateDialog } from '../topology-template/components/template-dialog'
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
  const { allowsAction, allowsPermission, isChecking } = usePermissionActions()
  const [createSegmentDialogOpen, setCreateSegmentDialogOpen] = useState(false)
  const [createProcessDialogOpen, setCreateProcessDialogOpen] = useState(false)
  const [nodeEditDialogOpen, setNodeEditDialogOpen] = useState(false)
  const [lineProfileDialogOpen, setLineProfileDialogOpen] = useState(false)
  const [editingLine, setEditingLine] = useState<ProductionLine | null>(null)
  const [capturingLineAsTemplate, setCapturingLineAsTemplate] =
    useState<ProductionLine | null>(null)
  const { captureFromLine } = useTopologyTemplates()
  const {
    data: bomBranches = [],
    error: bomBranchQueryError,
    isLoading: isLoadingBOMBranches,
  } = useProductionLineBOMBranchesQuery()
  const {
    createLineStrict,
    deleteLine,
    lines,
    isLoading,
    error,
    updateLineStrict,
  } = useProductionLines()
  const { nodeDraftMap, patchNodeDraft } = useLineMindmapNodeDrafts()

  const levelNames = useMemo<Record<MindmapLevel, string>>(
    () => ({
      1: 'L1',
      2: 'L2',
      3: 'L3',
    }),
    []
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
  const { handleAddSegment, handleBindBOMBranch, handleDeleteSelected } =
    useLineMindmapActions({
      activeLine,
      requestTopologyAuth,
      selectedNode,
      settleSelection,
      updateLineStrict,
    })
  const {
    handleCreateProcessForSegment,
    handleSaveProcessEntity,
    handleSaveProcessSelection,
    standardProcesses,
  } = useLineMindmapProcessPanel({
    activeLine,
  })
  const canManageLine = allowsPermission('perm_manage')
  const canUpdateLine = allowsAction('action_production_line_update')

  const openCreateLineDialog = () => {
    setEditingLine(null)
    setLineProfileDialogOpen(true)
  }

  const openEditLineDialog = () => {
    if (!activeLine) {
      return
    }
    setEditingLine(activeLine)
    setLineProfileDialogOpen(true)
  }

  const handleLineProfileSubmit = async (
    payload: ProductionLineMutationPayload
  ) => {
    if (payload.type === 'CREATE') {
      if (!canManageLine) {
        return
      }
      await createLineStrict(payload.data)
      return
    }

    if (!canUpdateLine) {
      return
    }

    requestTopologyAuth({
      delta: payload.delta,
      lineId: payload.id,
      nextSelectedNodeId: resolvedSelectedNodeId,
      version: payload.version,
    })
  }

  const handleDeleteLine = async () => {
    if (!activeLine || !canManageLine) {
      return
    }

    const confirmed = await requestApplicationConfirmation('确认删除当前 L1？')
    if (!confirmed) {
      return
    }

    await deleteLine(activeLine.id)
    setActiveLineId('')
  }

  const handleToggleLine = () => {
    if (!activeLine || !canUpdateLine) {
      return
    }

    const delta = buildFlattenDelta(activeLine.isActive, !activeLine.isActive, {
      basePath: 'isActive',
    })
    requestTopologyAuth({
      delta,
      lineId: activeLine.id,
      nextSelectedNodeId: resolvedSelectedNodeId,
      version: activeLine.version,
    })
  }
  const { defaultProcessParentId, segmentParentNodeOptions } =
    useLineMindmapParentOptions({
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
        activeLineIsActive={activeLine?.isActive ?? false}
        canManageLine={canManageLine}
        canUpdateLine={canUpdateLine}
        isCheckingPermissions={isChecking}
        lineOptions={lineOptions}
        resolvedLineId={resolvedLineId}
        selectedNode={Boolean(selectedNode)}
        title={t('productionArchitecture.mindmap.header.title')}
        onCreateLevel1={openCreateLineDialog}
        onCreateLevel2={() => setCreateSegmentDialogOpen(true)}
        onCreateLevel3={() => setCreateProcessDialogOpen(true)}
        onEditNode={() => setNodeEditDialogOpen(true)}
        onDeleteLine={() => void handleDeleteLine()}
        onEditLine={openEditLineDialog}
        onToggleLine={handleToggleLine}
        onSelectLine={setActiveLineId}
        onCaptureTopologyTemplate={() => {
          if (canManageLine && activeLine)
            setCapturingLineAsTemplate(activeLine)
        }}
      />

      <div className='min-h-0 flex-1'>
        <MindmapCanvas
          nodes={nodes}
          selectedNodeId={resolvedSelectedNodeId}
          levelNames={levelNames}
          onSelect={handleSelectNode}
        />
      </div>

      <LineMindmapDialogs
        authDialogOpen={authDialogOpen}
        createProcessDialogOpen={createProcessDialogOpen}
        createSegmentDialogOpen={createSegmentDialogOpen}
        defaultProcessParentId={defaultProcessParentId}
        handleAuthConfirm={handleAuthConfirm}
        handleAuthOpenChange={handleAuthOpenChange}
        segmentParentNodeOptions={segmentParentNodeOptions}
        standardProcesses={standardProcesses}
        bomBranches={bomBranches}
        isLoadingBOMBranches={isLoadingBOMBranches}
        bomBranchQueryError={bomBranchQueryError}
        level2Name='L2'
        level3Name='L3'
        levelNames={levelNames}
        nodeEditDialogOpen={nodeEditDialogOpen}
        onCreateProcessDialogOpenChange={setCreateProcessDialogOpen}
        onCreateSegmentDialogOpenChange={setCreateSegmentDialogOpen}
        onDeleteSelected={handleDeleteSelected}
        onEditDialogOpenChange={setNodeEditDialogOpen}
        onPatchNode={patchNodeDraft}
        onProcessSubmit={handleCreateProcessForSegment}
        onBindBOMBranch={handleBindBOMBranch}
        onSegmentSubmit={handleAddSegment}
        onSaveProcessEntity={
          canManageLine ? handleSaveProcessEntity : undefined
        }
        onSaveProcessSelection={
          canManageLine ? handleSaveProcessSelection : undefined
        }
        selectedNode={selectedNode}
      />

      <TemplateDialog
        open={Boolean(capturingLineAsTemplate)}
        onOpenChange={(open) => {
          if (!open) setCapturingLineAsTemplate(null)
        }}
        mode='capture'
        initialSourceLine={capturingLineAsTemplate || undefined}
        lines={lines}
        branches={[]}
        onSave={async (request) => {
          if (!canManageLine) throw new Error('无拓扑模板维护权限')
          if (request.mode === 'capture')
            await captureFromLine({
              sourceLineId: request.sourceLineId,
              sourceLineVersion: request.sourceLineVersion,
              name: request.name,
              description: request.description,
            })
          toast.success('已保存为独立拓扑模板')
        }}
      />

      <ProductionLineProfileDialog
        open={lineProfileDialogOpen}
        onOpenChange={(open) => {
          setLineProfileDialogOpen(open)
          if (!open) {
            setEditingLine(null)
          }
        }}
        editingLine={editingLine}
        lines={lines}
        entityLabel='L1'
        onSubmit={handleLineProfileSubmit}
      />
    </div>
  )
}
