import { useMemo, useState } from 'react'
import { CheckCircle2, PackageCheck } from 'lucide-react'
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
import { useSalesReturnMutations } from '@/features/trading/sales/hooks/use-sales-returns'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'
import { useWarehouseCategoryOptions } from '@/features/warehouse/category'

type SalesReturnInboundDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  record?: SalesReturnRecord
  isLoading?: boolean
  salesOrderLineId?: number
}

function createTodayDateInputValue() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function parseBarcodeLines(rawValue: string, salesReturnLineId: number) {
  const uniqueCodes = Array.from(
    new Set(
      rawValue
        .split(/[\s,;，；、]+/g)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )

  return uniqueCodes.map((code) => ({
    salesReturnLineId,
    rawCode: code,
    normalizedCode: code.toUpperCase(),
    bindSource: 'WAREHOUSE_SCAN',
    verificationStatus: 'MATCHED',
  }))
}

export function SalesReturnInboundDialog({
  open,
  onOpenChange,
  record,
  isLoading = false,
  salesOrderLineId,
}: SalesReturnInboundDialogProps) {
  const categoryOptionsQuery = useWarehouseCategoryOptions()
  const { confirmInboundMutation } = useSalesReturnMutations()
  const targetLine = useMemo(
    () =>
      record?.lines.find((line) => line.salesOrderLineId === salesOrderLineId),
    [record?.lines, salesOrderLineId]
  )
  const remainingQuantity = Math.max(
    0,
    (targetLine?.quantity ?? 0) - (targetLine?.receivedQuantity ?? 0)
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
  const [batchNo, setBatchNo] = useState(record?.returnNo ?? '')
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
    if (!record || !targetLine) return
    const parsedQuantity = Number(quantity)
    if (!selectedTargetCategory) {
      toast.warning('请选择入库仓库')
      return
    }
    if (
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      parsedQuantity > remainingQuantity
    ) {
      toast.warning('入库数量必须大于 0 且不能超过剩余未入库数量')
      return
    }

    await confirmInboundMutation.mutateAsync({
      salesReturnId: record.id,
      payload: {
        clientRequestId,
        targetCategory: selectedTargetCategory,
        batchNo: batchNo.trim() || record.returnNo,
        inboundDate,
        remarks: remarks.trim() || undefined,
        lines: [
          {
            salesReturnLineId: targetLine.id,
            quantity: parsedQuantity,
            barcodes: parseBarcodeLines(barcodeText, targetLine.id),
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
              <span className='flex size-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10'>
                <PackageCheck className='size-5 text-emerald-600' />
              </span>
              确认退货入库
            </DialogTitle>
            <DialogDescription className='text-xs font-bold text-muted-foreground'>
              {isLoading
                ? '正在加载退货记录...'
                : `${record?.returnNo ?? '--'} / 行 ${targetLine?.lineNo ?? '--'} / 剩余 ${remainingQuantity.toLocaleString()} ${targetLine?.uom ?? ''}`}
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
            <div className='space-y-2'>
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
                退回条码
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
              <Input
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                className='h-11 rounded-2xl font-bold'
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
              isLoading || confirmInboundMutation.isPending || !targetLine
            }
            onClick={() => void handleSubmit()}
          >
            <CheckCircle2 className='mr-1 size-3.5' />
            {confirmInboundMutation.isPending ? '提交中' : '确认入库'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
