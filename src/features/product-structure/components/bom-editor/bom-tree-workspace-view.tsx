import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type BOM } from '../../data/schema'
import { type BOMWorkspaceNode } from '../../hooks/use-bom-workspace-projection'
import { ItemTable } from './item-table'

interface BOMTreeWorkspaceViewProps {
  form: UseFormReturn<BOM>
  nodes: BOMWorkspaceNode[]
  materials: MaterialOption[]
  onRemove: (index: number) => void
  onBranchToggle: (branchKey: string) => void
  onAdd: (sectionCode?: string) => void
}

export function BOMTreeWorkspaceView({ form, nodes, materials, onRemove, onBranchToggle, onAdd }: BOMTreeWorkspaceViewProps) {
  const { t } = useLanguage()

  if (nodes.length === 0) {
    return (
      <div className='custom-scrollbar flex-1 overflow-y-auto p-3 sm:p-4'>
        <div className='rounded-[24px] border border-dashed border-muted/40 bg-muted/10 p-6 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
          {t('engineering.bomArchive.recipe.summaryHint')}
        </div>
      </div>
    )
  }

  return (
    <div className='custom-scrollbar flex-1 overflow-y-auto p-3 sm:p-4'>
      <div className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
        <div className='flex min-h-0 gap-4 px-4 pb-4 pt-4 sm:px-5'>
          <div className='w-px self-stretch rounded-full bg-border/70' />
          <div className='min-h-0 flex-1 overflow-hidden rounded-[24px] border border-dashed border-muted/40 bg-background/70'>
            <ItemTable
              form={form}
              nodes={nodes}
              materials={materials}
              onRemove={onRemove}
              onBranchToggle={onBranchToggle}
              onAdd={onAdd}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
