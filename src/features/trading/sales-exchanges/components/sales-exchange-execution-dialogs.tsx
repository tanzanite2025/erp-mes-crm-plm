import { useMemo, useState } from 'react'
import { CheckCircle2, PackageCheck, Truck } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useWarehouseCategoryOptions } from '@/features/warehouse/category'
import type { SalesExchangeExecutionBarcodePayload } from '../contracts/sales-exchange-api-dto'
import { useSalesExchangeMutations } from '../hooks/use-sales-exchanges'
import type { SalesExchangeDraftRecord } from '../types/sales-exchange-types'

type SalesExchangeExecutionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SalesExchangeDraftRecord
  isLoading?: boolean
}

type SalesExchangeReplacementShipmentDialogProps =
  SalesExchangeExecutionDialogProps & {
    salesOrderLineId?: number
  }

function parseExecutionBarcodes(
  rawValue: string,
  side: SalesExchangeExecutionBarcodePayload['side'],
  recognitionSource: SalesExchangeExecutionBarcodePayload['recognitionSource']
) {
  const uniqueCodes = Array.from(
    new Set(
      rawValue
        .split(/[\s,;，；、]+/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )

  return uniqueCodes.map<SalesExchangeExecutionBarcodePayload>((code) => ({
    rawLabelCode: code,
    normalizedLabelCode: code.toUpperCase(),
    recognizedAt: new Date().toISOString(),
    recognitionSource,
    side,
  }))
}

function createTodayDateInputValue() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

export function SalesExchangeOldItemInboundDialog({
  open,
  onOpenChange,
  record,
  isLoading = false,
  salesOrderLineId,
}: SalesExchangeExecutionDialogProps & { salesOrderLineId?: number }) {
  const categoryOptionsQuery = useWarehouseCategoryOptions()
  const { confirmOldItemInboundMutation } = useSalesExchangeMutations()
  const targetLine = useMemo(
    () =>
      record?.lines.find((line) => line.salesOrderLineId === salesOrderLineId),
    [record?.lines, salesOrderLineId]
  )
  const remainingQuantity = Math.max(
    0,
    (targetLine?.exchangeQuantity ?? 0) -
      (targetLine?.oldItemReceivedQuantity ?? 0)
  )
  const inboundCategories = useMemo(
    () =>
      (categoryOptionsQuery.data ?? [])
        .filter((category) => category.active && category.allowInbound)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [categoryOptionsQuery.data]
  )
  const defaultCategory =
    inboundCategories.find((category) => category.defaultForProductInbound)
      ?.value ??
    inboundCategories[0]?.value ??
    ''
  const [targetCategory, setTargetCategory] = useState(defaultCategory)
  const [inboundDate, setInboundDate] = useState(createTodayDateInputValue)
  const [batchNo, setBatchNo] = useState(record?.exchangeNo ?? '')
  const [quantity, setQuantity] = useState(
    remainingQuantity > 0 ? String(remainingQuantity) : ''
  )
  const [barcodeText, setBarcodeText] = useState('')
  const [remarks, setRemarks] = useState('')
  const [clientRequestId, setClientRequestId] = useState(() =>
    crypto.randomUUID()
  )
  const selectedTargetCategory = targetCategory || defaultCategory

  const handleSubmit = async () => {
    if (!record || !targetLine || typeof targetLine.id !== 'number') return
    if (!selectedTargetCategory) {
      toast.warning('请选择旧货入库仓库')
      return
    }
    const parsedQuantity = Number(quantity)
    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      parsedQuantity > remainingQuantity
    ) {
      toast.warning('入库数量必须大于 0 且不能超过该行剩余未入库数量')
      return
    }
    await confirmOldItemInboundMutation.mutateAsync({
      salesExchangeId: record.id,
      payload: {
        clientRequestId,
        salesExchangeLineId: targetLine.id,
        quantity: parsedQuantity,
        targetCategory: selectedTargetCategory,
        batchNo: batchNo.trim() || record.exchangeNo,
        inboundDate,
        remarks: remarks.trim(),
        barcodes: parseExecutionBarcodes(
          barcodeText,
          'OLD_ITEM',
          'warehouseScan'
        ),
      },
    })
    setClientRequestId(crypto.randomUUID())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='overflow-hidden rounded-[28px] border-none p-0 shadow-2xl sm:max-w-lg'>
        <div className='bg-background p-6'>
          <DialogHeader className='text-left'>
            <DialogTitle className='flex items-center gap-3 text-lg font-black tracking-tight'>
              <span className='flex size-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10'>
                <PackageCheck className='size-5 text-emerald-600' />
              </span>
              确认换货旧货入库
            </DialogTitle>
            <DialogDescription className='text-xs font-bold text-muted-foreground'>
              {isLoading
                ? '正在加载换货记录...'
                : `${record?.exchangeNo ?? '--'} / 行 ${targetLine?.lineNo ?? '--'} / 剩余 ${remainingQuantity.toLocaleString()} ${targetLine?.uom ?? ''}`}
            </DialogDescription>
          </DialogHeader>

          <div className='mt-5 grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                入库仓库
              </Label>
              <Select
                value={selectedTargetCategory}
                onValueChange={setTargetCategory}
              >
                <SelectTrigger className='h-11 rounded-2xl font-bold'>
                  <SelectValue placeholder='请选择仓库' />
                </SelectTrigger>
                <SelectContent>
                  {inboundCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                入库日期
              </Label>
              <Input
                type='date'
                value={inboundDate}
                onChange={(event) => setInboundDate(event.target.value)}
                className='h-11 rounded-2xl font-bold'
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                入库数量
              </Label>
              <Input
                type='number'
                min={0}
                step='0.01'
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className='h-11 rounded-2xl font-black'
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                旧货条码
              </Label>
              <Textarea
                value={barcodeText}
                onChange={(event) => setBarcodeText(event.target.value)}
                rows={3}
                placeholder='可粘贴多个条码，用空格、换行或逗号分隔'
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                批次
              </Label>
              <Input
                value={batchNo}
                onChange={(event) => setBatchNo(event.target.value)}
                className='h-11 rounded-2xl font-bold'
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                备注
              </Label>
              <Textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2 bg-muted/20 px-6 py-4'>
          <Button
            type='button'
            variant='ghost'
            className='rounded-full text-[10px] font-black tracking-widest uppercase'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type='button'
            className='rounded-full text-[10px] font-black tracking-widest uppercase'
            disabled={
              isLoading ||
              confirmOldItemInboundMutation.isPending ||
              !record ||
              !targetLine
            }
            onClick={() => void handleSubmit()}
          >
            <CheckCircle2 className='mr-1 size-3.5' />
            {confirmOldItemInboundMutation.isPending ? '提交中' : '确认入库'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function SalesExchangeReplacementShipmentDialog({
  open,
  onOpenChange,
  record,
  isLoading = false,
  salesOrderLineId,
}: SalesExchangeReplacementShipmentDialogProps) {
  const categoryOptionsQuery = useWarehouseCategoryOptions()
  const { confirmReplacementShipmentMutation } = useSalesExchangeMutations()
  const targetLine = useMemo(
    () =>
      record?.lines.find((line) => line.salesOrderLineId === salesOrderLineId),
    [record?.lines, salesOrderLineId]
  )
  const remainingQuantity = Math.max(
    0,
    (targetLine?.exchangeQuantity ?? 0) -
      (targetLine?.replacementShippedQuantity ?? 0)
  )
  const shipmentCategories = useMemo(
    () =>
      (categoryOptionsQuery.data ?? [])
        .filter((category) => category.active && category.allowShipment)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [categoryOptionsQuery.data]
  )
  const defaultCategory = shipmentCategories[0]?.value ?? ''
  const [sourceCategory, setSourceCategory] = useState(defaultCategory)
  const [shipmentDate, setShipmentDate] = useState(createTodayDateInputValue)
  const [batchNo, setBatchNo] = useState(record?.exchangeNo ?? '')
  const [quantity, setQuantity] = useState(
    remainingQuantity > 0 ? String(remainingQuantity) : ''
  )
  const [replacementTrackingNo, setReplacementTrackingNo] = useState(
    record?.replacementTrackingNo ?? ''
  )
  const [barcodeText, setBarcodeText] = useState('')
  const [remarks, setRemarks] = useState('')
  const [clientRequestId, setClientRequestId] = useState(() =>
    crypto.randomUUID()
  )
  const selectedSourceCategory = sourceCategory || defaultCategory

  const handleSubmit = async () => {
    if (!record || !targetLine) return
    if (typeof targetLine.id !== 'number') {
      toast.warning('缺少换货明细 ID，无法确认补发')
      return
    }
    const parsedQuantity = Number(quantity)
    if (!selectedSourceCategory) {
      toast.warning('请选择补发出库仓库')
      return
    }
    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      parsedQuantity > remainingQuantity
    ) {
      toast.warning('补发数量必须大于 0 且不能超过剩余未补发数量')
      return
    }
    if (
      targetLine.oldItemReceivedQuantity + 1e-9 <
      targetLine.exchangeQuantity
    ) {
      toast.warning('旧货尚未全部入库，不能确认补发')
      return
    }

    await confirmReplacementShipmentMutation.mutateAsync({
      salesExchangeId: record.id,
      payload: {
        clientRequestId,
        sourceCategory: selectedSourceCategory,
        batchNo: batchNo.trim() || record.exchangeNo,
        shipmentDate,
        replacementTrackingNo: replacementTrackingNo.trim() || undefined,
        remarks: remarks.trim() || undefined,
        lines: [
          {
            salesExchangeLineId: Number(targetLine.id),
            quantity: parsedQuantity,
            barcodes: parseExecutionBarcodes(
              barcodeText,
              'REPLACEMENT_ITEM',
              'shipmentScan'
            ),
          },
        ],
      },
    })
    setClientRequestId(crypto.randomUUID())
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='overflow-hidden rounded-[28px] border-none p-0 shadow-2xl sm:max-w-xl'>
        <div className='bg-background p-6'>
          <DialogHeader className='text-left'>
            <DialogTitle className='flex items-center gap-3 text-lg font-black tracking-tight'>
              <span className='flex size-10 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10'>
                <Truck className='size-5 text-sky-600' />
              </span>
              确认换货补发
            </DialogTitle>
            <DialogDescription className='text-xs font-bold text-muted-foreground'>
              {isLoading
                ? '正在加载换货记录...'
                : `${record?.exchangeNo ?? '--'} / 行 ${targetLine?.lineNo ?? '--'} / 剩余 ${remainingQuantity.toLocaleString()} ${targetLine?.uom ?? ''}`}
            </DialogDescription>
          </DialogHeader>

          <div className='mt-5 grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                出库仓库
              </Label>
              <Select
                value={selectedSourceCategory}
                onValueChange={setSourceCategory}
              >
                <SelectTrigger className='h-11 rounded-2xl font-bold'>
                  <SelectValue placeholder='请选择仓库' />
                </SelectTrigger>
                <SelectContent>
                  {shipmentCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                出库日期
              </Label>
              <Input
                type='date'
                value={shipmentDate}
                onChange={(event) => setShipmentDate(event.target.value)}
                className='h-11 rounded-2xl font-bold'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                补发数量
              </Label>
              <Input
                type='number'
                min={0}
                step='0.01'
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className='h-11 rounded-2xl font-black'
              />
            </div>
            <div className='space-y-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                批次
              </Label>
              <Input
                value={batchNo}
                onChange={(event) => setBatchNo(event.target.value)}
                className='h-11 rounded-2xl font-bold'
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                补发运单号
              </Label>
              <Input
                value={replacementTrackingNo}
                onChange={(event) =>
                  setReplacementTrackingNo(event.target.value)
                }
                className='h-11 rounded-2xl font-bold'
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                补发条码
              </Label>
              <Textarea
                value={barcodeText}
                onChange={(event) => setBarcodeText(event.target.value)}
                rows={3}
                placeholder='可粘贴多个条码，用空格、换行或逗号分隔'
              />
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                备注
              </Label>
              <Textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter className='gap-2 bg-muted/20 px-6 py-4'>
          <Button
            type='button'
            variant='ghost'
            className='rounded-full text-[10px] font-black tracking-widest uppercase'
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            type='button'
            className='rounded-full text-[10px] font-black tracking-widest uppercase'
            disabled={
              isLoading ||
              confirmReplacementShipmentMutation.isPending ||
              typeof targetLine?.id !== 'number'
            }
            onClick={() => void handleSubmit()}
          >
            <CheckCircle2 className='mr-1 size-3.5' />
            {confirmReplacementShipmentMutation.isPending
              ? '提交中'
              : '确认补发'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
