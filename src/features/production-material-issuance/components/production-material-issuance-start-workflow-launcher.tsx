import { lazy, Suspense, useId, useState } from 'react'
import { PackagePlus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { ProductionMaterialIssuanceSelectedSource } from '../contracts/production-material-issuance-source-selection-and-preparation-api-dto'

const ProductionMaterialIssuanceSourceSelectionWorkflow = lazy(() =>
  import('./production-material-issuance-source-selection-bom-review-and-dispatch-workflow').then(
    (module) => ({
      default:
        module.ProductionMaterialIssuanceSourceSelectionBomReviewAndDispatchWorkflow,
    })
  )
)

export function ProductionMaterialIssuanceStartWorkflowLauncher({
  initialSources = [],
  startRequested = false,
  onStartRequestHandled,
  compact = false,
}: {
  initialSources?: ProductionMaterialIssuanceSelectedSource[]
  startRequested?: boolean
  onStartRequestHandled?: () => void
  compact?: boolean
}) {
  const { t } = useLanguage()
  const { allowsAction } = usePermissionActions()
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  const [open, setOpen] = useState(false)
  const permissionHintId = useId()
  const canStart =
    Boolean(actorId) &&
    allowsAction([
      'menu_mrp',
      'tab_mrp_requirements',
      'tab_mrp_production_material_issuance',
    ]) &&
    allowsAction('action_production_material_issuance_view') &&
    allowsAction('action_production_material_issuance_dispatch')
  return (
    <div
      className='space-y-2'
      title={
        !canStart
          ? t('mrp.productionMaterialIssuance.start.permissionRequired')
          : undefined
      }
    >
      <Button
        className={cn(
          'h-auto min-h-10 rounded-full px-5 py-2 whitespace-normal',
          compact && 'min-h-9 rounded-lg px-3'
        )}
        disabled={!canStart}
        aria-describedby={!canStart ? permissionHintId : undefined}
        onClick={() => setOpen(true)}
      >
        <PackagePlus aria-hidden='true' className='size-4' />
        {t(
          initialSources.length
            ? 'mrp.productionMaterialIssuance.start.startWithSelected'
            : 'mrp.productionMaterialIssuance.start.action'
        )}
      </Button>
      {!canStart && (
        <p
          id={permissionHintId}
          className={cn(
            'max-w-xl text-xs leading-6 text-muted-foreground',
            compact && 'sr-only'
          )}
        >
          {t('mrp.productionMaterialIssuance.start.permissionRequired')}
        </p>
      )}
      <Dialog
        open={canStart && (open || startRequested)}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) onStartRequestHandled?.()
        }}
      >
        <DialogContent
          size='full'
          className='flex h-[85dvh] max-h-none w-[85vw] max-w-none min-w-0 flex-col overflow-hidden rounded-2xl p-4 sm:p-6'
        >
          <DialogHeader className='shrink-0 pr-6'>
            <DialogTitle>
              {t('mrp.productionMaterialIssuance.start.title')}
            </DialogTitle>
            <DialogDescription>
              {t('mrp.productionMaterialIssuance.start.steps')}
            </DialogDescription>
          </DialogHeader>
          <div className='min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]'>
            {canStart && (open || startRequested) && (
              <Suspense
                fallback={
                  <p role='status'>
                    {t('mrp.productionMaterialIssuance.start.loading')}
                  </p>
                }
              >
                <ProductionMaterialIssuanceSourceSelectionWorkflow
                  key={actorId}
                  actorId={actorId}
                  initialSources={initialSources}
                />
              </Suspense>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
