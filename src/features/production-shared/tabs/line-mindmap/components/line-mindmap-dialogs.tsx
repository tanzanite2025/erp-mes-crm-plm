import type { ProductionProcessStep } from '../../../data/production-process'
import { SecurityAuthDialog } from '../../../topology/security-auth-dialog'
import type { LineMindmapNode, MindmapLevel } from '../data/line-mindmap-domain'
import type { LineMindmapNodeDraft } from '../hooks/use-line-mindmap-node-drafts'
import type { LineMindmapProcessDraft, MindmapParentNodeOption } from '../types'
import {
  MindmapCreateProcessDialog,
  MindmapCreateSegmentDialog,
} from './mindmap-create-node-dialog'
import { MindmapNodeEditDialog } from './mindmap-node-edit-dialog'

interface LineMindmapDialogsProps {
  authDialogOpen: boolean
  createSegmentDialogOpen: boolean
  createProcessDialogOpen: boolean
  defaultProcessParentId?: string
  handleAuthConfirm: (password: string) => void | Promise<boolean | void>
  handleAuthOpenChange: (open: boolean) => void
  segmentParentNodeOptions: MindmapParentNodeOption[]
  level3Name: string
  level2Name: string
  levelNames: Record<MindmapLevel, string>
  nodeEditDialogOpen: boolean
  onAssignProcess: (processId: string) => void | Promise<void>
  onCreateSegmentDialogOpenChange: (open: boolean) => void
  onCreateProcessDialogOpenChange: (open: boolean) => void
  onDeleteProcessEntity: (
    process: ProductionProcessStep
  ) => void | Promise<void>
  onDeleteSelected: () => void | Promise<void>
  onEditDialogOpenChange: (open: boolean) => void
  onRemoveProcess: () => void | Promise<void>
  onRenameSelected: (name: string) => void | Promise<void>
  onSegmentSubmit: (name: string) => void | Promise<void>
  onProcessSubmit: (
    draft: LineMindmapProcessDraft,
    parentSegmentId: string
  ) => Promise<unknown>
  onPatchNode: (nodeId: string, patch: Partial<LineMindmapNodeDraft>) => void
  onSaveProcessEntity: (process: ProductionProcessStep) => void | Promise<void>
  processOptions: Array<{ id: string; label: string; code?: string }>
  selectedNode: LineMindmapNode | null
}

export function LineMindmapDialogs({
  authDialogOpen,
  createSegmentDialogOpen,
  createProcessDialogOpen,
  defaultProcessParentId,
  handleAuthConfirm,
  handleAuthOpenChange,
  segmentParentNodeOptions,
  level2Name,
  level3Name,
  levelNames,
  nodeEditDialogOpen,
  onAssignProcess,
  onCreateSegmentDialogOpenChange,
  onCreateProcessDialogOpenChange,
  onDeleteProcessEntity,
  onDeleteSelected,
  onEditDialogOpenChange,
  onPatchNode,
  onProcessSubmit,
  onRemoveProcess,
  onRenameSelected,
  onSegmentSubmit,
  onSaveProcessEntity,
  processOptions,
  selectedNode,
}: LineMindmapDialogsProps) {
  return (
    <>
      <SecurityAuthDialog
        open={authDialogOpen}
        onOpenChange={handleAuthOpenChange}
        onConfirm={handleAuthConfirm}
      />

      <MindmapCreateSegmentDialog
        open={createSegmentDialogOpen}
        onOpenChange={onCreateSegmentDialogOpenChange}
        levelName={level2Name}
        onSubmit={onSegmentSubmit}
      />

      <MindmapCreateProcessDialog
        open={createProcessDialogOpen}
        onOpenChange={onCreateProcessDialogOpenChange}
        parentLevelName={level2Name}
        levelName={level3Name}
        parentNodes={segmentParentNodeOptions}
        defaultParentId={defaultProcessParentId}
        onSubmit={onProcessSubmit}
      />

      <MindmapNodeEditDialog
        open={nodeEditDialogOpen && Boolean(selectedNode)}
        onOpenChange={onEditDialogOpenChange}
        selectedNode={selectedNode}
        levelNames={levelNames}
        onPatchNode={onPatchNode}
        readonlyMode={false}
        processOptions={processOptions}
        onAssignProcess={onAssignProcess}
        onDeleteProcessEntity={onDeleteProcessEntity}
        onRenameSelected={onRenameSelected}
        onDeleteSelected={onDeleteSelected}
        onRemoveProcess={onRemoveProcess}
        onSaveProcessEntity={onSaveProcessEntity}
      />
    </>
  )
}
