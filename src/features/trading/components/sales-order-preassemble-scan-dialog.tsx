import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, QrCode, ScanLine, Search, Tag } from 'lucide-react'
import { toast } from 'sonner'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ShipmentCoreService } from '@/features/warehouse/shipment'
import { type ShipmentRecord } from '@/features/warehouse/shipment/data/schema'
import { useGetSalesOrderDetail } from '../sales'
import { type SalesOrder, type SalesOrderLine } from '../data/schema'
import { isSalesOrderPreassembleScanAllowed } from '../utils/sales-order-preassemble'

const SHIPMENT_FETCH_PAGE_SIZE = 500
const SHIPMENT_FETCH_MAX_PAGES = 20

interface SalesOrderPreassembleScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: SalesOrder | null
  isSubmitting?: boolean
  onConfirm?: (payload: SalesOrderPreassembleConfirmPayload) => Promise<void> | void
}

interface ScanLogEntry {
  raw: string
  matchedCount: number
  parsedCodes: string[]
  ambiguousCodes: string[]
  unmatchedCodes: string[]
  scannedAt: string
}

interface VirtualCodePoolEntry {
  shipmentId: string
  version: number
  primaryCode: string
  codeType: 'SINGLE' | 'ASSEMBLY'
  allCodes: string[]
  materialId: string
  materialCode: string
  materialName: string
  quantity: number
  batchNo: string
  orderNo: string
  salesOrderId: string
  salesOrderLineId: number
  lineCandidates: SalesOrderLine[]
  lineLabel: string
}

export interface SalesOrderPreassembleConfirmEntry {
  shipmentId: string
  version: number
  primaryCode: string
  materialCode: string
  materialName: string
  targetSalesOrderLineId: number
  currentSalesOrderId: string
  currentSalesOrderLineId: number
  currentOrderNo: string
}

export interface SalesOrderPreassembleConfirmPayload {
  orderId: string
  orderNo: string
  entries: SalesOrderPreassembleConfirmEntry[]
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase()
}

function appendCode(target: Set<string>, value: unknown) {
  if (typeof value !== 'string') return
  const normalized = normalizeCode(value)
  if (!normalized) return
  if (normalized.length > 256) return
  target.add(normalized)
}

function extractCodesFromUnknown(value: unknown, target: Set<string>) {
  if (typeof value === 'string') {
    appendCode(target, value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractCodesFromUnknown(item, target))
    return
  }
  if (!value || typeof value !== 'object') return

  const record = value as Record<string, unknown>
  ;['code', 'barcode', 'packageCode', 'boxCode', 'cartonCode', 'outerCode'].forEach((key) => {
    appendCode(target, record[key])
  })
  ;['codes', 'barcodes', 'items', 'components', 'innerCodes', 'children'].forEach((key) => {
    extractCodesFromUnknown(record[key], target)
  })
}

function decodeScannedCodes(raw: string): string[] {
  const result = new Set<string>()
  const normalizedRaw = normalizeCode(raw)
  if (normalizedRaw) {
    result.add(normalizedRaw)
  }

  try {
    const parsed = JSON.parse(raw)
    extractCodesFromUnknown(parsed, result)
  } catch {
    // Keep plain-text path.
  }

  raw
    .split(/[\n,，;；、]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => {
      const kvIndex = segment.indexOf('=')
      if (kvIndex > 0 && kvIndex < segment.length - 1) {
        appendCode(result, segment.slice(kvIndex + 1))
      }
      segment
        .split('|')
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => {
          const partKvIndex = part.indexOf('=')
          if (partKvIndex > 0 && partKvIndex < part.length - 1) {
            appendCode(result, part.slice(partKvIndex + 1))
            return
          }
          appendCode(result, part)
        })
    })

  return Array.from(result)
}

function createLineCandidatesResolver(lines: SalesOrderLine[]) {
  const byProductID = new Map<string, SalesOrderLine[]>()
  const byProductCode = new Map<string, SalesOrderLine[]>()

  lines.forEach((line) => {
    if (line.productId?.trim()) {
      const key = line.productId.trim()
      byProductID.set(key, [...(byProductID.get(key) ?? []), line])
    }

    if (line.productCode?.trim()) {
      const key = normalizeCode(line.productCode)
      byProductCode.set(key, [...(byProductCode.get(key) ?? []), line])
    }
  })

  return (materialId: string, materialCode: string): SalesOrderLine[] => {
    const result = new Map<number, SalesOrderLine>()
    const idKey = materialId.trim()
    const codeKey = normalizeCode(materialCode)

    ;(byProductID.get(idKey) ?? []).forEach((line) => {
      if (typeof line.id === 'number') {
        result.set(line.id, line)
      }
    })
    ;(byProductCode.get(codeKey) ?? []).forEach((line) => {
      if (typeof line.id === 'number') {
        result.set(line.id, line)
      }
    })

    return Array.from(result.values())
  }
}

function getRecordLineLabel(record: ShipmentRecord, candidates: SalesOrderLine[]): string {
  if (typeof record.salesOrderLineId === 'number' && record.salesOrderLineId > 0) {
    return `已绑定行 #${record.salesOrderLineId}`
  }
  if (candidates.length === 1) {
    const line = candidates[0]
    return `候选行 #${line.lineNo} ${line.productModel || line.productCode || ''}`.trim()
  }
  if (candidates.length > 1) {
    return `候选订单行 ${candidates.length} 条（需唯一）`
  }
  return '无可匹配订单行'
}

export function SalesOrderPreassembleScanDialog({
  open,
  onOpenChange,
  order,
  isSubmitting = false,
  onConfirm,
}: SalesOrderPreassembleScanDialogProps) {
  const { t } = useLanguage()
  const [scanInput, setScanInput] = useState('')
  const [manualSelectedIds, setManualSelectedIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([])
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false)
  const scannerInputRef = useRef<HTMLInputElement | null>(null)

  const submitting = isSubmitting || isSubmittingLocal
  const orderDetailQuery = useGetSalesOrderDetail(order?.id ?? '')
  const lines = useMemo(() => orderDetailQuery.data?.lines ?? [], [orderDetailQuery.data?.lines])

  const virtualPoolQuery = useQuery({
    queryKey: ['trading', 'sales-order', 'preassemble-scan', order?.id ?? 'empty'],
    queryFn: async () => {
      const all: ShipmentRecord[] = []
      for (let page = 1; page <= SHIPMENT_FETCH_MAX_PAGES; page += 1) {
        const chunk = await ShipmentCoreService.getShipmentHistory({
          page,
          pageSize: SHIPMENT_FETCH_PAGE_SIZE,
        })
        all.push(...chunk)
        if (chunk.length < SHIPMENT_FETCH_PAGE_SIZE) {
          break
        }
      }
      return all
    },
    enabled: open && Boolean(order?.id),
  })

  const poolEntries = useMemo<VirtualCodePoolEntry[]>(() => {
    if (!order) return []

    const resolveLineCandidates = createLineCandidatesResolver(lines)
    const virtualRecords = (virtualPoolQuery.data ?? []).filter((record) => {
      if (record.sourceCategory !== 'SHIPPING_VIRTUAL' || record.status !== 'DRAFT') {
        return false
      }

      const sameOrderByID = Boolean(record.salesOrderId) && record.salesOrderId === order.id
      const sameOrderByNo = Boolean(record.orderNo) && record.orderNo === order.orderNo
      if (sameOrderByID || sameOrderByNo) {
        return true
      }

      if (record.salesOrderId && record.salesOrderId !== order.id) {
        return false
      }
      if (record.orderNo && record.orderNo !== order.orderNo) {
        return false
      }

      return resolveLineCandidates(record.materialId, record.materialCode).length > 0
    })

    return virtualRecords.map((record) => {
      const codes = Array.from(new Set(decodeScannedCodes(record.batchNo || '').filter(Boolean)))
      const fallbackCode = normalizeCode(record.batchNo || '')
      const primaryCode = codes[0] || fallbackCode || `[NO-CODE] ${record.id.slice(0, 8)}`
      const lineCandidates = resolveLineCandidates(record.materialId, record.materialCode)
      const lineLabel = getRecordLineLabel(record, lineCandidates)

      return {
        shipmentId: record.id,
        version: record.version,
        primaryCode,
        codeType: codes.length > 1 ? 'ASSEMBLY' : 'SINGLE',
        allCodes: codes,
        materialId: record.materialId,
        materialCode: record.materialCode,
        materialName: record.materialName,
        quantity: record.quantity,
        batchNo: record.batchNo,
        orderNo: record.orderNo || '',
        salesOrderId: record.salesOrderId || '',
        salesOrderLineId: record.salesOrderLineId || 0,
        lineCandidates,
        lineLabel,
      }
    })
  }, [lines, order, virtualPoolQuery.data])

  const codeIndex = useMemo(() => {
    const map = new Map<string, Set<string>>()
    poolEntries.forEach((entry) => {
      entry.allCodes.forEach((code) => {
        const normalized = normalizeCode(code)
        if (!normalized) return
        const group = map.get(normalized) ?? new Set<string>()
        group.add(entry.shipmentId)
        map.set(normalized, group)
      })
    })
    return map
  }, [poolEntries])

  const selectedEntries = useMemo(
    () => poolEntries.filter((entry) => selectedIds.has(entry.shipmentId)),
    [poolEntries, selectedIds]
  )

  useEffect(() => {
    if (!open) {
      setManualSelectedIds(new Set())
      setSelectedIds(new Set())
      setScanLog([])
      setScanInput('')
      setIsSubmittingLocal(false)
      return
    }
    scannerInputRef.current?.focus()
  }, [open, order?.id])

  const handleScan = (rawInput: string) => {
    const raw = rawInput.trim()
    if (!raw) return

    const parsedCodes = decodeScannedCodes(raw)
    const matchedIds = new Set<string>()
    const ambiguousCodes: string[] = []
    const unmatchedCodes: string[] = []

    parsedCodes.forEach((code) => {
      const matched = codeIndex.get(normalizeCode(code))
      if (!matched || matched.size === 0) {
        unmatchedCodes.push(code)
        return
      }
      if (matched.size > 1) {
        ambiguousCodes.push(code)
        return
      }
      matched.forEach((id) => matchedIds.add(id))
    })

    if (matchedIds.size > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        matchedIds.forEach((id) => next.add(id))
        return next
      })
      toast.success(`识别成功：匹配到 ${matchedIds.size} 条记录`)
    }
    if (ambiguousCodes.length > 0) {
      toast.warning(`有 ${ambiguousCodes.length} 个码命中多条记录，请在左侧手动选择`)
    }
    if (matchedIds.size === 0 && ambiguousCodes.length === 0) {
      toast.error('未识别到可用条码，请确认条码在虚拟发货仓条码池中')
    }

    setScanLog((prev) => [
      {
        raw,
        matchedCount: matchedIds.size,
        parsedCodes,
        ambiguousCodes,
        unmatchedCodes,
        scannedAt: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      },
      ...prev,
    ].slice(0, 12))

    setScanInput('')
    scannerInputRef.current?.focus()
  }

  const toggleManualSelect = (shipmentId: string) => {
    setManualSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(shipmentId)) {
        next.delete(shipmentId)
      } else {
        next.add(shipmentId)
      }
      return next
    })
  }

  const addManualSelectedToRecognized = () => {
    if (manualSelectedIds.size === 0) {
      toast.error('请先在左侧条码池手动选择号码')
      return
    }
    setSelectedIds((prev) => {
      const next = new Set(prev)
      manualSelectedIds.forEach((id) => next.add(id))
      return next
    })
    toast.success(`已手动加入 ${manualSelectedIds.size} 条到识别记录`)
    setManualSelectedIds(new Set())
  }

  const clearSelection = () => {
    setManualSelectedIds(new Set())
    setSelectedIds(new Set())
    setScanLog([])
    setScanInput('')
  }

  const completeScanSession = async () => {
    if (!order) return
    if (!isSalesOrderPreassembleScanAllowed(order)) {
      toast.error('当前订单状态不允许扫码预装')
      return
    }
    if (selectedEntries.length === 0) {
      toast.error('请先识别或手动加入至少一条记录')
      return
    }

    const unresolved: string[] = []
    const confirmEntries: SalesOrderPreassembleConfirmEntry[] = []

    selectedEntries.forEach((entry) => {
      const boundToOtherOrder =
        (entry.salesOrderId && entry.salesOrderId !== order.id) ||
        (entry.orderNo && entry.orderNo !== order.orderNo)
      if (boundToOtherOrder) {
        unresolved.push(entry.primaryCode)
        return
      }

      let targetLineId = 0
      if (entry.salesOrderId === order.id && entry.salesOrderLineId > 0) {
        targetLineId = entry.salesOrderLineId
      } else if (entry.lineCandidates.length === 1 && typeof entry.lineCandidates[0]?.id === 'number') {
        targetLineId = entry.lineCandidates[0].id as number
      }

      if (targetLineId <= 0) {
        unresolved.push(entry.primaryCode)
        return
      }

      confirmEntries.push({
        shipmentId: entry.shipmentId,
        version: entry.version,
        primaryCode: entry.primaryCode,
        materialCode: entry.materialCode,
        materialName: entry.materialName,
        targetSalesOrderLineId: targetLineId,
        currentSalesOrderId: entry.salesOrderId,
        currentSalesOrderLineId: entry.salesOrderLineId,
        currentOrderNo: entry.orderNo,
      })
    })

    if (unresolved.length > 0) {
      const preview = unresolved.slice(0, 3).join(' / ')
      toast.error(
        t('tradingSalesOrder.preassembleScan.toasts.unresolvedOrderLines', {
          count: unresolved.length,
          preview,
        })
      )
      return
    }

    const payload: SalesOrderPreassembleConfirmPayload = {
      orderId: order.id,
      orderNo: order.orderNo,
      entries: confirmEntries,
    }

    try {
      setIsSubmittingLocal(true)
      if (onConfirm) {
        await onConfirm(payload)
      } else {
        toast.success(`已完成扫码确认，共 ${confirmEntries.length} 条`)
        onOpenChange(false)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '扫码确认失败')
    } finally {
      setIsSubmittingLocal(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size='full'
        className='w-[98vw] max-w-[1560px] sm:max-w-[1560px] rounded-[28px] border-none p-0 shadow-2xl'
      >
        <div className='border-b border-dashed border-muted/50 px-6 py-4'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-black uppercase tracking-wide'>
              <QrCode className='size-4 text-primary' />
              扫码预装入单
            </DialogTitle>
            <DialogDescription className='text-xs font-semibold text-muted-foreground/80'>
              当前订单：{order?.orderNo || '--'}。支持单件码与组装码识别；完成后将写入订单预装结果。
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className='grid gap-0 lg:grid-cols-[1.2fr_1fr]'>
          <section className='border-b border-dashed border-muted/40 p-4 lg:border-r lg:border-b-0 lg:p-5'>
            <div className='mb-3 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Tag className='size-4 text-primary' />
                <h3 className='text-sm font-black'>虚拟发货仓条码池</h3>
              </div>
              <div className='flex items-center gap-2'>
                <Badge variant='outline' className='rounded-full border-dashed text-[10px] font-black'>
                  {poolEntries.length} 条
                </Badge>
                <Badge variant='outline' className='rounded-full border-dashed text-[10px] font-black'>
                  已选 {manualSelectedIds.size}
                </Badge>
              </div>
            </div>
            <div className='mb-3 flex items-center justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                className='h-9 rounded-xl border-dashed px-3 text-[11px] font-black'
                disabled={manualSelectedIds.size === 0 || submitting}
                onClick={addManualSelectedToRecognized}
              >
                加入识别记录
              </Button>
            </div>

            <div className='h-[420px] overflow-y-auto rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-2'>
              {virtualPoolQuery.isLoading ? (
                <div className='space-y-2'>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      key={`virtual-pool-skeleton-${index}`}
                      className='rounded-xl border border-dashed border-muted/40 bg-background p-3'
                    >
                      <div className='flex items-center justify-between gap-3'>
                        <Skeleton className='h-4 w-32' />
                        <Skeleton className='h-5 w-16 rounded-full' />
                      </div>
                      <div className='mt-3 flex items-center gap-2'>
                        <Skeleton className='h-3 w-24' />
                        <Skeleton className='h-3 w-20' />
                      </div>
                    </div>
                  ))}
                </div>
              ) : poolEntries.length === 0 ? (
                <div className='flex h-full items-center justify-center text-xs font-black text-muted-foreground/60'>
                  当前订单暂无可用条码记录
                </div>
              ) : (
                poolEntries.map((entry) => {
                  const manuallyActive = manualSelectedIds.has(entry.shipmentId)
                  const recognized = selectedIds.has(entry.shipmentId)
                  return (
                    <button
                      key={entry.shipmentId}
                      type='button'
                      onClick={() => toggleManualSelect(entry.shipmentId)}
                      className={`mb-2 w-full rounded-xl border p-3 text-left transition-all ${
                        manuallyActive
                          ? 'border-primary/40 bg-primary/10 shadow-sm'
                          : 'border-dashed border-muted/40 bg-background hover:border-primary/30'
                      }`}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <p className='truncate text-xs font-black'>{entry.primaryCode}</p>
                        <div className='flex items-center gap-1.5'>
                          {recognized ? (
                            <Badge
                              variant='outline'
                              className='rounded-full border-emerald-300 bg-emerald-50 text-[10px] font-black text-emerald-700'
                            >
                              已加入
                            </Badge>
                          ) : null}
                          <Badge
                            variant='outline'
                            className='rounded-full border-dashed text-[10px] font-black'
                          >
                            {entry.codeType === 'ASSEMBLY' ? '组装码' : '单件码'}
                          </Badge>
                        </div>
                      </div>
                      <p className='mt-1 truncate text-[11px] font-bold text-muted-foreground'>
                        {entry.materialCode} · {entry.materialName}
                      </p>
                      <div className='mt-2 flex items-center justify-between text-[10px] font-semibold text-muted-foreground/80'>
                        <span>{entry.lineLabel}</span>
                        <span>数量 {entry.quantity}</span>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </section>

          <section className='p-4 lg:p-5'>
            <div className='mb-3 flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <ScanLine className='size-4 text-primary' />
                <h3 className='text-sm font-black'>扫码识别区</h3>
              </div>
              <Badge variant='outline' className='rounded-full border-dashed text-[10px] font-black'>
                已识别 {selectedEntries.length} 条
              </Badge>
            </div>

            <div className='space-y-3 rounded-2xl border border-dashed border-muted/50 bg-muted/5 p-3'>
              <div className='flex items-center gap-2'>
                <Input
                  ref={scannerInputRef}
                  placeholder='扫码枪输入后回车，支持单件码/组装码'
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleScan(scanInput)
                    }
                  }}
                  className='h-10 rounded-xl border-dashed'
                />
                <Button
                  type='button'
                  className='h-10 rounded-xl px-4 text-xs font-black'
                  onClick={() => handleScan(scanInput)}
                  disabled={submitting}
                >
                  <Search className='mr-1 size-3.5' />
                  识别
                </Button>
              </div>

              <Textarea
                placeholder='也可粘贴二维码载荷内容（JSON 或 code 列表），点击“识别”'
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                className='min-h-[88px] rounded-xl border-dashed bg-background text-xs'
              />
            </div>

            <div className='mt-3 grid gap-3 lg:grid-cols-2'>
              <div className='rounded-2xl border border-dashed border-muted/50 p-3'>
                <div className='mb-2 flex items-center gap-2 text-xs font-black'>
                  <CheckCircle2 className='size-3.5 text-emerald-600' />
                  已识别记录
                </div>
                <div className='h-[180px] overflow-y-auto space-y-1.5'>
                  {selectedEntries.length === 0 ? (
                    <p className='text-[11px] font-semibold text-muted-foreground/70'>暂无识别结果</p>
                  ) : (
                    selectedEntries.map((entry) => (
                      <div key={entry.shipmentId} className='rounded-lg border border-dashed border-emerald-300/60 bg-emerald-50/40 px-2 py-1.5'>
                        <p className='truncate text-[11px] font-black'>{entry.primaryCode}</p>
                        <p className='truncate text-[10px] font-semibold text-muted-foreground'>
                          {entry.materialCode} · {entry.lineLabel}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className='rounded-2xl border border-dashed border-muted/50 p-3'>
                <div className='mb-2 text-xs font-black'>扫码日志</div>
                <div className='h-[180px] overflow-y-auto space-y-1.5'>
                  {scanLog.length === 0 ? (
                    <p className='text-[11px] font-semibold text-muted-foreground/70'>暂无扫码日志</p>
                  ) : (
                    scanLog.map((entry, idx) => (
                      <div key={`${entry.scannedAt}-${idx}`} className='rounded-lg border border-dashed border-muted/50 bg-muted/10 px-2 py-1.5'>
                        <p className='truncate text-[11px] font-black'>{entry.raw}</p>
                        <p className='text-[10px] font-semibold text-muted-foreground'>
                          {entry.scannedAt} · 命中 {entry.matchedCount} · 冲突 {entry.ambiguousCodes.length} · 未匹配 {entry.unmatchedCodes.length}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className='mt-4 flex items-center justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                className='h-10 rounded-xl border-dashed text-xs font-black'
                onClick={clearSelection}
                disabled={submitting}
              >
                清空本次扫码
              </Button>
              <Button
                type='button'
                className='h-10 rounded-xl px-5 text-xs font-black'
                onClick={() => void completeScanSession()}
                disabled={submitting}
              >
                {submitting ? '提交中...' : '完成本次扫码'}
              </Button>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

