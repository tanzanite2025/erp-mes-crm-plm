import { useState } from 'react'
import { type UseFormReturn } from 'react-hook-form'
import { Settings2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type BOM } from '../../data/schema'
import {
  type BOMWorkspaceGroupNode,
  type BOMWorkspaceNode,
} from '../../hooks/use-bom-workspace-projection'
import { BOMSharedSectionManagementDialog } from '../bom-section-management/bom-shared-section-management-dialog'
import { BOMRecipeDraftSummaryStrip } from './bom-recipe-draft-summary-strip'
import { ItemTable } from './item-table'

interface BOMRecipeSummaryAndSectionAccordionEditorProps {
  form: UseFormReturn<BOM>
  materials: MaterialOption[]
  groups: BOMWorkspaceGroupNode[]
  nodes: BOMWorkspaceNode[]
  onRemove: (index: number) => void
  onBranchToggle: (branchKey: string) => void
  onAddItem: (sectionCode?: string) => void
  canEdit: boolean
}

export function BOMRecipeSummaryAndSectionAccordionEditor({
  form,
  materials,
  groups,
  nodes,
  onRemove,
  onBranchToggle,
  onAddItem,
  canEdit,
}: BOMRecipeSummaryAndSectionAccordionEditorProps) {
  const { t } = useLanguage()
  const [isSharedSectionManagementOpen, setIsSharedSectionManagementOpen] =
    useState(false)
  return (
    <div className='flex min-h-0 flex-1 flex-col gap-2.5'>
      <div className='flex shrink-0 items-center justify-between gap-2'>
        <h3 className='text-xs font-bold sm:text-sm'>
          {t('engineering.bomArchive.recipe.title')}
        </h3>
        <Button
          type='button'
          variant='outline'
          className='h-9 shrink-0 rounded-full border-blue-600/20 bg-blue-600/5 px-3 text-xs text-blue-700 hover:bg-blue-600/10 dark:text-blue-300'
          onClick={() => setIsSharedSectionManagementOpen(true)}
        >
          <Settings2 className='mr-1.5 size-3.5' />
          {t('engineering.bomSectionConfig.managementTitle')}
        </Button>
      </div>
      <BOMRecipeDraftSummaryStrip groups={groups} />
      <div className='flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-dashed border-border/60'>
        <ItemTable
          form={form}
          nodes={nodes}
          materials={materials}
          onRemove={onRemove}
          onBranchToggle={onBranchToggle}
          onAdd={onAddItem}
          canEdit={canEdit}
        />
      </div>
      <BOMSharedSectionManagementDialog
        open={isSharedSectionManagementOpen}
        onOpenChange={setIsSharedSectionManagementOpen}
      />
    </div>
  )
}
