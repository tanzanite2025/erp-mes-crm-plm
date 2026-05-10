import type { UseFormReturn } from 'react-hook-form'
import { useLanguage } from '@/context/language-provider'
import { SegmentedTabs } from '@/components/segmented-tabs'
import { Tabs } from '@/components/ui/tabs'
import { type MaterialOption } from '../../../material-archive/data/schema'
import { type BOM } from '../../data/schema'
import {
  type BOMWorkspaceBranchNode,
  type BOMWorkspaceGroupNode,
  type BOMWorkspaceNode,
  type BOMWorkspaceViewMode,
} from '../../hooks/use-bom-workspace-projection'
import { BOMTreeWorkspaceView } from './bom-tree-workspace-view'
import { SummaryPanel } from './summary-panel'

export interface BOMFlatWorkspaceViewProps {
  form: UseFormReturn<BOM>
  materials: MaterialOption[]
  remove: (index: number) => void
  groups: BOMWorkspaceGroupNode[]
  groupNodes: BOMWorkspaceBranchNode[]
  activeGroupKey: string
  onActiveGroupChange: (value: string) => void
  viewMode: BOMWorkspaceViewMode
  visibleTreeNodes: BOMWorkspaceNode[]
  onBranchToggle: (branchKey: string) => void
  onAddItem: (sectionCode?: string) => void
}

export function BOMFlatWorkspaceView({
  form,
  materials,
  remove,
  groups,
  groupNodes,
  activeGroupKey,
  onActiveGroupChange,
  viewMode,
  visibleTreeNodes,
  onBranchToggle,
  onAddItem,
}: BOMFlatWorkspaceViewProps) {
  const { t } = useLanguage()
  const activeModeTab = viewMode === 'summary' ? 'all' : 'tree'

  return (
    <div className='flex min-h-0 flex-1 flex-col space-y-2 p-0.5'>
      <div className='mb-1.5 flex items-center justify-between border-b-2 border-dashed border-muted/50 pb-1.5'>
        <h4 className='text-[10px] font-black uppercase tracking-widest italic text-slate-900 sm:text-[12px]'>
          {t('engineering.bomArchive.recipe.title')}
        </h4>
      </div>

      <div className='mb-1.5'>
        <SegmentedTabs
          tabs={[
            { value: 'all', label: t('engineering.bomArchive.recipe.all') },
            { value: 'tree', label: t('engineering.bomArchive.recipe.title') },
          ]}
          value={activeModeTab}
          onValueChange={(value) => {
            if (value === 'all') {
              onActiveGroupChange('all')
              return
            }

            const fallbackGroupKey = activeGroupKey === 'all' ? groupNodes[0]?.key : activeGroupKey
            onActiveGroupChange(fallbackGroupKey || 'all')
          }}
          className='w-full overflow-hidden'
          listClassName='h-11 shrink-0 rounded-2xl bg-muted/20 p-0 px-1 sm:grid sm:h-10 sm:grid-cols-8'
        />
      </div>

      <Tabs value={activeModeTab} className='flex min-h-0 w-full flex-1 flex-col'>
        <div className='relative mt-1 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-background shadow-inner'>
          {viewMode === 'summary' ? (
            <div className='custom-scrollbar flex-1 overflow-y-auto p-0'>
              <SummaryPanel
                groups={groups}
                onSectionClick={(section) => onActiveGroupChange(section)}
              />
            </div>
          ) : (
            <BOMTreeWorkspaceView
              form={form}
              nodes={visibleTreeNodes}
              materials={materials}
              onRemove={(index) => remove(index)}
              onBranchToggle={onBranchToggle}
              onAdd={onAddItem}
            />
          )}
        </div>
      </Tabs>
    </div>
  )
}
