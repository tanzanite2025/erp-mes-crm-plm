import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectDropdown } from '@/components/select-dropdown'
import { type PurchaseOrder } from '../../../data/schema'

type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]
type PurchaseOrderSelectItem = {
  label: string
  value: string
  disabled?: boolean
}

interface PurchaseOrderCoreFieldsGridProps {
  formData: Partial<PurchaseOrder>
  supplierOptions: PurchaseOrderSelectItem[]
  currencyOptions: PurchaseOrderSelectItem[]
  isFinanceLoading: boolean
  isFinanceReady: boolean
  effectiveExchangeRate: number
  baseCurrencyCode: string
  exchangeRateText: string
  handleHeaderChange: (
    field: keyof PurchaseOrder,
    value: PurchaseOrderFieldValue
  ) => void
  handleSupplierChange: (value: string) => void
}

export function PurchaseOrderCoreFieldsGrid({
  formData,
  supplierOptions,
  currencyOptions,
  isFinanceLoading,
  isFinanceReady,
  effectiveExchangeRate,
  baseCurrencyCode,
  exchangeRateText,
  handleHeaderChange,
  handleSupplierChange,
}: PurchaseOrderCoreFieldsGridProps) {
  const { t } = useLanguage()

  return (
    <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,3fr)]'>
      <div className='space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
          {t('purchase.orders.headerFields.supplier')}
        </Label>
        <SelectDropdown
          placeholder={t('purchase.orders.headerFields.supplierPlaceholder')}
          items={supplierOptions}
          defaultValue={formData.supplierId}
          onValueChange={handleSupplierChange}
          className='h-10 rounded-2xl bg-background font-bold'
        />
      </div>

      <div className='space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
          {t('purchase.orders.headerFields.currency')}
        </Label>
        <SelectDropdown
          placeholder={t('purchase.orders.headerFields.currencyPlaceholder')}
          items={currencyOptions}
          defaultValue={formData.currency}
          onValueChange={(value) => handleHeaderChange('currency', value)}
          isPending={isFinanceLoading}
          disabled={!isFinanceReady}
          className='h-10 rounded-2xl bg-background font-bold'
        />
      </div>

      <div className='space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
          {t('purchase.orders.headerFields.expectedArrival')}
        </Label>
        <Input
          type='date'
          value={formData.expectedDate}
          onChange={(e) => handleHeaderChange('expectedDate', e.target.value)}
          className='h-10 rounded-2xl bg-background text-[11px] font-bold md:text-[11px] [&::-webkit-datetime-edit]:text-[11px] [&::-webkit-datetime-edit]:font-bold'
        />
      </div>

      <div className='space-y-1.5'>
        <Label className='pl-1 text-[10px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase'>
          {t('purchase.orders.headerFields.exchangeRate')}
        </Label>
        <div className='space-y-2'>
          <Input
            readOnly
            value={effectiveExchangeRate.toFixed(4)}
            className='h-10 rounded-2xl border-none bg-background font-black text-emerald-600 shadow-sm'
          />
          <div className='flex flex-wrap items-center gap-2 pl-1 text-[9px] font-bold tracking-wide'>
            <p className='text-muted-foreground/70'>
              {t('purchase.orders.headerFields.exchangeRateAuto')}
            </p>
            <span className='size-1 rounded-full bg-muted-foreground/30' />
            <p className='text-muted-foreground/70'>
              {t('purchase.orders.headerFields.exchangeRateBase', {
                base: baseCurrencyCode,
              })}
            </p>
            <span className='size-1 rounded-full bg-emerald-500/40' />
            <p className='text-emerald-600'>{exchangeRateText}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
