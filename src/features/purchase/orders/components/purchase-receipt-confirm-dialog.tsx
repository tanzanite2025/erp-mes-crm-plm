'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, CheckCheck, Package, Tag, Warehouse } from 'lucide-react'
import { failLoudly } from '@/lib/safe-catch'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import {
  WarehouseCategoryCoreService,
  type WarehouseCategoryOption,
} from '@/features/warehouse/services/warehouse-category-core-service'
import { filterWarehouseCategoriesByScene } from '@/features/warehouse/utils/warehouse-category-config'
import { getPurchaseStatusDisplayMeta } from '../data/purchase-status'
import { type PurchaseOrder } from '../data/schema'
import type { ConfirmPurchaseReceiptPayload } from '../services/purchase-transaction-service'

interface ReceiptLineFormItem {
  purchaseOrderLineId: number
  orderLineVersion: number
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

function buildDefaultReceiptLines(
  order: PurchaseOrder | undefined
): ReceiptLineFormItem[] {
  if (!order) {
    return []
  }

  return (order.lines || [])
    .map((line) => {
      const remainingQty = Math.max(
        (line.qty || 0) - (line.receivedQty || 0) - (line.returnedQty || 0),
        0
      )
      if (!line.id || remainingQty <= 0) return null
      if (line.version == null) {
        throw new Error(
          `[CRITICAL] Missing purchase order line version for receipt confirmation on line ${line.id}`
        )
      }
      return {
        purchaseOrderLineId: line.id,
        orderLineVersion: line.version,
        materialId: line.materialId,
        lineNo: line.lineNo,
        materialName: line.materialName,
        materialCode: line.materialCode,
        specification: line.specification,
        // [UI-PREVIEW-VALUE]: 剩余待收数量由 UI 实时试算，仅供预览，权威值由后端库存引擎校验。
        remainingQty,
        quantity: remainingQty,
        purchasePrice: line.price || 0,
        // [UI-SUGGESTED-ID]: 默认批次号仅供建议，权威唯一 ID 将在入库事务提及时生成。
        batchNo: `${order.orderNo || 'PO'}-L${line.lineNo}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
        targetCategory: '',
      }
    })
    .filter((line): line is ReceiptLineFormItem => line !== null)
}

function resolvePurchaseReceiptCategoryLookup(
  options: WarehouseCategoryOption[]
) {
  const filteredOptions = filterWarehouseCategoriesByScene(
    options,
    'purchase-receipt'
  )
  if (filteredOptions.length === 0) {
    throw new Error(
      '[CRITICAL] Missing warehouse categories for purchase receipt scene'
    )
  }

  const defaultCategory =
    filteredOptions.find((category) => category.code === 'MATERIAL') ??
    filteredOptions.find((category) => category.defaultForPurchaseReceipt)

  if (!defaultCategory) {
    throw new Error(
      '[CRITICAL] Missing default warehouse category for purchase receipt scene'
    )
  }

  return {
    filteredOptions,
    defaultCategoryCode: defaultCategory.code,
  }
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
  const [warehouseCategories, setWarehouseCategories] = useState<
    WarehouseCategoryOption[]
  >([])
  const [isWarehouseCategoryLoading, setIsWarehouseCategoryLoading] =
    useState(true)
  const [warehouseCategoryLookupError, setWarehouseCategoryLookupError] =
    useState<Error | null>(null)
  const [receiptDate, setReceiptDate] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [remarks, setRemarks] = useState(
    t('purchase.orders.detailReceiptAutoRemarks')
  )
  const [lines, setLines] = useState<ReceiptLineFormItem[]>(() =>
    buildDefaultReceiptLines(order)
  )
  const statusMeta = getPurchaseStatusDisplayMeta(order.status, t)

  const editableLines = useMemo(
    () => lines.filter((line) => line.remainingQty > 0),
    [lines]
  )

  useEffect(() => {
    let isActive = true

    setIsWarehouseCategoryLoading(true)
    setWarehouseCategoryLookupError(null)

    void (async () => {
      try {
        const options = await WarehouseCategoryCoreService.getCategoryOptions()
        const { filteredOptions, defaultCategoryCode } =
          resolvePurchaseReceiptCategoryLookup(options)

        if (!isActive) return

        setWarehouseCategories(filteredOptions)
        setLines((prev) =>
          prev.map((line) => ({
            ...line,
            targetCategory: line.targetCategory || defaultCategoryCode,
          }))
        )
      } catch (error) {
        const resolvedError =
          error instanceof Error
            ? error
            : new Error(
                '[CRITICAL] Warehouse category lookup failed for purchase receipt dialog'
              )
        failLoudly(
          resolvedError,
          'PurchaseReceiptConfirmDialog.warehouseCategories'
        )

        if (!isActive) return
        setWarehouseCategoryLookupError(resolvedError)
      } finally {
        if (isActive) {
          setIsWarehouseCategoryLoading(false)
        }
      }
    })()

    return () => {
      isActive = false
    }
  }, [])

  if (warehouseCategoryLookupError) {
    throw warehouseCategoryLookupError
  }

  const updateLine = (
    purchaseOrderLineId: number,
    patch: Partial<ReceiptLineFormItem>
  ) => {
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
    if (isWarehouseCategoryLoading) return

    const normalizedLines = editableLines
      .map((line) => {
        const requestedQuantity = Number(line.quantity)
        if (!Number.isFinite(requestedQuantity) || requestedQuantity < 0) {
          throw new Error(
            `[CRITICAL] Invalid receipt quantity for purchase order line ${line.purchaseOrderLineId}`
          )
        }

        const purchasePrice = Number(line.purchasePrice)
        if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
          throw new Error(
            `[CRITICAL] Invalid purchase price for purchase order line ${line.purchaseOrderLineId}`
          )
        }

        return {
          purchaseOrderLineId: line.purchaseOrderLineId,
          orderLineVersion: line.orderLineVersion,
          materialId: line.materialId,
          quantity: requestedQuantity,
          purchasePrice,
          batchNo: line.batchNo.trim(),
          targetCategory: line.targetCategory.trim(),
        }
      })
      .filter((line) => line.quantity > 0 && line.targetCategory)

    if (normalizedLines.length === 0) return

    onConfirm({
      remarks,
      receiptDate: new Date(`${receiptDate}T00:00:00`).toISOString(),
      lines: normalizedLines,
    })
  }

  return (
    <div className='relative max-h-[85vh] space-y-6 overflow-y-auto p-5 md:p-8'>
      <DialogHeader className='text-left'>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
          <DialogTitle className='flex items-center gap-2 text-base font-black tracking-widest uppercase md:text-lg'>
            <CheckCheck className='size-5 text-primary' />
            {t('purchase.orders.detailConfirmReceipt')}
          </DialogTitle>
          <div className='flex items-center gap-3'>
            <span className='text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase'>
              {order.orderNo}
            </span>
            <AuditStatusDisplay meta={statusMeta} />
          </div>
        </div>
        <DialogDescription className='text-[11px] font-bold text-muted-foreground'>
          {t('purchase.orders.receiptDialogDescription')}
        </DialogDescription>

        {/* [BACKEND-AUTHORITY] 架构提示 */}
        <div className='mt-4 rounded-2xl border border-dashed border-amber-500/20 bg-amber-500/5 p-3'>
          <p className='flex items-center gap-2 text-[9px] font-black tracking-widest text-amber-600 uppercase'>
            <span className='size-1.5 animate-pulse rounded-full bg-amber-500' />
            [UI-DERIVED-PREVIEW] 后端权威校验已开启
          </p>
          <p className='mt-1 text-[8px] leading-relaxed font-bold text-amber-600/60'>
            当前显示的待收数量与系统批次号为 UI
            实时生成的【逻辑预览值】。实际入库数量将由服务器在执行事务时，基于最新的库存与对账快照进行二次验证，以确保财务合规。
          </p>
        </div>
      </DialogHeader>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <div className='space-y-1.5'>
          <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <Calendar className='mr-2 inline size-3 text-primary' />
            {t('purchase.orders.receiptDialogDate')}
          </Label>
          <Input
            type='date'
            value={receiptDate}
            onChange={(e) => setReceiptDate(e.target.value)}
            className='h-10 rounded-xl'
          />
        </div>
        <div className='space-y-1.5'>
          <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
            <Tag className='mr-2 inline size-3 text-primary' />
            {t('purchase.orders.receiptDialogRemarks')}
          </Label>
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className='h-10 rounded-xl'
          />
        </div>
      </div>

      <div className='space-y-4'>
        {editableLines.map((line) => (
          <div
            key={line.purchaseOrderLineId}
            className='space-y-4 rounded-[24px] border border-dashed p-4'
          >
            <div className='flex items-start justify-between gap-4'>
              <div>
                <div className='text-[12px] font-black'>
                  {line.materialName}
                </div>
                <div className='text-[10px] font-bold text-muted-foreground'>
                  {line.materialCode} | {line.specification}
                </div>
              </div>
              <div className='text-right'>
                <div className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  {t('purchase.orders.receiptDialogRemainingQty')} [PREVIEW]
                </div>
                <div className='text-[12px] font-black text-primary'>
                  {line.remainingQty}
                </div>
                <div className='mt-1 text-[9px] font-bold text-rose-500/80'>
                  {t('purchase.orders.returns.alreadyReturned')}:{' '}
                  {order.lines.find(
                    (item) => item.id === line.purchaseOrderLineId
                  )?.returnedQty || 0}
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <Package className='mr-2 inline size-3 text-primary' />
                  {t('purchase.orders.receiptDialogQuantity')}
                </Label>
                <Input
                  type='number'
                  min={0}
                  max={line.remainingQty}
                  step='0.01'
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.purchaseOrderLineId, {
                      quantity: Number(e.target.value),
                    })
                  }
                  className='h-10 rounded-xl'
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <Tag className='mr-2 inline size-3 text-primary' />
                  {t('purchase.orders.receiptDialogBatchNo')}
                </Label>
                <Input
                  value={line.batchNo}
                  onChange={(e) =>
                    updateLine(line.purchaseOrderLineId, {
                      batchNo: e.target.value,
                    })
                  }
                  className='h-10 rounded-xl'
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                  <Warehouse className='mr-2 inline size-3 text-primary' />
                  {t('purchase.orders.receiptDialogTargetCategory')}
                </Label>
                <Select
                  value={line.targetCategory}
                  onValueChange={(value) =>
                    updateLine(line.purchaseOrderLineId, {
                      targetCategory: value,
                    })
                  }
                  disabled={isWarehouseCategoryLoading}
                >
                  <SelectTrigger className='h-10 rounded-xl'>
                    <SelectValue
                      placeholder={t(
                        'purchase.orders.receiptDialogSelectCategory'
                      )}
                    />
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
        <Button
          variant='ghost'
          onClick={() => onOpenChange(false)}
          className='rounded-2xl'
        >
          {t('purchase.orders.receiptDialogCancel')}
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={
            isSubmitting ||
            isWarehouseCategoryLoading ||
            editableLines.length === 0
          }
          className='rounded-2xl'
        >
          {isSubmitting
            ? t('purchase.orders.receiptDialogSubmitting')
            : t('purchase.orders.receiptDialogSubmit')}
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
      <DialogContent className='w-[95vw] overflow-hidden rounded-2xl border-none p-0 shadow-2xl sm:max-w-[980px] md:rounded-[32px]'>
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
