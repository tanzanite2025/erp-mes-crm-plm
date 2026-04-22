import { Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DocumentEvidenceManager } from '@/features/sales-document/components/document-evidence-manager'
import type { OrderEvidence, SalesOrder } from '@/features/trading/data/schema'
import { usePurchaseReturnDictionaryOptions } from '@/features/trading/purchase/hooks/use-purchase-return-dictionaries'
import type { SalesReturnTransportMode } from '@/features/trading/sales/contracts/sales-return-api-dto'
import { useSalesReturnMutations } from '@/features/trading/sales/hooks/use-sales-returns'

interface SalesReturnCreateSheetProps {
  order?: SalesOrder
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (returnId: string) => void
}

type LineDraft = {
  quantity: number
}

const salesReturnTransportModeOptions: SalesReturnTransportMode[] = [
  'Courier',
  'Other',
]

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function toIsoDateTimeValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  return new Date(trimmed).toISOString()
}

function getSalesReturnTransportModeLabel(
  mode: SalesReturnTransportMode,
  t: ReturnType<typeof useLanguage>['t']
) {
  switch (mode) {
    case 'Courier':
      return t('trading.salesReturns.transportModes.Courier')
    case 'Other':
      return t('trading.salesReturns.transportModes.Other')
    default:
      return mode
  }
}

function createEmptyLineDraft(): LineDraft {
  return { quantity: 0 }
}

export function SalesReturnCreateSheet({
  order,
  open,
  onOpenChange,
  onCreated,
}: SalesReturnCreateSheetProps) {
  const formKey = `${order?.id || 'empty'}-${open ? 'open' : 'closed'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        showCloseButton
        className='flex h-[min(96vh,980px)] w-[calc(100vw-20px)] max-w-[1440px] flex-col gap-0 overflow-hidden rounded-2xl border-none bg-background p-0 shadow-2xl md:rounded-[28px]'
      >
        {order ? (
          <SalesReturnCreateSheetBody
            key={formKey}
            order={order}
            onOpenChange={onOpenChange}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type SalesReturnCreateSheetBodyProps = {
  order: SalesOrder
  onOpenChange: (open: boolean) => void
  onCreated?: (returnId: string) => void
}

function SalesReturnCreateSheetBody({
  order,
  onOpenChange,
  onCreated,
}: SalesReturnCreateSheetBodyProps) {
  const { t } = useLanguage()
  const { createMutation } = useSalesReturnMutations()
  const issueCategoryQuery = usePurchaseReturnDictionaryOptions('issue_category')
  const [returnDate, setReturnDate] = useState(todayValue())
  const [transportMode, setTransportMode] =
    useState<SalesReturnTransportMode>('Courier')
  const [trackingNo, setTrackingNo] = useState('')
  const [carrier, setCarrier] = useState('')
  const [shippedAt, setShippedAt] = useState('')
  const [issueCategory, setIssueCategory] = useState('')
  const [remarks, setRemarks] = useState('')
  const [evidences, setEvidences] = useState<OrderEvidence[]>([])
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>([])
  const [activeLineId, setActiveLineId] = useState<number | null>(null)
  const [lineDrafts, setLineDrafts] = useState<Record<number, LineDraft>>({})

  const lines = useMemo(
    () => (order.lines ?? []).filter((line) => typeof line.id === 'number'),
    [order.lines]
  )
  const returnableLines = useMemo(
    () => lines.filter((line) => line.remainingReturnableQuantity > 0),
    [lines]
  )
  const selectedLineIdSet = useMemo(
    () => new Set(selectedLineIds),
    [selectedLineIds]
  )
  const availableLines = useMemo(
    () =>
      returnableLines.filter(
        (line) => !selectedLineIdSet.has(Number(line.id))
      ),
    [returnableLines, selectedLineIdSet]
  )

  const selectedDraftLines = useMemo(
    () =>
      selectedLineIds
        .map((lineId) => {
          const line = returnableLines.find((item) => Number(item.id) === lineId)
          if (!line) {
            return null
          }
          return {
            line,
            draft: lineDrafts[lineId] ?? createEmptyLineDraft(),
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    [lineDrafts, returnableLines, selectedLineIds]
  )

  const selectedLineCount = selectedDraftLines.length
  const totalQuantity = useMemo(
    () => selectedDraftLines.reduce((sum, { draft }) => sum + draft.quantity, 0),
    [selectedDraftLines]
  )
  const estimatedAmount = useMemo(
    () =>
      selectedDraftLines.reduce(
        (sum, { line, draft }) => sum + draft.quantity * (line.price || 0),
        0
      ),
    [selectedDraftLines]
  )
  const issueCategoryOptions = useMemo(
    () =>
      (issueCategoryQuery.data ?? []).filter((item) => item.status !== 'Inactive'),
    [issueCategoryQuery.data]
  )

  const updateLineQuantity = (
    lineId: number,
    rawValue: string,
    maxQty: number
  ) => {
    const parsed = Number(rawValue)
    const nextQuantity = Number.isFinite(parsed)
      ? Math.max(0, Math.min(maxQty, parsed))
      : 0

    setLineDrafts((prev) => ({
      ...prev,
      [lineId]: {
        ...(prev[lineId] ?? createEmptyLineDraft()),
        quantity: nextQuantity,
      },
    }))
  }

  const addLine = (lineId: number) => {
    setSelectedLineIds((prev) => (prev.includes(lineId) ? prev : [...prev, lineId]))
    setLineDrafts((prev) => ({
      ...prev,
      [lineId]: prev[lineId] ?? createEmptyLineDraft(),
    }))
  }

  const removeLine = (lineId: number) => {
    setSelectedLineIds((prev) => prev.filter((id) => id !== lineId))
    setActiveLineId((current) => (current === lineId ? null : current))
    setLineDrafts((prev) => {
      if (!(lineId in prev)) {
        return prev
      }

      const next = { ...prev }
      delete next[lineId]
      return next
    })
  }

  const handleSubmit = () => {
    const payloadLines = selectedDraftLines
      .filter(
        ({ line, draft }) => typeof line.id === 'number' && draft.quantity > 0
      )
      .map(({ line, draft }) => ({
        salesOrderLineId: Number(line.id),
        quantity: Number(draft.quantity),
        price: line.price || 0,
      }))

    if (payloadLines.length === 0) {
      toast.warning(t('trading.salesReturns.createSheet.emptyLinesTitle'), {
        description: t(
          'trading.salesReturns.createSheet.emptyLinesDescription'
        ),
      })
      return
    }

    createMutation.mutate(
      {
        salesOrderId: order.id,
        payload: {
          returnDate: new Date(`${returnDate}T00:00:00`).toISOString(),
          transportMode,
          trackingNo: trackingNo.trim() || undefined,
          carrier: carrier.trim() || undefined,
          shippedAt: toIsoDateTimeValue(shippedAt),
          issueCategory: issueCategory.trim() || undefined,
          remarks: remarks.trim() || undefined,
          evidences: evidences.length > 0 ? evidences : undefined,
          lines: payloadLines,
        },
      },
      {
        onSuccess: (data) => {
          onOpenChange(false)
          onCreated?.(data.salesReturn.id)
        },
      }
    )
  }

  return (
    <>
      <DialogHeader className='border-b border-dashed border-border/70 px-4 py-4 text-left'>
        <DialogTitle className='text-base font-black tracking-tight'>
          {t('trading.salesReturns.createSheet.title')}
        </DialogTitle>
        <DialogDescription className='text-[11px] font-bold text-muted-foreground'>
          {t('trading.salesReturns.createSheet.description', {
            orderNo: order.orderNo,
          })}
        </DialogDescription>
      </DialogHeader>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <div className='min-h-0 flex-1 overflow-y-auto'>
        <div className='grid gap-2 border-b border-dashed border-border/60 px-4 py-2.5 md:grid-cols-4'>
          <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 px-3 py-2'>
            <div className='flex min-h-[44px] items-center justify-between gap-3'>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('trading.salesReturns.createSheet.summaryOrderNo')}
              </p>
              <p className='truncate text-right text-sm font-black'>{order.orderNo}</p>
            </div>
          </div>
          <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 px-3 py-2'>
            <div className='flex min-h-[44px] items-center justify-between gap-3'>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('trading.salesReturns.createSheet.summaryCustomer')}
              </p>
              <p className='truncate text-right text-sm font-black'>{order.customerName}</p>
            </div>
          </div>
          <div className='rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 px-3 py-2'>
            <div className='flex min-h-[44px] items-center justify-between gap-3'>
              <p className='text-[10px] font-black tracking-widest text-amber-600/60 uppercase'>
                {t('trading.salesReturns.createSheet.summarySelectedLines')}
              </p>
              <p className='text-base font-black text-amber-600 italic'>
                {selectedLineCount}
              </p>
            </div>
          </div>
          <div className='rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/5 px-3 py-2'>
            <div className='flex min-h-[44px] items-center justify-between gap-3'>
              <p className='text-[10px] font-black tracking-widest text-rose-600/60 uppercase'>
                {t('trading.salesReturns.createSheet.summaryQuantity')}
              </p>
              <p className='text-base font-black text-rose-600 italic'>
                {totalQuantity.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className='px-4 py-2.5'>
          <div>
            <p className='text-sm font-black'>
              {t('trading.salesReturns.createSheet.linesTitle')}
            </p>
            <p className='text-[11px] font-bold text-muted-foreground'>
              {t('trading.salesReturns.createSheet.linesDescription')}
            </p>
          </div>
        </div>

        <div className='px-4 pb-3'>
          <div className='grid gap-3 xl:grid-cols-2'>
            <div className='overflow-hidden rounded-[24px] border border-dashed border-border/70 bg-background/80 shadow-sm'>
              <div className='border-b border-dashed border-border/70 px-4 py-3'>
                <p className='text-sm font-black text-foreground'>
                  {t('trading.salesReturns.createSheet.availableLinesTitle')}
                </p>
                <p className='mt-0.5 text-[11px] font-bold text-muted-foreground'>
                  {t('trading.salesReturns.createSheet.availableLinesDescription')}
                </p>
              </div>
              <div className='divide-y divide-dashed divide-border/60'>
                {availableLines.length === 0 ? (
                  <div className='px-4 py-6 text-center text-[11px] font-bold text-muted-foreground'>
                    {t('trading.salesReturns.createSheet.availableLinesEmpty')}
                  </div>
                ) : (
                  availableLines.map((line) => {
                    const lineId = Number(line.id)
                    return (
                      <div key={lineId} className='flex items-start justify-between gap-3 px-4 py-3'>
                        <div className='min-w-0'>
                          <p className='text-sm font-black text-foreground'>
                            {line.productCode || line.productModel || `Line ${line.lineNo}`}
                          </p>
                          <p className='mt-0.5 text-xs leading-4.5 font-bold text-muted-foreground'>
                            {line.specification || line.description || '--'}
                          </p>
                          <div className='mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-muted-foreground'>
                            <span>
                              {t('trading.salesReturns.createSheet.lineNo')} {line.lineNo}
                            </span>
                            <span>
                              {t('trading.salesReturns.createSheet.orderQty')} {line.qty.toLocaleString()} {line.uom}
                            </span>
                            <span>
                              {t('trading.salesReturns.createSheet.returnedQty')} {line.returnedQuantity.toLocaleString()} {line.uom}
                            </span>
                            <span className='text-emerald-600'>
                              {t('trading.salesReturns.createSheet.remainingQty')} {line.remainingReturnableQuantity.toLocaleString()} {line.uom}
                            </span>
                            <span>
                              {t('trading.salesReturns.createSheet.price')} ¥ {line.price.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='shrink-0 rounded-full'
                          onClick={() => addLine(lineId)}
                        >
                          <Plus className='mr-1 size-3.5' />
                          {t('trading.salesReturns.createSheet.addLine')}
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div className='overflow-hidden rounded-[24px] border border-dashed border-border/70 bg-background/80 shadow-sm'>
              <div className='border-b border-dashed border-border/70 px-4 py-3'>
                <p className='text-sm font-black text-foreground'>
                  {t('trading.salesReturns.createSheet.selectedLinesTitle')}
                </p>
                <p className='mt-0.5 text-[11px] font-bold text-muted-foreground'>
                  {t('trading.salesReturns.createSheet.selectedLinesDescription')}
                </p>
              </div>
              <div className='divide-y divide-dashed divide-border/60'>
                {selectedDraftLines.length === 0 ? (
                  <div className='px-4 py-6 text-center text-[11px] font-bold text-muted-foreground'>
                    {t('trading.salesReturns.createSheet.selectedLinesEmpty')}
                  </div>
                ) : (
                  selectedDraftLines.map(({ line, draft }) => {
                    const lineId = Number(line.id)
                    const isActive = activeLineId === lineId
                    const isEdited = draft.quantity > 0
                    return (
                      <div
                        key={lineId}
                        className={`px-4 py-3 transition-all ${
                          isActive
                            ? 'bg-primary/6 shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
                            : isEdited
                              ? 'bg-emerald-500/5'
                              : 'hover:bg-muted/5'
                        }`}
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <p className='text-sm font-black text-foreground'>
                              {line.productCode || line.productModel || `Line ${line.lineNo}`}
                            </p>
                            <p className='mt-0.5 text-xs leading-4.5 font-bold text-muted-foreground'>
                              {line.specification || line.description || '--'}
                            </p>
                            <div className='mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-muted-foreground'>
                              <span>
                                {t('trading.salesReturns.createSheet.lineNo')} {line.lineNo}
                              </span>
                              <span>
                                {t('trading.salesReturns.createSheet.returnedQty')} {line.returnedQuantity.toLocaleString()} {line.uom}
                              </span>
                              <span className='text-emerald-600'>
                                {t('trading.salesReturns.createSheet.remainingQty')} {line.remainingReturnableQuantity.toLocaleString()} {line.uom}
                              </span>
                              <span>
                                {t('trading.salesReturns.createSheet.price')} ¥ {line.price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='shrink-0 rounded-full px-2 text-muted-foreground hover:text-foreground'
                            onClick={() => removeLine(lineId)}
                          >
                            <X className='mr-1 size-3.5' />
                            {t('trading.salesReturns.createSheet.removeLine')}
                          </Button>
                        </div>
                        <div className='mt-2.5 flex items-center justify-end gap-3'>
                          <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                            {t('trading.salesReturns.createSheet.returnQty')}
                          </label>
                          <div
                            className={`rounded-[18px] border px-2 py-1.5 shadow-sm transition-all ${
                              isActive
                                ? 'border-primary/35 bg-primary/7 ring-2 ring-primary/12'
                                : isEdited
                                  ? 'border-emerald-500/25 bg-emerald-500/6'
                                  : 'border-primary/15 bg-primary/3 focus-within:border-primary/35 focus-within:bg-primary/5 focus-within:ring-2 focus-within:ring-primary/10'
                            }`}
                          >
                            <Input
                              type='number'
                              min={0}
                              max={line.remainingReturnableQuantity}
                              step='0.01'
                              value={
                                draft.quantity === 0
                                  ? ''
                                  : String(draft.quantity)
                              }
                              onChange={(event) =>
                                updateLineQuantity(
                                  lineId,
                                  event.target.value,
                                  line.remainingReturnableQuantity
                                )
                              }
                              onFocus={() => setActiveLineId(lineId)}
                              onBlur={() => {
                                setActiveLineId((current) =>
                                  current === lineId ? null : current
                                )
                              }}
                              placeholder='0'
                              className='h-9 w-[128px] border-none bg-transparent px-1.5 text-right font-black tabular-nums shadow-none focus-visible:ring-0'
                              disabled={line.remainingReturnableQuantity <= 0}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='grid gap-2 border-b border-dashed border-border/60 px-4 py-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6'>
          <div className='space-y-1.5'>
            <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('trading.salesReturns.createSheet.returnDate')}
            </label>
            <Input
              type='date'
              value={returnDate}
              onChange={(event) => setReturnDate(event.target.value)}
              className='h-9 rounded-xl'
            />
          </div>
          <div className='space-y-1.5'>
            <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('trading.salesReturns.createSheet.transportMode')}
            </label>
            <Select
              value={transportMode}
              onValueChange={(value) =>
                setTransportMode(value as SalesReturnTransportMode)
              }
            >
              <SelectTrigger className='h-9 rounded-xl'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {salesReturnTransportModeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {getSalesReturnTransportModeLabel(option, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-1.5'>
            <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('trading.salesReturns.createSheet.trackingNo')}
            </label>
            <Input
              value={trackingNo}
              onChange={(event) => setTrackingNo(event.target.value)}
              placeholder={t(
                'trading.salesReturns.createSheet.trackingNoPlaceholder'
              )}
              className='h-9 rounded-xl'
            />
          </div>
          <div className='space-y-1.5'>
            <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('trading.salesReturns.createSheet.carrier')}
            </label>
            <Input
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              placeholder={t(
                'trading.salesReturns.createSheet.carrierPlaceholder'
              )}
              className='h-9 rounded-xl'
            />
          </div>
          <div className='space-y-1.5'>
            <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('trading.salesReturns.createSheet.shippedAt')}
            </label>
            <Input
              type='datetime-local'
              value={shippedAt}
              onChange={(event) => setShippedAt(event.target.value)}
              className='h-9 rounded-xl'
            />
          </div>
          {issueCategoryOptions.length > 0 ? (
            <div className='space-y-1.5'>
              <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('trading.salesReturns.createSheet.issueCategory')}
              </label>
              <Select value={issueCategory} onValueChange={setIssueCategory}>
                <SelectTrigger className='h-9 rounded-xl'>
                  <SelectValue
                    placeholder={t(
                      'trading.salesReturns.createSheet.issueCategoryPlaceholder'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {issueCategoryOptions.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className='space-y-1.5 md:col-span-2 lg:col-span-4 xl:col-span-6'>
            <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('trading.salesReturns.createSheet.remarks')}
            </label>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder={t(
                'trading.salesReturns.createSheet.remarksPlaceholder'
              )}
              rows={1}
              className='min-h-[36px] rounded-xl'
            />
          </div>
        </div>

        <div className='border-b border-dashed border-border/60 px-4 py-2.5'>
          <div className='rounded-[20px] border border-dashed border-border/70 bg-background/80 p-2 shadow-sm'>
            <DocumentEvidenceManager
              evidences={evidences}
              onChange={setEvidences}
              enableCameraCapture
              compact
              title={t('trading.salesReturns.createSheet.evidenceTitle')}
              hint=''
              emptyText={t('trading.salesReturns.createSheet.evidenceEmpty')}
              uploadActionText={t(
                'trading.salesReturns.createSheet.evidenceUploadAction'
              )}
              cameraActionText={t(
                'trading.salesReturns.createSheet.evidenceCameraAction'
              )}
              noteLabel={t(
                'trading.salesReturns.createSheet.evidenceNoteLabel'
              )}
              notePlaceholder={t(
                'trading.salesReturns.createSheet.evidenceNotePlaceholder'
              )}
              uploadSuccessText={t(
                'trading.salesReturns.createSheet.evidenceUploadSuccess'
              )}
              uploadFailedText={t(
                'trading.salesReturns.createSheet.evidenceUploadFailed'
              )}
            />
          </div>
        </div>
        </div>

        <DialogFooter className='border-t border-dashed border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='text-left'>
            <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
              {t('trading.salesReturns.createSheet.estimatedAmount')}
            </p>
            <p className='mt-0.5 text-base font-black'>
              ¥ {estimatedAmount.toLocaleString()}
            </p>
          </div>
          <div className='flex items-center justify-end gap-2'>
            <div className='text-left'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
              >
                {t('common.actions.cancel')}
              </Button>
              <Button
                type='button'
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? t('common.actions.loading')
                  : t('trading.salesReturns.createSheet.submit')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </div>
    </>
  )
}
