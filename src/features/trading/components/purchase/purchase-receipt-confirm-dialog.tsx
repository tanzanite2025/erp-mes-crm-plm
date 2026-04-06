'use client'

import { useMemo, useState } from 'react'
import { Calendar, CheckCheck, Package, Tag, Warehouse } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useLanguage } from '@/context/language-provider'
import { dictionaryService } from '@/features/basic-settings/services/dictionary-service'
import { type PurchaseOrder } from '../../data/schema'
import type { ConfirmPurchaseReceiptPayload } from '../../services/purchase-service'

interface ReceiptLineFormItem {
  purchaseOrderLineId: number
  materialId: string
  lineNo: number
  materialName: string
  materialCode: string
  specification: string
  remainingQty: number
  quantity: number
  purchasePrice: number
  batchNo: string
  targetCategory: string
}

interface PurchaseReceiptConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PurchaseOrder | undefined
  onConfirm: (payload: ConfirmPurchaseReceiptPayload) => void
  isSubmitting?: boolean
}

function buildDefaultReceiptLines(order: PurchaseOrder | undefined): ReceiptLineFormItem[] {
  if (!order) {
    return []
  }

  return (order.lines || [])
    .map((line) => {
      const remainingQty = Math.max((line.qty || 0) - (line.receivedQty || 0), 0)
      if (!line.id || remainingQty <= 0) return null
      return {
        purchaseOrderLineId: line.id,
        materialId: line.materialId,
        lineNo: line.lineNo,
        materialName: line.materialName,
        materialCode: line.materialCode,
        specification: line.specification,
        remainingQty,
        quantity: remainingQty,
        purchasePrice: line.price || 0,
        batchNo: `${order.orderNo || 'PO'}-L${line.lineNo}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        targetCategory: line.materialId ? 'MATERIAL' : '',
      }
    })
    .filter((line): line is ReceiptLineFormItem => line !== null)
}

function PurchaseReceiptConfirmDialogBody({
  order,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  order: PurchaseOrder
  onOpenChange: (open: boolean) => void
  onConfirm: (payload: ConfirmPurchaseReceiptPayload) => void
  isSubmitting: boolean
}) {
  const { t } = useLanguage()
  const warehouseCategories = useMemo(
    () => (dictionaryService.getOptions('WAREHOUSE_CATEGORY') || []) as Array<{ value: string; label: string }>,
    []
  )
  const [receiptDate, setReceiptDate] = useState(new Date().toISOString().slice(0, 10))
  const [remarks, setRemarks] = useState(t('purchase.orders.detailReceiptAutoRemarks'))
  const [lines, setLines] = useState<ReceiptLineFormItem[]>(() => buildDefaultReceiptLines(order))

  const editableLines = useMemo(() => lines.filter((line) => line.remainingQty > 0), [lines])

  const updateLine = (purchaseOrderLineId: number, patch: Partial<ReceiptLineFormItem>) => {
    setLines((prev) =>
      prev.map((line) =>
        line.purchaseOrderLineId === purchaseOrderLineId
          ? {
              ...line,
              ...patch,
            }
          : line
      )
    )
  }

  const handleConfirm = () => {
    const normalizedLines = editableLines
      .map((line) => ({
        purchaseOrderLineId: line.purchaseOrderLineId,
        materialId: line.materialId,
        quantity: Math.min(Math.max(line.quantity || 0, 0), line.remainingQty),
        purchasePrice: Math.max(line.purchasePrice || 0, 0),
        batchNo: line.batchNo.trim(),
        targetCategory: line.targetCategory.trim(),
      }))
      .filter((line) => line.quantity > 0 && line.targetCategory)

    if (normalizedLines.length === 0) return

    onConfirm({
      remarks,
      receiptDate: new Date(`${receiptDate}T00:00:00`).toISOString(),
      lines: normalizedLines,
    })
  }

  return (
    <div className='relative p-5 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto'>
      <DialogHeader className='text-left'>
        <DialogTitle className='flex items-center gap-2 text-base md:text-lg font-black uppercase tracking-widest'>
          <CheckCheck className='size-5 text-primary' />
          {t('purchase.orders.detailConfirmReceipt')}
        </DialogTitle>
        <DialogDescription className='text-[11px] font-bold text-muted-foreground'>
          {t('purchase.orders.receiptDialogDescription')}
        </DialogDescription>
      </DialogHeader>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <div className='space-y-1.5'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
            <Calendar className='inline mr-2 size-3 text-primary' />
            {t('purchase.orders.receiptDialogDate')}
          </Label>
          <Input type='date' value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className='h-10 rounded-xl' />
        </div>
        <div className='space-y-1.5'>
          <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
            <Tag className='inline mr-2 size-3 text-primary' />
            {t('purchase.orders.receiptDialogRemarks')}
          </Label>
          <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} className='h-10 rounded-xl' />
        </div>
      </div>

      <div className='space-y-4'>
        {editableLines.map((line) => (
          <div key={line.purchaseOrderLineId} className='rounded-[24px] border border-dashed p-4 space-y-4'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <div className='text-[12px] font-black'>{line.materialName}</div>
                <div className='text-[10px] font-bold text-muted-foreground'>
                  {line.materialCode} | {line.specification}
                </div>
              </div>
              <div className='text-right'>
                <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  {t('purchase.orders.receiptDialogRemainingQty')}
                </div>
                <div className='text-[12px] font-black text-primary'>{line.remainingQty}</div>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  <Package className='inline mr-2 size-3 text-primary' />
                  {t('purchase.orders.receiptDialogQuantity')}
                </Label>
                <Input
                  type='number'
                  min={0}
                  max={line.remainingQty}
                  step='0.01'
                  value={line.quantity}
                  onChange={(e) => updateLine(line.purchaseOrderLineId, { quantity: Number(e.target.value) })}
                  className='h-10 rounded-xl'
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  <Tag className='inline mr-2 size-3 text-primary' />
                  {t('purchase.orders.receiptDialogBatchNo')}
                </Label>
                <Input
                  value={line.batchNo}
                  onChange={(e) => updateLine(line.purchaseOrderLineId, { batchNo: e.target.value })}
                  className='h-10 rounded-xl'
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
                  <Warehouse className='inline mr-2 size-3 text-primary' />
                  {t('purchase.orders.receiptDialogTargetCategory')}
                </Label>
                <Select
                  value={line.targetCategory}
                  onValueChange={(value) => updateLine(line.purchaseOrderLineId, { targetCategory: value })}
                >
                  <SelectTrigger className='h-10 rounded-xl'>
                    <SelectValue placeholder={t('purchase.orders.receiptDialogSelectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouseCategories.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='flex items-center justify-end gap-3 pt-2'>
        <Button variant='ghost' onClick={() => onOpenChange(false)} className='rounded-2xl'>
          {t('purchase.orders.receiptDialogCancel')}
        </Button>
        <Button onClick={handleConfirm} disabled={isSubmitting || editableLines.length === 0} className='rounded-2xl'>
          {isSubmitting ? t('purchase.orders.receiptDialogSubmitting') : t('purchase.orders.receiptDialogSubmit')}
        </Button>
      </div>
    </div>
  )
}

export function PurchaseReceiptConfirmDialog({
  open,
  onOpenChange,
  order,
  onConfirm,
  isSubmitting = false,
}: PurchaseReceiptConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] sm:max-w-[980px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
        {open && order ? (
          <PurchaseReceiptConfirmDialogBody
            key={`${order.id}-${open ? 'open' : 'closed'}`}
            order={order}
            onOpenChange={onOpenChange}
            onConfirm={onConfirm}
            isSubmitting={isSubmitting}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
