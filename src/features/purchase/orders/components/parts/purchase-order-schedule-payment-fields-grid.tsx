import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { type PurchaseOrder } from '../../data/schema'
import { PurchaseOrderNoteSection } from './purchase-order-note-section'

type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]
type PurchaseOrderSelectItem = {
  label: string
  value: string
  disabled?: boolean
}

interface PurchaseOrderSchedulePaymentFieldsGridProps {
  formData: Partial<PurchaseOrder>
  paymentMethodOptions: PurchaseOrderSelectItem[]
  paymentTermOptions: PurchaseOrderSelectItem[]
  isFinanceLoading: boolean
  isFinanceReady: boolean
  handleHeaderChange: (
    field: keyof PurchaseOrder,
    value: PurchaseOrderFieldValue
  ) => void
  handlePaymentMethodChange: (value: string) => void
  handlePaymentTermChange: (value: string) => void
}

export function PurchaseOrderSchedulePaymentFieldsGrid({
  formData,
  paymentMethodOptions,
  paymentTermOptions,
  isFinanceLoading,
  isFinanceReady,
  handleHeaderChange,
  handlePaymentMethodChange,
  handlePaymentTermChange,
}: PurchaseOrderSchedulePaymentFieldsGridProps) {
  const { t } = useLanguage()

  return (
    <div className='grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,3fr)]'>
      <div className='min-w-0 space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
          {t('purchase.orders.headerFields.paymentMethod')}
        </Label>
        <SelectDropdown
          placeholder={t(
            'purchase.orders.headerFields.paymentMethodPlaceholder'
          )}
          items={paymentMethodOptions}
          defaultValue={formData.paymentMethod}
          onValueChange={handlePaymentMethodChange}
          isPending={isFinanceLoading}
          disabled={!isFinanceReady}
          className='h-10 w-full min-w-0 rounded-2xl bg-background font-bold'
        />
      </div>

      <div className='min-w-0 space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
          {t('purchase.orders.headerFields.paymentTerm')}
        </Label>
        <SelectDropdown
          placeholder={t('purchase.orders.headerFields.paymentTermPlaceholder')}
          items={paymentTermOptions}
          defaultValue={formData.paymentTerm}
          onValueChange={handlePaymentTermChange}
          isPending={isFinanceLoading}
          disabled={!isFinanceReady}
          className='h-10 w-full min-w-0 rounded-2xl bg-background font-bold'
        />
      </div>

      <div className='col-span-2 min-w-0 space-y-1.5 sm:col-span-1'>
        <Label className='pl-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
          {t('purchase.orders.headerFields.purchaser')}
        </Label>
        <Input
          value={formData.purchaser}
          disabled
          className='h-10 rounded-2xl border-none bg-white/50 font-black shadow-sm'
        />
      </div>

      <PurchaseOrderNoteSection
        note={formData.note}
        handleHeaderChange={handleHeaderChange}
        className='col-span-2 lg:col-span-1'
        variant='field'
      />
    </div>
  )
}
