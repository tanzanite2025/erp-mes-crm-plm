import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BookOpen, Search } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Button, buttonVariants } from '@/components/ui/button'
import { ForbiddenState } from '@/components/forbidden-state'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { RequirementDrawer } from '../components/requirements/requirement-drawer'
import { RequirementStageAlert } from '../components/requirements/requirement-stage-alert'
import { SelectionTree } from '../components/requirements/selection-tree'
import { useRequirements } from '../hooks/use-requirements'

export function PartRequirements() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const {
    activeOrders,
    requirements,
    error,
    isLoading,
    stats,
    calculate,
    sourceLines,
    bomSelections,
    isComplete,
    setBomSelection,
    recalculate,
    ordersError,
    isLoadingOrders,
    refresh,
  } = useRequirements()
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const handleAnalyze = () => {
    if (selectedKeys.length === 0 || ordersError || isLoadingOrders) return
    setIsDrawerOpen(true)
    calculate(selectedKeys)
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
        statusBadge={
          matchesPathPermissionProjection(user, '/mrp/requirements-guide') ? (
            <Link
              to='/mrp/requirements-guide'
              className={buttonVariants({ variant: 'outline', size: 'sm' })}
            >
              <BookOpen aria-hidden='true' className='size-4' />
              {t('mrp.operationGuide.openGuide')}
            </Link>
          ) : undefined
        }
      />

      <div className='flex h-full flex-col p-1'>
        <div className='mb-4 px-2 pt-3'>
          <p className='text-[11px] font-bold tracking-tight text-muted-foreground/50 uppercase'>
            {t('mrp.requirements.helperText')}
          </p>
        </div>

        <div className='custom-scrollbar flex-1 overflow-y-auto px-1'>
          {ordersError ? (
            <div className='space-y-3'>
              <RequirementStageAlert
                tone='error'
                title={t('mrp.requirements.orderLoading.failedTitle')}
                description={t(
                  'mrp.requirements.orderLoading.failedDescription'
                )}
                details={ordersError.message}
              />
              <Button
                variant='outline'
                disabled={isLoadingOrders}
                onClick={() => void refresh()}
              >
                {t('mrp.requirements.orderLoading.retry')}
              </Button>
            </div>
          ) : isLoadingOrders ? (
            <p role='status' className='p-4 text-sm text-muted-foreground'>
              {t('mrp.requirements.orderLoading.loading')}
            </p>
          ) : (
            <SelectionTree
              orders={activeOrders}
              selectedKeys={selectedKeys}
              onSelectionChange={setSelectedKeys}
              onAnalyze={handleAnalyze}
            />
          )}
        </div>

        <RequirementDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          data={requirements}
          sourceLines={sourceLines}
          bomSelections={bomSelections}
          isComplete={isComplete}
          onBomSelectionChange={setBomSelection}
          onRecalculate={recalculate}
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
