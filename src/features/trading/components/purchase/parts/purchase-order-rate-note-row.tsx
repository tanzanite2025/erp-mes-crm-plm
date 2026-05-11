import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLanguage } from '@/context/language-provider'
import { type PurchaseOrder } from '../../../data/schema'
import { PurchaseOrderNoteSection } from './purchase-order-note-section'

type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]

interface PurchaseOrderRateNoteRowProps {
  effectiveExchangeRate: number
  baseCurrencyCode: string
  exchangeRateText: string
  note: string | undefined
  handleHeaderChange: (field: keyof PurchaseOrder, value: PurchaseOrderFieldValue) => void
}

export function PurchaseOrderRateNoteRow({
  effectiveExchangeRate,
  baseCurrencyCode,
  exchangeRateText,
  note,
  handleHeaderChange,
}: PurchaseOrderRateNoteRowProps) {
  const { t } = useLanguage()

  return (
    <div className='grid grid-cols-1 gap-4 xl:grid-cols-[340px_minmax(0,1fr)]'>
      <div className='space-y-1.5 rounded-[32px] border border-dashed border-primary/10 bg-primary/5 p-5'>
        <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60'>
          {t('purchase.orders.headerFields.exchangeRate')}
        </Label>
        <div className='space-y-2'>
          <Input
            readOnly
            value={effectiveExchangeRate.toFixed(4)}
            className='h-10 rounded-2xl border-none bg-background font-black text-emerald-600 shadow-sm'
          />
          <div className='space-y-1 pl-1'>
            <p className='text-[9px] font-bold tracking-wide text-muted-foreground/70'>
              {t('purchase.orders.headerFields.exchangeRateAuto')}
            </p>
            <p className='text-[9px] font-bold tracking-wide text-muted-foreground/70'>
              {t('purchase.orders.headerFields.exchangeRateBase', { base: baseCurrencyCode })}
            </p>
            <p className='text-[9px] font-bold tracking-wide text-emerald-600'>
              {exchangeRateText}
            </p>
          </div>
        </div>
      </div>
      <PurchaseOrderNoteSection note={note} handleHeaderChange={handleHeaderChange} />
    </div>
  )
}
