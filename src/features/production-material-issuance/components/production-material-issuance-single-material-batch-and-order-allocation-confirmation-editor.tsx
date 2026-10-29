import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ProductionMaterialIssuanceReviewedSourceBasis } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'
import {
  productionMaterialIssuanceWarehouseCommandSchema,
  type ProductionMaterialIssuanceWarehouseAction,
  type ProductionMaterialIssuanceWarehouseReview,
  type ProductionMaterialIssuanceWarehouseCommand,
  type ProductionMaterialIssuanceAllocationInput,
} from '../contracts/production-material-issuance-warehouse-review-batch-availability-and-confirmed-movement-api-dto'
import { useProductionMaterialIssuanceMaterialBatchAvailability } from '../hooks/use-production-material-issuance-warehouse-queries-and-session-stable-explicit-confirmation'
import { suggestProductionMaterialIssuanceOrdinaryAllocations } from '../services/production-material-issuance-warehouse-review-batches-suggestions-and-explicit-confirmation-service'
import { productionMaterialIssuanceFrozenOrderLineDisplayLabel } from '../utils/production-material-issuance-frozen-order-line-display-label'

const warehouseHandoverFormControlClassName =
  'h-10 w-full min-w-0 rounded-xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 md:h-11'

const warehouseHandoverSecondaryButtonClassName =
  'h-auto min-h-10 max-w-full min-w-0 rounded-full border-dashed px-4 py-2 text-[10px] leading-5 font-black tracking-widest whitespace-normal uppercase active:scale-95 md:min-h-11 md:px-5'

export function ProductionMaterialIssuanceSingleMaterialBatchAndOrderAllocationConfirmationEditor({
  review,
  sources,
  actions,
  onConfirm,
}: {
  review: ProductionMaterialIssuanceWarehouseReview
  sources: ProductionMaterialIssuanceReviewedSourceBasis[]
  actions: ProductionMaterialIssuanceWarehouseAction[]
  onConfirm: (
    payload: Omit<ProductionMaterialIssuanceWarehouseCommand, 'commandId'>
  ) => void
}) {
  const { t } = useLanguage()
  const [action, setAction] = useState(actions[0])
  const [materialId, setMaterialId] = useState('')
  return (
    <section className='space-y-5 rounded-2xl border border-dashed border-primary/20 bg-primary/5 p-4 md:rounded-[24px] md:p-5'>
      <h4 className='text-[11px] font-black tracking-widest text-primary uppercase'>
        {t('mrp.productionMaterialIssuance.warehouseHandling.confirmTitle')}
      </h4>
      <p className='text-[11px] leading-6 font-bold text-muted-foreground/60'>
        {t('mrp.productionMaterialIssuance.warehouseHandling.oneBatchHint')}
      </p>
      <div className='grid gap-3 sm:grid-cols-2'>
        <label className='min-w-0 space-y-2 text-[11px] font-bold'>
          <span>
            {t('mrp.productionMaterialIssuance.warehouseHandling.action')}
          </span>
          <select
            className={warehouseHandoverFormControlClassName}
            value={action}
            onChange={(event) => {
              const next = actions.find((item) => item === event.target.value)
              if (next) setAction(next)
            }}
          >
            {actions.map((item) => (
              <option key={item} value={item}>
                {t(
                  `mrp.productionMaterialIssuance.warehouseHandling.actions.${item}`
                )}
              </option>
            ))}
          </select>
        </label>
        <label className='min-w-0 space-y-2 text-[11px] font-bold'>
          <span>
            {t('mrp.productionMaterialIssuance.warehouseHandling.material')}
          </span>
          <select
            className={warehouseHandoverFormControlClassName}
            value={materialId}
            onChange={(event) => setMaterialId(event.target.value)}
          >
            <option value=''>
              {t(
                'mrp.productionMaterialIssuance.warehouseHandling.chooseMaterial'
              )}
            </option>
            {review.materialTotals.map((item) => {
              const row = review.sourceMaterials.find(
                (entry) => entry.materialId === item.materialId
              )
              return (
                <option key={item.materialId} value={item.materialId}>
                  {row?.materialCode} {row?.materialName} · {item.unit}
                </option>
              )
            })}
          </select>
        </label>
      </div>
      {materialId && action && (
        <ProductionMaterialIssuanceSelectedMaterialBatchConfirmationFields
          key={`${review.document.version}/${action}/${materialId}`}
          review={review}
          sources={sources}
          materialId={materialId}
          action={action}
          onConfirm={onConfirm}
        />
      )}
    </section>
  )
}

function ProductionMaterialIssuanceSelectedMaterialBatchConfirmationFields({
  review,
  sources,
  materialId,
  action,
  onConfirm,
}: {
  review: ProductionMaterialIssuanceWarehouseReview
  sources: ProductionMaterialIssuanceReviewedSourceBasis[]
  materialId: string
  action: ProductionMaterialIssuanceWarehouseAction
  onConfirm: (
    payload: Omit<ProductionMaterialIssuanceWarehouseCommand, 'commandId'>
  ) => void
}) {
  const { t } = useLanguage()
  const [batchInventoryId, setBatchInventoryId] = useState('')
  const [quantityText, setQuantityText] = useState('')
  const [reason, setReason] = useState('')
  const [lineId, setLineId] = useState('')
  const [originalId, setOriginalId] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [allocations, setAllocations] = useState<
    ProductionMaterialIssuanceAllocationInput[] | null
  >(null)
  const batches = useProductionMaterialIssuanceMaterialBatchAvailability(
    action === 'return'
      ? null
      : {
          documentId: review.document.id,
          expectedVersion: review.document.version,
          materialId,
        }
  )
  const suggestion = useMutation({
    mutationFn: suggestProductionMaterialIssuanceOrdinaryAllocations,
    retry: false,
  })
  const material = review.materialTotals.find(
    (item) => item.materialId === materialId
  )
  const original = review.returnableAllocations.find(
    (item) => item.originalAllocationId === originalId
  )
  const batch = batches.data?.items.find(
    (item) => item.inventoryId === batchInventoryId
  )
  const quantity = Number(quantityText)
  const selectedAllocations =
    action === 'issue'
      ? allocations?.filter((entry) => entry.quantity !== 0)
      : action === 'supplement'
        ? [
            {
              salesOrderLineId: Number(lineId),
              quantity,
              originalAllocationId: null,
            },
          ]
        : original
          ? [
              {
                salesOrderLineId: original.salesOrderLineId,
                quantity,
                originalAllocationId: original.originalAllocationId,
              },
            ]
          : null
  const payload = {
    documentId: review.document.id,
    expectedVersion: review.document.version,
    action,
    reason,
    materials: [
      {
        materialId,
        batchNo:
          action === 'return'
            ? (original?.batchNo ?? '')
            : (batch?.batchNo ?? ''),
        quantity,
        allocations: selectedAllocations ?? [],
      },
    ],
  }
  const valid = productionMaterialIssuanceWarehouseCommandSchema.safeParse({
    ...payload,
    commandId: '11111111-1111-4111-8111-111111111111',
  }).success
  const selectionReady =
    action === 'return'
      ? Boolean(original && quantity <= original.returnableQty)
      : Boolean(
          batch &&
          !batches.isFetching &&
          !batches.isError &&
          quantity <= batch.availableQty
        )
  const locked = suggestion.isPending
  const changeWarehouseHandoverQuantityAndResetAllocations = (
    value: string
  ) => {
    setQuantityText(value)
    setAllocations(null)
    setConfirmed(false)
    suggestion.reset()
  }
  return (
    <div className='space-y-3'>
      <p className='rounded-xl border border-dashed border-primary/15 bg-background/70 px-4 py-3 text-[11px] leading-6 font-bold'>
        {t('mrp.productionMaterialIssuance.warehouseHandling.materialStatus', {
          standard: material?.standardQty ?? '',
          remaining: material?.remainingQty ?? '',
          excess: material?.excessQty ?? '',
          unit: material?.unit ?? '',
        })}
      </p>
      {action === 'return' ? (
        <div className='space-y-2'>
          <label className='block space-y-2 text-[11px] font-bold'>
            <span>
              {t(
                'mrp.productionMaterialIssuance.warehouseHandling.originalAllocation'
              )}
            </span>
            <select
              className={warehouseHandoverFormControlClassName}
              value={originalId}
              onChange={(event) => {
                setOriginalId(event.target.value)
                setConfirmed(false)
              }}
            >
              <option value=''>
                {t(
                  'mrp.productionMaterialIssuance.warehouseHandling.chooseOriginal'
                )}
              </option>
              {review.returnableAllocations
                .filter((item) => item.materialId === materialId)
                .map((item) => (
                  <option
                    key={item.originalAllocationId}
                    value={item.originalAllocationId}
                  >
                    {productionMaterialIssuanceFrozenOrderLineDisplayLabel(
                      sources,
                      item.salesOrderLineId
                    )}{' '}
                    ·{' '}
                    {item.batchNo ||
                      t(
                        'mrp.productionMaterialIssuance.warehouseHandling.noBatch'
                      )}{' '}
                    ·{' '}
                    {t(
                      'mrp.productionMaterialIssuance.warehouseHandling.returnable',
                      { quantity: item.returnableQty, unit: item.unit }
                    )}{' '}
                    · {item.originalAllocationId.slice(0, 8)}
                  </option>
                ))}
            </select>
          </label>
          {original && (
            <p className='rounded-xl bg-background px-4 py-3 text-[11px] leading-6 font-bold wrap-anywhere'>
              {productionMaterialIssuanceFrozenOrderLineDisplayLabel(
                sources,
                original.salesOrderLineId
              )}{' '}
              ·{' '}
              {original.batchNo ||
                t(
                  'mrp.productionMaterialIssuance.warehouseHandling.noBatch'
                )}{' '}
              ·{' '}
              {t(
                'mrp.productionMaterialIssuance.warehouseHandling.returnable',
                { quantity: original.returnableQty, unit: original.unit }
              )}
            </p>
          )}
        </div>
      ) : (
        <div className='space-y-2'>
          {batches.isFetching && (
            <p role='status' className='text-sm'>
              {t(
                'mrp.productionMaterialIssuance.warehouseHandling.loadingBatches'
              )}
            </p>
          )}
          {batches.isError && (
            <p role='alert' className='text-sm text-destructive'>
              {t(
                'mrp.productionMaterialIssuance.warehouseHandling.batchFailed'
              )}{' '}
              {batches.error.message}
            </p>
          )}
          <div className='grid gap-2 sm:flex sm:items-end'>
            <label className='min-w-0 flex-1 space-y-2 text-[11px] font-bold'>
              <span>
                {t('mrp.productionMaterialIssuance.warehouseHandling.batch')}
              </span>
              <select
                className={warehouseHandoverFormControlClassName}
                value={batchInventoryId}
                disabled={batches.isFetching || batches.isError || locked}
                onChange={(event) => {
                  setBatchInventoryId(event.target.value)
                  setConfirmed(false)
                }}
              >
                <option value=''>
                  {t(
                    'mrp.productionMaterialIssuance.warehouseHandling.chooseBatch'
                  )}
                </option>
                {batches.data?.items.map((item) => (
                  <option
                    key={item.inventoryId}
                    value={item.inventoryId}
                    disabled={item.availableQty <= 0}
                  >
                    {item.batchNo ||
                      t(
                        'mrp.productionMaterialIssuance.warehouseHandling.noBatch'
                      )}{' '}
                    ·{' '}
                    {t(
                      'mrp.productionMaterialIssuance.warehouseHandling.available',
                      { quantity: item.availableQty, unit: item.unit }
                    )}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type='button'
              variant='outline'
              className={warehouseHandoverSecondaryButtonClassName}
              disabled={batches.isFetching || locked}
              onClick={() => {
                setBatchInventoryId('')
                setConfirmed(false)
                void batches.refetch()
              }}
            >
              <RefreshCw aria-hidden='true' className='size-3.5' />
              {t('mrp.productionMaterialIssuance.warehouseHandling.refresh')}
            </Button>
          </div>
          {batch && !batches.isError && (
            <p className='text-xs leading-6'>
              {t(
                'mrp.productionMaterialIssuance.warehouseHandling.batchBalance',
                {
                  stock: batch.inventoryQty,
                  reserved: batch.reservedQty,
                  available: batch.availableQty,
                  unit: batch.unit,
                }
              )}
            </p>
          )}
          {batches.data?.items.length === 0 && !batches.isError && (
            <p className='text-sm'>
              {t('mrp.productionMaterialIssuance.warehouseHandling.noStock')}
            </p>
          )}
        </div>
      )}
      {action === 'supplement' && (
        <label className='block space-y-2 text-[11px] font-bold'>
          <span>
            {t('mrp.productionMaterialIssuance.warehouseHandling.orderLine')}
          </span>
          <select
            className={warehouseHandoverFormControlClassName}
            value={lineId}
            onChange={(event) => {
              setLineId(event.target.value)
              setConfirmed(false)
            }}
          >
            <option value=''>
              {t('mrp.productionMaterialIssuance.warehouseHandling.chooseLine')}
            </option>
            {review.sourceMaterials
              .filter((item) => item.materialId === materialId)
              .map((item) => (
                <option
                  key={item.salesOrderLineId}
                  value={item.salesOrderLineId}
                >
                  {productionMaterialIssuanceFrozenOrderLineDisplayLabel(
                    sources,
                    item.salesOrderLineId
                  )}
                </option>
              ))}
          </select>
        </label>
      )}
      <div className='grid gap-2 sm:flex sm:flex-wrap sm:items-end'>
        <label className='min-w-0 flex-1 space-y-2 text-[11px] font-bold'>
          <span>
            {t('mrp.productionMaterialIssuance.warehouseHandling.quantity', {
              unit: material?.unit ?? '',
            })}
          </span>
          <Input
            className={warehouseHandoverFormControlClassName}
            inputMode='decimal'
            type='number'
            step='any'
            min='0'
            value={quantityText}
            disabled={locked}
            onChange={(event) =>
              changeWarehouseHandoverQuantityAndResetAllocations(
                event.target.value
              )
            }
          />
        </label>
        {action === 'issue' && (
          <Button
            type='button'
            variant='outline'
            className={warehouseHandoverSecondaryButtonClassName}
            disabled={
              locked ||
              !Number.isFinite(quantity) ||
              quantity <= 0 ||
              !selectionReady
            }
            onClick={() => {
              setConfirmed(false)
              suggestion.mutate(
                {
                  documentId: review.document.id,
                  expectedVersion: review.document.version,
                  materialId,
                  quantity,
                },
                {
                  onSuccess: (result) =>
                    setAllocations(
                      review.sourceMaterials
                        .filter((row) => row.materialId === materialId)
                        .map((row) => ({
                          salesOrderLineId: row.salesOrderLineId,
                          quantity:
                            result.allocations.find(
                              (entry) =>
                                entry.salesOrderLineId === row.salesOrderLineId
                            )?.quantity ?? 0,
                          originalAllocationId: null,
                        }))
                    ),
                }
              )
            }}
          >
            {t('mrp.productionMaterialIssuance.warehouseHandling.suggest')}
          </Button>
        )}
      </div>
      {suggestion.isError && (
        <p role='alert' className='text-sm text-destructive'>
          {suggestion.error.message}
        </p>
      )}
      {action === 'issue' && allocations && (
        <div className='space-y-3 rounded-2xl border border-dashed border-muted/50 bg-background/80 p-4'>
          <p className='text-[11px] leading-6 font-bold'>
            {t(
              'mrp.productionMaterialIssuance.warehouseHandling.allocationHint'
            )}
          </p>
          {allocations.map((allocation, index) => (
            <label
              key={allocation.salesOrderLineId}
              className='grid items-center gap-2 text-[11px] font-bold sm:grid-cols-[1fr_9rem]'
            >
              <span className='min-w-0 wrap-anywhere'>
                {productionMaterialIssuanceFrozenOrderLineDisplayLabel(
                  sources,
                  allocation.salesOrderLineId
                )}
              </span>
              <Input
                className={warehouseHandoverFormControlClassName}
                aria-label={t(
                  'mrp.productionMaterialIssuance.warehouseHandling.allocationQuantity',
                  {
                    line: productionMaterialIssuanceFrozenOrderLineDisplayLabel(
                      sources,
                      allocation.salesOrderLineId
                    ),
                  }
                )}
                type='number'
                inputMode='decimal'
                min='0'
                step='any'
                value={allocation.quantity}
                onChange={(event) => {
                  setAllocations(
                    allocations.map((entry, position) =>
                      position === index
                        ? { ...entry, quantity: Number(event.target.value) }
                        : entry
                    )
                  )
                  setConfirmed(false)
                }}
              />
            </label>
          ))}
        </div>
      )}
      <label className='block space-y-2 text-[11px] font-bold'>
        <span>
          {t(
            action === 'issue'
              ? 'mrp.productionMaterialIssuance.warehouseHandling.reasonOptional'
              : 'mrp.productionMaterialIssuance.warehouseHandling.reasonRequired'
          )}
        </span>
        <Textarea
          className='min-h-20 w-full rounded-xl border-none bg-muted/50 px-4 py-3 text-xs font-bold shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20'
          value={reason}
          onChange={(event) => {
            setReason(event.target.value)
            setConfirmed(false)
          }}
        />
      </label>
      <label className='flex items-start gap-3 rounded-2xl border border-dashed border-primary/20 bg-background/70 p-4 text-[11px] leading-6 font-bold'>
        <input
          type='checkbox'
          className='mt-1 size-4 shrink-0 accent-primary'
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <span>
          {t(
            'mrp.productionMaterialIssuance.warehouseHandling.confirmChecklist'
          )}
        </span>
      </label>
      <Button
        type='button'
        className='h-auto min-h-10 max-w-full rounded-full px-5 py-3 text-[10px] leading-5 font-black tracking-widest whitespace-normal uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 md:min-h-11 md:px-6'
        disabled={!confirmed || !valid || !selectionReady || locked}
        onClick={() => onConfirm(payload)}
      >
        {t(
          `mrp.productionMaterialIssuance.warehouseHandling.confirmActions.${action}`
        )}
      </Button>
      <p className='text-[10px] leading-6 font-bold text-muted-foreground/60'>
        {t('mrp.productionMaterialIssuance.warehouseHandling.custodyHint')}
      </p>
    </div>
  )
}
