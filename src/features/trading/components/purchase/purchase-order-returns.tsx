/**
 * 采购退货管理列表 + 行编辑器(双区:列表 + 表单)。
 *
 * 这是采购退货的主入口,功能包括:
 *   - 列表区: 现有退货单列表 + 状态筛选 + 凭证预览(EvidencePreviewGrid)
 *   - 表单区: 创建新退货单(关联现有采购订单 → 选行 → 填数量/原因 → 上传凭证)
 *
 * 状态展示:
 *   - getPurchaseReturnStatusMeta 把后端 status 字符串映射为 (label, color, icon) 三元组
 *
 * 关键不变量:
 *   - 退货数量 ≤ 采购订单线已收数量(运行时 + DB 兜底)
 *   - 凭证文件支持图片预览,formatDate/formatMetric 集中数值格式化
 *
 * 此组件 1300+ 行偏长,因为列表 + 表单 + 凭证预览三态耦合在同一页;
 * 后续可考虑拆为 PurchaseReturnList / PurchaseReturnEditor / EvidencePreviewGrid 三个独立模块。
 */
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
import {
  type AuditStatusDisplayMeta,
  AuditStatusDisplay,
} from '@/components/common/audit-status-display'
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
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { isForbiddenError } from '@/lib/error-status'
import { auditUtils } from '@/lib/audit-utils'
import { failLoudly } from '@/lib/safe-catch'
import { getStaticEvidenceUrl } from '@/lib/url-utils'
import { cn } from '@/lib/utils'
import {
  getPurchaseOrderPendingLines,
  getPurchaseOrderRemainingQty,
  usePurchaseReturnViewModel,
} from '../../hooks/use-purchase-return-view-model'
import { usePurchaseReturnActions } from '../../hooks/use-purchase-return-actions'
import { getPurchaseStatusDisplayMeta } from '../../data/purchase-status'
import type { OrderEvidence, PurchaseOrder } from '../../data/schema'
import {
  type PurchaseReturnRecord,
  type PurchaseReturnDictionaryItem,
  useGetPurchaseOrdersWithLines,
  usePurchaseReturnDictionaryOptions,
  useGetPurchaseReturns,
  usePurchaseReturnMutations,
} from '../../purchase'
import { PurchaseReturnEvidenceManager } from './purchase-return-evidence-manager'
import { PurchaseReturnPrint } from './purchase-return-print'

const logger = createLogger('PurchaseOrderReturns')

type PurchaseOrderReturnsResource = CompositeReadResource<{
  orders: PurchaseOrder[]
  records: PurchaseReturnRecord[]
  returnReasonOptions: PurchaseReturnDictionaryItem[]
  issueCategoryOptions: PurchaseReturnDictionaryItem[]
}>

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

function createEmptyLineDraft(): ReturnLineDraft {
  return {
    quantity: 0,
    issueCategory: '',
    reason: '',
    evidences: [],
  }
}

function formatStatusText(status: string) {
  return status
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function getPurchaseReturnStatusMeta(status: string, locale: string): AuditStatusDisplayMeta {
  const normalized = status.trim().toUpperCase()

  if (normalized === 'DRAFT') {
    return {
      label: locale === 'zh-CN' ? '待提交' : 'Draft',
      className: 'bg-amber-500/10 text-amber-600 border-amber-200',
      dotClassName: 'bg-amber-500',
    }
  }

  if (normalized === 'CREATED' || normalized === 'OPEN') {
    return {
      label: locale === 'zh-CN' ? '已登记' : 'Registered',
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      dotClassName: 'bg-emerald-500',
    }
  }

  if (normalized === 'SUBMITTED' || normalized === 'CONFIRMED' || normalized === 'POSTED') {
    return {
      label: locale === 'zh-CN' ? '处理中' : 'In Progress',
      className: 'bg-blue-500/10 text-blue-600 border-blue-200',
      dotClassName: 'bg-blue-500',
    }
  }

  if (normalized === 'COMPLETED' || normalized === 'CLOSED' || normalized === 'RETURNED') {
    return {
      label: locale === 'zh-CN' ? '已完成' : 'Completed',
      className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
      dotClassName: 'bg-emerald-500',
    }
  }

  if (normalized === 'CANCELED' || normalized === 'CANCELLED' || normalized === 'VOID' || normalized === 'REJECTED') {
    return {
      label: locale === 'zh-CN' ? '已作废' : 'Voided',
      className: 'bg-rose-500/10 text-rose-600 border-rose-200',
      dotClassName: 'bg-rose-500',
    }
  }

  return {
    label: formatStatusText(status),
    className: 'bg-muted/30 text-muted-foreground border-muted/20',
    dotClassName: 'bg-muted-foreground',
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
  const { t, locale } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const ordersQuery = useGetPurchaseOrdersWithLines(1, 100)
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

  const readResource = useMemo<PurchaseOrderReturnsResource>(() => {
    const ordersFailure = resolveQueryFailure({
      data: ordersQuery.data,
      error: ordersQuery.error,
      isPending: ordersQuery.isPending,
      scope: 'PurchaseOrderReturns.orders',
      missingMessage: '[CRITICAL] Purchase return orders missing after load',
      failureMessage: '[CRITICAL] Purchase return orders query failed',
    })
    if (ordersFailure) {
      return {
        status: 'error',
        error: ordersFailure.error,
        scope: ordersFailure.scope,
      }
    }

    const returnsFailure = resolveQueryFailure({
      data: returnsQuery.data,
      error: returnsQuery.error,
      isPending: returnsQuery.isPending,
      scope: 'PurchaseOrderReturns.records',
      missingMessage: '[CRITICAL] Purchase return records missing after load',
      failureMessage: '[CRITICAL] Purchase return records query failed',
    })
    if (returnsFailure) {
      return {
        status: 'error',
        error: returnsFailure.error,
        scope: returnsFailure.scope,
      }
    }

    const returnReasonFailure = resolveQueryFailure({
      data: returnReasonQuery.data,
      error: returnReasonQuery.error,
      isPending: returnReasonQuery.isPending,
      scope: 'PurchaseOrderReturns.returnReasons',
      missingMessage: '[CRITICAL] Purchase return reason dictionary missing after load',
      failureMessage: '[CRITICAL] Purchase return reason dictionary query failed',
    })
    if (returnReasonFailure) {
      return {
        status: 'error',
        error: returnReasonFailure.error,
        scope: returnReasonFailure.scope,
      }
    }

    const issueCategoryFailure = resolveQueryFailure({
      data: issueCategoryQuery.data,
      error: issueCategoryQuery.error,
      isPending: issueCategoryQuery.isPending,
      scope: 'PurchaseOrderReturns.issueCategories',
      missingMessage: '[CRITICAL] Purchase return issue category dictionary missing after load',
      failureMessage: '[CRITICAL] Purchase return issue category dictionary query failed',
    })
    if (issueCategoryFailure) {
      return {
        status: 'error',
        error: issueCategoryFailure.error,
        scope: issueCategoryFailure.scope,
      }
    }

    if (
      ordersQuery.isPending ||
      returnsQuery.isPending ||
      returnReasonQuery.isPending ||
      issueCategoryQuery.isPending
    ) {
      return { status: 'loading' }
    }

    const ordersData = ordersQuery.data
    const returnsData = returnsQuery.data
    const returnReasonData = returnReasonQuery.data
    const issueCategoryData = issueCategoryQuery.data
    if (!ordersData) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] Purchase return orders missing after load'),
        scope: 'PurchaseOrderReturns.orders',
      }
    }
    if (!returnsData) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] Purchase return records missing after load'),
        scope: 'PurchaseOrderReturns.records',
      }
    }
    if (!returnReasonData) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] Purchase return reason dictionary missing after load'),
        scope: 'PurchaseOrderReturns.returnReasons',
      }
    }
    if (!issueCategoryData) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] Purchase return issue category dictionary missing after load'),
        scope: 'PurchaseOrderReturns.issueCategories',
      }
    }

    return {
      status: 'ready',
      orders: ordersData.items,
      records: returnsData.items,
      returnReasonOptions: returnReasonData.filter((item) => item.status !== 'Inactive'),
      issueCategoryOptions: issueCategoryData.filter((item) => item.status !== 'Inactive'),
    }
  }, [
    issueCategoryQuery.data,
    issueCategoryQuery.error,
    issueCategoryQuery.isPending,
    ordersQuery.data,
    ordersQuery.error,
    ordersQuery.isPending,
    returnReasonQuery.data,
    returnReasonQuery.error,
    returnReasonQuery.isPending,
    returnsQuery.data,
    returnsQuery.error,
    returnsQuery.isPending,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(`Failed to load purchase returns page resources: ${readResource.scope}`, readResource.error)
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  const orders = readResource.status === 'ready' ? readResource.orders : []
  const records = readResource.status === 'ready' ? readResource.records : []
  const returnReasonOptions =
    readResource.status === 'ready' ? readResource.returnReasonOptions : []
  const issueCategoryOptions =
    readResource.status === 'ready' ? readResource.issueCategoryOptions : []

  const {
    draftSummary,
    eligibleOrders,
    eligibleOrderStats,
    filteredEligibleOrders,
    groupedEligibleOrders,
    selectedOrder,
    selectedPendingLines,
    selectedPendingQty,
    totalPendingLineCount,
    totalReturnedAmount,
    totalReturnedQty,
    visibleRecords,
  } = usePurchaseReturnViewModel({
    orders,
    records,
    searchValue,
    historyOrderNo,
    selectedOrderId,
    lineDrafts,
  })

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


    const {
    clearAllDrafts,
    clearLineDraft,
    fillAllRemaining,
    fillLineRemaining,
    handleSubmit,
    updateLineDraft,
  } = usePurchaseReturnActions({
    selectedOrder,
    selectedPendingLines,
    lineDrafts,
    setLineDrafts,
    issueCategory,
    reason,
    remarks,
    evidences,
    returnDate,
    createMutation,
    onCloseDialog: () => handleOpenChange(false),
  })

  const resetDialog = () => {
    setReturnDate(todayValue())
    setIssueCategory('')
    setReason('')
    setRemarks('')
    setEvidences([])
    setLineDrafts({})
  }

  const hydrateLineDraftsForOrder = (orderId: string) => {
    const nextOrder = orders.find((order) => order.id === orderId)
    if (!nextOrder) {
      setLineDrafts({})
      return
    }

    setLineDrafts((prev) => {
      const nextDrafts: Record<number, ReturnLineDraft> = {}
      getPurchaseOrderPendingLines(nextOrder).forEach((line) => {
        if (!line.id) return
        nextDrafts[line.id] = prev[line.id] ?? createEmptyLineDraft()
      })
      return nextDrafts
    })
  }

  const handleSelectedOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId)
    hydrateLineDraftsForOrder(orderId)
  }

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (open) {
      const nextOrderId = selectedOrder?.id || eligibleOrders[0]?.id || ''
      if (nextOrderId) {
        setSelectedOrderId(nextOrderId)
        hydrateLineDraftsForOrder(nextOrderId)
      }
      return
    }

    resetDialog()
  }
  if (readResource.status === 'loading') {
    return (
      <div className='flex h-[55vh] flex-col items-center justify-center gap-3 opacity-70'>
        <Loader2 className='size-8 animate-spin text-primary' />
        <p className='text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground'>
          {t('purchase.orders.returns.loading')}
        </p>
      </div>
    )
  }

  if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
    return <ForbiddenState />
  }

  if (readResource.status === 'error') {
    return (
      <div className='flex h-[55vh] flex-col items-center justify-center gap-4 px-6 text-center'>
        <AlertCircle className='size-8 text-rose-500' />
        <div className='space-y-2'>
          <p className='text-[10px] font-black uppercase tracking-[0.25em] text-rose-700'>
            采购退货数据加载失败
          </p>
          <p className='max-w-2xl text-[11px] font-bold leading-5 text-rose-700/80'>
            {readResource.error.message || '请重试后再处理采购退货。'}
          </p>
        </div>
        <Button
          type='button'
          variant='outline'
          className='h-10 rounded-full border-dashed px-6 text-[10px] font-black uppercase tracking-widest'
          onClick={() => {
            void Promise.all([
              ordersQuery.refetch(),
              returnsQuery.refetch(),
              returnReasonQuery.refetch(),
              issueCategoryQuery.refetch(),
            ]).catch((error) => {
              logger.error('Failed to retry purchase return resources', error)
            })
          }}
        >
          重试
        </Button>
      </div>
    )
  }

  const selectedStatusMeta = selectedOrder ? getPurchaseStatusDisplayMeta(selectedOrder.status, t) : null

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
                      {formatMetric(selectedPendingQty)}
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
                <Select value={selectedOrder?.id || ''} onValueChange={handleSelectedOrderChange}>
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
                <Button
                  variant='outline'
                  onClick={fillAllRemaining}
                  className='h-10 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
                >
                  <RotateCcw className='mr-2 size-4' />
                  {t('purchase.orders.returns.fillAll')}
                </Button>
                <Button
                  variant='ghost'
                  onClick={clearAllDrafts}
                  className='h-10 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
                >
                  <XCircle className='mr-2 size-4' />
                  {t('purchase.orders.returns.clearAll')}
                </Button>
              </div>
            </div>

            <ScrollArea className='mt-4 h-[360px] pr-4'>
              <div className='space-y-3'>
                {selectedPendingLines.map((line) => {
                  const remainingQty = getPurchaseOrderRemainingQty(selectedOrder!, line.id)
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
                              className='h-11 flex-1 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
                            >
                              {t('purchase.orders.returns.fillRemaining')}
                            </Button>
                            <Button
                              type='button'
                              variant='ghost'
                              onClick={() => clearLineDraft(line.id!)}
                              className='h-11 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
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
                <Button
                  variant='ghost'
                  onClick={() => handleOpenChange(false)}
                  className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
                >
                  {t('purchase.orders.receiptDialogCancel')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!selectedOrder || createMutation.isPending || draftSummary.selectedLines === 0}
                  className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
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

      <div className='grid gap-3 md:grid-cols-4'>
        <Card className='gap-0 rounded-[24px] border-none bg-emerald-500/5 py-2.5 shadow-sm'>
          <CardContent className='px-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-emerald-600/60'>
                {t('purchase.orders.returns.eligibleOrders')}
              </p>
              <p className='shrink-0 text-xl font-black italic leading-none tracking-tighter text-emerald-600'>
                {eligibleOrders.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className='gap-0 rounded-[24px] border-none bg-amber-500/5 py-2.5 shadow-sm'>
          <CardContent className='px-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-amber-600/60'>
                {t('purchase.orders.returns.pendingLines')}
              </p>
              <p className='shrink-0 text-xl font-black italic leading-none tracking-tighter text-amber-600'>
                {totalPendingLineCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className='gap-0 rounded-[24px] border-none bg-rose-500/5 py-2.5 shadow-sm'>
          <CardContent className='px-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-rose-600/60'>
                {t('purchase.orders.returns.totalQty')}
              </p>
              <p className='shrink-0 text-xl font-black italic leading-none tracking-tighter text-rose-600'>
                {formatMetric(totalReturnedQty)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className='gap-0 rounded-[24px] border-none bg-blue-500/5 py-2.5 shadow-sm'>
          <CardContent className='px-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-blue-600/60'>
                {t('purchase.orders.returns.totalAmount')}
              </p>
              <p className='shrink-0 text-xl font-black italic leading-none tracking-tighter text-blue-600'>
                {formatMetric(totalReturnedAmount)}
              </p>
            </div>
          </CardContent>
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
                  handleOpenChange(true)
                }}
                disabled={eligibleOrders.length === 0}
                className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
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
                        const orderStatusMeta = getPurchaseStatusDisplayMeta(statusGroup.status, t)
                        return (
                          <div key={`${supplierGroup.supplierName}-${statusGroup.status}`} className='space-y-2'>
                            <div className='flex items-center gap-2 px-1'>
                              <AuditStatusDisplay meta={orderStatusMeta} />
                              <span className='text-[10px] font-bold text-muted-foreground'>
                                {statusGroup.orders.length}
                              </span>
                            </div>
                            {statusGroup.orders.map((order) => {
                              const pendingStats = eligibleOrderStats.get(order.id)
                              const pendingLinesCount = pendingStats?.pendingLinesCount ?? 0
                              const pendingQty = pendingStats?.pendingQty ?? 0

                              return (
                                <button
                                  key={order.id}
                                  type='button'
                                  onClick={() => handleSelectedOrderChange(order.id)}
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
                                      <p className='mt-1 text-sm font-black text-amber-600'>{pendingLinesCount}</p>
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
                    {selectedStatusMeta ? <AuditStatusDisplay meta={selectedStatusMeta} /> : null}
                    <Button
                      onClick={() => {
                        if (!allowsAction('action_trading_purchase_order_manage')) return
                        handleOpenChange(true)
                      }}
                      className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
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
                      {formatMetric(selectedPendingQty)}
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
                            {formatMetric(line.id ? getPurchaseOrderRemainingQty(selectedOrder, line.id) : 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : eligibleOrders.length > 0 ? (
            <Card className='rounded-[32px] border-dashed bg-muted/5 shadow-none'>
              <CardContent className='flex min-h-[320px] flex-col items-center justify-center gap-3 text-center'>
                <PackageSearch className='size-10 text-muted-foreground/30' />
                <p className='text-[12px] font-black uppercase tracking-widest'>
                  {t('purchase.orders.returns.emptySelection')}
                </p>
                <p className='max-w-md text-[11px] font-bold leading-6 text-muted-foreground'>
                  {t('purchase.orders.returns.emptySelectionDescription')}
                </p>
              </CardContent>
            </Card>
          ) : null}

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
                    className='h-10 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
                    onClick={() => setHistoryOrderNo(selectedOrder?.orderNo || '')}
                    disabled={!selectedOrder}
                  >
                    {t('purchase.orders.returns.viewCurrentOrderHistory')}
                  </Button>
                  <Button
                    variant='ghost'
                    className='h-10 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
                    onClick={() => setHistoryOrderNo('')}
                  >
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
                              <AuditStatusDisplay meta={getPurchaseReturnStatusMeta(record.status, locale)} />
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
                                {t('purchase.orders.returns.operator')}: {auditUtils.formatOperatorName(record.operator) || record.operator}
                              </p>
                            ) : null}
                            <div className='mt-3 flex justify-end gap-2'>
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-10 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
                                onClick={() => setHistoryOrderNo(record.purchaseOrderNo)}
                              >
                                <Search className='mr-1 size-3.5' />
                                {t('purchase.orders.returns.historyAction')}
                              </Button>
                              <Button
                                variant='outline'
                                size='sm'
                                className='h-10 rounded-full px-4 text-[10px] font-black uppercase tracking-widest'
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










