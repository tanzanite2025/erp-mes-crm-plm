import { useState } from 'react'
import { ChevronDown, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'
import type { ProductionMaterialIssuanceReviewedSourceBasis } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'
import type { ProductionMaterialIssuanceWarehouseAction } from '../contracts/production-material-issuance-warehouse-review-batch-availability-and-confirmed-movement-api-dto'
import {
  type ProductionMaterialIssuanceWarehouseHandlingIntent,
  productionMaterialIssuanceWarehouseConfirmationPermissions as confirmationPermissions,
} from '../data/production-material-issuance-warehouse-handling-intent'
import {
  isProductionMaterialIssuanceWarehouseCommandExplicitlyRejected,
  useProductionMaterialIssuanceWarehouseExplicitConfirmation,
  useProductionMaterialIssuanceWarehouseReview,
} from '../hooks/use-production-material-issuance-warehouse-queries-and-session-stable-explicit-confirmation'
import { productionMaterialIssuanceFrozenOrderLineDisplayLabel } from '../utils/production-material-issuance-frozen-order-line-display-label'
import { ProductionMaterialIssuanceCommandFailureAndStableRetryGuidance } from './production-material-issuance-command-failure-and-stable-retry-guidance'
import { ProductionMaterialIssuanceSingleMaterialBatchAndOrderAllocationConfirmationEditor } from './production-material-issuance-single-material-batch-and-order-allocation-confirmation-editor'

export function ProductionMaterialIssuanceWarehouseDocumentProgressMovementHistoryAndInlineHandlingSection({
  documentId,
  sources,
  initiallyOpen = false,
  handlingIntent,
}: {
  documentId: string
  sources: ProductionMaterialIssuanceReviewedSourceBasis[]
  initiallyOpen?: boolean
  handlingIntent?: ProductionMaterialIssuanceWarehouseHandlingIntent
}) {
  const { t } = useLanguage()
  const { allowsAction } = usePermissionActions()
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  const [open, setOpen] = useState(initiallyOpen)
  if (!actorId || !allowsAction('action_production_material_issuance_view'))
    return null
  return (
    <section className='min-w-0 space-y-5 rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-4 md:rounded-[24px] md:p-5'>
      <Button
        type='button'
        variant='outline'
        className='h-auto min-h-10 max-w-full rounded-full border-dashed px-4 py-2 text-[10px] leading-5 font-black tracking-widest whitespace-normal uppercase md:min-h-11 md:px-5'
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {t('mrp.productionMaterialIssuance.warehouseHandling.open')}
        <ChevronDown
          aria-hidden='true'
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
        />
      </Button>
      {open && (
        <AuthorizedProductionMaterialIssuanceWarehouseDocumentHandling
          key={`${actorId}/${documentId}`}
          documentId={documentId}
          sources={sources}
          handlingIntent={handlingIntent}
        />
      )}
    </section>
  )
}

function AuthorizedProductionMaterialIssuanceWarehouseDocumentHandling({
  documentId,
  sources,
  handlingIntent,
}: {
  documentId: string
  sources: ProductionMaterialIssuanceReviewedSourceBasis[]
  handlingIntent?: ProductionMaterialIssuanceWarehouseHandlingIntent
}) {
  const { t, locale } = useLanguage()
  const { allowsAction } = usePermissionActions()
  const query = useProductionMaterialIssuanceWarehouseReview(documentId)
  const command =
    useProductionMaterialIssuanceWarehouseExplicitConfirmation(documentId)
  const warehouseAllowed = allowsAction('menu_warehouse')
  const authorizedActions = (
    Object.keys(
      confirmationPermissions
    ) as ProductionMaterialIssuanceWarehouseAction[]
  ).filter(
    (action) =>
      warehouseAllowed && allowsAction(confirmationPermissions[action])
  )
  const actions = authorizedActions.filter((action) =>
    handlingIntent === undefined || handlingIntent === 'recovery'
      ? true
      : handlingIntent === action
  )
  const prepared = command.current?.request
  const showCommands = handlingIntent !== 'review'
  const currentActionAllowed =
    prepared && authorizedActions.includes(prepared.action)
  const pending = command.current?.status === 'pending'
  return (
    <div className='min-w-0 space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-[11px] font-black tracking-widest text-primary uppercase'>
          {t('mrp.productionMaterialIssuance.warehouseHandling.title')}
        </h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-10 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
          disabled={query.isFetching || pending}
          onClick={() => void query.refetch()}
        >
          <RefreshCw
            aria-hidden='true'
            className={cn('size-3.5', query.isFetching && 'animate-spin')}
          />
          {t(
            'mrp.productionMaterialIssuance.warehouseHandling.refreshDocument'
          )}
        </Button>
      </div>
      <p className='text-[11px] leading-6 font-bold text-muted-foreground/60'>
        {t('mrp.productionMaterialIssuance.warehouseHandling.documentScope')}
      </p>
      {showCommands && prepared && (
        <section className='space-y-4 rounded-2xl border border-dashed border-primary/25 bg-primary/5 p-4'>
          <p className='text-xs font-black text-primary'>
            {t(
              `mrp.productionMaterialIssuance.warehouseHandling.actions.${prepared.action}`
            )}{' '}
            ·{' '}
            {t('mrp.productionMaterialIssuance.warehouseHandling.version', {
              version: prepared.expectedVersion,
            })}
          </p>
          {prepared.materials.map((item) => (
            <div
              key={`${item.materialId}/${item.batchNo}`}
              className='space-y-1 text-sm'
            >
              <p className='wrap-anywhere'>
                {query.data?.sourceMaterials.find(
                  (row) => row.materialId === item.materialId
                )?.materialName ?? item.materialId}{' '}
                ·{' '}
                {item.batchNo ||
                  t(
                    'mrp.productionMaterialIssuance.warehouseHandling.noBatch'
                  )}{' '}
                · {item.quantity}
              </p>
              {item.allocations.map((allocation) => (
                <p
                  key={`${allocation.salesOrderLineId}/${allocation.originalAllocationId}`}
                  className='text-xs wrap-anywhere'
                >
                  {productionMaterialIssuanceFrozenOrderLineDisplayLabel(
                    sources,
                    allocation.salesOrderLineId
                  )}{' '}
                  · {allocation.quantity}
                </p>
              ))}
            </div>
          ))}
          {prepared.reason && (
            <p className='text-sm wrap-anywhere'>{prepared.reason}</p>
          )}
          {command.current?.data ? (
            <p role='status'>
              {t('mrp.productionMaterialIssuance.warehouseHandling.confirmed', {
                version:
                  command.current.data.movement.movement.documentVersionAfter,
              })}
            </p>
          ) : (
            <Button
              type='button'
              className='h-auto min-h-10 max-w-full rounded-full px-5 py-2 text-[10px] font-black tracking-widest whitespace-normal uppercase shadow-lg shadow-primary/15 active:scale-95'
              disabled={pending || !currentActionAllowed}
              onClick={() => command.submitWarehouseConfirmation()}
            >
              {t(
                pending
                  ? 'mrp.productionMaterialIssuance.commands.submitting'
                  : 'mrp.productionMaterialIssuance.commands.retryOriginal'
              )}
            </Button>
          )}
          {command.current?.error && (
            <ProductionMaterialIssuanceCommandFailureAndStableRetryGuidance
              error={command.current.error}
            />
          )}
          {(command.current?.status === 'success' ||
            isProductionMaterialIssuanceWarehouseCommandExplicitlyRejected(
              command.current?.error
            )) && (
            <Button
              type='button'
              variant='outline'
              className='h-auto min-h-10 max-w-full rounded-full border-dashed px-4 py-2 text-[10px] font-black tracking-widest whitespace-normal uppercase'
              onClick={command.startAnotherExplicitWarehouseConfirmation}
            >
              {t(
                'mrp.productionMaterialIssuance.warehouseHandling.startAnother'
              )}
            </Button>
          )}
        </section>
      )}
      {query.isFetching && (
        <p role='status' className='text-sm'>
          {t('mrp.productionMaterialIssuance.warehouseHandling.loading')}
        </p>
      )}
      {query.isError ? (
        <p role='alert' className='text-sm text-destructive'>
          {t('mrp.productionMaterialIssuance.warehouseHandling.failed')}{' '}
          {query.error.message}
        </p>
      ) : (
        query.data &&
        !query.isFetching && (
          <>
            <p className='font-maple-ui text-[10px] font-bold text-muted-foreground/60'>
              {query.data.document.documentNo} ·{' '}
              {t('mrp.productionMaterialIssuance.warehouseHandling.version', {
                version: query.data.document.version,
              })}
            </p>
            <div className='grid gap-3 xl:grid-cols-2'>
              {query.data.sourceMaterials.map((row) => (
                <article
                  key={`${row.salesOrderLineId}/${row.materialId}`}
                  className='min-w-0 space-y-3 rounded-2xl border border-dashed border-muted/60 bg-background/80 p-4'
                >
                  <p className='text-xs font-black wrap-anywhere'>
                    {row.materialCode} · {row.materialName}
                  </p>
                  <p className='text-[10px] leading-6 font-bold wrap-anywhere text-muted-foreground/60'>
                    {productionMaterialIssuanceFrozenOrderLineDisplayLabel(
                      sources,
                      row.salesOrderLineId
                    )}
                  </p>
                  <dl className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                    {(
                      [
                        'standardQty',
                        'issuedQty',
                        'returnedQty',
                        'netQty',
                        'remainingQty',
                        'excessQty',
                      ] as const
                    ).map((field) => (
                      <div
                        key={field}
                        className={cn(
                          'min-w-0 rounded-xl p-3',
                          field === 'remainingQty'
                            ? 'bg-primary/5 text-primary'
                            : field === 'excessQty' && row.excessQty > 0
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              : 'bg-muted/40'
                        )}
                      >
                        <dt className='text-[9px] font-black tracking-wider text-muted-foreground/60'>
                          {t(
                            `mrp.productionMaterialIssuance.warehouseHandling.quantities.${field}`
                          )}
                        </dt>
                        <dd className='mt-1 font-maple-ui text-sm font-black wrap-anywhere tabular-nums'>
                          {row[field]} {row.unit}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </article>
              ))}
            </div>
            {actions.some(
              (action) => query.data.warehouseActionBlockers[action]
            ) && (
              <p
                role='alert'
                className='rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100'
              >
                {t('mrp.productionMaterialIssuance.start.warehouseUnavailable')}{' '}
                {Array.from(
                  new Set(
                    actions
                      .map(
                        (action) => query.data.warehouseActionBlockers[action]
                      )
                      .filter(Boolean)
                  )
                ).join('；')}
              </p>
            )}
            {handlingIntent === 'recovery' && !prepared && (
              <p className='rounded-xl bg-muted/30 p-3 text-sm leading-6'>
                {t(
                  'mrp.productionMaterialIssuance.warehouseHandling.dialog.noUnfinishedRequest'
                )}
              </p>
            )}
            {showCommands &&
              handlingIntent !== 'recovery' &&
              !prepared &&
              query.data.document.status === 'DISPATCHED' &&
              (actions.some(
                (action) => !query.data.warehouseActionBlockers[action]
              ) ? (
                <ProductionMaterialIssuanceSingleMaterialBatchAndOrderAllocationConfirmationEditor
                  key={`${query.data.document.version}/${actions.filter((action) => !query.data.warehouseActionBlockers[action]).join(',')}`}
                  review={query.data}
                  sources={sources}
                  actions={actions.filter(
                    (action) => !query.data.warehouseActionBlockers[action]
                  )}
                  onConfirm={command.submitWarehouseConfirmation}
                />
              ) : actions.length > 0 ? null : (
                <p className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 p-4 text-[11px] leading-6 font-bold text-muted-foreground'>
                  {t(
                    'mrp.productionMaterialIssuance.warehouseHandling.readonly'
                  )}
                </p>
              ))}
            <section className='space-y-3 border-t border-dashed border-muted/50 pt-5'>
              <h4 className='text-[11px] font-black tracking-widest uppercase'>
                {t('mrp.productionMaterialIssuance.warehouseHandling.history')}
              </h4>
              {query.data.movements.length === 0 && (
                <p className='rounded-2xl bg-muted/10 px-4 py-6 text-[11px] leading-6 font-bold text-muted-foreground/60'>
                  {t(
                    'mrp.productionMaterialIssuance.warehouseHandling.noMovements'
                  )}
                </p>
              )}
              {query.data.movements.map((entry) => (
                <details
                  key={entry.movement.id}
                  className='min-w-0 rounded-2xl border border-dashed border-muted/50 bg-background/70 p-4'
                >
                  <summary className='cursor-pointer text-[11px] leading-6 font-bold wrap-anywhere'>
                    {t(
                      `mrp.productionMaterialIssuance.warehouseHandling.actions.${entry.movement.kind === 'ISSUE' ? 'issue' : entry.movement.kind === 'SUPPLEMENT' ? 'supplement' : 'return'}`
                    )}{' '}
                    ·{' '}
                    {new Date(entry.movement.confirmedAt).toLocaleString(
                      locale
                    )}{' '}
                    · {entry.movement.confirmedBy}
                  </summary>
                  <div className='mt-2 space-y-2 text-sm'>
                    {entry.movement.reason && (
                      <p className='wrap-anywhere'>{entry.movement.reason}</p>
                    )}
                    {entry.materials.map((item) => (
                      <div
                        key={item.material.id}
                        className='space-y-1 rounded-xl bg-muted/30 p-3 text-[11px] leading-6 font-bold'
                      >
                        <p className='wrap-anywhere'>
                          {
                            query.data?.sourceMaterials.find(
                              (row) =>
                                row.materialId === item.material.materialId
                            )?.materialName
                          }{' '}
                          ·{' '}
                          {item.material.batchNo ||
                            t(
                              'mrp.productionMaterialIssuance.warehouseHandling.noBatch'
                            )}{' '}
                          · {item.material.quantity} {item.material.unit}
                        </p>
                        {item.allocations.map((allocation) => (
                          <p
                            key={allocation.id}
                            className='text-xs wrap-anywhere'
                          >
                            {productionMaterialIssuanceFrozenOrderLineDisplayLabel(
                              sources,
                              allocation.salesOrderLineId
                            )}{' '}
                            · {allocation.quantity} {item.material.unit}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </section>
          </>
        )
      )}
    </div>
  )
}
