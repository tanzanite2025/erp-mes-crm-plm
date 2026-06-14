import { useState } from 'react'
import { Search } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { RequirementDrawer } from '../components/requirements/requirement-drawer'
import { SelectionTree } from '../components/requirements/selection-tree'
import { useRequirements } from '../hooks/use-requirements'

export function PartRequirements() {
  const { t } = useLanguage()
  const { activeOrders, requirements, error, isLoading, stats, calculate } =
    useRequirements()
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
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={Search}
        title={t('mrp.requirements.pageTitle')}
        description={t('mrp.requirements.pageDescription')}
      />

      <div className='flex h-full flex-col p-1'>
        <div className='mb-4 px-2 pt-3'>
          <p className='text-[11px] font-bold tracking-tight text-muted-foreground/50 uppercase'>
            {t('mrp.requirements.helperText')}
          </p>
        </div>

        <div className='custom-scrollbar flex-1 overflow-y-auto px-1'>
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
          errorMessage={
            error && !isForbiddenError(error) && error instanceof Error
              ? error.message
              : typeof error === 'object' && error && 'message' in error
                ? String((error as { message: unknown }).message)
                : undefined
          }
          stats={stats}
          isLoading={isLoading}
          selectedCount={selectedKeys.length}
        />
      </div>
    </div>
  )
}
