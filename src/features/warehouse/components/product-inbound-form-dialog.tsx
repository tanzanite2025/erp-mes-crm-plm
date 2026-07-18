'use client'

import { CheckCircle2, Package } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
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
import { buildHostedQuickActionDialogContentClassName } from '@/components/hosted-quick-action-dialog.styles'
import { PermissionBoundary } from '@/components/permission-boundary'
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
      <DialogContent
        className={buildHostedQuickActionDialogContentClassName(
          'overflow-hidden rounded-2xl border-none p-0 shadow-2xl md:max-w-[560px] md:rounded-[32px]'
        )}
      >
        <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-emerald-600/5 via-transparent' />

        <div className='relative p-5 md:p-8'>
          <DialogHeader className='mb-6 text-left md:mb-8'>
            <DialogTitle className='flex items-center gap-3 text-lg font-black tracking-tighter uppercase italic md:gap-4 md:text-xl'>
              <div className='flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 md:size-10'>
                <Package className='size-4 text-emerald-600 md:size-5' />
              </div>
              <span className='truncate'>
                {t('warehouse.inbound.dialog.title')}
              </span>
            </DialogTitle>
            <DialogDescription className='mt-1 block truncate text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase md:text-[9px]'>
              {targetNodeDescription
                ? t(
                    'warehouse.inbound.dialog.targetNode',
                    targetNodeDescription
                  )
                : ''}
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 md:space-y-6'>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6'>
              <div className='space-y-2 md:space-y-3'>
                <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                  {t('warehouse.inbound.dialog.destination')}
                </Label>
                <Select
                  value={formData.targetCategory}
                  onValueChange={onTargetCategoryChange}
                >
                  <SelectTrigger className='h-10 rounded-xl border-none bg-muted/50 px-4 text-xs font-bold shadow-inner focus:ring-emerald-500 md:h-11 md:px-5'>
                    <SelectValue
                      placeholder={t('warehouse.inbound.dialog.selectArea')}
                    />
                  </SelectTrigger>
                  <SelectContent className='rounded-xl border-none p-1.5 shadow-2xl md:p-2'>
                    {selectableWarehouseCategories.map((cat) => (
                      <SelectItem
                        key={cat.value}
                        value={cat.value}
                        className='rounded-lg py-2 text-[8px] font-black tracking-widest uppercase md:py-2.5 md:text-[10px]'
                      >
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2 md:space-y-3'>
                <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                  {t('warehouse.inbound.dialog.entryDate')}
                </Label>
                <Input
                  type='date'
                  value={formData.entryDate}
                  onChange={(e) => onEntryDateChange(e.target.value)}
                  className='h-10 rounded-xl border-none bg-muted/50 px-4 font-mono text-xs font-bold shadow-inner focus-visible:ring-emerald-500 md:h-11 md:px-5'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6'>
              <div className='space-y-2 md:space-y-3'>
                <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                  {t('warehouse.inbound.dialog.quantity')}
                </Label>
                <div className='group relative'>
                  <Input
                    type='number'
                    className='h-10 rounded-xl border-none bg-muted/50 pr-10 pl-4 font-mono text-lg font-black shadow-inner transition-all group-hover:bg-muted/70 focus-visible:ring-emerald-500 md:h-11 md:pr-12 md:pl-5 md:text-xl'
                    value={formData.quantity}
                    onChange={(e) => onQuantityChange(Number(e.target.value))}
                  />
                  <div className='absolute top-1/2 right-4 -translate-y-1/2 text-[8px] font-black tracking-widest text-muted-foreground/20 uppercase transition-colors select-none group-focus-within:text-emerald-500 md:right-5 md:text-[9px]'>
                    {itemUnit || t('warehouse.inbound.dialog.units')}
                  </div>
                </div>
              </div>
              <div className='space-y-2 md:space-y-3'>
                <Label className='block text-[9px] font-black tracking-widest text-muted-foreground/60 uppercase md:text-[10px]'>
                  {t('warehouse.inbound.dialog.batch')}
                </Label>
                <Input
                  placeholder={t('warehouse.inbound.dialog.batchPlaceholder')}
                  value={formData.batchNo}
                  onChange={(e) => onBatchNoChange(e.target.value)}
                  className='h-10 rounded-xl border-none bg-muted/50 px-4 font-mono text-xs font-black shadow-inner focus-visible:ring-emerald-500 md:h-11 md:px-5 md:text-sm'
                />
              </div>
            </div>

            <div className='space-y-3'>
              <Label className='block text-[10px] font-black tracking-widest text-muted-foreground/60 uppercase'>
                {t('warehouse.inbound.dialog.remarks')}
              </Label>
              <Input
                placeholder={t('warehouse.inbound.dialog.remarksPlaceholder')}
                value={formData.remarks}
                onChange={(e) => onRemarksChange(e.target.value)}
                className='h-11 rounded-xl border-none bg-muted/50 px-5 font-bold shadow-inner focus-visible:ring-emerald-500'
              />
            </div>
          </div>
        </div>

        <DialogFooter className='flex items-center justify-between gap-4 bg-transparent p-8 pt-0'>
          <Button
            variant='ghost'
            className='h-11 flex-1 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors hover:bg-muted'
            onClick={onCancel}
          >
            {t('warehouse.inbound.dialog.cancel')}
          </Button>
          <PermissionBoundary permission='action_warehouse_inbound_record'>
            <Button
              className='h-11 flex-1 gap-2 rounded-full bg-emerald-600 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-700 active:scale-95'
              onClick={() => {
                onSubmit()
              }}
              disabled={isSubmittingInbound}
            >
              <CheckCircle2 className='size-4' />{' '}
              {t('warehouse.inbound.dialog.commit')}
            </Button>
          </PermissionBoundary>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
