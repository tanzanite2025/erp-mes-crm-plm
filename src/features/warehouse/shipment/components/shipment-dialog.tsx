'use client'

import {
  Truck,
  Warehouse,
  Calendar,
  TrendingDown,
  FileText,
  Tag,
  User,
  Save,
  Send,
  AlertTriangle,
  Database,
} from 'lucide-react'
import { auditUtils } from '@/lib/audit-utils'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import type { SalesOrder } from '@/features/trading/data/schema'
import type { WarehouseCategoryOption } from '../../category/data/schema'
import type { MasterDataSearchResult } from '../../inventory'
import type {
  ShipmentFormData,
  ShipmentFormMode,
  ShipmentFormUpdater,
} from '../data/schema'
import type { ShipmentInventoryContextResource } from '../hooks/use-shipment-inventory-context'

interface ShipmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedItem: MasterDataSearchResult | null
  formData: ShipmentFormData
  setFormData: (data: ShipmentFormUpdater) => void
  warehouseCategories: WarehouseCategoryOption[]
  formMode: ShipmentFormMode
  onSubmit: (status: 'DRAFT' | 'COMMITTED') => void
  inventoryContextResource: ShipmentInventoryContextResource
  onRetryInventoryContext: () => void
  materialThreshold?: number
  salesOrders?: SalesOrder[]
}

export function ShipmentDialog({
  open,
  onOpenChange,
  selectedItem,
  formData,
  setFormData,
  warehouseCategories,
  formMode,
  onSubmit,
  inventoryContextResource,
  onRetryInventoryContext,
  materialThreshold = 0,
  salesOrders = [],
}: ShipmentDialogProps) {
  const { t } = useLanguage()

  if (!selectedItem) return null

  const isVirtualLock = formMode === 'virtualLock'
  const selectableCategories = isVirtualLock
    ? warehouseCategories.filter(
        (category) => category.value !== 'SHIPPING_VIRTUAL'
      )
    : warehouseCategories
  const readyInventoryContext =
    inventoryContextResource.status === 'ready'
      ? inventoryContextResource
      : null
  const remainingStock = (selectedItem.stock || 0) - (formData.quantity || 0)
  const isBelowSafety =
    materialThreshold > 0 && remainingStock < materialThreshold

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] overflow-hidden rounded-2xl border-none bg-background p-0 shadow-2xl sm:max-w-[850px] md:rounded-[32px]'>
        <div className='relative flex h-20 shrink-0 items-center overflow-hidden bg-blue-600 px-5 md:h-24 md:px-8'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/20 via-transparent to-black/20' />
          <div
            className='pointer-events-none absolute top-0 left-0 h-full w-full opacity-10'
            style={{
              backgroundImage:
                'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />

          <div className='relative flex w-full items-center justify-between gap-4 overflow-hidden'>
            <div className='flex items-center gap-4 overflow-hidden md:gap-5'>
              <div className='flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-md md:size-12 md:rounded-[18px]'>
                <Truck className='size-5 text-white md:size-6' />
              </div>
              <div className='space-y-0.5 overflow-hidden'>
                <h3 className='truncate text-base font-black tracking-widest text-white uppercase italic md:text-lg'>
                  {isVirtualLock
                    ? '转入虚拟发货仓'
                    : t('warehouse.shipment.dialog.title')}
                </h3>
                <div className='flex items-center gap-2 truncate'>
                  <Badge className='h-3.5 shrink-0 rounded-full border-none bg-white/20 px-1.5 text-[7px] leading-none font-black tracking-widest text-white uppercase md:text-[8px]'>
                    {t('warehouse.shipment.dialog.masterNode')}
                  </Badge>
                  <span className='truncate font-mono text-[8px] font-black tracking-widest text-blue-100/60 uppercase md:text-[9px]'>
                    {selectedItem.name} ({selectedItem.code})
                  </span>
                </div>
              </div>
            </div>
            <div className='hidden shrink-0 sm:flex'>
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.shipment}
                targetName={
                  isVirtualLock
                    ? '转入虚拟发货仓'
                    : t('warehouse.shipment.dialog.title')
                }
                label={t('common.audit.trigger')}
                className='h-10 rounded-full border-white/30 bg-white/10 px-4 text-white hover:bg-white/20 hover:text-white'
              />
            </div>
          </div>

          <div className='pointer-events-none absolute top-1/2 right-8 hidden -translate-y-1/2 flex-col items-end opacity-20 md:flex'>
            <span className='text-[9px] font-black tracking-widest text-white uppercase'>
              {t('warehouse.shipment.dialog.transactionLayer')}
            </span>
            <span className='text-[9px] font-black tracking-widest text-white uppercase'>
              TS_0928_NODE
            </span>
          </div>
        </div>

        {inventoryContextResource.status === 'error' ? (
          <div className='flex min-h-[420px] items-center justify-center bg-background px-6 py-10 text-center'>
            <div className='flex max-w-md flex-col items-center gap-3 rounded-[24px] border border-dashed border-rose-200 bg-rose-50/60 px-6 py-8'>
              <AlertTriangle className='size-8 text-rose-500' />
              <div className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>
                {t('warehouse.errors.queryFailed')}
              </div>
              <p className='text-[11px] leading-relaxed font-bold text-foreground'>
                {inventoryContextResource.error.message}
              </p>
              <Button
                type='button'
                variant='outline'
                className='h-9 rounded-full border-dashed px-5 text-[10px] font-black tracking-widest uppercase'
                onClick={onRetryInventoryContext}
              >
                重试
              </Button>
            </div>
          </div>
        ) : inventoryContextResource.status === 'loading' ? (
          <div className='flex min-h-[420px] items-center justify-center bg-background px-6 py-10 text-center'>
            <div className='flex max-w-md flex-col items-center gap-3 rounded-[24px] border border-dashed border-muted/40 bg-muted/5 px-6 py-8'>
              <Database className='size-8 animate-pulse text-blue-500/50' />
              <div className='text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                {t('warehouse.shipment.dialog.realtimeIndex')}
              </div>
              <p className='text-[11px] leading-relaxed font-bold text-muted-foreground'>
                正在加载库存上下文，请稍候。
              </p>
            </div>
          </div>
        ) : (
          <div className='flex max-h-[80vh] flex-col overflow-y-auto bg-background lg:h-[540px] lg:flex-row lg:overflow-visible'>
            <div className='flex-1 space-y-6 overflow-y-auto p-5 md:p-6'>
              <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8'>
                <div className='space-y-6'>
                  <div className='space-y-1.5'>
                    <Label className='group flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      <Warehouse className='size-3 text-blue-500' />{' '}
                      {t('warehouse.shipment.dialog.sourceArea')}
                    </Label>
                    <Select
                      value={formData.sourceCategory}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          sourceCategory: val,
                        }))
                      }
                    >
                      <SelectTrigger className='h-10 rounded-xl border-none bg-muted/30 text-sm font-bold focus:ring-blue-500'>
                        <SelectValue
                          placeholder={t(
                            'warehouse.shipment.dialog.selectArea'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className='rounded-2xl border-none shadow-2xl'>
                        {selectableCategories.map((cat) => (
                          <SelectItem
                            key={cat.value}
                            value={cat.value}
                            className='mx-1 my-1 rounded-xl transition-colors focus:bg-blue-500 focus:text-white'
                          >
                            <div className='flex w-full items-center justify-between gap-8 pr-2'>
                              <span className='text-[11px] font-black tracking-widest uppercase'>
                                {cat.label}
                              </span>
                              <span className='font-mono text-[9px] opacity-40'>
                                {t('warehouse.shipment.dialog.available', {
                                  count:
                                    readyInventoryContext?.inventoryBreakdown[
                                      cat.value
                                    ] || 0,
                                })}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      <TrendingDown className='size-3 text-blue-500' />{' '}
                      {t('warehouse.shipment.dialog.quantity')}
                    </Label>
                    <div className='group relative'>
                      <Input
                        type='number'
                        className='h-10 rounded-xl border-none bg-muted/30 pr-20 font-mono text-lg font-black text-blue-600 focus-visible:ring-blue-500'
                        value={formData.quantity}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            quantity: Number(e.target.value),
                          }))
                        }
                      />
                      <div className='absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center gap-1.5'>
                        <span className='text-[9px] font-black text-muted-foreground/30 uppercase'>
                          {selectedItem.uom}
                        </span>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='h-7 rounded-lg bg-blue-500/10 px-2 text-[9px] font-black tracking-widest text-blue-600 uppercase hover:bg-blue-500/20'
                          onClick={() =>
                            setFormData({
                              quantity:
                                readyInventoryContext?.categoryStock ?? 0,
                            })
                          }
                        >
                          {t('warehouse.shipment.dialog.max')}
                        </Button>
                      </div>
                    </div>

                    <div className='flex items-center justify-between px-1'>
                      <span className='text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                        {t('warehouse.shipment.dialog.areaAvailable', {
                          count: readyInventoryContext?.categoryStock ?? 0,
                        })}
                      </span>
                      {formData.quantity >
                        (readyInventoryContext?.categoryStock ?? 0) && (
                        <Badge className='animate-pulse rounded-full border-none bg-rose-500 px-2 text-[8px] font-black tracking-widest text-white uppercase'>
                          {t('warehouse.shipment.dialog.insufficientStock')}
                        </Badge>
                      )}
                    </div>

                    {isBelowSafety && (
                      <div className='flex animate-in gap-4 rounded-2xl border border-dashed border-rose-500/30 bg-rose-500/5 p-4 duration-300 zoom-in-95 fade-in'>
                        <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-500/10'>
                          <AlertTriangle className='size-4 text-rose-600' />
                        </div>
                        <div className='space-y-1'>
                          <div className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>
                            {t('warehouse.shipment.dialog.safetyTitle')}
                          </div>
                          <p className='text-[10px] leading-relaxed font-medium text-rose-600/70'>
                            {t('warehouse.shipment.dialog.projection', {
                              count: remainingStock,
                              uom: selectedItem.uom,
                            })}{' '}
                            <span className='opacity-40'>
                              {t('warehouse.shipment.dialog.safetyThreshold', {
                                count: materialThreshold,
                              })}
                            </span>{' '}
                            {t('warehouse.shipment.dialog.safetyHint')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className='space-y-6'>
                  <div className='space-y-1.5'>
                    <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      <Calendar className='size-3 text-blue-500' />{' '}
                      {t('warehouse.shipment.dialog.shipDate')}
                    </Label>
                    <Input
                      type='date'
                      className='h-10 rounded-xl border-none bg-muted/30 text-sm font-bold focus:ring-blue-500'
                      value={formData.shipmentDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          shipmentDate: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                      <FileText className='size-3 text-blue-500' />{' '}
                      {t('warehouse.shipment.dialog.assocOrder')}
                    </Label>
                    <Select
                      value={formData.orderNo}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, orderNo: val }))
                      }
                    >
                      <SelectTrigger className='h-10 rounded-xl border-none bg-muted/30 text-sm font-bold focus:ring-blue-500'>
                        <SelectValue
                          placeholder={t(
                            'warehouse.shipment.dialog.selectOrder'
                          )}
                        />
                      </SelectTrigger>
                      <SelectContent className='overflow-hidden rounded-2xl border-none shadow-2xl'>
                        {salesOrders
                          .filter((o) =>
                            ['Pending', 'InProgress'].includes(o.status)
                          )
                          .map((order) => (
                            <SelectItem
                              key={order.orderNo}
                              value={order.orderNo}
                              className='mx-1 my-1 rounded-xl transition-colors focus:bg-blue-500 focus:text-white'
                            >
                              <div className='flex flex-col items-start gap-0.5'>
                                <span className='text-[11px] font-black tracking-widest uppercase'>
                                  {order.orderNo}
                                </span>
                                <span className='text-[9px] font-medium uppercase opacity-60'>
                                  {order.customerName}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        {salesOrders.length === 0 && (
                          <div className='p-4 text-center text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase italic'>
                            {t('warehouse.shipment.dialog.noOrders')}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 gap-6 border-t border-dashed border-muted pt-6 sm:grid-cols-2 md:gap-8'>
                <div className='space-y-1.5'>
                  <Label className='flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    <Tag className='size-3 text-blue-500' />{' '}
                    {t('warehouse.shipment.dialog.batch')}
                  </Label>
                  <Input
                    placeholder={t(
                      'warehouse.shipment.dialog.batchPlaceholder'
                    )}
                    className='h-10 rounded-xl border-none bg-muted/30 text-sm font-bold focus:ring-blue-500'
                    value={formData.batchNo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        batchNo: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className='space-y-1.5'>
                  <Label className='flex items-center gap-2 text-[9px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                    <User className='size-3 text-blue-500' />{' '}
                    {t('warehouse.shipment.dialog.operator')}
                  </Label>
                  <Input
                    disabled
                    className='h-10 rounded-xl border-none bg-muted/50 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'
                    value={auditUtils.getOperatorInfo().label}
                  />
                </div>
              </div>

              <div className='space-y-1.5'>
                <Label className='flex items-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground/40 uppercase'>
                  {t('warehouse.shipment.dialog.remarks')}
                </Label>
                <Input
                  placeholder={t(
                    'warehouse.shipment.dialog.remarksPlaceholder'
                  )}
                  className='h-10 rounded-xl border-none bg-muted/30 text-sm font-bold focus:focus-visible:ring-blue-500'
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                />
              </div>

              <div className='flex shrink-0 flex-wrap justify-end gap-2.5 pt-4'>
                <Button
                  variant='ghost'
                  className='rounded-full px-4 text-[8px] font-black tracking-widest uppercase transition-all md:px-6 md:text-[9px]'
                  onClick={() => onOpenChange(false)}
                >
                  {t('warehouse.shipment.dialog.exit')}
                </Button>
                {!isVirtualLock && (
                  <Button
                    variant='outline'
                    className='gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-6 text-[9px] font-black tracking-widest text-amber-600 uppercase transition-all hover:bg-amber-500/20'
                    onClick={() => onSubmit('DRAFT')}
                  >
                    <Save className='size-3' />{' '}
                    {t('warehouse.shipment.dialog.saveDraft')}
                  </Button>
                )}
                <Button
                  className='transform gap-2 rounded-full bg-blue-600 px-8 text-[9px] font-black tracking-widest text-white uppercase shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95'
                  onClick={() => onSubmit('COMMITTED')}
                >
                  <Send className='size-3' />{' '}
                  {isVirtualLock
                    ? '转入虚拟发货仓'
                    : t('warehouse.shipment.dialog.commit')}
                </Button>
              </div>
            </div>

            <div className='flex w-full shrink-0 flex-col border-t border-dashed border-muted bg-muted/20 p-5 md:p-6 lg:w-[260px] lg:border-t-0 lg:border-l'>
              <div className='mb-6 flex items-center gap-3'>
                <div className='flex size-9 items-center justify-center rounded-xl border border-dashed border-muted bg-card shadow-inner'>
                  <Warehouse className='size-4.5 text-blue-500' />
                </div>
                <div className='space-y-0.5'>
                  <h3 className='text-[10px] font-black tracking-widest uppercase'>
                    {t('warehouse.shipment.dialog.distribution')}
                  </h3>
                  <p className='text-[8px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                    {t('warehouse.shipment.dialog.realtimeIndex')}
                  </p>
                </div>
              </div>

              <div className='custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2'>
                {selectableCategories.map((cat) => {
                  const stock =
                    readyInventoryContext?.inventoryBreakdown[cat.value] || 0
                  const isSelected = formData.sourceCategory === cat.value
                  return (
                    <div
                      key={cat.value}
                      className={cn(
                        'group cursor-pointer space-y-2 rounded-[20px] border-2 p-3 transition-all',
                        isSelected
                          ? 'translate-x-1 border-blue-500/40 bg-blue-500/5 shadow-xl shadow-blue-500/5'
                          : 'border-transparent bg-background hover:border-muted/50'
                      )}
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          sourceCategory: cat.value,
                        }))
                      }
                    >
                      <div className='flex items-center justify-between'>
                        <span
                          className={cn(
                            'text-[9px] font-black tracking-widest uppercase',
                            isSelected
                              ? 'text-blue-700'
                              : 'text-muted-foreground/60'
                          )}
                        >
                          {cat.label}
                        </span>
                      </div>
                      <div className='flex items-baseline justify-between'>
                        <div
                          className={cn(
                            'font-mono text-lg leading-none font-black tracking-tighter',
                            isSelected ? 'text-blue-600' : 'text-foreground'
                          )}
                        >
                          {stock}
                        </div>
                        <span className='text-[9px] font-black tracking-tighter uppercase opacity-30'>
                          {selectedItem.uom}
                        </span>
                      </div>
                      <div className='h-1 overflow-hidden rounded-full bg-muted/40'>
                        <div
                          className={cn(
                            'h-full transition-all duration-1000',
                            isSelected
                              ? 'bg-blue-500'
                              : 'bg-muted-foreground/20'
                          )}
                          style={{
                            width: `${Math.min(100, (stock / (selectedItem.stock || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className='mt-8 space-y-4 border-t border-dashed border-muted pt-6'>
                <div className='flex items-center justify-between'>
                  <span className='text-[10px] font-black tracking-widest text-muted-foreground/30 uppercase'>
                    {t('warehouse.shipment.dialog.totalReserve')}
                  </span>
                  <div className='flex items-center gap-2'>
                    <span className='font-mono text-sm font-black text-foreground'>
                      {selectedItem.stock}
                    </span>
                    <span className='text-[10px] font-black tracking-widest text-muted-foreground/20 uppercase'>
                      {selectedItem.uom}
                    </span>
                  </div>
                </div>
                <div className='flex items-center gap-3 rounded-2xl bg-blue-500/5 p-3'>
                  <Database className='size-4 text-blue-500/40' />
                  <span className='text-[9px] leading-tight font-black tracking-widest text-blue-600/60 uppercase'>
                    {t('warehouse.shipment.dialog.consistency')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
