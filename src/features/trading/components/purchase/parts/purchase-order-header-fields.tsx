import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'
import { useLanguage } from '@/context/language-provider'
import { CurrencyCoreService } from '@/features/finance/services/currency-core-service'
import { PaymentTermCoreService } from '@/features/finance/services/payment-term-core-service'
import { type Currency, type PaymentTerm } from '@/features/finance/data/schema'
import { createLogger } from '@/lib/logger'
import { type PurchaseOrder, type Supplier } from '../../../data/schema'
import { getPurchaseStatusLabel } from '../../../data/purchase-status'

const logger = createLogger('PurchaseOrderHeaderFields')
type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]

interface PurchaseOrderHeaderFieldsProps {
  formData: Partial<PurchaseOrder>
  handleHeaderChange: (field: keyof PurchaseOrder, value: PurchaseOrderFieldValue) => void
  suppliers: Supplier[]
}

export function PurchaseOrderHeaderFields({
  formData,
  handleHeaderChange,
  suppliers,
}: PurchaseOrderHeaderFieldsProps) {
  const { t } = useLanguage()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])

  useEffect(() => {
    const loadFinanceData = async () => {
      try {
        const [currencyData, paymentTermData] = await Promise.all([
          CurrencyCoreService.getCurrencies(),
          PaymentTermCoreService.getPaymentTerms(),
        ])
        setCurrencies(currencyData)
        setPaymentTerms(paymentTermData)
      } catch (error) {
        logger.error('Failed to load finance data', error)
      }
    }

    loadFinanceData()
  }, [formData.id])

  const handleSupplierChange = (value: string) => {
    const supplier = suppliers.find((item) => item.id === value)
    if (!supplier) return
    handleHeaderChange('supplierId', value)
    handleHeaderChange('supplierName', supplier.name)
  }

  const currencyOptions = currencies.map((currency) => ({
    label: `${currency.name} (${currency.code})`,
    value: currency.code,
  }))

  const paymentTermOptions = paymentTerms.map((paymentTerm) => ({
    label: paymentTerm.name,
    value: paymentTerm.code,
  }))

  return (
    <section className='space-y-4'>
      <div className='grid grid-cols-1 gap-4 rounded-[32px] border border-dashed border-muted-foreground/20 bg-muted/20 p-5 md:grid-cols-5'>
        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50'>
            {t('purchase.orders.headerFields.orderNo')}
          </Label>
          <Input value={formData.orderNo} disabled className='h-10 rounded-2xl border-none bg-background font-black shadow-sm' />
        </div>

        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50'>
            {t('purchase.orders.headerFields.supplier')}
          </Label>
          <SelectDropdown
            placeholder={t('purchase.orders.headerFields.supplierPlaceholder')}
            items={suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id }))}
            defaultValue={formData.supplierId}
            onValueChange={handleSupplierChange}
            className='h-10 rounded-2xl bg-background font-bold'
          />
        </div>

        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50'>
            {t('purchase.orders.headerFields.currency')}
          </Label>
          <SelectDropdown
            placeholder={t('purchase.orders.headerFields.currencyPlaceholder')}
            items={currencyOptions}
            defaultValue={formData.currency}
            onValueChange={(value) => handleHeaderChange('currency', value)}
            className='h-10 rounded-2xl bg-background font-bold'
          />
        </div>

        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50'>
            {t('purchase.orders.headerFields.exchangeRate')}
          </Label>
          <Input
            type='number'
            step='0.0001'
            value={formData.exchangeRate}
            onChange={(e) => handleHeaderChange('exchangeRate', Number(e.target.value))}
            className='h-10 rounded-2xl border-none bg-background font-black text-emerald-600 shadow-sm'
          />
        </div>

        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60'>
            {t('purchase.orders.headerFields.status')}
          </Label>
          <Input
            value={getPurchaseStatusLabel(formData.status || 'Draft', t)}
            disabled
            className='h-10 rounded-2xl border-none bg-white/50 font-black text-primary shadow-sm'
          />
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4 rounded-[32px] border border-dashed border-primary/10 bg-primary/5 p-5 md:grid-cols-3'>
        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60'>
            {t('purchase.orders.headerFields.expectedArrival')}
          </Label>
          <Input
            type='date'
            value={formData.expectedDate}
            onChange={(e) => handleHeaderChange('expectedDate', e.target.value)}
            className='h-10 rounded-2xl bg-background font-bold'
          />
        </div>

        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60'>
            {t('purchase.orders.headerFields.paymentTerm')}
          </Label>
          <SelectDropdown
            placeholder={t('purchase.orders.headerFields.paymentTermPlaceholder')}
            items={paymentTermOptions}
            defaultValue={formData.paymentTerm}
            onValueChange={(value) => handleHeaderChange('paymentTerm', value)}
            className='h-10 rounded-2xl bg-background font-bold'
          />
        </div>

        <div className='space-y-1.5'>
          <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60'>
            {t('purchase.orders.headerFields.purchaser')}
          </Label>
          <Input value={formData.purchaser} disabled className='h-10 rounded-2xl border-none bg-white/50 font-black shadow-sm' />
        </div>
      </div>

      <div className='space-y-1.5 rounded-[32px] border border-dashed border-muted-foreground/20 bg-muted/5 p-5'>
        <Label className='pl-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50'>
          {t('purchase.orders.headerFields.note')}
        </Label>
        <Textarea
          placeholder={t('purchase.orders.headerFields.notePlaceholder')}
          value={formData.note}
          onChange={(e) => handleHeaderChange('note', e.target.value)}
          className='min-h-[80px] resize-none rounded-2xl border-none bg-background p-4 font-bold shadow-sm'
        />
      </div>
    </section>
  )
}
