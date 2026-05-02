'use client'

import { CheckCircle2, Package } from 'lucide-react'
import { NonBlockingPermissionBoundary } from '@/components/permission-passthrough'
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
import { useLanguage } from '@/context/language-provider'
import { type WarehouseCategoryOption } from '../category'
import { type InboundFormData } from '../hooks/use-product-inbound'

export type InboundTargetNodeDescription = {
  name: string
  code: string
}

type ProductInboundFormDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: InboundFormData
  selectableWarehouseCategories: WarehouseCategoryOption[]
  targetNodeDescription: InboundTargetNodeDescription | null
  itemUnit?: string
  isSubmittingInbound: boolean
  onTargetCategoryChange: (value: string) => void
  onEntryDateChange: (value: string) => void
  onQuantityChange: (value: number) => void
  onBatchNoChange: (value: string) => void
  onRemarksChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

export function ProductInboundFormDialog({
  open,
  onOpenChange,
  formData,
  selectableWarehouseCategories,
  targetNodeDescription,
  itemUnit,
  isSubmittingInbound,
  onTargetCategoryChange,
  onEntryDateChange,
  onQuantityChange,
  onBatchNoChange,
  onRemarksChange,
  onSubmit,
  onCancel,
}: ProductInboundFormDialogProps) {
  const { t } = useLanguage()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] sm:max-w-[560px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
        <div className='absolute inset-0 bg-linear-to-br from-emerald-600/5 via-transparent pointer-events-none' />

        <div className='relative p-5 md:p-8'>
          <DialogHeader className='mb-6 md:mb-8 text-left'>
            <DialogTitle className='text-lg md:text-xl font-black tracking-tighter uppercase italic flex items-center gap-3 md:gap-4'>
              <div className='size-9 md:size-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0'>
                <Package className='size-4 md:size-5 text-emerald-600' />
              </div>
              <span className='truncate'>{t('warehouse.inbound.dialog.title')}</span>
            </DialogTitle>
            <DialogDescription className='text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mt-1 truncate block'>
              {targetNodeDescription
                ? t('warehouse.inbound.dialog.targetNode', targetNodeDescription)
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 md:space-y-6'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6'>
              <div className='space-y-2 md:space-y-3'>
                <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                  {t('warehouse.inbound.dialog.destination')}
                </Label>
                <Select value={formData.targetCategory} onValueChange={onTargetCategoryChange}>
                  <SelectTrigger className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-bold px-4 md:px-5 focus:ring-emerald-500 shadow-inner text-xs'>
                    <SelectValue placeholder={t('warehouse.inbound.dialog.selectArea')} />
                  </SelectTrigger>
                  <SelectContent className='rounded-xl shadow-2xl border-none p-1.5 md:p-2'>
                    {selectableWarehouseCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className='rounded-lg font-black uppercase text-[8px] md:text-[10px] tracking-widest py-2 md:py-2.5'>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2 md:space-y-3'>
                <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                  {t('warehouse.inbound.dialog.entryDate')}
                </Label>
                <Input
                  type='date'
                  value={formData.entryDate}
                  onChange={(e) => onEntryDateChange(e.target.value)}
                  className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-mono font-bold px-4 md:px-5 focus-visible:ring-emerald-500 shadow-inner text-xs'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6'>
              <div className='space-y-2 md:space-y-3'>
                <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                  {t('warehouse.inbound.dialog.quantity')}
                </Label>
                <div className='relative group'>
                  <Input
                    type='number'
                    className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-mono text-lg md:text-xl font-black pl-4 md:pl-5 pr-10 md:pr-12 focus-visible:ring-emerald-500 shadow-inner group-hover:bg-muted/70 transition-all'
                    value={formData.quantity}
                    onChange={(e) => onQuantityChange(Number(e.target.value))}
                  />
                  <div className='absolute right-4 md:right-5 top-1/2 -translate-y-1/2 text-[8px] md:text-[9px] font-black uppercase tracking-widest text-muted-foreground/20 select-none group-focus-within:text-emerald-500 transition-colors'>
                    {itemUnit || t('warehouse.inbound.dialog.units')}
                  </div>
                </div>
              </div>
              <div className='space-y-2 md:space-y-3'>
                <Label className='text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                  {t('warehouse.inbound.dialog.batch')}
                </Label>
                <Input
                  placeholder={t('warehouse.inbound.dialog.batchPlaceholder')}
                  value={formData.batchNo}
                  onChange={(e) => onBatchNoChange(e.target.value)}
                  className='h-10 md:h-11 rounded-xl bg-muted/50 border-none font-mono font-black text-xs md:text-sm px-4 md:px-5 focus-visible:ring-emerald-500 shadow-inner'
                />
              </div>
            </div>

            <div className='space-y-3'>
              <Label className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 block'>
                {t('warehouse.inbound.dialog.remarks')}
              </Label>
              <Input
                placeholder={t('warehouse.inbound.dialog.remarksPlaceholder')}
                value={formData.remarks}
                onChange={(e) => onRemarksChange(e.target.value)}
                className='h-11 rounded-xl bg-muted/50 border-none font-bold px-5 focus-visible:ring-emerald-500 shadow-inner'
              />
            </div>
          </div>
        </div>

        <DialogFooter className='p-8 pt-0 bg-transparent flex items-center justify-between gap-4'>
          <Button
            variant='ghost'
            className='flex-1 h-11 rounded-full hover:bg-muted font-black text-[10px] uppercase tracking-widest transition-colors'
            onClick={onCancel}
          >
            {t('warehouse.inbound.dialog.cancel')}
          </Button>
          <NonBlockingPermissionBoundary permission='action_warehouse_inbound_record'>
            <Button
              className='flex-1 h-11 rounded-full shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 gap-2'
              onClick={() => {
                onSubmit()
              }}
              disabled={isSubmittingInbound}
            >
              <CheckCircle2 className='size-4' /> {t('warehouse.inbound.dialog.commit')}
            </Button>
          </NonBlockingPermissionBoundary>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
