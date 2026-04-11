import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SelectDropdown } from '@/components/select-dropdown'
import { useLanguage } from '@/context/language-provider'
import { OrderEvidenceManager } from '@/features/trading/components/parts/order-evidence-manager'
import { CurrencyCoreService } from '@/features/finance/services/currency-core-service'
import { PaymentMethodCoreService } from '@/features/finance/services/payment-method-core-service'
import { PaymentTermCoreService } from '@/features/finance/services/payment-term-core-service'
import { type Currency, type PaymentMethod, type PaymentTerm } from '@/features/finance/data/schema'
import { createLogger } from '@/lib/logger'
import { type OrderEvidence, type PurchaseOrder, type Supplier } from '../../../data/schema'
import { getPurchaseStatusLabel } from '../../../data/purchase-status'

const logger = createLogger('PurchaseOrderHeaderFields')
type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]

interface PurchaseOrderHeaderFieldsProps {
  formData: Partial<PurchaseOrder>
  handleHeaderChange: (field: keyof PurchaseOrder, value: PurchaseOrderFieldValue) => void
  suppliers: Supplier[]
  onEvidencesChange: (evidences: OrderEvidence[]) => void
}

export function PurchaseOrderHeaderFields({
  formData,
  handleHeaderChange,
  suppliers,
  onEvidencesChange,
}: PurchaseOrderHeaderFieldsProps) {
  const { t } = useLanguage()
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([])

  useEffect(() => {
    const loadFinanceData = async () => {
      try {
        const [currencyData, paymentMethodData, paymentTermData] = await Promise.all([
          CurrencyCoreService.getCurrencies(),
          PaymentMethodCoreService.getPaymentMethods(),
          PaymentTermCoreService.getPaymentTerms(),
        ])
        setCurrencies(currencyData)
        setPaymentMethods(paymentMethodData.filter((item) => item.status === 'Active'))
        setPaymentTerms(paymentTermData.filter((item) => item.status === 'Active'))
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

  const paymentMethodOptions = paymentMethods.map((paymentMethod) => ({
    label: paymentMethod.name,
    value: paymentMethod.code,
  }))

  const baseCurrency = currencies.find((currency) => currency.isBase) ?? null
  const selectedCurrency = currencies.find((currency) => currency.code === formData.currency) ?? null
  const baseCurrencyCode = baseCurrency?.code || 'CNY'
  const selectedCurrencyCode = formData.currency || selectedCurrency?.code || baseCurrencyCode
  const effectiveExchangeRate =
    typeof formData.exchangeRate === 'number' && Number.isFinite(formData.exchangeRate)
      ? formData.exchangeRate
      : selectedCurrency?.rate ?? 1
  const exchangeRateText =
    selectedCurrencyCode === baseCurrencyCode
      ? t('purchase.orders.headerFields.exchangeRateBaseLocked', {
          currency: selectedCurrencyCode,
        })
      : t('purchase.orders.headerFields.exchangeRatePair', {
          currency: selectedCurrencyCode,
          rate: effectiveExchangeRate.toFixed(4),
          base: baseCurrencyCode,
        })

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

      <div className='grid grid-cols-1 gap-4 rounded-[32px] border border-dashed border-primary/10 bg-primary/5 p-5 md:grid-cols-4'>
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
            {t('purchase.orders.headerFields.paymentMethod')}
          </Label>
          <SelectDropdown
            placeholder={t('purchase.orders.headerFields.paymentMethodPlaceholder')}
            items={paymentMethodOptions}
            defaultValue={formData.paymentMethod}
            onValueChange={(value) => {
              const selected = paymentMethods.find((item) => item.code === value)
              handleHeaderChange('paymentMethod', value)
              handleHeaderChange('paymentMethodName', selected?.name ?? '')
            }}
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
            onValueChange={(value) => {
              const selected = paymentTerms.find((item) => item.code === value)
              handleHeaderChange('paymentTerm', value)
              handleHeaderChange('paymentTermName', selected?.name ?? '')
            }}
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

      <div className='rounded-[32px] border border-dashed border-muted-foreground/20 bg-muted/5 p-5'>
        <OrderEvidenceManager
          evidences={formData.evidences || []}
          onChange={onEvidencesChange}
          disabled={false}
          uploadPath='/purchase/evidence/upload'
        />
      </div>
    </section>
  )
}
