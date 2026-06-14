/**
 * 销售换货创建对话框(从一线扫码出发,匹配销售单 → 选行 → 选要换的标签码)。
 *
 * 流程:
 *   1. 用户扫码或手动选已发货的销售订单
 *   2. 选择需要换货的行(数量受限于 delivered_qty,clampSalesExchangeQuantityWithinDeliveredQuantity 兜底)
 *   3. 扫码识别旧货标签码 → 自动绑定到行;未识别的标签码作为"未匹配"留痕
 *   4. 提交后调用 createSalesExchange API,后端走 createSalesExchangeTx 事务
 *
 * 关键不变量:
 *   - 单行换货数量 ≤ 该行已发货数量
 *   - 标签码去重(appendSalesExchangeUnmatchedLabelCodesWithoutDuplicates),避免同一标签重复入库
 *   - 已匹配标签自动定位到行,未匹配标签独立列表(便于 QA 后续核对)
 */
import { useMemo, useState } from 'react'
import { ArrowLeftRight, Barcode, Plus, ScanLine, X } from 'lucide-react'
import { toast } from 'sonner'
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
import type { SalesOrder, SalesOrderLine } from '@/features/trading/data/schema'
import type {
  SalesExchangeLineDraft,
  SalesExchangeUnmatchedLabelCode,
} from '../types/sales-exchange-types'
import {
  buildSalesExchangeLineDraftFromSalesOrderLine,
  buildSalesExchangeLineDraftsFromRecognizedLabelCodes,
  buildSalesExchangeRecognizedLabelCodesFromScannerInput,
  mergeSalesExchangeRecognizedLabelCodes,
} from '../utils/sales-exchange-label-code-parser'
import {
  resolveSalesExchangeLineDisplaySubtitle,
  resolveSalesExchangeLineDisplayTitle,
} from '../utils/sales-exchange-line-display'

type SalesExchangeCreateDialogProps = {
  sourceSalesOrder?: SalesOrder
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateSalesExchangeDraftRecord: (input: {
    sourceSalesOrder: SalesOrder
    lineDrafts: SalesExchangeLineDraft[]
    unmatchedLabelCodes: SalesExchangeUnmatchedLabelCode[]
    exchangeDate: string
    expectedReplacementDate: string
    receivedOldItemTrackingNo: string
    replacementTrackingNo: string
    exchangeReason: string
    exchangeRemarks: string
  }) => Promise<void> | void
}

function createTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function clampSalesExchangeQuantityWithinDeliveredQuantity(
  rawQuantity: string,
  deliveredQuantity: number
) {
  const parsedQuantity = Number(rawQuantity)
  if (!Number.isFinite(parsedQuantity)) {
    return 0
  }

  return Math.max(0, Math.min(deliveredQuantity, parsedQuantity))
}

function appendSalesExchangeUnmatchedLabelCodesWithoutDuplicates(
  currentUnmatchedLabelCodes: SalesExchangeUnmatchedLabelCode[],
  incomingUnmatchedLabelCodes: SalesExchangeUnmatchedLabelCode[]
) {
  const unmatchedLabelCodesByNormalizedValue = new Map<
    string,
    SalesExchangeUnmatchedLabelCode
  >()

  currentUnmatchedLabelCodes.forEach((labelCode) => {
    unmatchedLabelCodesByNormalizedValue.set(
      labelCode.normalizedLabelCode,
      labelCode
    )
  })
  incomingUnmatchedLabelCodes.forEach((labelCode) => {
    unmatchedLabelCodesByNormalizedValue.set(
      labelCode.normalizedLabelCode,
      labelCode
    )
  })

  return Array.from(unmatchedLabelCodesByNormalizedValue.values())
}

export function SalesExchangeCreateDialog({
  sourceSalesOrder,
  open,
  onOpenChange,
  onCreateSalesExchangeDraftRecord,
}: SalesExchangeCreateDialogProps) {
  const [exchangeDate, setExchangeDate] = useState(createTodayDateInputValue())
  const [expectedReplacementDate, setExpectedReplacementDate] = useState('')
  const [receivedOldItemTrackingNo, setReceivedOldItemTrackingNo] = useState('')
  const [replacementTrackingNo, setReplacementTrackingNo] = useState('')
  const [exchangeReason, setExchangeReason] = useState('')
  const [exchangeRemarks, setExchangeRemarks] = useState('')
  const [scannerInputValue, setScannerInputValue] = useState('')
  const [
    activeSalesOrderLineIdForLabelInput,
    setActiveSalesOrderLineIdForLabelInput,
  ] = useState<number | null>(null)
  const [lineDrafts, setLineDrafts] = useState<SalesExchangeLineDraft[]>([])
  const [unmatchedLabelCodes, setUnmatchedLabelCodes] = useState<
    SalesExchangeUnmatchedLabelCode[]
  >([])

  const exchangeableSalesOrderLines = useMemo(
    () =>
      (sourceSalesOrder?.lines ?? []).filter(
        (salesOrderLine) =>
          typeof salesOrderLine.id === 'number' &&
          salesOrderLine.deliveredQty > 0
      ),
    [sourceSalesOrder?.lines]
  )

  const selectedSalesOrderLineIds = useMemo(
    () => new Set(lineDrafts.map((lineDraft) => lineDraft.salesOrderLineId)),
    [lineDrafts]
  )

  const totalExchangeQuantity = useMemo(
    () =>
      lineDrafts.reduce(
        (sum, lineDraft) => sum + lineDraft.exchangeQuantity,
        0
      ),
    [lineDrafts]
  )

  const handleAddSalesOrderLineToExchangeDraft = (
    salesOrderLine: SalesOrderLine
  ) => {
    if (typeof salesOrderLine.id !== 'number') {
      return
    }

    setLineDrafts((currentLineDrafts) => {
      if (
        currentLineDrafts.some(
          (lineDraft) => lineDraft.salesOrderLineId === salesOrderLine.id
        )
      ) {
        return currentLineDrafts
      }

      return [
        ...currentLineDrafts,
        buildSalesExchangeLineDraftFromSalesOrderLine(salesOrderLine),
      ].sort((left, right) => left.lineNo - right.lineNo)
    })
    setActiveSalesOrderLineIdForLabelInput(salesOrderLine.id)
  }

  const handleRemoveSalesExchangeLineDraft = (salesOrderLineId: number) => {
    setLineDrafts((currentLineDrafts) =>
      currentLineDrafts.filter(
        (lineDraft) => lineDraft.salesOrderLineId !== salesOrderLineId
      )
    )
    setActiveSalesOrderLineIdForLabelInput((currentLineId) =>
      currentLineId === salesOrderLineId ? null : currentLineId
    )
  }

  const handleChangeSalesExchangeLineQuantity = (
    salesOrderLineId: number,
    rawQuantity: string
  ) => {
    setLineDrafts((currentLineDrafts) =>
      currentLineDrafts.map((lineDraft) =>
        lineDraft.salesOrderLineId === salesOrderLineId
          ? {
              ...lineDraft,
              exchangeQuantity:
                clampSalesExchangeQuantityWithinDeliveredQuantity(
                  rawQuantity,
                  lineDraft.deliveredQuantity
                ),
            }
          : lineDraft
      )
    )
  }

  const handleChangeSalesExchangeLineReplacementMode = (
    salesOrderLineId: number,
    replacementMode: SalesExchangeLineDraft['replacementMode']
  ) => {
    setLineDrafts((currentLineDrafts) =>
      currentLineDrafts.map((lineDraft) =>
        lineDraft.salesOrderLineId === salesOrderLineId
          ? { ...lineDraft, replacementMode }
          : lineDraft
      )
    )
  }

  const handleChangeSalesExchangeLineIssueDescription = (
    salesOrderLineId: number,
    issueDescription: string
  ) => {
    setLineDrafts((currentLineDrafts) =>
      currentLineDrafts.map((lineDraft) =>
        lineDraft.salesOrderLineId === salesOrderLineId
          ? { ...lineDraft, issueDescription }
          : lineDraft
      )
    )
  }

  const handleAssignScannerInputToActiveSalesOrderLine = () => {
    const incomingRecognizedLabelCodes =
      buildSalesExchangeRecognizedLabelCodesFromScannerInput(scannerInputValue)
    if (incomingRecognizedLabelCodes.length === 0) {
      toast.warning('请先录入标签码')
      return
    }

    if (!activeSalesOrderLineIdForLabelInput) {
      return false
    }

    const activeSalesOrderLine = exchangeableSalesOrderLines.find(
      (salesOrderLine) =>
        salesOrderLine.id === activeSalesOrderLineIdForLabelInput
    )
    if (!activeSalesOrderLine || typeof activeSalesOrderLine.id !== 'number') {
      return false
    }

    setLineDrafts((currentLineDrafts) => {
      const currentLineDraft = currentLineDrafts.find(
        (lineDraft) => lineDraft.salesOrderLineId === activeSalesOrderLine.id
      )
      const nextRecognizedLabelCodes = mergeSalesExchangeRecognizedLabelCodes(
        currentLineDraft?.recognizedLabelCodes ?? [],
        incomingRecognizedLabelCodes
      )
      const nextLineDraft = currentLineDraft
        ? {
            ...currentLineDraft,
            exchangeQuantity: Math.max(
              currentLineDraft.exchangeQuantity,
              nextRecognizedLabelCodes.length
            ),
            recognizedLabelCodes: nextRecognizedLabelCodes,
          }
        : buildSalesExchangeLineDraftFromSalesOrderLine(
            activeSalesOrderLine,
            nextRecognizedLabelCodes
          )

      return [
        ...currentLineDrafts.filter(
          (lineDraft) => lineDraft.salesOrderLineId !== activeSalesOrderLine.id
        ),
        nextLineDraft,
      ].sort((left, right) => left.lineNo - right.lineNo)
    })
    setScannerInputValue('')
    toast.success(
      `已把 ${incomingRecognizedLabelCodes.length} 个标签码挂到当前明细`
    )
    return true
  }

  const handleRecognizeScannerInputAgainstSourceSalesOrder = () => {
    if (!sourceSalesOrder) {
      return
    }

    const assignedToActiveLine =
      handleAssignScannerInputToActiveSalesOrderLine()
    if (assignedToActiveLine) {
      return
    }

    const incomingRecognizedLabelCodes =
      buildSalesExchangeRecognizedLabelCodesFromScannerInput(scannerInputValue)
    if (incomingRecognizedLabelCodes.length === 0) {
      toast.warning('请先录入标签码')
      return
    }

    const result = buildSalesExchangeLineDraftsFromRecognizedLabelCodes({
      sourceSalesOrder,
      currentLineDrafts: lineDrafts,
      incomingRecognizedLabelCodes,
    })

    setLineDrafts(result.lineDrafts)
    setUnmatchedLabelCodes((currentUnmatchedLabelCodes) =>
      appendSalesExchangeUnmatchedLabelCodesWithoutDuplicates(
        currentUnmatchedLabelCodes,
        result.unmatchedLabelCodes
      )
    )
    setScannerInputValue('')

    if (result.unmatchedLabelCodes.length > 0) {
      toast.warning(
        `识别到 ${incomingRecognizedLabelCodes.length} 个标签码，其中 ${result.unmatchedLabelCodes.length} 个未自动匹配`
      )
      return
    }

    toast.success(`识别到 ${incomingRecognizedLabelCodes.length} 个标签码`)
  }

  const handleSubmitSalesExchangeDraftRecord = async () => {
    if (!sourceSalesOrder) {
      return
    }

    const validLineDrafts = lineDrafts.filter(
      (lineDraft) => lineDraft.exchangeQuantity > 0
    )
    if (validLineDrafts.length === 0) {
      toast.warning('请先加入至少一条换货明细')
      return
    }
    if (!exchangeReason.trim()) {
      toast.warning('请填写换货原因，方便售后追踪')
      return
    }

    try {
      await onCreateSalesExchangeDraftRecord({
        sourceSalesOrder,
        lineDrafts: validLineDrafts,
        unmatchedLabelCodes,
        exchangeDate,
        expectedReplacementDate,
        receivedOldItemTrackingNo: receivedOldItemTrackingNo.trim(),
        replacementTrackingNo: replacementTrackingNo.trim(),
        exchangeReason: exchangeReason.trim(),
        exchangeRemarks: exchangeRemarks.trim(),
      })
    } catch {
      return
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        showCloseButton
        className='flex h-[min(96vh,980px)] w-[calc(100vw-20px)] max-w-[1480px] flex-col gap-0 overflow-hidden rounded-2xl border-none bg-background p-0 shadow-2xl md:rounded-[28px]'
      >
        {sourceSalesOrder ? (
          <>
            <DialogHeader className='border-b border-dashed border-border/70 px-5 py-4 text-left'>
              <DialogTitle className='flex items-center gap-2 text-base font-black tracking-tight'>
                <ArrowLeftRight className='size-4 text-primary' />
                新建销售换货草稿
              </DialogTitle>
              <DialogDescription className='text-xs font-bold text-muted-foreground'>
                来源订单 {sourceSalesOrder.orderNo}
                ，换货不会写入应收冲减；标签码会作为旧货识别和后续追溯依据。
              </DialogDescription>
            </DialogHeader>

            <div className='min-h-0 flex-1 overflow-y-auto'>
              <div className='grid gap-3 border-b border-dashed border-border/60 px-5 py-3 md:grid-cols-2 xl:grid-cols-4'>
                <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 px-3 py-2'>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    来源订单
                  </p>
                  <p className='mt-1 truncate text-sm font-black'>
                    {sourceSalesOrder.orderNo}
                  </p>
                </div>
                <div className='rounded-2xl border border-dashed border-muted/50 bg-muted/10 px-3 py-2'>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                    客户
                  </p>
                  <p className='mt-1 truncate text-sm font-black'>
                    {sourceSalesOrder.customerName}
                  </p>
                </div>
                <div className='rounded-2xl border border-dashed border-sky-500/20 bg-sky-500/5 px-3 py-2'>
                  <p className='text-[10px] font-black tracking-widest text-sky-600/70 uppercase'>
                    已选明细
                  </p>
                  <p className='mt-1 text-sm font-black text-sky-700'>
                    {lineDrafts.length.toLocaleString()} 行
                  </p>
                </div>
                <div className='rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/5 px-3 py-2'>
                  <p className='text-[10px] font-black tracking-widest text-emerald-600/70 uppercase'>
                    换货数量
                  </p>
                  <p className='mt-1 text-sm font-black text-emerald-700'>
                    {totalExchangeQuantity.toLocaleString()} PCS
                  </p>
                </div>
              </div>

              <div className='grid gap-4 px-5 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.85fr)]'>
                <section className='min-h-0 rounded-[24px] border border-dashed border-border/70 bg-background/80'>
                  <div className='border-b border-dashed border-border/70 px-4 py-3'>
                    <p className='text-sm font-black'>订单可换明细</p>
                    <p className='mt-1 text-xs font-bold text-muted-foreground'>
                      可以手工加入明细，也可以先选中某一行后扫码录入标签码。
                    </p>
                  </div>
                  <div className='max-h-[360px] divide-y divide-dashed divide-border/60 overflow-y-auto'>
                    {exchangeableSalesOrderLines.map((salesOrderLine) => {
                      const salesOrderLineId = Number(salesOrderLine.id)
                      const isSelected =
                        selectedSalesOrderLineIds.has(salesOrderLineId)
                      const isActive =
                        activeSalesOrderLineIdForLabelInput === salesOrderLineId

                      return (
                        <button
                          key={salesOrderLineId}
                          type='button'
                          onClick={() =>
                            setActiveSalesOrderLineIdForLabelInput(
                              salesOrderLineId
                            )
                          }
                          className={`block w-full px-4 py-3 text-left transition-colors ${
                            isActive
                              ? 'bg-primary/6 shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
                              : 'hover:bg-muted/10'
                          }`}
                        >
                          <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0'>
                              <p className='truncate text-sm font-black text-foreground'>
                                {resolveSalesExchangeLineDisplayTitle(
                                  salesOrderLine
                                )}
                              </p>
                              <p className='mt-1 truncate text-xs font-bold text-muted-foreground'>
                                {resolveSalesExchangeLineDisplaySubtitle(
                                  salesOrderLine
                                )}
                              </p>
                              <div className='mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-muted-foreground'>
                                <span>行号 {salesOrderLine.lineNo}</span>
                                <span>
                                  订单 {salesOrderLine.qty.toLocaleString()}{' '}
                                  {salesOrderLine.uom}
                                </span>
                                <span className='text-emerald-600'>
                                  已交付{' '}
                                  {salesOrderLine.deliveredQty.toLocaleString()}{' '}
                                  {salesOrderLine.uom}
                                </span>
                              </div>
                            </div>
                            <Button
                              type='button'
                              variant={isSelected ? 'secondary' : 'outline'}
                              size='sm'
                              className='shrink-0 rounded-full'
                              onClick={(event) => {
                                event.stopPropagation()
                                handleAddSalesOrderLineToExchangeDraft(
                                  salesOrderLine
                                )
                              }}
                            >
                              <Plus className='mr-1 size-3.5' />
                              {isSelected ? '已加入' : '加入'}
                            </Button>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className='rounded-[24px] border border-dashed border-border/70 bg-muted/5 p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-sm font-black'>标签码录入</p>
                      <p className='mt-1 text-xs font-bold text-muted-foreground'>
                        未选中明细时按产品码自动匹配；选中明细后直接挂到该行。
                      </p>
                    </div>
                    <span className='rounded-full border border-dashed border-muted/50 px-2.5 py-1 text-[10px] font-black text-muted-foreground'>
                      当前行{' '}
                      {activeSalesOrderLineIdForLabelInput
                        ? `#${activeSalesOrderLineIdForLabelInput}`
                        : '自动'}
                    </span>
                  </div>
                  <div className='mt-3 space-y-3'>
                    <Input
                      value={scannerInputValue}
                      onChange={(event) =>
                        setScannerInputValue(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          handleRecognizeScannerInputAgainstSourceSalesOrder()
                        }
                      }}
                      placeholder='扫码枪输入后回车，或粘贴单个标签码'
                      className='h-10 rounded-xl'
                    />
                    <Textarea
                      value={scannerInputValue}
                      onChange={(event) =>
                        setScannerInputValue(event.target.value)
                      }
                      placeholder='也可以粘贴多个标签码、JSON 二维码内容或用逗号/换行分隔的标签码'
                      className='min-h-[88px] rounded-xl text-xs'
                    />
                    <Button
                      type='button'
                      className='w-full rounded-full text-xs font-black'
                      onClick={
                        handleRecognizeScannerInputAgainstSourceSalesOrder
                      }
                    >
                      <ScanLine className='mr-1 size-3.5' />
                      识别并加入换货明细
                    </Button>
                  </div>

                  {unmatchedLabelCodes.length > 0 ? (
                    <div className='mt-4 rounded-[18px] border border-dashed border-amber-500/30 bg-amber-500/8 p-3'>
                      <p className='text-xs font-black text-amber-700'>
                        未自动匹配标签码
                      </p>
                      <div className='mt-2 flex flex-wrap gap-2'>
                        {unmatchedLabelCodes.map((labelCode) => (
                          <span
                            key={labelCode.normalizedLabelCode}
                            className='rounded-full border border-amber-500/20 bg-background/80 px-2.5 py-1 text-[10px] font-black text-amber-700'
                          >
                            {labelCode.normalizedLabelCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>

              <div className='px-5 pb-4'>
                <section className='rounded-[24px] border border-dashed border-border/70 bg-background/80'>
                  <div className='border-b border-dashed border-border/70 px-4 py-3'>
                    <p className='text-sm font-black'>已加入换货明细</p>
                    <p className='mt-1 text-xs font-bold text-muted-foreground'>
                      换货数量只用于售后处理，不会触发应收金额冲减。
                    </p>
                  </div>
                  <div className='divide-y divide-dashed divide-border/60'>
                    {lineDrafts.length === 0 ? (
                      <div className='px-4 py-8 text-center text-xs font-bold text-muted-foreground'>
                        请先加入订单明细或录入可识别的标签码
                      </div>
                    ) : (
                      lineDrafts.map((lineDraft) => (
                        <div key={lineDraft.lineDraftId} className='px-4 py-3'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='min-w-0'>
                              <p className='truncate text-sm font-black text-foreground'>
                                {resolveSalesExchangeLineDisplayTitle(
                                  lineDraft
                                )}
                              </p>
                              <p className='mt-1 truncate text-xs font-bold text-muted-foreground'>
                                {resolveSalesExchangeLineDisplaySubtitle(
                                  lineDraft
                                )}
                              </p>
                            </div>
                            <Button
                              type='button'
                              variant='ghost'
                              size='sm'
                              className='shrink-0 rounded-full text-muted-foreground hover:text-foreground'
                              onClick={() =>
                                handleRemoveSalesExchangeLineDraft(
                                  lineDraft.salesOrderLineId
                                )
                              }
                            >
                              <X className='mr-1 size-3.5' />
                              移除
                            </Button>
                          </div>
                          <div className='mt-3 grid gap-3 md:grid-cols-[160px_220px_minmax(0,1fr)]'>
                            <div className='space-y-1.5'>
                              <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                                换货数量
                              </label>
                              <Input
                                type='number'
                                min={0}
                                max={lineDraft.deliveredQuantity}
                                value={
                                  lineDraft.exchangeQuantity === 0
                                    ? ''
                                    : String(lineDraft.exchangeQuantity)
                                }
                                onChange={(event) =>
                                  handleChangeSalesExchangeLineQuantity(
                                    lineDraft.salesOrderLineId,
                                    event.target.value
                                  )
                                }
                                className='h-9 rounded-xl'
                              />
                            </div>
                            <div className='space-y-1.5'>
                              <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                                补发方式
                              </label>
                              <Select
                                value={lineDraft.replacementMode}
                                onValueChange={(value) =>
                                  handleChangeSalesExchangeLineReplacementMode(
                                    lineDraft.salesOrderLineId,
                                    value as SalesExchangeLineDraft['replacementMode']
                                  )
                                }
                              >
                                <SelectTrigger className='h-9 rounded-xl'>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value='sameSalesOrderLineItem'>
                                    同款同规格补发
                                  </SelectItem>
                                  <SelectItem value='manualReplacementReview'>
                                    人工确认替换品
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className='space-y-1.5'>
                              <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                                明细问题说明
                              </label>
                              <Input
                                value={lineDraft.issueDescription}
                                onChange={(event) =>
                                  handleChangeSalesExchangeLineIssueDescription(
                                    lineDraft.salesOrderLineId,
                                    event.target.value
                                  )
                                }
                                placeholder='例如：标签错贴、规格不符、客户要求换同款'
                                className='h-9 rounded-xl'
                              />
                            </div>
                          </div>
                          <div className='mt-3 flex flex-wrap gap-2'>
                            {lineDraft.recognizedLabelCodes.length === 0 ? (
                              <span className='inline-flex items-center rounded-full border border-dashed border-muted/50 px-2.5 py-1 text-[10px] font-black text-muted-foreground'>
                                暂无标签码
                              </span>
                            ) : (
                              lineDraft.recognizedLabelCodes.map(
                                (labelCode) => (
                                  <span
                                    key={labelCode.normalizedLabelCode}
                                    className='inline-flex items-center rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-black text-sky-700'
                                  >
                                    <Barcode className='mr-1 size-3' />
                                    {labelCode.normalizedLabelCode}
                                  </span>
                                )
                              )
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>

              <div className='grid gap-3 border-t border-dashed border-border/60 px-5 py-4 md:grid-cols-2 xl:grid-cols-4'>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    换货日期
                  </label>
                  <Input
                    type='date'
                    value={exchangeDate}
                    onChange={(event) => setExchangeDate(event.target.value)}
                    className='h-9 rounded-xl'
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    预计补发日期
                  </label>
                  <Input
                    type='date'
                    value={expectedReplacementDate}
                    onChange={(event) =>
                      setExpectedReplacementDate(event.target.value)
                    }
                    className='h-9 rounded-xl'
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    旧货物流单号
                  </label>
                  <Input
                    value={receivedOldItemTrackingNo}
                    onChange={(event) =>
                      setReceivedOldItemTrackingNo(event.target.value)
                    }
                    placeholder='可后续补录'
                    className='h-9 rounded-xl'
                  />
                </div>
                <div className='space-y-1.5'>
                  <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    补发物流单号
                  </label>
                  <Input
                    value={replacementTrackingNo}
                    onChange={(event) =>
                      setReplacementTrackingNo(event.target.value)
                    }
                    placeholder='可后续补录'
                    className='h-9 rounded-xl'
                  />
                </div>
                <div className='space-y-1.5 md:col-span-2'>
                  <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    换货原因
                  </label>
                  <Textarea
                    value={exchangeReason}
                    onChange={(event) => setExchangeReason(event.target.value)}
                    placeholder='请填写客户换货原因或售后判断依据'
                    className='min-h-[64px] rounded-xl'
                  />
                </div>
                <div className='space-y-1.5 md:col-span-2'>
                  <label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    备注
                  </label>
                  <Textarea
                    value={exchangeRemarks}
                    onChange={(event) => setExchangeRemarks(event.target.value)}
                    placeholder='补充旧货状态、补发要求、沟通记录等'
                    className='min-h-[64px] rounded-xl'
                  />
                </div>
              </div>
            </div>

            <DialogFooter className='border-t border-dashed border-border/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between'>
              <div className='text-left'>
                <p className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                  当前草稿不会写入应收
                </p>
                <p className='mt-1 text-xs font-bold text-muted-foreground'>
                  后续接后端时只落换货单、标签码和补发追踪。
                </p>
              </div>
              <div className='flex items-center justify-end gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className='rounded-full'
                  onClick={() => onOpenChange(false)}
                >
                  取消
                </Button>
                <Button
                  type='button'
                  className='rounded-full'
                  onClick={() => void handleSubmitSalesExchangeDraftRecord()}
                >
                  创建换货草稿
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
