import type { ProductionBOMBranch } from '../../../data/production-bom-branch'
import type { ProductionBOMBranchOperation } from '../../../data/production-line'
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
  standardProcesses: ProductionProcessStep[]
  bomBranches: ProductionBOMBranch[]
  isLoadingBOMBranches: boolean
  bomBranchQueryError?: Error | null
  level3Name: string
  level2Name: string
  levelNames: Record<MindmapLevel, string>
  nodeEditDialogOpen: boolean
  onCreateSegmentDialogOpenChange: (open: boolean) => void
  onCreateProcessDialogOpenChange: (open: boolean) => void
  onDeleteSelected: () => void | Promise<void>
  onEditDialogOpenChange: (open: boolean) => void
  onSegmentSubmit: (branch: ProductionBOMBranch) => void | Promise<void>
  onBindBOMBranch: (
    segmentId: string,
    branch: ProductionBOMBranch
  ) => void | Promise<void>
  onProcessSubmit: (
    draft: LineMindmapProcessDraft,
    parentSegmentId: string
  ) => Promise<unknown>
  onPatchNode: (nodeId: string, patch: Partial<LineMindmapNodeDraft>) => void
  onSaveProcessEntity?: (
    process: ProductionBOMBranchOperation
  ) => void | Promise<unknown>
  onSaveProcessSelection?: (
    segmentId: string,
    processLibraryIds: string[]
  ) => void | Promise<unknown>
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
  standardProcesses,
  bomBranches,
  isLoadingBOMBranches,
  bomBranchQueryError,
  level2Name,
  level3Name,
  levelNames,
  nodeEditDialogOpen,
  onCreateSegmentDialogOpenChange,
  onCreateProcessDialogOpenChange,
  onDeleteSelected,
  onEditDialogOpenChange,
  onPatchNode,
  onProcessSubmit,
  onSegmentSubmit,
  onBindBOMBranch,
  onSaveProcessEntity,
  onSaveProcessSelection,
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
        branches={bomBranches}
        isLoadingBranches={isLoadingBOMBranches}
        branchQueryError={bomBranchQueryError}
        onSubmit={onSegmentSubmit}
      />

      <MindmapCreateProcessDialog
        open={createProcessDialogOpen}
        onOpenChange={onCreateProcessDialogOpenChange}
        parentLevelName={level2Name}
        levelName={level3Name}
        parentNodes={segmentParentNodeOptions}
        defaultParentId={defaultProcessParentId}
        standardProcesses={standardProcesses}
        onSubmit={onProcessSubmit}
      />

      <MindmapNodeEditDialog
        open={nodeEditDialogOpen && Boolean(selectedNode)}
        onOpenChange={onEditDialogOpenChange}
        selectedNode={selectedNode}
        levelNames={levelNames}
        onPatchNode={onPatchNode}
        readonlyMode={false}
        bomBranches={bomBranches}
        isLoadingBOMBranches={isLoadingBOMBranches}
        bomBranchQueryError={bomBranchQueryError}
        onBindBOMBranch={(branch) => {
          const segmentId = selectedNode?.sourceId
          if (segmentId) return onBindBOMBranch(segmentId, branch)
        }}
        onDeleteSelected={onDeleteSelected}
        onSaveProcessEntity={onSaveProcessEntity}
        standardProcesses={standardProcesses}
        onSaveProcessSelection={onSaveProcessSelection}
      />
    </>
  )
}
