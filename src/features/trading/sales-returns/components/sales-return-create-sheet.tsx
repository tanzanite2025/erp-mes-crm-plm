/**
 * 销售换货创建抽屉(已有销售订单 + 已有退货单情况下创建调整后的换货)。
 *
 * 流程:
 *   1. 取销售订单原始 lines + 已存在的销售退货 record
 *   2. createAdjustedOrder 把退货数量从订单 lines 中扣除,得到"剩余可换货"基准
 *   3. createLineDraftMap 准备每行的换货输入草稿
 *   4. 用户编辑后调用 createSalesExchange API
 *
 * 容错:
 *   - record 关联的 SalesOrder 已被删除时,createFallbackOrder 用退货数据兜底重建
 *   - 数量不足时阻止创建(运行时校验,后端 + DB 也有兜底)
 *
 * 此组件只负责 UI 呈现 + 表单校验,所有业务计算放在 createAdjustedOrder/createFallbackOrder。
 */
import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
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
import { usePurchaseReturnDictionaryOptions } from '@/features/purchase/orders'
import { DocumentEvidenceManager } from '@/features/sales-document/components/document-evidence-manager'
import type {
  OrderEvidence,
  SalesOrder,
  SalesOrderLine,
} from '@/features/trading/data/schema'
import { useGetSalesReturnSourceOrderDetail } from '@/features/trading/sales/hooks/use-sales-return-queries'
import { useSalesReturnMutations } from '@/features/trading/sales/hooks/use-sales-returns'
import type {
  SalesReturnLine,
  SalesReturnRecord,
} from '@/features/trading/sales/services/sales-return-service'
import {
  resolveSalesReturnLineDisplaySubtitle,
  resolveSalesReturnLineDisplayTitle,
} from '../utils/sales-return-line-display'

interface SalesReturnCreateSheetProps {
  order?: SalesOrder
  record?: SalesReturnRecord
  open: boolean
  onOpenChange: (open: boolean) => void
  mode?: 'create' | 'edit'
  initialValues?: SalesReturnCreateInitialValues
  onCreated?: (returnId: string) => void
  onUpdated?: (returnId: string) => void
}

export type SalesReturnCreateInitialValues = {
  initialLineId?: number
  returnDate?: string
  trackingNo?: string
  carrier?: string
  shippedAt?: string
  logisticsNote?: string
}

type LineDraft = {
  quantity: number
}

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

function createEmptyLineDraft(): LineDraft {
  return { quantity: 0 }
}

function createLineDraftMap(
  lines: SalesReturnLine[]
): Record<number, LineDraft> {
  return lines.reduce<Record<number, LineDraft>>((acc, line) => {
    acc[line.salesOrderLineId] = {
      quantity: line.quantity,
    }
    return acc
  }, {})
}

function createAdjustedOrder(
  order: SalesOrder,
  record: SalesReturnRecord
): SalesOrder {
  const currentLineQtyMap = new Map<number, number>()
  for (const line of record.lines) {
    currentLineQtyMap.set(line.salesOrderLineId, line.quantity)
  }

  return {
    ...order,
    lines: order.lines.map((line) => {
      const currentQty = currentLineQtyMap.get(Number(line.id)) ?? 0
      return {
        ...line,
        returnedQuantity: Math.max(0, line.returnedQuantity - currentQty),
        remainingReturnableQuantity:
          line.remainingReturnableQuantity + currentQty,
      }
    }),
  }
}

function createFallbackOrderLine(
  line: SalesReturnLine,
  returnDate: string
): SalesOrderLine {
  return {
    id: line.salesOrderLineId,
    lineNo: line.lineNo,
    productId: line.productId,
    productModel: line.productModel,
    productCode: line.productCode,
    specification: line.specification,
    productDisplayTitleSnapshot: line.productDisplayTitleSnapshot,
    productDisplaySubtitleSnapshot: line.productDisplaySubtitleSnapshot,
    productDisplayCodeSnapshot: line.productDisplayCodeSnapshot,
    productDisplayFullLabelSnapshot: line.productDisplayFullLabelSnapshot,
    productDisplayStrategyVersionSnapshot:
      line.productDisplayStrategyVersionSnapshot,
    description: line.description,
    qty: line.quantity,
    uom: line.uom,
    price: line.price,
    amount: line.amount,
    deliveredQty: line.quantity,
    customerPartNo: '',
    jobNo: '',
    orderDate: returnDate,
    status: 'Done',
    returnedQuantity: 0,
    remainingReturnableQuantity: line.quantity,
  }
}

function createFallbackOrder(record: SalesReturnRecord): SalesOrder {
  const returnDate = record.returnDate.slice(0, 10)
  return {
    id: record.salesOrderId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    isDeleted: false,
    orderNo: record.salesOrderNo,
    customerName: record.customerName,
    customerId: record.customerId,
    type: 'NORMAL',
    currency: 'CNY',
    exchangeRateSnapshot: 1,
    classification: 'GENERAL',
    status: 'Done',
    amount: record.totalAmount,
    quantity: record.totalQuantity,
    orderDate: returnDate,
    deliveryDate: returnDate,
    lines: record.lines.map((line) =>
      createFallbackOrderLine(line, returnDate)
    ),
    version: 0,
  }
}

export function SalesReturnCreateSheet({
  order,
  record,
  open,
  onOpenChange,
  mode = 'create',
  initialValues,
  onCreated,
  onUpdated,
}: SalesReturnCreateSheetProps) {
  const { t } = useLanguage()
  const sourceOrderQuery = useGetSalesReturnSourceOrderDetail(
    mode === 'edit' ? (record?.salesOrderId ?? '') : ''
  )
  const resolvedOrder = useMemo(() => {
    if (mode === 'edit') {
      if (!record) {
        return undefined
      }
      if (!sourceOrderQuery.data) {
        return createFallbackOrder(record)
      }
      return createAdjustedOrder(sourceOrderQuery.data, record)
    }
    return order
  }, [mode, order, record, sourceOrderQuery.data])
  const formKey = `${mode}-${resolvedOrder?.id || 'empty'}-${record?.id || 'new'}-${open ? 'open' : 'closed'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        showCloseButton
        className='flex h-[min(96vh,980px)] w-[calc(100vw-20px)] max-w-[1440px] flex-col gap-0 overflow-hidden rounded-2xl border-none bg-background p-0 shadow-2xl md:rounded-[28px]'
      >
        {mode === 'edit' && sourceOrderQuery.isLoading ? (
          <div className='flex flex-1 items-center justify-center px-6 py-10'>
            <p className='text-sm font-black text-muted-foreground'>
              {t('trading.salesReturns.editSheet.sourceLoading')}
            </p>
          </div>
        ) : mode === 'edit' && (!resolvedOrder || !record) ? (
          <div className='flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center'>
            <p className='text-sm font-black text-foreground'>
              {t('trading.salesReturns.editSheet.sourceLoadFailed')}
            </p>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              {t('common.actions.close')}
            </Button>
          </div>
        ) : resolvedOrder ? (
          <SalesReturnCreateSheetBody
            key={formKey}
            mode={mode}
            order={resolvedOrder}
            record={record}
            initialValues={initialValues}
            onOpenChange={onOpenChange}
            onCreated={onCreated}
            onUpdated={onUpdated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type SalesReturnCreateSheetBodyProps = {
  mode: 'create' | 'edit'
  order: SalesOrder
  record?: SalesReturnRecord
  initialValues?: SalesReturnCreateInitialValues
  onOpenChange: (open: boolean) => void
  onCreated?: (returnId: string) => void
  onUpdated?: (returnId: string) => void
}

function SalesReturnCreateSheetBody({
  mode,
  order,
  record,
  initialValues,
  onOpenChange,
  onCreated,
  onUpdated,
}: SalesReturnCreateSheetBodyProps) {
  const { t } = useLanguage()
  const { createMutation, patchBodyMutation } = useSalesReturnMutations()
  const issueCategoryQuery =
    usePurchaseReturnDictionaryOptions('issue_category')
  const isEditMode = mode === 'edit' && Boolean(record)
  const [returnDate, setReturnDate] = useState(
    isEditMode && record
      ? record.returnDate.slice(0, 10)
      : (initialValues?.returnDate ?? todayValue())
  )
  const [trackingNo, setTrackingNo] = useState(
    record?.trackingNo ?? initialValues?.trackingNo ?? ''
  )
  const [carrier, setCarrier] = useState(
    record?.carrier ?? initialValues?.carrier ?? ''
  )
  const [shippedAt, setShippedAt] = useState(
    record?.shippedAt
      ? record.shippedAt.slice(0, 16)
      : (initialValues?.shippedAt ?? '')
  )
  const [logisticsNote, setLogisticsNote] = useState(
    record?.logisticsNote ?? initialValues?.logisticsNote ?? ''
  )
  const [issueCategory, setIssueCategory] = useState(
    record?.issueCategory ?? ''
  )
  const [reason, setReason] = useState(record?.reason ?? '')
  const [remarks, setRemarks] = useState(record?.remarks ?? '')
  const [evidences, setEvidences] = useState<OrderEvidence[]>(
    record?.evidences ?? []
  )
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>(
    record?.lines.map((line) => line.salesOrderLineId) ??
      (typeof initialValues?.initialLineId === 'number'
        ? [initialValues.initialLineId]
        : [])
  )
  const [activeLineId, setActiveLineId] = useState<number | null>(null)
  const [lineDrafts, setLineDrafts] = useState<Record<number, LineDraft>>(
    record
      ? createLineDraftMap(record.lines)
      : typeof initialValues?.initialLineId === 'number'
        ? { [initialValues.initialLineId]: createEmptyLineDraft() }
        : {}
  )

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
      returnableLines.filter((line) => !selectedLineIdSet.has(Number(line.id))),
    [returnableLines, selectedLineIdSet]
  )

  const selectedDraftLines = useMemo(
    () =>
      selectedLineIds
        .map((lineId) => {
          const line = returnableLines.find(
            (item) => Number(item.id) === lineId
          )
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
    () =>
      selectedDraftLines.reduce((sum, { draft }) => sum + draft.quantity, 0),
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
      (issueCategoryQuery.data ?? []).filter(
        (item) => item.status !== 'Inactive'
      ),
    [issueCategoryQuery.data]
  )
  const detailFieldsGridClassName =
    issueCategoryOptions.length > 0
      ? 'grid gap-2 border-b border-dashed border-border/60 px-4 py-2 md:grid-cols-2 lg:grid-cols-[160px_180px_minmax(0,1fr)_minmax(0,1fr)]'
      : 'grid gap-2 border-b border-dashed border-border/60 px-4 py-2 md:grid-cols-2 lg:grid-cols-[160px_minmax(0,1fr)_minmax(0,1fr)]'

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
    setSelectedLineIds((prev) =>
      prev.includes(lineId) ? prev : [...prev, lineId]
    )
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

    if (isEditMode && record) {
      patchBodyMutation.mutate(
        {
          salesReturnId: record.id,
          payload: {
            issueCategory: issueCategory.trim() || undefined,
            reason: reason.trim() || undefined,
            remarks: remarks.trim() || undefined,
            evidences: evidences.length > 0 ? evidences : undefined,
            returnDate: new Date(`${returnDate}T00:00:00`).toISOString(),
            lines: payloadLines,
          },
        },
        {
          onSuccess: (data) => {
            onOpenChange(false)
            onUpdated?.(data.id)
          },
        }
      )
      return
    }

    createMutation.mutate(
      {
        salesOrderId: order.id,
        payload: {
          returnDate: new Date(`${returnDate}T00:00:00`).toISOString(),
          trackingNo: trackingNo.trim() || undefined,
          carrier: carrier.trim() || undefined,
          shippedAt: toIsoDateTimeValue(shippedAt),
          logisticsNote: logisticsNote.trim() || undefined,
          issueCategory: issueCategory.trim() || undefined,
          reason: reason.trim() || undefined,
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
          {isEditMode
            ? t('trading.salesReturns.editSheet.title')
            : t('trading.salesReturns.createSheet.title')}
        </DialogTitle>
        <DialogDescription className='text-[11px] font-bold text-muted-foreground'>
          {isEditMode && record
            ? t('trading.salesReturns.editSheet.description', {
                orderNo: order.orderNo,
              })
            : t('trading.salesReturns.createSheet.description', {
                orderNo: order.orderNo,
              })}
        </DialogDescription>
      </DialogHeader>

      <div className='flex min-h-0 flex-1 flex-col overflow-hidden'>
        <div className='min-h-0 flex-1 overflow-y-auto'>
          <div className='overflow-x-auto border-b border-dashed border-border/60 px-4 py-2.5'>
            <div className='flex min-w-[920px] items-stretch gap-2'>
              {isEditMode && record ? (
                <div className='min-w-0 flex-1 rounded-2xl border border-dashed border-muted/50 bg-muted/10 px-3 py-2'>
                  <div className='flex min-h-[44px] items-center justify-between gap-3'>
                    <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                      {t('trading.salesReturns.editSheet.summaryReturnNo')}
                    </p>
                    <p className='truncate text-right text-sm font-black'>
                      {record.returnNo}
                    </p>
                  </div>
                </div>
              ) : null}
              <div className='min-w-0 flex-1 rounded-2xl border border-dashed border-muted/50 bg-muted/10 px-3 py-2'>
                <div className='flex min-h-[44px] items-center justify-between gap-3'>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {t('trading.salesReturns.createSheet.summaryOrderNo')}
                  </p>
                  <p className='truncate text-right text-sm font-black'>
                    {order.orderNo}
                  </p>
                </div>
              </div>
              <div className='min-w-0 flex-1 rounded-2xl border border-dashed border-muted/50 bg-muted/10 px-3 py-2'>
                <div className='flex min-h-[44px] items-center justify-between gap-3'>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    {t('trading.salesReturns.createSheet.summaryCustomer')}
                  </p>
                  <p className='truncate text-right text-sm font-black'>
                    {order.customerName}
                  </p>
                </div>
              </div>
              <div className='min-w-[150px] rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 px-3 py-2'>
                <div className='flex min-h-[44px] items-center justify-between gap-3'>
                  <p className='text-[10px] font-black tracking-widest text-amber-600/60 uppercase'>
                    {t('trading.salesReturns.createSheet.summarySelectedLines')}
                  </p>
                  <p className='text-base font-black text-amber-600 italic'>
                    {selectedLineCount}
                  </p>
                </div>
              </div>
              <div className='min-w-[150px] rounded-2xl border border-dashed border-rose-500/20 bg-rose-500/5 px-3 py-2'>
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
                    {t(
                      'trading.salesReturns.createSheet.availableLinesDescription'
                    )}
                  </p>
                </div>
                <div className='divide-y divide-dashed divide-border/60'>
                  {availableLines.length === 0 ? (
                    <div className='px-4 py-6 text-center text-[11px] font-bold text-muted-foreground'>
                      {t(
                        'trading.salesReturns.createSheet.availableLinesEmpty'
                      )}
                    </div>
                  ) : (
                    availableLines.map((line) => {
                      const lineId = Number(line.id)
                      return (
                        <div
                          key={lineId}
                          className='flex items-start justify-between gap-3 px-4 py-3'
                        >
                          <div className='min-w-0'>
                            <p className='text-sm font-black text-foreground'>
                              {resolveSalesReturnLineDisplayTitle(line)}
                            </p>
                            <p className='mt-0.5 text-xs leading-4.5 font-bold text-muted-foreground'>
                              {resolveSalesReturnLineDisplaySubtitle(line)}
                            </p>
                            <div className='mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-muted-foreground'>
                              <span>
                                {t('trading.salesReturns.createSheet.lineNo')}{' '}
                                {line.lineNo}
                              </span>
                              <span>
                                {t('trading.salesReturns.createSheet.orderQty')}{' '}
                                {line.qty.toLocaleString()} {line.uom}
                              </span>
                              <span>
                                {t(
                                  'trading.salesReturns.createSheet.returnedQty'
                                )}{' '}
                                {line.returnedQuantity.toLocaleString()}{' '}
                                {line.uom}
                              </span>
                              <span className='text-emerald-600'>
                                {t(
                                  'trading.salesReturns.createSheet.remainingQty'
                                )}{' '}
                                {line.remainingReturnableQuantity.toLocaleString()}{' '}
                                {line.uom}
                              </span>
                              <span>
                                {t('trading.salesReturns.createSheet.price')} ¥{' '}
                                {line.price.toLocaleString()}
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
                    {t(
                      'trading.salesReturns.createSheet.selectedLinesDescription'
                    )}
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
                                {resolveSalesReturnLineDisplayTitle(line)}
                              </p>
                              <p className='mt-0.5 text-xs leading-4.5 font-bold text-muted-foreground'>
                                {resolveSalesReturnLineDisplaySubtitle(line)}
                              </p>
                              <div className='mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-muted-foreground'>
                                <span>
                                  {t('trading.salesReturns.createSheet.lineNo')}{' '}
                                  {line.lineNo}
                                </span>
                                <span>
                                  {t(
                                    'trading.salesReturns.createSheet.returnedQty'
                                  )}{' '}
                                  {line.returnedQuantity.toLocaleString()}{' '}
                                  {line.uom}
                                </span>
                                <span className='text-emerald-600'>
                                  {t(
                                    'trading.salesReturns.createSheet.remainingQty'
                                  )}{' '}
                                  {line.remainingReturnableQuantity.toLocaleString()}{' '}
                                  {line.uom}
                                </span>
                                <span>
                                  {t('trading.salesReturns.createSheet.price')}{' '}
                                  ¥ {line.price.toLocaleString()}
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

          {!isEditMode ? (
            <div className='grid gap-2 border-b border-dashed border-border/60 px-4 py-2 md:grid-cols-2 lg:grid-cols-3'>
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
              <div className='space-y-1.5 md:col-span-2 lg:col-span-3'>
                <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  {t('trading.salesReturns.createSheet.logisticsNote')}
                </label>
                <Textarea
                  value={logisticsNote}
                  onChange={(event) => setLogisticsNote(event.target.value)}
                  placeholder={t(
                    'trading.salesReturns.createSheet.logisticsNotePlaceholder'
                  )}
                  rows={1}
                  className='min-h-[36px] rounded-xl'
                />
              </div>
            </div>
          ) : null}
          <div className={detailFieldsGridClassName}>
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
            <div className='space-y-1.5'>
              <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('trading.salesReturns.createSheet.reason')}
              </label>
              <Textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={t(
                  'trading.salesReturns.createSheet.reasonPlaceholder'
                )}
                rows={1}
                className='min-h-[36px] rounded-xl'
              />
            </div>
            <div className='space-y-1.5'>
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
                disabled={
                  createMutation.isPending || patchBodyMutation.isPending
                }
              >
                {createMutation.isPending || patchBodyMutation.isPending
                  ? t('common.actions.loading')
                  : isEditMode
                    ? t('trading.salesReturns.editSheet.submit')
                    : t('trading.salesReturns.createSheet.submit')}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </div>
    </>
  )
}
