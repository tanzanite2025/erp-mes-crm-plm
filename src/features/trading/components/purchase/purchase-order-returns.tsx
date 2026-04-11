import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ClipboardMinus,
  Filter,
  ImageIcon,
  Loader2,
  PackageSearch,
  PackageX,
  Printer,
  RotateCcw,
  Search,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { useReactToPrint } from 'react-to-print'
import { ForbiddenState } from '@/components/forbidden-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { isForbiddenError } from '@/lib/error-status'
import { getStaticEvidenceUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import { getPurchaseStatusLabel, getPurchaseStatusMeta } from '../../data/purchase-status'
import type { OrderEvidence, PurchaseOrder } from '../../data/schema'
import {
  type PurchaseReturnRecord,
  useGetPurchaseOrders,
  usePurchaseReturnDictionaryOptions,
  useGetPurchaseReturns,
  usePurchaseReturnMutations,
} from '../../purchase'
import { PurchaseReturnEvidenceManager } from './purchase-return-evidence-manager'
import { PurchaseReturnPrint } from './purchase-return-print'

interface ReturnLineDraft {
  quantity: number
  issueCategory: string
  reason: string
  evidences: OrderEvidence[]
}

const todayValue = () => new Date().toISOString().slice(0, 10)

function formatDate(value?: string) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function formatMetric(value: number) {
  return Number(value || 0).toLocaleString()
}

function getRemainingQty(order: PurchaseOrder, lineId?: number) {
  const line = order.lines.find((item) => item.id === lineId)
  if (!line) return 0
  return Math.max((line.qty || 0) - (line.receivedQty || 0) - (line.returnedQty || 0), 0)
}

function getPendingLines(order?: PurchaseOrder) {
  if (!order) return []
  return order.lines.filter((line) => line.id && getRemainingQty(order, line.id) > 0)
}

function createEmptyLineDraft(): ReturnLineDraft {
  return {
    quantity: 0,
    issueCategory: '',
    reason: '',
    evidences: [],
  }
}

function EvidencePreviewGrid({ evidences }: { evidences?: OrderEvidence[] }) {
  if (!evidences || evidences.length === 0) return null

  return (
    <div className='flex flex-wrap gap-2'>
      {evidences.map((evidence) => (
        <a
          key={evidence.id}
          href={getStaticEvidenceUrl(evidence.url)}
          target='_blank'
          rel='noreferrer'
          className='overflow-hidden rounded-xl border bg-background'
        >
          <img
            src={getStaticEvidenceUrl(evidence.url)}
            alt={evidence.name}
            className='size-16 object-cover transition-transform duration-300 hover:scale-105'
          />
        </a>
      ))}
    </div>
  )
}

export function PurchaseOrderReturns() {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const ordersQuery = useGetPurchaseOrders(1, 100)
  const returnsQuery = useGetPurchaseReturns(1, 100)
  const returnReasonQuery = usePurchaseReturnDictionaryOptions('return_reason')
  const issueCategoryQuery = usePurchaseReturnDictionaryOptions('issue_category')
  const { createMutation } = usePurchaseReturnMutations()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [returnDate, setReturnDate] = useState(todayValue())
  const [issueCategory, setIssueCategory] = useState('')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [evidences, setEvidences] = useState<OrderEvidence[]>([])
  const [historyOrderNo, setHistoryOrderNo] = useState('')
  const [lineDrafts, setLineDrafts] = useState<Record<number, ReturnLineDraft>>({})
  const [recordToPrint, setRecordToPrint] = useState<PurchaseReturnRecord | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const orders = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data?.items])
  const records = useMemo(() => returnsQuery.data?.items ?? [], [returnsQuery.data?.items])
  const returnReasonOptions = useMemo(
    () => (returnReasonQuery.data ?? []).filter((item) => item.status !== 'Inactive'),
    [returnReasonQuery.data]
  )
  const issueCategoryOptions = useMemo(
    () => (issueCategoryQuery.data ?? []).filter((item) => item.status !== 'Inactive'),
    [issueCategoryQuery.data]
  )

  const eligibleOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          (order.status === 'Sent' || order.status === 'Awaiting') &&
          order.lines.some((line) => getRemainingQty(order, line.id) > 0)
      ),
    [orders]
  )

  const normalizedSearch = searchValue.trim().toLowerCase()
  const filteredEligibleOrders = useMemo(() => {
    if (!normalizedSearch) return eligibleOrders
    return eligibleOrders.filter((order) =>
      [order.orderNo, order.supplierName, order.purchaser]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    )
  }, [eligibleOrders, normalizedSearch])

  const selectedOrder = useMemo(() => {
    const exactMatch =
      filteredEligibleOrders.find((item) => item.id === selectedOrderId) ||
      eligibleOrders.find((item) => item.id === selectedOrderId)
    return exactMatch ?? filteredEligibleOrders[0] ?? eligibleOrders[0]
  }, [eligibleOrders, filteredEligibleOrders, selectedOrderId])

  useEffect(() => {
    if (!selectedOrderId && selectedOrder) {
      setSelectedOrderId(selectedOrder.id)
    }
  }, [selectedOrder, selectedOrderId])

  useEffect(() => {
    if (!isDialogOpen || !selectedOrder) return
    setSelectedOrderId(selectedOrder.id)
  }, [isDialogOpen, selectedOrder])

  useEffect(() => {
    if (!selectedOrder) {
      setLineDrafts({})
      return
    }

    setLineDrafts((prev) => {
      const nextDrafts: Record<number, ReturnLineDraft> = {}
      getPendingLines(selectedOrder).forEach((line) => {
        if (!line.id) return
        nextDrafts[line.id] = prev[line.id] ?? createEmptyLineDraft()
      })
      return nextDrafts
    })
  }, [selectedOrder?.id])

  const reactToPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: recordToPrint ? `${recordToPrint.returnNo}_purchase_return` : 'purchase_return',
    onAfterPrint: () => setRecordToPrint(null),
  })

  useEffect(() => {
    if (!recordToPrint) return
    const timer = window.setTimeout(() => {
      reactToPrint()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [reactToPrint, recordToPrint])

  const selectedPendingLines = useMemo(() => getPendingLines(selectedOrder), [selectedOrder])

  const draftSummary = useMemo(() => {
    if (!selectedOrder) {
      return { selectedLines: 0, totalQty: 0, totalAmount: 0 }
    }

    return selectedPendingLines.reduce(
      (summary, line) => {
        if (!line.id) return summary
        const draftQty = Math.min(
          Math.max(Number(lineDrafts[line.id]?.quantity || 0), 0),
          getRemainingQty(selectedOrder, line.id)
        )
        if (draftQty <= 0) return summary

        summary.selectedLines += 1
        summary.totalQty += draftQty
        summary.totalAmount += draftQty * (line.price || 0)
        return summary
      },
      { selectedLines: 0, totalQty: 0, totalAmount: 0 }
    )
  }, [lineDrafts, selectedOrder, selectedPendingLines])

  const groupedEligibleOrders = useMemo(() => {
    const supplierMap = new Map<
      string,
      {
        supplierName: string
        groups: Array<{ status: string; orders: PurchaseOrder[] }>
      }
    >()

    filteredEligibleOrders.forEach((order) => {
      const supplierKey = order.supplierName || '未指定供应商'
      const supplierEntry = supplierMap.get(supplierKey) ?? {
        supplierName: supplierKey,
        groups: [],
      }
      let statusGroup = supplierEntry.groups.find((item) => item.status === order.status)
      if (!statusGroup) {
        statusGroup = { status: order.status, orders: [] }
        supplierEntry.groups.push(statusGroup)
      }
      statusGroup.orders.push(order)
      supplierMap.set(supplierKey, supplierEntry)
    })

    return Array.from(supplierMap.values()).sort((a, b) => a.supplierName.localeCompare(b.supplierName))
  }, [filteredEligibleOrders])

  const visibleRecords = useMemo(() => {
    const normalized = historyOrderNo.trim().toLowerCase()
    if (normalized) {
      return records.filter((record) => record.purchaseOrderNo.toLowerCase().includes(normalized))
    }
    if (!selectedOrder) return records
    const matched = records.filter((record) => record.purchaseOrderId === selectedOrder.id)
    return matched.length > 0 ? matched : records
  }, [historyOrderNo, records, selectedOrder])

  const totalReturnedAmount = useMemo(
    () => records.reduce((sum, item) => sum + (Number(item.totalAmount) || 0), 0),
    [records]
  )

  const totalReturnedQty = useMemo(
    () => records.reduce((sum, item) => sum + (Number(item.totalQuantity) || 0), 0),
    [records]
  )

  const totalPendingLineCount = useMemo(
    () => eligibleOrders.reduce((sum, order) => sum + getPendingLines(order).length, 0),
    [eligibleOrders]
  )

  const resetDialog = () => {
    setReturnDate(todayValue())
    setIssueCategory('')
    setReason('')
    setRemarks('')
    setEvidences([])
    setLineDrafts({})
  }

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      resetDialog()
    }
  }

  const updateLineDraft = (lineId: number, patch: Partial<ReturnLineDraft>) => {
    setLineDrafts((prev) => ({
      ...prev,
      [lineId]: {
        ...createEmptyLineDraft(),
        ...prev[lineId],
        ...patch,
      },
    }))
  }

  const fillLineRemaining = (lineId: number) => {
    if (!selectedOrder) return
    updateLineDraft(lineId, { quantity: getRemainingQty(selectedOrder, lineId) })
  }

  const clearLineDraft = (lineId: number) => {
    updateLineDraft(lineId, createEmptyLineDraft())
  }

  const fillAllRemaining = () => {
    if (!selectedOrder) return
    setLineDrafts((prev) => {
      const next = { ...prev }
      selectedPendingLines.forEach((line) => {
        if (!line.id) return
        next[line.id] = {
          quantity: getRemainingQty(selectedOrder, line.id),
          issueCategory: prev[line.id]?.issueCategory || '',
          reason: prev[line.id]?.reason || '',
          evidences: prev[line.id]?.evidences || [],
        }
      })
      return next
    })
  }

  const clearAllDrafts = () => {
    setLineDrafts((prev) => {
      const next = { ...prev }
      selectedPendingLines.forEach((line) => {
        if (!line.id) return
        next[line.id] = {
          ...createEmptyLineDraft(),
        }
      })
      return next
    })
  }

  const handleSubmit = () => {
    if (!selectedOrder) return
    const lines = Object.entries(lineDrafts)
      .map(([key, value]) => ({
        purchaseOrderLineId: Number(key),
        quantity: Number(value.quantity || 0),
        price: selectedOrder.lines.find((line) => line.id === Number(key))?.price || 0,
        issueCategory: value.issueCategory.trim() || issueCategory || undefined,
        reason: value.reason.trim() || undefined,
        evidences: value.evidences,
      }))
      .filter((item) => item.quantity > 0)

    if (lines.length === 0) return

    createMutation.mutate(
      {
        purchaseOrderId: selectedOrder.id,
        payload: {
          issueCategory: issueCategory || undefined,
          reason: reason.trim() || undefined,
          remarks: remarks.trim() || undefined,
          evidences,
          returnDate: new Date(`${returnDate}T00:00:00`).toISOString(),
          lines,
        },
      },
      {
        onSuccess: () => {
          handleOpenChange(false)
        },
      }
    )
  }

  if (
    ordersQuery.isLoading ||
    returnsQuery.isLoading ||
    returnReasonQuery.isLoading ||
    issueCategoryQuery.isLoading
  ) {
    return (
      <div className='flex h-[55vh] flex-col items-center justify-center gap-3 opacity-70'>
        <Loader2 className='size-8 animate-spin text-primary' />
        <p className='text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground'>
          {t('purchase.orders.returns.loading')}
        </p>
      </div>
    )
  }

  if (
    isForbiddenError(ordersQuery.error) ||
    isForbiddenError(returnsQuery.error) ||
    isForbiddenError(returnReasonQuery.error) ||
    isForbiddenError(issueCategoryQuery.error)
  ) {
    return <ForbiddenState />
  }

  const selectedStatusMeta = selectedOrder ? getPurchaseStatusMeta(selectedOrder.status) : null

  return (
    <div className='space-y-6'>
      <div className='hidden'>{recordToPrint ? <PurchaseReturnPrint ref={printRef} record={recordToPrint} /> : null}</div>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className='max-w-5xl rounded-[28px] border-none p-0 shadow-2xl'>
          <div className='max-h-[88vh] overflow-y-auto p-6 md:p-8'>
            <DialogHeader className='text-left'>
              <DialogTitle className='flex items-center gap-2 text-base font-black uppercase tracking-widest'>
                <RotateCcw className='size-4 text-primary' />
                {t('purchase.orders.returns.createTitle')}
              </DialogTitle>
              <DialogDescription className='text-[11px] font-bold text-muted-foreground'>
                {t('purchase.orders.returns.createDescription')}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder ? (
              <div className='mt-6 grid gap-4 md:grid-cols-4'>
                <Card className='rounded-[24px] border-none bg-muted/20 shadow-none'>
                  <CardContent className='p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('purchase.orders.detailStats.orderNo')}
                    </p>
                    <p className='mt-2 text-sm font-black'>{selectedOrder.orderNo}</p>
                  </CardContent>
                </Card>
                <Card className='rounded-[24px] border-none bg-muted/20 shadow-none'>
                  <CardContent className='p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('purchase.orders.detailFields.supplier')}
                    </p>
                    <p className='mt-2 text-sm font-black'>{selectedOrder.supplierName}</p>
                  </CardContent>
                </Card>
                <Card className='rounded-[24px] border-none bg-amber-500/5 shadow-none'>
                  <CardContent className='p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-amber-600/60'>
                      {t('purchase.orders.returns.pendingLines')}
                    </p>
                    <p className='mt-2 text-2xl font-black italic text-amber-600'>
                      {selectedPendingLines.length}
                    </p>
                  </CardContent>
                </Card>
                <Card className='rounded-[24px] border-none bg-rose-500/5 shadow-none'>
                  <CardContent className='p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-rose-600/60'>
                      {t('purchase.orders.returns.pendingQty')}
                    </p>
                    <p className='mt-2 text-2xl font-black italic text-rose-600'>
                      {formatMetric(
                        selectedPendingLines.reduce(
                          (sum, line) => sum + (line.id ? getRemainingQty(selectedOrder, line.id) : 0),
                          0
                        )
                      )}
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            <div className='mt-6 grid gap-4 md:grid-cols-3'>
              <div className='space-y-1.5 md:col-span-2'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('purchase.orders.returns.order')}
                </Label>
                <Select value={selectedOrder?.id || ''} onValueChange={setSelectedOrderId}>
                  <SelectTrigger className='h-11 rounded-2xl'>
                    <SelectValue placeholder={t('purchase.orders.returns.selectOrder')} />
                  </SelectTrigger>
                  <SelectContent className='rounded-2xl'>
                    {eligibleOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.orderNo} | {order.supplierName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('purchase.orders.returns.date')}
                </Label>
                <Input
                  type='date'
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className='h-11 rounded-2xl'
                />
              </div>
            </div>

            <div className='mt-4 grid gap-4 md:grid-cols-3'>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('purchase.orders.returns.reason')}
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className='h-11 rounded-2xl'>
                    <SelectValue placeholder={t('purchase.orders.returns.reasonPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className='rounded-2xl'>
                    {returnReasonOptions.map((option) => (
                      <SelectItem key={option.code} value={option.name}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('purchase.orders.returns.issueCategory')}
                </Label>
                <Select value={issueCategory} onValueChange={setIssueCategory}>
                  <SelectTrigger className='h-11 rounded-2xl'>
                    <SelectValue placeholder={t('purchase.orders.returns.issueCategoryPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent className='rounded-2xl'>
                    {issueCategoryOptions.map((option) => (
                      <SelectItem key={option.code} value={option.name}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5 md:col-span-1'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('purchase.orders.returns.remarks')}
                </Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={t('purchase.orders.returns.remarksPlaceholder')}
                  className='min-h-11 rounded-2xl'
                />
              </div>
            </div>

            <div className='mt-4'>
              <PurchaseReturnEvidenceManager
                evidences={evidences}
                onChange={setEvidences}
                title={t('purchase.orders.returns.evidenceTitle')}
                hint={t('purchase.orders.returns.evidenceHint')}
                empty={t('purchase.orders.returns.evidenceEmpty')}
                cameraAction={t('purchase.orders.returns.cameraAction')}
                uploadAction={t('purchase.orders.returns.uploadAction')}
                maxReachedText={t('purchase.orders.returns.evidenceLimitReached')}
                uploadFailedText={t('purchase.orders.returns.evidenceUploadFailed')}
                noteLabel={t('purchase.orders.returns.photoNote')}
                notePlaceholder={t('purchase.orders.returns.photoNotePlaceholder')}
                locationLabel={t('purchase.orders.returns.photoLocation')}
                locationPlaceholder={t('purchase.orders.returns.photoLocationPlaceholder')}
                defectPartLabel={t('purchase.orders.returns.photoDefectPart')}
                defectPartPlaceholder={t('purchase.orders.returns.photoDefectPartPlaceholder')}
              />
            </div>

            <div className='mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-dashed border-muted/40 bg-muted/10 px-4 py-3'>
              <div>
                <p className='text-[11px] font-black uppercase tracking-widest'>
                  {t('purchase.orders.returns.draftSummary')}
                </p>
                <p className='mt-1 text-[10px] font-bold text-muted-foreground'>
                  {t('purchase.orders.returns.selectedLines')}: {draftSummary.selectedLines} ·{' '}
                  {t('purchase.orders.returns.totalQty')}: {formatMetric(draftSummary.totalQty)} ·{' '}
                  {t('purchase.orders.returns.estimatedAmount')}: {formatMetric(draftSummary.totalAmount)}
                </p>
              </div>
              <div className='flex flex-wrap gap-2'>
                <Button variant='outline' onClick={fillAllRemaining} className='rounded-full'>
                  <RotateCcw className='mr-2 size-4' />
                  {t('purchase.orders.returns.fillAll')}
                </Button>
                <Button variant='ghost' onClick={clearAllDrafts} className='rounded-full'>
                  <XCircle className='mr-2 size-4' />
                  {t('purchase.orders.returns.clearAll')}
                </Button>
              </div>
            </div>

            <ScrollArea className='mt-4 h-[360px] pr-4'>
              <div className='space-y-3'>
                {selectedPendingLines.map((line) => {
                  const remainingQty = getRemainingQty(selectedOrder!, line.id)
                  const draft = lineDrafts[line.id!] ?? createEmptyLineDraft()
                  const amountPreview = Number(draft.quantity || 0) * Number(line.price || 0)

                  return (
                    <Card key={line.id} className='rounded-[24px] border-dashed shadow-none'>
                      <CardContent className='space-y-4 p-5'>
                        <div className='flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between'>
                          <div>
                            <p className='text-[12px] font-black'>{line.materialName}</p>
                            <p className='mt-1 text-[10px] font-bold text-muted-foreground'>
                              {line.materialCode} | {line.specification}
                            </p>
                          </div>
                          <div className='flex flex-wrap gap-2'>
                            <Badge variant='outline' className='rounded-full px-3 py-1 text-[9px] font-black uppercase'>
                              {t('purchase.orders.returns.remainingQty')}: {formatMetric(remainingQty)}
                            </Badge>
                            <Badge variant='outline' className='rounded-full px-3 py-1 text-[9px] font-black uppercase'>
                              {t('purchase.orders.detailReceivedQty')}: {formatMetric(line.receivedQty || 0)}
                            </Badge>
                            <Badge variant='outline' className='rounded-full px-3 py-1 text-[9px] font-black uppercase'>
                              {t('purchase.orders.returns.alreadyReturned')}: {formatMetric(line.returnedQty || 0)}
                            </Badge>
                          </div>
                        </div>

                        <div className='grid gap-4 md:grid-cols-5'>
                          <div className='space-y-1.5'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                              {t('purchase.orders.returns.returnQty')}
                            </Label>
                            <Input
                              type='number'
                              min={0}
                              max={remainingQty}
                              step='0.01'
                              value={draft.quantity}
                              onChange={(e) =>
                                updateLineDraft(line.id!, {
                                  quantity: Math.min(Number(e.target.value || 0), remainingQty),
                                })
                              }
                              className='h-11 rounded-2xl'
                            />
                          </div>
                          <div className='space-y-1.5'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                              {t('purchase.orders.detailPrice')}
                            </Label>
                            <div className='flex h-11 items-center rounded-2xl border bg-muted/20 px-3 text-sm font-black text-primary'>
                              {formatMetric(line.price || 0)}
                            </div>
                          </div>
                          <div className='space-y-1.5'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                              {t('purchase.orders.returns.issueCategory')}
                            </Label>
                            <Select
                              value={draft.issueCategory}
                              onValueChange={(value) => updateLineDraft(line.id!, { issueCategory: value })}
                            >
                              <SelectTrigger className='h-11 rounded-2xl'>
                                <SelectValue placeholder={t('purchase.orders.returns.issueCategoryPlaceholder')} />
                              </SelectTrigger>
                              <SelectContent className='rounded-2xl'>
                                {issueCategoryOptions.map((option) => (
                                  <SelectItem key={option.code} value={option.name}>
                                    {option.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className='space-y-1.5'>
                            <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                              {t('purchase.orders.detailAmount')}
                            </Label>
                            <div className='flex h-11 items-center rounded-2xl border bg-muted/20 px-3 text-sm font-black'>
                              {formatMetric(amountPreview)}
                            </div>
                          </div>
                          <div className='flex items-end gap-2'>
                            <Button
                              type='button'
                              variant='outline'
                              onClick={() => fillLineRemaining(line.id!)}
                              className='h-11 flex-1 rounded-2xl'
                            >
                              {t('purchase.orders.returns.fillRemaining')}
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              onClick={() => clearLineDraft(line.id!)}
                              className='h-11 rounded-2xl px-4'
                            >
                              {t('purchase.orders.returns.clearLine')}
                            </Button>
                          </div>
                        </div>

                        <div className='space-y-1.5'>
                          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                            {t('purchase.orders.returns.lineReason')}
                          </Label>
                          <Input
                            value={draft.reason}
                            onChange={(e) => updateLineDraft(line.id!, { reason: e.target.value })}
                            placeholder={t('purchase.orders.returns.lineReasonPlaceholder')}
                            className='h-11 rounded-2xl'
                          />
                        </div>

                        <PurchaseReturnEvidenceManager
                          evidences={draft.evidences}
                          onChange={(next) => updateLineDraft(line.id!, { evidences: next })}
                          title={t('purchase.orders.returns.lineEvidenceTitle')}
                          hint={t('purchase.orders.returns.lineEvidenceHint')}
                          empty={t('purchase.orders.returns.lineEvidenceEmpty')}
                          cameraAction={t('purchase.orders.returns.cameraAction')}
                          uploadAction={t('purchase.orders.returns.uploadAction')}
                          maxReachedText={t('purchase.orders.returns.evidenceLimitReached')}
                          uploadFailedText={t('purchase.orders.returns.evidenceUploadFailed')}
                          noteLabel={t('purchase.orders.returns.photoNote')}
                          notePlaceholder={t('purchase.orders.returns.photoNotePlaceholder')}
                          locationLabel={t('purchase.orders.returns.photoLocation')}
                          locationPlaceholder={t('purchase.orders.returns.photoLocationPlaceholder')}
                          defectPartLabel={t('purchase.orders.returns.photoDefectPart')}
                          defectPartPlaceholder={t('purchase.orders.returns.photoDefectPartPlaceholder')}
                          maxCount={6}
                        />
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </ScrollArea>

            <div className='mt-4 flex items-start gap-3 rounded-[24px] border border-dashed border-amber-500/30 bg-amber-500/5 p-4 text-amber-700'>
              <ShieldAlert className='mt-0.5 size-4 shrink-0' />
              <p className='text-[11px] font-bold leading-6'>{t('purchase.orders.returns.tip')}</p>
            </div>

            <div className='mt-4 flex flex-col justify-between gap-4 rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4 md:flex-row md:items-center'>
              <div>
                <p className='text-[10px] font-black uppercase tracking-widest text-primary/60'>
                  {t('purchase.orders.returns.draftSummary')}
                </p>
                <p className='mt-1 text-sm font-black text-primary'>
                  {formatMetric(draftSummary.totalQty)} / {formatMetric(draftSummary.totalAmount)}
                </p>
              </div>
              <div className='flex justify-end gap-3'>
                <Button variant='ghost' onClick={() => handleOpenChange(false)} className='rounded-2xl'>
                  {t('purchase.orders.receiptDialogCancel')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedOrder || createMutation.isPending || draftSummary.selectedLines === 0}
                  className='rounded-2xl'
                >
                  {createMutation.isPending ? (
                    <Loader2 className='mr-2 size-4 animate-spin' />
                  ) : (
                    <RotateCcw className='mr-2 size-4' />
                  )}
                  {t('purchase.orders.returns.submit')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className='grid gap-4 md:grid-cols-4'>
        <Card className='rounded-[28px] border-none bg-emerald-500/5 shadow-sm'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-emerald-600/60'>
              {t('purchase.orders.returns.eligibleOrders')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tight text-emerald-600'>
              {eligibleOrders.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className='rounded-[28px] border-none bg-amber-500/5 shadow-sm'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-amber-600/60'>
              {t('purchase.orders.returns.pendingLines')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tight text-amber-600'>
              {totalPendingLineCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className='rounded-[28px] border-none bg-rose-500/5 shadow-sm'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-rose-600/60'>
              {t('purchase.orders.returns.totalQty')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tight text-rose-600'>
              {formatMetric(totalReturnedQty)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className='rounded-[28px] border-none bg-blue-500/5 shadow-sm'>
          <CardHeader className='pb-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-blue-600/60'>
              {t('purchase.orders.returns.totalAmount')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tight text-blue-600'>
              {formatMetric(totalReturnedAmount)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className='grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]'>
        <Card className='rounded-[32px] border-dashed border-muted/40 bg-muted/5 shadow-none'>
          <CardHeader className='gap-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <CardTitle className='text-sm font-black uppercase tracking-widest'>
                  {t('purchase.orders.returns.availableOrders')}
                </CardTitle>
                <CardDescription className='mt-1 text-[11px] font-bold text-muted-foreground'>
                  {t('purchase.orders.returns.availableOrdersDescription')}
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  if (!allowsAction('action_trading_purchase_order_manage')) return
                  setIsDialogOpen(true)
                }}
                disabled={eligibleOrders.length === 0}
                className='rounded-full px-5'
              >
                <PackageX className='mr-2 size-4' />
                {t('purchase.orders.returns.createAction')}
              </Button>
            </div>

            <div className='relative'>
              <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50' />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder={t('purchase.orders.searchPlaceholder')}
                className='h-11 rounded-2xl pl-10'
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredEligibleOrders.length === 0 ? (
              <div className='rounded-[24px] border border-dashed border-amber-500/20 bg-amber-500/5 px-4 py-6 text-center text-[11px] font-bold text-amber-700'>
                <ClipboardMinus className='mx-auto mb-3 size-5' />
                {t('purchase.orders.returns.noEligibleOrders')}
              </div>
            ) : (
              <ScrollArea className='h-[520px] pr-4'>
                <div className='space-y-5'>
                  {groupedEligibleOrders.map((supplierGroup) => (
                    <div key={supplierGroup.supplierName} className='space-y-3'>
                      <div className='flex items-center gap-2 rounded-[18px] bg-background/70 px-3 py-2'>
                        <Filter className='size-3.5 text-primary' />
                        <p className='text-[11px] font-black uppercase tracking-widest'>
                          {supplierGroup.supplierName}
                        </p>
                      </div>
                      {supplierGroup.groups.map((statusGroup) => {
                        const orderStatusMeta = getPurchaseStatusMeta(statusGroup.status)
                        return (
                          <div key={`${supplierGroup.supplierName}-${statusGroup.status}`} className='space-y-2'>
                            <div className='flex items-center gap-2 px-1'>
                              <Badge className={orderStatusMeta?.color}>
                                {getPurchaseStatusLabel(statusGroup.status, t)}
                              </Badge>
                              <span className='text-[10px] font-bold text-muted-foreground'>
                                {statusGroup.orders.length}
                              </span>
                            </div>
                            {statusGroup.orders.map((order) => {
                              const pendingLines = getPendingLines(order)
                              const pendingQty = pendingLines.reduce(
                                (sum, line) => sum + (line.id ? getRemainingQty(order, line.id) : 0),
                                0
                              )

                              return (
                                <button
                                  key={order.id}
                                  type='button'
                                  onClick={() => setSelectedOrderId(order.id)}
                                  className={cn(
                                    'w-full rounded-[24px] border border-dashed p-4 text-left transition-all',
                                    selectedOrder?.id === order.id
                                      ? 'border-primary/30 bg-primary/5 shadow-sm'
                                      : 'border-muted/40 bg-background hover:border-primary/20 hover:bg-muted/20'
                                  )}
                                >
                                  <div className='flex items-center justify-between gap-3'>
                                    <div>
                                      <p className='text-[12px] font-black'>{order.orderNo}</p>
                                      <p className='mt-1 text-[10px] font-bold text-muted-foreground'>
                                        {order.purchaser || t('purchase.orders.notSet')}
                                      </p>
                                    </div>
                                    <span className='text-[10px] font-bold text-muted-foreground'>
                                      {order.expectedDate || '--'}
                                    </span>
                                  </div>

                                  <div className='mt-4 grid grid-cols-2 gap-3'>
                                    <div>
                                      <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>
                                        {t('purchase.orders.returns.pendingLines')}
                                      </p>
                                      <p className='mt-1 text-sm font-black text-amber-600'>{pendingLines.length}</p>
                                    </div>
                                    <div>
                                      <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>
                                        {t('purchase.orders.returns.pendingQty')}
                                      </p>
                                      <p className='mt-1 text-sm font-black text-rose-600'>{formatMetric(pendingQty)}</p>
                                    </div>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <div className='space-y-6'>
          {selectedOrder ? (
            <Card className='rounded-[32px] border-none shadow-sm'>
              <CardHeader className='gap-4'>
                <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                  <div>
                    <CardTitle className='text-base font-black uppercase tracking-widest'>
                      {t('purchase.orders.returns.selectedOrder')}
                    </CardTitle>
                    <CardDescription className='mt-1 text-[11px] font-bold text-muted-foreground'>
                      {selectedOrder.orderNo} · {selectedOrder.supplierName}
                    </CardDescription>
                  </div>
                  <div className='flex items-center gap-3'>
                    <Badge className={selectedStatusMeta?.color}>
                      {getPurchaseStatusLabel(selectedOrder.status, t)}
                    </Badge>
                    <Button
                      onClick={() => {
                        if (!allowsAction('action_trading_purchase_order_manage')) return
                        setIsDialogOpen(true)
                      }}
                      className='rounded-full px-5'
                    >
                      <RotateCcw className='mr-2 size-4' />
                      {t('purchase.orders.returns.createAction')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='grid gap-4 md:grid-cols-4'>
                  <div className='rounded-[24px] bg-muted/20 p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('purchase.orders.detailFields.supplier')}
                    </p>
                    <p className='mt-2 text-sm font-black'>{selectedOrder.supplierName}</p>
                  </div>
                  <div className='rounded-[24px] bg-muted/20 p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('purchase.orders.detailFields.purchaser')}
                    </p>
                    <p className='mt-2 text-sm font-black'>{selectedOrder.purchaser || t('purchase.orders.notSet')}</p>
                  </div>
                  <div className='rounded-[24px] bg-muted/20 p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('purchase.orders.detailStats.expectedArrival')}
                    </p>
                    <p className='mt-2 text-sm font-black'>{selectedOrder.expectedDate || '--'}</p>
                  </div>
                  <div className='rounded-[24px] bg-muted/20 p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                      {t('purchase.orders.detailStats.totalAmount')}
                    </p>
                    <p className='mt-2 text-sm font-black text-primary'>
                      {formatMetric(selectedOrder.amount)} {selectedOrder.currency}
                    </p>
                  </div>
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='rounded-[24px] border border-dashed border-amber-500/30 bg-amber-500/5 p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-amber-700/60'>
                      {t('purchase.orders.returns.pendingLines')}
                    </p>
                    <p className='mt-2 text-2xl font-black italic text-amber-700'>{selectedPendingLines.length}</p>
                  </div>
                  <div className='rounded-[24px] border border-dashed border-rose-500/30 bg-rose-500/5 p-4'>
                    <p className='text-[10px] font-black uppercase tracking-widest text-rose-700/60'>
                      {t('purchase.orders.returns.pendingQty')}
                    </p>
                    <p className='mt-2 text-2xl font-black italic text-rose-700'>
                      {formatMetric(
                        selectedPendingLines.reduce(
                          (sum, line) => sum + (line.id ? getRemainingQty(selectedOrder, line.id) : 0),
                          0
                        )
                      )}
                    </p>
                  </div>
                </div>

                <div className='space-y-3'>
                  {selectedPendingLines.map((line) => (
                    <div
                      key={line.id}
                      className='flex flex-col gap-4 rounded-[24px] border border-dashed border-muted/40 p-4 md:flex-row md:items-center md:justify-between'
                    >
                      <div>
                        <p className='text-[12px] font-black'>{line.materialName}</p>
                        <p className='mt-1 text-[10px] font-bold text-muted-foreground'>
                          {line.materialCode} | {line.specification}
                        </p>
                      </div>
                      <div className='grid grid-cols-3 gap-4 md:w-[360px]'>
                        <div className='text-right'>
                          <p className='text-[10px] font-black text-muted-foreground/50'>
                            {t('purchase.orders.detailQty')}
                          </p>
                          <p className='mt-1 text-sm font-black'>{formatMetric(line.qty)}</p>
                        </div>
                        <div className='text-right'>
                          <p className='text-[10px] font-black text-muted-foreground/50'>
                            {t('purchase.orders.returns.alreadyReturned')}
                          </p>
                          <p className='mt-1 text-sm font-black text-rose-600'>{formatMetric(line.returnedQty || 0)}</p>
                        </div>
                        <div className='text-right'>
                          <p className='text-[10px] font-black text-muted-foreground/50'>
                            {t('purchase.orders.returns.remainingQty')}
                          </p>
                          <p className='mt-1 text-sm font-black text-primary'>
                            {formatMetric(line.id ? getRemainingQty(selectedOrder, line.id) : 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className='rounded-[32px] border-dashed bg-muted/5 shadow-none'>
              <CardContent className='flex min-h-[320px] flex-col items-center justify-center gap-3 text-center'>
                <PackageSearch className='size-10 text-muted-foreground/30' />
                <p className='text-[12px] font-black uppercase tracking-widest'>
                  {t('purchase.orders.returns.empty')}
                </p>
                <p className='max-w-md text-[11px] font-bold leading-6 text-muted-foreground'>
                  {t('purchase.orders.returns.emptyDescription')}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className='rounded-[32px] border-dashed border-muted/40 bg-muted/5 shadow-none'>
            <CardHeader>
              <CardTitle className='text-sm font-black uppercase tracking-widest'>
                {t('purchase.orders.returns.recentRecords')}
              </CardTitle>
              <CardDescription className='text-[11px] font-bold text-muted-foreground'>
                {t('purchase.orders.returns.recentRecordsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='mb-4 flex flex-col gap-3 rounded-[24px] border border-dashed border-muted/40 bg-background/70 p-4 md:flex-row md:items-center'>
                <div className='relative flex-1'>
                  <Search className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50' />
                  <Input
                    value={historyOrderNo}
                    onChange={(e) => setHistoryOrderNo(e.target.value)}
                    placeholder={t('purchase.orders.returns.historySearchPlaceholder')}
                    className='h-11 rounded-2xl pl-10'
                  />
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    variant='outline'
                    className='rounded-full'
                    onClick={() => setHistoryOrderNo(selectedOrder?.orderNo || '')}
                    disabled={!selectedOrder}
                  >
                    {t('purchase.orders.returns.viewCurrentOrderHistory')}
                  </Button>
                  <Button variant='ghost' className='rounded-full' onClick={() => setHistoryOrderNo('')}>
                    {t('purchase.orders.returns.viewAllHistory')}
                  </Button>
                </div>
              </div>

              {visibleRecords.length === 0 ? (
                <div className='flex min-h-[220px] flex-col items-center justify-center gap-3 text-center'>
                  <AlertCircle className='size-8 text-muted-foreground/30' />
                  <p className='text-[12px] font-black uppercase tracking-widest'>
                    {t('purchase.orders.returns.empty')}
                  </p>
                  <p className='max-w-md text-[11px] font-bold leading-6 text-muted-foreground'>
                    {t('purchase.orders.returns.emptyDescription')}
                  </p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {visibleRecords.map((record) => (
                    <Card key={record.id} className='rounded-[28px] border-dashed bg-background shadow-none'>
                      <CardContent className='space-y-4 p-5'>
                        <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                          <div>
                            <div className='flex items-center gap-3'>
                              <p className='text-[13px] font-black'>{record.returnNo}</p>
                              <Badge className='border-rose-500/20 bg-rose-500/10 text-rose-600'>
                                {record.status}
                              </Badge>
                              {record.issueCategory ? (
                                <Badge variant='outline' className='border-amber-500/20 bg-amber-500/5 text-amber-700'>
                                  {record.issueCategory}
                                </Badge>
                              ) : null}
                            </div>
                            <p className='mt-1 text-[11px] font-bold text-muted-foreground'>
                              {record.purchaseOrderNo} · {record.supplierName}
                            </p>
                          </div>
                          <div className='text-right text-[11px] font-bold text-muted-foreground'>
                            <p>{formatDate(record.returnDate)}</p>
                            <p className='mt-1 text-primary'>
                              {formatMetric(record.totalQuantity)} / {formatMetric(record.totalAmount)}
                            </p>
                            {record.operator ? (
                              <p className='mt-1 text-[10px] text-muted-foreground'>
                                {t('purchase.orders.returns.operator')}: {record.operator}
                              </p>
                            ) : null}
                            <div className='mt-3 flex justify-end gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                className='rounded-full'
                                onClick={() => setHistoryOrderNo(record.purchaseOrderNo)}
                              >
                                <Search className='mr-1 size-3.5' />
                                {t('purchase.orders.returns.historyAction')}
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                className='rounded-full'
                                onClick={() => setRecordToPrint(record)}
                              >
                                <Printer className='mr-1 size-3.5' />
                                {t('purchase.orders.returns.printAction')}
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
                          {record.lines.map((line) => (
                            <div
                              key={`${record.id}-${line.id}`}
                              className='rounded-[22px] border border-dashed border-primary/10 bg-primary/5 p-4'
                            >
                              <p className='text-[11px] font-black'>{line.materialName}</p>
                              <p className='mt-1 text-[9px] font-bold text-muted-foreground'>
                                {line.materialCode} | {line.specification}
                              </p>
                              <div className='mt-3 flex items-center justify-between text-[10px] font-black'>
                                <span>
                                  {formatMetric(line.quantity)} {line.uom}
                                </span>
                                <span className='text-primary'>{formatMetric(line.amount)}</span>
                              </div>
                              {line.issueCategory ? (
                                <p className='mt-2 text-[10px] font-bold text-amber-700/80'>{line.issueCategory}</p>
                              ) : null}
                              {line.reason ? (
                                <p className='mt-2 text-[10px] font-medium text-muted-foreground'>{line.reason}</p>
                              ) : null}
                              {line.evidences && line.evidences.length > 0 ? (
                                <div className='mt-3 space-y-2'>
                                  <p className='flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground/60'>
                                    <ImageIcon className='size-3.5 text-primary' />
                                    {t('purchase.orders.returns.lineEvidenceTitle')}
                                  </p>
                                  <EvidencePreviewGrid evidences={line.evidences} />
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>

                        {record.evidences && record.evidences.length > 0 ? (
                          <div className='rounded-[22px] border border-dashed border-primary/10 bg-background p-4'>
                            <p className='mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                              <ImageIcon className='size-3.5 text-primary' />
                              {t('purchase.orders.returns.evidenceTitle')}
                            </p>
                            <EvidencePreviewGrid evidences={record.evidences} />
                          </div>
                        ) : null}

                        {record.reason || record.remarks ? (
                          <div className='rounded-[22px] bg-muted/30 p-4 text-[11px] font-medium leading-6 text-muted-foreground'>
                            {record.reason ? <p>{record.reason}</p> : null}
                            {record.remarks ? <p>{record.remarks}</p> : null}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
