import { useState } from 'react'
import { Search } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { SelectionTree } from '../components/requirements/selection-tree'
import { RequirementDrawer } from '../components/requirements/requirement-drawer'
import { useRequirements } from '../hooks/use-requirements'

export function PartRequirements() {
  const { t } = useLanguage()
  const { activeOrders, requirements, error, isLoading, stats, calculate } = useRequirements()
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const handleAnalyze = async () => {
    setIsDrawerOpen(true)
    await calculate(selectedKeys)
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={Search}
        title={t('mrp.requirements.pageTitle')}
        description={t('mrp.requirements.pageDescription')}
      />

      <div className='p-1 h-full flex flex-col'>
        <div className='mb-4 px-2 pt-3'>
          <p className='text-[11px] font-bold text-muted-foreground/50 uppercase tracking-tight'>
            {t('mrp.requirements.helperText')}
          </p>
        </div>

        <div className='flex-1 overflow-y-auto px-1 custom-scrollbar'>
          <SelectionTree
            orders={activeOrders}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            onAnalyze={handleAnalyze}
          />
        </div>

        <RequirementDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          data={requirements}
          errorMessage={error && !isForbiddenError(error) && error instanceof Error ? error.message : typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : undefined}
          stats={stats}
          isLoading={isLoading}
          selectedCount={selectedKeys.length}
        />
      </div>
    </div>
  )
}
