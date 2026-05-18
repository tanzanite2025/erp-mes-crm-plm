'use client'

import { Truck, Warehouse, Calendar, TrendingDown, FileText, Tag, User, Save, Send, AlertTriangle, Database } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import {
  Dialog,
  DialogContent
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { cn } from '@/lib/utils'
import type { MasterDataSearchResult } from '../../inventory'
import type { SalesOrder } from '@/features/trading/data/schema'
import { auditUtils } from '@/lib/audit-utils'
import type { ShipmentFormData, ShipmentFormMode, ShipmentFormUpdater } from '../data/schema'
import type { WarehouseCategoryOption } from '../../category/data/schema'
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
  salesOrders = []
}: ShipmentDialogProps) {
  const { t } = useLanguage()

  if (!selectedItem) return null

  const isVirtualLock = formMode === 'virtualLock'
  const selectableCategories = isVirtualLock
    ? warehouseCategories.filter((category) => category.value !== 'SHIPPING_VIRTUAL')
    : warehouseCategories
  const readyInventoryContext = inventoryContextResource.status === 'ready' ? inventoryContextResource : null
  const remainingStock = (selectedItem.stock || 0) - (formData.quantity || 0)
  const isBelowSafety = materialThreshold > 0 && remainingStock < materialThreshold

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] sm:max-w-[850px] p-0 overflow-hidden shadow-2xl border-none rounded-2xl md:rounded-[32px] bg-background'>
        <div className='relative h-20 md:h-24 bg-blue-600 flex items-center px-5 md:px-8 overflow-hidden shrink-0'>
          <div className='absolute inset-0 bg-linear-to-br from-primary/20 via-transparent to-black/20' />
          <div
            className='absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none'
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}
          />

          <div className='relative flex items-center justify-between gap-4 w-full overflow-hidden'>
            <div className='flex items-center gap-4 md:gap-5 overflow-hidden'>
            <div className='size-10 md:size-12 rounded-xl md:rounded-[18px] bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl shrink-0'>
              <Truck className='size-5 md:size-6 text-white' />
            </div>
            <div className='space-y-0.5 overflow-hidden'>
              <h3 className='text-base md:text-lg font-black text-white tracking-widest uppercase italic truncate'>
                {isVirtualLock ? '转入虚拟发货仓' : t('warehouse.shipment.dialog.title')}
              </h3>
              <div className='flex items-center gap-2 truncate'>
                <Badge className='bg-white/20 text-white border-none text-[7px] md:text-[8px] font-black uppercase tracking-widest px-1.5 h-3.5 rounded-full leading-none shrink-0'>{t('warehouse.shipment.dialog.masterNode')}</Badge>
                <span className='text-blue-100/60 font-mono text-[8px] md:text-[9px] font-black uppercase tracking-widest truncate'>{selectedItem.name} ({selectedItem.code})</span>
              </div>
            </div>
            </div>
            <div className='hidden sm:flex shrink-0'>
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.shipment}
                targetName={isVirtualLock ? '转入虚拟发货仓' : t('warehouse.shipment.dialog.title')}
                label={t('common.audit.trigger')}
                className='h-10 rounded-full border-white/30 bg-white/10 px-4 text-white hover:bg-white/20 hover:text-white'
              />
            </div>
          </div>

          <div className='absolute right-8 top-1/2 -translate-y-1/2 hidden md:flex flex-col items-end opacity-20 pointer-events-none'>
            <span className='text-[9px] font-black text-white uppercase tracking-widest'>{t('warehouse.shipment.dialog.transactionLayer')}</span>
            <span className='text-[9px] font-black text-white uppercase tracking-widest'>TS_0928_NODE</span>
          </div>
        </div>

        {inventoryContextResource.status === 'error' ? (
          <div className='flex min-h-[420px] items-center justify-center bg-background px-6 py-10 text-center'>
            <div className='flex max-w-md flex-col items-center gap-3 rounded-[24px] border border-dashed border-rose-200 bg-rose-50/60 px-6 py-8'>
              <AlertTriangle className='size-8 text-rose-500' />
              <div className='text-[10px] font-black uppercase tracking-widest text-rose-700'>
                {t('warehouse.errors.queryFailed')}
              </div>
              <p className='text-[11px] font-bold leading-relaxed text-foreground'>
                {inventoryContextResource.error.message}
              </p>
              <Button
                type='button'
                variant='outline'
                className='h-9 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'
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
              <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
                {t('warehouse.shipment.dialog.realtimeIndex')}
              </div>
              <p className='text-[11px] font-bold leading-relaxed text-muted-foreground'>
                正在加载库存上下文，请稍候。
              </p>
            </div>
          </div>
        ) : (
        <div className='flex flex-col lg:flex-row bg-background max-h-[80vh] overflow-y-auto lg:overflow-visible lg:h-[540px]'>
          <div className='flex-1 p-5 md:p-6 space-y-6 overflow-y-auto'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8'>
              <div className='space-y-6'>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-black text-muted-foreground/40 flex items-center gap-2 uppercase tracking-widest group'>
                    <Warehouse className='size-3 text-blue-500' /> {t('warehouse.shipment.dialog.sourceArea')}
                  </Label>
                  <Select
                    value={formData.sourceCategory}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, sourceCategory: val }))}
                  >
                    <SelectTrigger className='h-10 rounded-xl border-none bg-muted/30 font-bold focus:ring-blue-500 text-sm'>
                      <SelectValue placeholder={t('warehouse.shipment.dialog.selectArea')} />
                    </SelectTrigger>
                    <SelectContent className='rounded-2xl border-none shadow-2xl'>
                      {selectableCategories.map(cat => (
                        <SelectItem key={cat.value} value={cat.value} className='rounded-xl my-1 mx-1 focus:bg-blue-500 focus:text-white transition-colors'>
                          <div className='flex justify-between items-center w-full gap-8 pr-2'>
                            <span className='font-black text-[11px] uppercase tracking-widest'>{cat.label}</span>
                            <span className='text-[9px] font-mono opacity-40'>{t('warehouse.shipment.dialog.available', { count: readyInventoryContext?.inventoryBreakdown[cat.value] || 0 })}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-black text-muted-foreground/40 flex items-center gap-2 uppercase tracking-widest'>
                    <TrendingDown className='size-3 text-blue-500' /> {t('warehouse.shipment.dialog.quantity')}
                  </Label>
                  <div className='relative group'>
                    <Input
                      type='number'
                      className='h-10 rounded-xl border-none bg-muted/30 font-mono text-lg font-black text-blue-600 pr-20 focus-visible:ring-blue-500'
                      value={formData.quantity}
                      onChange={(e) => setFormData((prev) => ({ ...prev, quantity: Number(e.target.value) }))}
                    />
                    <div className='absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5'>
                      <span className='text-[9px] font-black text-muted-foreground/30 uppercase'>{selectedItem.uom}</span>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='h-7 rounded-lg px-2 text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 hover:bg-blue-500/20'
                        onClick={() => setFormData({ quantity: readyInventoryContext?.categoryStock ?? 0 })}
                      >
                        {t('warehouse.shipment.dialog.max')}
                      </Button>
                    </div>
                  </div>

                  <div className='flex justify-between items-center px-1'>
                    <span className='text-[10px] font-black uppercase text-muted-foreground/30 tracking-widest'>
                      {t('warehouse.shipment.dialog.areaAvailable', { count: readyInventoryContext?.categoryStock ?? 0 })}
                    </span>
                    {formData.quantity > (readyInventoryContext?.categoryStock ?? 0) && (
                      <Badge className='bg-rose-500 text-white border-none text-[8px] font-black px-2 rounded-full animate-pulse tracking-widest uppercase'>{t('warehouse.shipment.dialog.insufficientStock')}</Badge>
                    )}
                  </div>

                  {isBelowSafety && (
                    <div className='p-4 rounded-2xl bg-rose-500/5 border border-dashed border-rose-500/30 flex gap-4 animate-in fade-in zoom-in-95 duration-300'>
                      <div className='size-8 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0'>
                        <AlertTriangle className='size-4 text-rose-600' />
                      </div>
                      <div className='space-y-1'>
                        <div className='text-[10px] font-black text-rose-700 uppercase tracking-widest'>{t('warehouse.shipment.dialog.safetyTitle')}</div>
                        <p className='text-[10px] text-rose-600/70 leading-relaxed font-medium'>
                          {t('warehouse.shipment.dialog.projection', { count: remainingStock, uom: selectedItem.uom })}{' '}
                          <span className='opacity-40'>{t('warehouse.shipment.dialog.safetyThreshold', { count: materialThreshold })}</span>{' '}
                          {t('warehouse.shipment.dialog.safetyHint')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className='space-y-6'>
                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-black text-muted-foreground/40 flex items-center gap-2 uppercase tracking-widest'>
                    <Calendar className='size-3 text-blue-500' /> {t('warehouse.shipment.dialog.shipDate')}
                  </Label>
                  <Input
                    type='date'
                    className='h-10 rounded-xl border-none bg-muted/30 font-bold focus:ring-blue-500 text-sm'
                    value={formData.shipmentDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, shipmentDate: e.target.value }))}
                  />
                </div>

                <div className='space-y-1.5'>
                  <Label className='text-[10px] font-black text-muted-foreground/40 flex items-center gap-2 uppercase tracking-widest'>
                    <FileText className='size-3 text-blue-500' /> {t('warehouse.shipment.dialog.assocOrder')}
                  </Label>
                  <Select
                    value={formData.orderNo}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, orderNo: val }))}
                  >
                    <SelectTrigger className='h-10 rounded-xl border-none bg-muted/30 font-bold focus:ring-blue-500 text-sm'>
                      <SelectValue placeholder={t('warehouse.shipment.dialog.selectOrder')} />
                    </SelectTrigger>
                    <SelectContent className='rounded-2xl border-none shadow-2xl overflow-hidden'>
                      {salesOrders.filter(o => ['Pending', 'InProgress'].includes(o.status)).map(order => (
                        <SelectItem key={order.orderNo} value={order.orderNo} className='rounded-xl my-1 mx-1 focus:bg-blue-500 focus:text-white transition-colors'>
                          <div className='flex flex-col items-start gap-0.5'>
                            <span className='font-black text-[11px] uppercase tracking-widest'>{order.orderNo}</span>
                            <span className='text-[9px] font-medium opacity-60 uppercase'>{order.customerName}</span>
                          </div>
                        </SelectItem>
                      ))}
                      {salesOrders.length === 0 && (
                        <div className='p-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 text-center italic'>{t('warehouse.shipment.dialog.noOrders')}</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8 border-t border-dashed border-muted pt-6'>
              <div className='space-y-1.5'>
                <Label className='text-[9px] font-black text-muted-foreground/40 flex items-center gap-2 uppercase tracking-widest'>
                  <Tag className='size-3 text-blue-500' /> {t('warehouse.shipment.dialog.batch')}
                </Label>
                <Input
                  placeholder={t('warehouse.shipment.dialog.batchPlaceholder')}
                  className='h-10 rounded-xl border-none bg-muted/30 font-bold focus:ring-blue-500 text-sm'
                  value={formData.batchNo}
                  onChange={(e) => setFormData((prev) => ({ ...prev, batchNo: e.target.value }))}
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-[9px] font-black text-muted-foreground/40 flex items-center gap-2 uppercase tracking-widest'>
                  <User className='size-3 text-blue-500' /> {t('warehouse.shipment.dialog.operator')}
                </Label>
                <Input disabled className='h-10 rounded-xl border-none bg-muted/50 font-black text-[10px] uppercase tracking-widest text-muted-foreground/40' value={auditUtils.getOperatorInfo().label} />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-[10px] font-black text-muted-foreground/40 flex items-center gap-2 uppercase tracking-widest'>{t('warehouse.shipment.dialog.remarks')}</Label>
              <Input
                placeholder={t('warehouse.shipment.dialog.remarksPlaceholder')}
                className='h-10 rounded-xl border-none bg-muted/30 font-bold focus:focus-visible:ring-blue-500 text-sm'
                value={formData.remarks}
                onChange={(e) => setFormData((prev) => ({ ...prev, remarks: e.target.value }))}
              />
            </div>

            <div className='pt-4 flex flex-wrap justify-end gap-2.5 shrink-0'>
              <Button variant='ghost' className='rounded-full px-4 md:px-6 text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all' onClick={() => onOpenChange(false)}>
                {t('warehouse.shipment.dialog.exit')}
              </Button>
              {!isVirtualLock && (
                <Button
                  variant='outline'
                  className='rounded-full px-6 text-[9px] font-black uppercase tracking-widest gap-2 bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-all'
                  onClick={() => onSubmit('DRAFT')}
                >
                  <Save className='size-3' /> {t('warehouse.shipment.dialog.saveDraft')}
                </Button>
              )}
              <Button
                className='rounded-full px-8 text-[9px] font-black uppercase tracking-widest gap-2 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all transform active:scale-95 text-white'
                onClick={() => onSubmit('COMMITTED')}
              >
                <Send className='size-3' /> {isVirtualLock ? '转入虚拟发货仓' : t('warehouse.shipment.dialog.commit')}
              </Button>
            </div>
          </div>

          <div className='w-full lg:w-[260px] bg-muted/20 border-t lg:border-t-0 lg:border-l border-dashed border-muted p-5 md:p-6 flex flex-col shrink-0'>
            <div className='flex items-center gap-3 mb-6'>
              <div className='size-9 rounded-xl bg-card border border-dashed border-muted flex items-center justify-center shadow-inner'>
                <Warehouse className='size-4.5 text-blue-500' />
              </div>
              <div className='space-y-0.5'>
                <h3 className='text-[10px] font-black uppercase tracking-widest'>{t('warehouse.shipment.dialog.distribution')}</h3>
                <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.shipment.dialog.realtimeIndex')}</p>
              </div>
            </div>

            <div className='space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar'>
              {selectableCategories.map((cat) => {
                const stock = readyInventoryContext?.inventoryBreakdown[cat.value] || 0
                const isSelected = formData.sourceCategory === cat.value
                return (
                  <div
                    key={cat.value}
                    className={cn(
                      'p-3 rounded-[20px] border-2 transition-all cursor-pointer group space-y-2',
                      isSelected
                        ? 'bg-blue-500/5 border-blue-500/40 shadow-xl shadow-blue-500/5 translate-x-1'
                        : 'bg-background border-transparent hover:border-muted/50'
                    )}
                    onClick={() => setFormData((prev) => ({ ...prev, sourceCategory: cat.value }))}
                  >
                    <div className='flex items-center justify-between'>
                      <span className={cn(
                        'text-[9px] font-black uppercase tracking-widest',
                        isSelected ? 'text-blue-700' : 'text-muted-foreground/60'
                      )}>{cat.label}</span>
                    </div>
                    <div className='flex items-baseline justify-between'>
                      <div className={cn(
                        'text-lg font-black font-mono tracking-tighter leading-none',
                        isSelected ? 'text-blue-600' : 'text-foreground'
                      )}>
                        {stock}
                      </div>
                      <span className='text-[9px] font-black uppercase tracking-tighter opacity-30'>{selectedItem.uom}</span>
                    </div>
                    <div className='h-1 bg-muted/40 rounded-full overflow-hidden'>
                      <div
                        className={cn('h-full transition-all duration-1000', isSelected ? 'bg-blue-500' : 'bg-muted-foreground/20')}
                        style={{ width: `${Math.min(100, (stock / (selectedItem.stock || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className='mt-8 pt-6 border-t border-dashed border-muted space-y-4'>
              <div className='flex justify-between items-center'>
                <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/30'>{t('warehouse.shipment.dialog.totalReserve')}</span>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-black font-mono text-foreground'>{selectedItem.stock}</span>
                  <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/20'>{selectedItem.uom}</span>
                </div>
              </div>
              <div className='p-3 bg-blue-500/5 rounded-2xl flex items-center gap-3'>
                <Database className='size-4 text-blue-500/40' />
                <span className='text-[9px] font-black uppercase tracking-widest text-blue-600/60 leading-tight'>{t('warehouse.shipment.dialog.consistency')}</span>
              </div>
            </div>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
