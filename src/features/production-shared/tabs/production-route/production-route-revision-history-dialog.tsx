import { useMemo } from 'react'
import { Copy } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ProductionRoute } from '../../data/production-route'

interface ProductionRouteRevisionHistoryDialogProps {
  open: boolean
  routes: ProductionRoute[]
  canManage: boolean
  isCheckingPermission: boolean
  isCreatingRevision: boolean
  onOpenChange: (open: boolean) => void
  onCreateRevision: (route: ProductionRoute) => void
}

export function ProductionRouteRevisionHistoryDialog({
  open,
  routes,
  canManage,
  isCheckingPermission,
  isCreatingRevision,
  onOpenChange,
  onCreateRevision,
}: ProductionRouteRevisionHistoryDialogProps) {
  const { t } = useLanguage()
  const revisions = useMemo(
    () => [...routes].sort((left, right) => right.revisionNo - left.revisionNo),
    [routes]
  )
  const currentRevision = revisions.find(
    (route) => route.isCurrentRevision && route.status === 'PUBLISHED'
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[min(85vh,760px)] max-w-3xl overflow-y-auto'>
        <DialogHeader>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0'>
              <DialogTitle>
                {t('productionArchitecture.routes.history.title')}
              </DialogTitle>
              <DialogDescription>
                {revisions[0]
                  ? `${revisions[0].productSKU} · ${revisions[0].productName} · ${revisions[0].bomVersionLevel || t('productionArchitecture.routes.bomBranch.unspecifiedVersion')}`
                  : t('productionArchitecture.routes.history.empty')}
              </DialogDescription>
            </div>
            {currentRevision ? (
              <Button
                type='button'
                size='sm'
                className='rounded-full'
                onClick={() => onCreateRevision(currentRevision)}
                disabled={
                  !canManage || isCheckingPermission || isCreatingRevision
                }
                title={
                  canManage
                    ? t('productionArchitecture.routes.history.copyCurrent')
                    : t('productionArchitecture.routes.noManagePermission')
                }
              >
                <Copy className='mr-2 size-4' />
                {t('productionArchitecture.routes.history.copyCurrent')}
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        {revisions.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>
            {t('productionArchitecture.routes.history.empty')}
          </p>
        ) : (
          <div className='divide-y rounded-md border'>
            {revisions.map((route) => {
              const stepNameById = new Map(
                route.steps.map((step) => [step.id, step.processName])
              )
              return (
                <section key={route.id} className='space-y-3 p-4'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='min-w-0'>
                      <h3 className='text-sm font-semibold break-words'>
                        {route.name}
                      </h3>
                      <p className='mt-1 text-xs break-words text-muted-foreground'>
                        {route.code} · R{route.revisionNo}
                        {route.basedOnRouteId
                          ? ` · ${t('productionArchitecture.routes.history.copiedRevision')}`
                          : ''}
                      </p>
                    </div>
                    <div className='flex shrink-0 flex-wrap gap-2'>
                      <Badge variant='outline'>
                        {t(
                          `productionArchitecture.routes.statuses.${route.status}`
                        )}
                      </Badge>
                      {route.isCurrentRevision ? (
                        <Badge variant='secondary'>
                          {t('productionArchitecture.routes.history.current')}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  {route.description ? (
                    <p className='text-xs break-words text-muted-foreground'>
                      {route.description}
                    </p>
                  ) : null}

                  <ol className='divide-y rounded border'>
                    {route.steps.map((step) => (
                      <li
                        key={step.id}
                        className='grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 p-3 text-xs sm:grid-cols-[auto_minmax(0,1fr)_auto]'
                      >
                        <span className='row-span-2 flex size-6 items-center justify-center rounded border font-medium'>
                          {step.sequence}
                        </span>
                        <span className='min-w-0 font-semibold break-words'>
                          {step.processName || step.processStepId}
                        </span>
                        <span className='break-words text-muted-foreground sm:text-right'>
                          {t(
                            `productionArchitecture.routes.executionModes.${step.executionMode}`
                          )}{' '}
                          ·{' '}
                          {t(
                            `productionArchitecture.routes.qualityGates.${step.qualityGate}`
                          )}
                          {step.estimatedMinutes > 0
                            ? ` · ${step.estimatedMinutes} ${t('productionArchitecture.routes.fields.minutesShort')}`
                            : ''}
                          {step.transferRequired
                            ? ` · ${t('productionArchitecture.routes.steps.transfer')}`
                            : ''}
                        </span>
                        {step.description ? (
                          <span className='col-start-2 break-words text-muted-foreground sm:col-start-2'>
                            {step.description}
                          </span>
                        ) : null}
                        {step.qualityRouting ? (
                          <span className='col-start-2 break-words text-muted-foreground sm:col-start-2'>
                            {Object.entries(step.qualityRouting)
                              .map(([disposition, target]) => {
                                const targetName = target.targetRouteStepId
                                  ? stepNameById.get(target.targetRouteStepId)
                                  : undefined
                                return `${disposition}: ${targetName || target.targetRouteStepId || t('productionArchitecture.routes.steps.noQualityTarget')}`
                              })
                              .join(' · ')}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </section>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
