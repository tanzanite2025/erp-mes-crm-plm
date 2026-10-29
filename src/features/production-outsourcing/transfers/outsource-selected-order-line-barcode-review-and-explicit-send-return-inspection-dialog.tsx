import { useRef, useState } from 'react'
import type { TranslationKey } from '@/locales'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type {
  OutsourceOrder,
  OutsourceOrderLine,
  OutsourceInspectionResult,
  OutsourceInspectionDisposition,
  OutsourceInspectionFormValues,
  OutsourceTransferFormValues,
} from '../data/outsource-order'
import { useOutsourceInventoryCategoryOptions } from '../hooks/use-outsource-inventory-category-options'
import {
  reviewOutsourceExecutionBarcodeForSelectedOrderLine,
  type OutsourceExecutionBarcodeReview,
} from '../services/outsource-order-line-optional-barcode-registration-and-execution-review-service'

export interface SelectedOutsourceOrderLineExecution {
  action: 'send' | 'return' | 'inspect'
  order: OutsourceOrder
  line: OutsourceOrderLine
}

const PRODUCTION_OUTSOURCE_CATEGORY = 'PRODUCTION_OUTSOURCE'

export function OutsourceSelectedOrderLineBarcodeReviewAndExplicitBusinessExecutionDialog({
  activeAction,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  activeAction: SelectedOutsourceOrderLineExecution | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (
    values: OutsourceTransferFormValues | OutsourceInspectionFormValues
  ) => void
}) {
  const { t } = useLanguage()
  const categoryOptionsQuery = useOutsourceInventoryCategoryOptions(
    activeAction?.action === 'send' || activeAction?.action === 'return'
  )
  const [productBarcode, setProductBarcode] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [result, setResult] = useState<OutsourceInspectionResult>('PASS')
  const [disposition, setDisposition] =
    useState<OutsourceInspectionDisposition>('ACCEPT')
  const [sourceCategory, setSourceCategory] = useState('')
  const [targetCategory, setTargetCategory] = useState('')
  const [batchNo, setBatchNo] = useState('')
  const [notes, setNotes] = useState('')
  const [barcodeReview, setBarcodeReview] =
    useState<OutsourceExecutionBarcodeReview | null>(null)
  const [reviewError, setReviewError] = useState('')
  const [isReviewing, setIsReviewing] = useState(false)
  const reviewRequestSequenceRef = useRef(0)

  const open = activeAction !== null
  const line = activeAction?.line

  if (!activeAction || !line) {
    return null
  }

  const isInspection = activeAction.action === 'inspect'
  const reviewed =
    barcodeReview?.productBarcode === productBarcode.trim().toUpperCase()
      ? barcodeReview
      : null
  const destination = reviewed?.destinations[disposition]
  const confirmDisabled =
    isSubmitting ||
    isReviewing ||
    !reviewed ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > reviewed.availableQuantity ||
    (!isInspection &&
      (activeAction.action === 'send' ? !sourceCategory : !targetCategory))

  async function readSelectedOutsourceLineBarcodeBeforeConfirmation() {
    if (!activeAction || !productBarcode.trim() || isReviewing || isSubmitting)
      return
    const requestSequence = ++reviewRequestSequenceRef.current
    setIsReviewing(true)
    setBarcodeReview(null)
    setReviewError('')
    try {
      const response =
        await reviewOutsourceExecutionBarcodeForSelectedOrderLine(
          activeAction.line.id,
          productBarcode,
          activeAction.action.toUpperCase() as 'SEND' | 'RETURN' | 'INSPECT'
        )
      if (requestSequence !== reviewRequestSequenceRef.current) return
      setBarcodeReview(response)
      setQuantity(Math.min(1, response.availableQuantity))
    } catch (failure) {
      if (requestSequence === reviewRequestSequenceRef.current)
        setReviewError(
          failure instanceof Error ? failure.message : String(failure)
        )
    } finally {
      if (requestSequence === reviewRequestSequenceRef.current)
        setIsReviewing(false)
    }
  }

  function changeOutsourceExecutionProductBarcode(value: string) {
    reviewRequestSequenceRef.current++
    setProductBarcode(value)
    setBarcodeReview(null)
    setReviewError('')
    setIsReviewing(false)
  }
  const titleKey =
    `productionOutsourcing.execution.dialog.${activeAction.action}Title` as TranslationKey
  const categoryOptions = categoryOptionsQuery.data ?? []
  const sourceCategoryOptions = categoryOptions.filter(
    (option) =>
      option.allowShipment && option.code !== PRODUCTION_OUTSOURCE_CATEGORY
  )
  const targetCategoryOptions = categoryOptions.filter(
    (option) =>
      option.allowInbound && option.code !== PRODUCTION_OUTSOURCE_CATEGORY
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) onOpenChange(nextOpen)
      }}
    >
      <DialogContent
        size='lg'
        data-mobile-floating-surface-layout='column'
        className='flex max-h-[90dvh] flex-col'
      >
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>
            {activeAction.order.orderNo} ·{' '}
            {line.productName || line.productCode} ·{' '}
            {activeAction.order.partnerNameSnapshot}
          </DialogDescription>
        </DialogHeader>
        <div
          data-mobile-floating-surface-scroll-body
          className='min-h-0 min-w-0 overflow-y-auto'
        >
          <fieldset disabled={isSubmitting} className='grid min-w-0 gap-3'>
            <div className='grid gap-1.5'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('productionOutsourcing.execution.fields.productBarcode')}
              </span>
              <Input
                autoFocus
                aria-label={t(
                  'productionOutsourcing.execution.fields.productBarcode'
                )}
                disabled={isSubmitting}
                value={productBarcode}
                onChange={(event) =>
                  changeOutsourceExecutionProductBarcode(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void readSelectedOutsourceLineBarcodeBeforeConfirmation()
                  }
                }}
                placeholder={t(
                  'productionOutsourcing.execution.placeholders.productBarcode'
                )}
              />
              {line.registeredProductBarcodes.length > 0 && (
                <select
                  aria-label={t(
                    'productionOutsourcing.barcodeRegistration.pickRegistered'
                  )}
                  value=''
                  disabled={isSubmitting}
                  onChange={(event) =>
                    changeOutsourceExecutionProductBarcode(event.target.value)
                  }
                  className='h-9 min-w-0 rounded-md border bg-background px-3 text-sm'
                >
                  <option value=''>
                    {t(
                      'productionOutsourcing.barcodeRegistration.pickRegistered'
                    )}
                  </option>
                  {line.registeredProductBarcodes.map((barcode) => (
                    <option key={barcode} value={barcode}>
                      {barcode}
                    </option>
                  ))}
                </select>
              )}
              <Button
                variant='outline'
                disabled={isSubmitting || isReviewing || !productBarcode.trim()}
                onClick={() =>
                  void readSelectedOutsourceLineBarcodeBeforeConfirmation()
                }
              >
                {isReviewing && (
                  <Loader2 className='mr-2 size-4 animate-spin' />
                )}
                {t('productionOutsourcing.execution.review.read')}
              </Button>
              {reviewError && (
                <p role='alert' className='text-sm text-destructive'>
                  {reviewError}
                </p>
              )}
              {reviewed && (
                <div
                  role='status'
                  className='rounded-md border border-primary/30 bg-primary/5 p-3 text-sm'
                >
                  <p className='font-medium break-all'>
                    {reviewed.productBarcode} · {reviewed.productName}
                  </p>
                  <p>
                    {t('productionOutsourcing.execution.review.currentProcess')}
                    : {reviewed.processName || '-'} ·{' '}
                    {t(
                      `productionExecution.statuses.${reviewed.status}` as TranslationKey
                    )}
                  </p>
                  <p>
                    {t('productionOutsourcing.execution.review.available')}:{' '}
                    {reviewed.availableQuantity} {reviewed.uom}
                  </p>
                  <p className='mt-2'>
                    {isInspection
                      ? t(
                          'productionOutsourcing.execution.review.inspectionDestination',
                          {
                            process: destination
                              ? `${
                                  destination.routeCompleted
                                    ? t(
                                        'productionOutsourcing.execution.review.routeCompleted'
                                      )
                                    : destination.processName
                                } · ${t(`productionExecution.statuses.${destination.status}` as TranslationKey)}`
                              : '-',
                          }
                        )
                      : t(
                          activeAction.action === 'send'
                            ? 'productionOutsourcing.execution.review.sendEffect'
                            : 'productionOutsourcing.execution.review.returnEffect'
                        )}
                  </p>
                </div>
              )}
            </div>
            {!isInspection ? (
              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='grid gap-1.5'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {t('productionOutsourcing.execution.fields.sourceCategory')}
                  </span>
                  <select
                    aria-label={t(
                      'productionOutsourcing.execution.fields.sourceCategory'
                    )}
                    value={
                      activeAction.action === 'send'
                        ? sourceCategory
                        : PRODUCTION_OUTSOURCE_CATEGORY
                    }
                    disabled={activeAction.action === 'return'}
                    onChange={(event) => setSourceCategory(event.target.value)}
                    className='h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30'
                  >
                    <option value=''>
                      {t(
                        'productionOutsourcing.execution.placeholders.sourceCategory'
                      )}
                    </option>
                    {activeAction.action === 'return' && (
                      <option value={PRODUCTION_OUTSOURCE_CATEGORY}>
                        {t(
                          'productionOutsourcing.execution.fields.outsourceInProcess'
                        )}
                      </option>
                    )}
                    {activeAction.action === 'send'
                      ? sourceCategoryOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))
                      : null}
                  </select>
                </div>
                <div className='grid gap-1.5'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {t('productionOutsourcing.execution.fields.targetCategory')}
                  </span>
                  <select
                    aria-label={t(
                      'productionOutsourcing.execution.fields.targetCategory'
                    )}
                    value={
                      activeAction.action === 'send'
                        ? PRODUCTION_OUTSOURCE_CATEGORY
                        : targetCategory
                    }
                    disabled={activeAction.action === 'send'}
                    onChange={(event) => setTargetCategory(event.target.value)}
                    className='h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60 dark:bg-input/30'
                  >
                    <option
                      value={
                        activeAction.action === 'send'
                          ? PRODUCTION_OUTSOURCE_CATEGORY
                          : ''
                      }
                    >
                      {activeAction.action === 'send'
                        ? t(
                            'productionOutsourcing.execution.fields.outsourceInProcess'
                          )
                        : t(
                            'productionOutsourcing.execution.placeholders.targetCategory'
                          )}
                    </option>
                    {activeAction.action === 'return'
                      ? targetCategoryOptions.map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))
                      : null}
                  </select>
                </div>
              </div>
            ) : null}
            {!isInspection ? (
              <div className='grid gap-1.5'>
                <span className='text-xs font-medium text-muted-foreground'>
                  {t('productionOutsourcing.execution.fields.batchNo')}
                </span>
                <Input
                  value={batchNo}
                  onChange={(event) => setBatchNo(event.target.value)}
                  placeholder={t(
                    'productionOutsourcing.execution.placeholders.batchNo'
                  )}
                />
              </div>
            ) : null}
            <div className='grid gap-1.5'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('productionOutsourcing.execution.fields.quantity')}
              </span>
              <Input
                type='number'
                aria-label={t(
                  'productionOutsourcing.execution.fields.quantity'
                )}
                min='0'
                step='0.01'
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </div>
            {isInspection ? (
              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='grid gap-1.5'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {t('productionOutsourcing.execution.fields.result')}
                  </span>
                  <select
                    aria-label={t(
                      'productionOutsourcing.execution.fields.result'
                    )}
                    value={result}
                    onChange={(event) => {
                      const next = event.target
                        .value as OutsourceInspectionResult
                      setResult(next)
                      setDisposition(
                        next === 'FAIL'
                          ? 'REWORK'
                          : next === 'CONDITIONAL'
                            ? 'CONCESSION'
                            : 'ACCEPT'
                      )
                    }}
                    className='h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
                  >
                    <option value='PASS'>
                      {t('productionOutsourcing.execution.results.PASS')}
                    </option>
                    <option value='CONDITIONAL'>
                      {t('productionOutsourcing.execution.results.CONDITIONAL')}
                    </option>
                    <option value='FAIL'>
                      {t('productionOutsourcing.execution.results.FAIL')}
                    </option>
                  </select>
                </div>
                <div className='grid gap-1.5'>
                  <span className='text-xs font-medium text-muted-foreground'>
                    {t('productionOutsourcing.execution.fields.disposition')}
                  </span>
                  <select
                    aria-label={t(
                      'productionOutsourcing.execution.fields.disposition'
                    )}
                    value={disposition}
                    onChange={(event) =>
                      setDisposition(
                        event.target.value as OutsourceInspectionDisposition
                      )
                    }
                    className='h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30'
                  >
                    <option value='ACCEPT' disabled={result === 'FAIL'}>
                      {t('productionOutsourcing.execution.dispositions.ACCEPT')}
                    </option>
                    <option value='CONCESSION' disabled={result === 'FAIL'}>
                      {t(
                        'productionOutsourcing.execution.dispositions.CONCESSION'
                      )}
                    </option>
                    <option value='REWORK'>
                      {t('productionOutsourcing.execution.dispositions.REWORK')}
                    </option>
                    <option value='SCRAP'>
                      {t('productionOutsourcing.execution.dispositions.SCRAP')}
                    </option>
                  </select>
                </div>
              </div>
            ) : null}
            <div className='grid gap-1.5'>
              <span className='text-xs font-medium text-muted-foreground'>
                {t('productionOutsourcing.execution.fields.notes')}
              </span>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className='min-h-20'
              />
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            className='rounded-full'
          >
            {t('common.actions.cancel')}
          </Button>
          <Button
            disabled={confirmDisabled}
            onClick={() => {
              if (confirmDisabled) return
              if (isInspection) {
                onSubmit({
                  productBarcode,
                  result,
                  disposition,
                  inspectedQuantity: quantity,
                  uom: line.uom,
                  inspectedAt: '',
                  notes,
                })
                return
              }
              onSubmit({
                productBarcode,
                quantity,
                uom: line.uom,
                occurredAt: '',
                sourceCategory:
                  activeAction.action === 'send'
                    ? sourceCategory
                    : PRODUCTION_OUTSOURCE_CATEGORY,
                targetCategory:
                  activeAction.action === 'send'
                    ? PRODUCTION_OUTSOURCE_CATEGORY
                    : targetCategory,
                batchNo,
                notes,
              })
            }}
            className='rounded-full'
          >
            {isSubmitting ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : null}
            {t(
              `productionOutsourcing.execution.review.confirm${activeAction.action === 'send' ? 'Send' : activeAction.action === 'return' ? 'Return' : 'Inspection'}` as TranslationKey
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
