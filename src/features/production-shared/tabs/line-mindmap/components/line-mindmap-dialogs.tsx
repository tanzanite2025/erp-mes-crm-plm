import type { ProductionProcessStep } from '../../../data/production-process'
import type { HierarchyLevelOptionItem } from '../../hierarchy-config/data/hierarchy-config'
import { SecurityAuthDialog } from '../../line-mgmt/components/topology/security-auth-dialog'
import type { LineMindmapNode, MindmapLevel } from '../data/line-mindmap-domain'
import type { LineMindmapNodeDraft } from '../hooks/use-line-mindmap-node-drafts'
import type { LineMindmapProcessDraft, MindmapParentNodeOption } from '../types'
import { HierarchyConfigDialog } from './hierarchy-config-dialog'
import {
  MindmapCreateChildDialog,
  MindmapCreateProcessDialog,
  MindmapCreateRootDialog,
} from './mindmap-create-node-dialog'
import { MindmapNodeEditDialog } from './mindmap-node-edit-dialog'

interface LineMindmapDialogsProps {
  authDialogOpen: boolean
  createLevel1DialogOpen: boolean
  createLevel2DialogOpen: boolean
  createLevel3DialogOpen: boolean
  defaultLevel2ParentId?: string
  defaultLevel3ParentId?: string
  handleAuthConfirm: (password: string) => void | Promise<boolean | void>
  handleAuthOpenChange: (open: boolean) => void
  hierarchyConfigDialogOpen: boolean
  jobCategoryParentNodeOptions: MindmapParentNodeOption[]
  level1Name: string
  level1Options: HierarchyLevelOptionItem[]
  level2Name: string
  level2Options: HierarchyLevelOptionItem[]
  level3Name: string
  levelNames: Record<MindmapLevel, string>
  nodeEditDialogOpen: boolean
  onAssignProcess: (processId: string) => void | Promise<void>
  onCreateLevel1DialogOpenChange: (open: boolean) => void
  onCreateLevel2DialogOpenChange: (open: boolean) => void
  onCreateLevel3DialogOpenChange: (open: boolean) => void
  onDeleteProcessEntity: (
    process: ProductionProcessStep
  ) => void | Promise<void>
  onDeleteSelected: () => void | Promise<void>
  onEditDialogOpenChange: (open: boolean) => void
  onHierarchyConfigDialogOpenChange: (open: boolean) => void
  onOpenHierarchyConfig: () => void
  onRemoveProcess: () => void | Promise<void>
  onRenameSelected: (name: string) => void | Promise<void>
  onRebindSelected: (option: HierarchyLevelOptionItem) => void | Promise<void>
  onRootSubmit: (option: HierarchyLevelOptionItem) => void | Promise<void>
  onChildSubmit: (
    parentId: string,
    option: HierarchyLevelOptionItem
  ) => void | Promise<void>
  onProcessSubmit: (
    draft: LineMindmapProcessDraft,
    parentJobCategoryId: string
  ) => Promise<unknown>
  onPatchNode: (nodeId: string, patch: Partial<LineMindmapNodeDraft>) => void
  onSaveProcessEntity: (process: ProductionProcessStep) => void | Promise<void>
  processOptions: Array<{ id: string; label: string; code?: string }>
  rebindOptions: HierarchyLevelOptionItem[]
  rootParentNodeOptions: MindmapParentNodeOption[]
  selectedNode: LineMindmapNode | null
}

export function LineMindmapDialogs({
  authDialogOpen,
  createLevel1DialogOpen,
  createLevel2DialogOpen,
  createLevel3DialogOpen,
  defaultLevel2ParentId,
  defaultLevel3ParentId,
  handleAuthConfirm,
  handleAuthOpenChange,
  hierarchyConfigDialogOpen,
  jobCategoryParentNodeOptions,
  level1Name,
  level1Options,
  level2Name,
  level2Options,
  level3Name,
  levelNames,
  nodeEditDialogOpen,
  onAssignProcess,
  onChildSubmit,
  onCreateLevel1DialogOpenChange,
  onCreateLevel2DialogOpenChange,
  onCreateLevel3DialogOpenChange,
  onDeleteProcessEntity,
  onDeleteSelected,
  onEditDialogOpenChange,
  onHierarchyConfigDialogOpenChange,
  onOpenHierarchyConfig,
  onPatchNode,
  onProcessSubmit,
  onRebindSelected,
  onRemoveProcess,
  onRenameSelected,
  onRootSubmit,
  onSaveProcessEntity,
  processOptions,
  rebindOptions,
  rootParentNodeOptions,
  selectedNode,
}: LineMindmapDialogsProps) {
  return (
    <>
      <SecurityAuthDialog
        open={authDialogOpen}
        onOpenChange={handleAuthOpenChange}
        onConfirm={handleAuthConfirm}
      />

      <HierarchyConfigDialog
        open={hierarchyConfigDialogOpen}
        onOpenChange={onHierarchyConfigDialogOpenChange}
      />

      <MindmapCreateRootDialog
        open={createLevel1DialogOpen}
        onOpenChange={onCreateLevel1DialogOpenChange}
        levelName={level1Name}
        options={level1Options}
        onSubmit={onRootSubmit}
        onOpenHierarchyConfig={onOpenHierarchyConfig}
      />

      <MindmapCreateChildDialog
        open={createLevel2DialogOpen}
        onOpenChange={onCreateLevel2DialogOpenChange}
        parentLevelName={level1Name}
        levelName={level2Name}
        parentNodes={rootParentNodeOptions}
        options={level2Options}
        defaultParentId={defaultLevel2ParentId}
        onSubmit={onChildSubmit}
        onOpenHierarchyConfig={onOpenHierarchyConfig}
      />

      <MindmapCreateProcessDialog
        open={createLevel3DialogOpen}
        onOpenChange={onCreateLevel3DialogOpenChange}
        parentLevelName={level2Name}
        levelName={level3Name}
        parentNodes={jobCategoryParentNodeOptions}
        defaultParentId={defaultLevel3ParentId}
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
        rebindOptions={rebindOptions}
        onAssignProcess={onAssignProcess}
        onDeleteProcessEntity={onDeleteProcessEntity}
        onRenameSelected={onRenameSelected}
        onDeleteSelected={onDeleteSelected}
        onRemoveProcess={onRemoveProcess}
        onRebindSelected={onRebindSelected}
        onSaveProcessEntity={onSaveProcessEntity}
      />
    </>
  )
}
