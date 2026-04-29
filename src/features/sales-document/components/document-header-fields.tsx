import { Barcode as BarcodeIcon, Calendar, CircleDollarSign, Hash, User } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { StatusGuard } from '@/components/status-guard'
import {
  type Customer,
  type SalesOrderDraft,
} from '@/features/trading/data/schema'
import { useSalesOrderHeaderFieldsViewModel } from '@/features/trading/hooks/use-sales-order-header-fields-view-model'
import { useTradingFinanceResources } from '@/features/trading/hooks/use-trading-finance-resources'
import { SALES_ORDER_EDITABLE_STATUSES } from '@/features/trading/utils/sales-order-actions'
import { cn } from '@/lib/utils'
import { DocumentEvidenceManager } from './document-evidence-manager'

type SalesOrderFormState = SalesOrderDraft
type SalesOrderFormUpdater =
  | SalesOrderFormState
  | ((prev: SalesOrderFormState) => SalesOrderFormState)

interface DocumentHeaderFieldsProps {
  formData: SalesOrderDraft
  setFormData: (value: SalesOrderFormUpdater) => void
  customers: Customer[]
  onClassificationChange: (value: string) => void
  readOnly?: boolean
  compactEvidence?: boolean
  denseContractFields?: boolean
}

export function DocumentHeaderFields({
  formData,
  setFormData,
  customers,
  onClassificationChange,
  readOnly = false,
  compactEvidence = false,
  denseContractFields = false,
}: DocumentHeaderFieldsProps) {
  const { t, locale } = useLanguage()
  const financeResources = useTradingFinanceResources({ includeCurrencies: true })
  const { currencies, paymentMethods, paymentTerms } = financeResources
  const isFinanceLoading = financeResources.readResource.status === 'loading'
  const isFinanceError = financeResources.readResource.status === 'error'
  const financeErrorMessage = financeResources.readResource.status === 'error'
    ? financeResources.readResource.error.message
    : ''
  const {
    typeOptions,
    classificationOptions,
    customerOptions,
    selectedCustomerId,
    currencyOptions,
    paymentMethodOptions,
    paymentTermOptions,
    handleCustomerChange,
    handleCurrencyChange,
    handlePaymentMethodChange,
    handlePaymentTermChange,
  } = useSalesOrderHeaderFieldsViewModel({
    locale,
    customers,
    currencies,
    currentCurrency: formData.currency,
    currentCustomerId: formData.customerId,
    currentCustomerName: formData.customerName,
    paymentMethods,
    paymentTerms,
    setFormData,
  })

  return (
    <section className='space-y-3'>
      <div className='flex items-center gap-2 px-1'>
        <div className='flex size-3 items-center justify-center rounded-full bg-primary/20'>
          <div className='size-1.5 rounded-full bg-primary' />
        </div>
        <h4 className='text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase italic'>
          {t('tradingSalesOrder.headerFields.sectionTitle')}
        </h4>
      </div>

      <StatusGuard
        status={formData.status || 'Draft'}
        allowedStatuses={[...SALES_ORDER_EDITABLE_STATUSES]}
        message={t('tradingSalesOrder.headerFields.lockedMessage')}
      >
        {isFinanceLoading ? (
          <div className='rounded-[20px] border border-dashed border-amber-500/30 bg-amber-500/5 px-4 py-3'>
            <p className='text-[10px] font-black tracking-widest text-amber-700 uppercase'>财务字段加载中</p>
            <p className='mt-1 text-[9px] font-bold text-amber-700/80'>支付币种、支付方式与结算方式暂不可编辑。</p>
          </div>
        ) : null}
        {isFinanceError ? (
          <div className='flex items-center justify-between gap-3 rounded-[20px] border border-dashed border-rose-500/30 bg-rose-500/5 px-4 py-3'>
            <div className='space-y-1'>
              <p className='text-[10px] font-black tracking-widest text-rose-700 uppercase'>财务字段加载失败</p>
              <p className='text-[9px] font-bold text-rose-700/80'>{financeErrorMessage || '请重试后再编辑支付币种、支付方式与结算方式。'}</p>
            </div>
            <Button
              type='button'
              variant='outline'
              className='h-9 rounded-full border-dashed px-4 text-[10px] font-black uppercase tracking-widest'
              onClick={() => {
                void financeResources.retry()
              }}
            >
              重试
            </Button>
          </div>
        ) : null}
        <div
          className={cn(
            'grid grid-cols-1 gap-4 rounded-[24px] border border-dashed border-muted-foreground/20 bg-muted/5 p-4 transition-all sm:p-5 md:grid-cols-2',
            denseContractFields ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
          )}
        >
          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.detail.info.customerPo')}
            </Label>
            <Input
              placeholder={t('tradingSalesOrder.detail.info.customerPo')}
              value={formData.purchaseOrderNo || ''}
              readOnly={readOnly}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  purchaseOrderNo: e.target.value,
                }))
              }
              className='h-11 text-[13px] font-bold shadow-sm sm:h-10 sm:text-[12px]'
            />
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.orderNo')}
            </Label>
            <div className='group relative'>
              <Hash className='absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-primary/40 transition-colors group-hover:text-primary' />
              <Input
                placeholder={t(
                  'tradingSalesOrder.headerFields.orderNoPlaceholder'
                )}
                value={formData.orderNo}
                readOnly
                className='h-11 cursor-not-allowed border-muted-foreground/10 bg-muted/20 pl-9 font-mono text-[13px] font-bold shadow-sm sm:h-10 sm:text-[12px]'
              />
            </div>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.customer')}
            </Label>
            <div className='relative'>
              <User className='absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/40' />
              <select
                className='h-11 w-full appearance-none truncate rounded-xl border border-muted/30 bg-background px-3 pl-9 text-[13px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20 sm:h-10 sm:text-[12px]'
                value={selectedCustomerId}
                disabled={readOnly}
                onChange={(e) => handleCustomerChange(e.target.value)}
              >
                <option value=''>
                  {t('tradingSalesOrder.headerFields.customerPlaceholder')}
                </option>
                {customerOptions.map((customer) => (
                  <option key={customer.id} value={customer.value}>
                    {customer.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.tradeMode')}
            </Label>
            <select
              className='h-11 w-full appearance-none rounded-xl border border-muted/30 bg-background px-4 text-[13px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20 sm:h-10 sm:text-[12px]'
              value={formData.type}
              disabled={readOnly}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, type: e.target.value }))
              }
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.category')}
            </Label>
            <select
              className='h-11 w-full appearance-none rounded-xl border border-muted/30 bg-background px-4 text-[13px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20 sm:h-10 sm:text-[12px]'
              value={formData.classification}
              disabled={readOnly}
              onChange={(e) => onClassificationChange(e.target.value)}
            >
              {classificationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.deliveryDeadline')}
            </Label>
            <div className='relative'>
              <Calendar className='absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/40' />
              <Input
                type='date'
                value={formData.deliveryDate}
                readOnly={readOnly}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryDate: e.target.value,
                  }))
                }
                className='h-11 pl-9 text-[13px] font-bold shadow-sm sm:h-10 sm:text-[12px]'
              />
            </div>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.paymentCurrency')}
            </Label>
            <div className='relative'>
              <CircleDollarSign className='absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/40' />
              <select
                className='h-11 w-full appearance-none truncate rounded-xl border border-muted/30 bg-background px-3 pl-9 text-[13px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20 sm:h-10 sm:text-[12px]'
                value={formData.currency || 'CNY'}
                disabled={readOnly || isFinanceLoading || isFinanceError}
                onChange={(e) => handleCurrencyChange(e.target.value)}
              >
                <option value=''>
                  {t('tradingSalesOrder.headerFields.paymentCurrencyPlaceholder')}
                </option>
                {currencyOptions.map((currency) => (
                  <option key={currency.value} value={currency.value}>
                    {currency.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.paymentMethod')}
            </Label>
            <select
              className='h-11 w-full appearance-none rounded-xl border border-muted/30 bg-background px-4 text-[13px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20 sm:h-10 sm:text-[12px]'
              value={formData.paymentMethod || ''}
              disabled={readOnly || isFinanceLoading || isFinanceError}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
            >
              <option value=''>
                {t('tradingSalesOrder.headerFields.paymentMethodPlaceholder')}
              </option>
              {paymentMethodOptions.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.paymentTerm')}
            </Label>
            <select
              className='h-11 w-full appearance-none rounded-xl border border-muted/30 bg-background px-4 text-[13px] font-bold shadow-sm focus:ring-2 focus:ring-primary/20 sm:h-10 sm:text-[12px]'
              value={formData.paymentTerm || ''}
              disabled={readOnly || isFinanceLoading || isFinanceError}
              onChange={(e) => handlePaymentTermChange(e.target.value)}
            >
              <option value=''>
                {t('tradingSalesOrder.headerFields.paymentTermPlaceholder')}
              </option>
              {paymentTermOptions.map((term) => (
                <option key={term.value} value={term.value}>
                  {term.label}
                </option>
              ))}
            </select>
          </div>

          <div className='grid gap-1'>
            <Label className='pl-1 text-[8px] leading-none font-bold tracking-widest text-muted-foreground/80 uppercase italic sm:text-[9px]'>
              {t('tradingSalesOrder.headerFields.barcode')}
            </Label>
            <div className='group relative'>
              <BarcodeIcon className='absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-primary/60' />
              <Input
                placeholder={t(
                  'tradingSalesOrder.headerFields.barcodePlaceholder'
                )}
                value={formData.barcode}
                readOnly
                className='h-11 cursor-not-allowed border-primary/20 bg-primary/5 pl-9 font-mono text-[13px] font-bold text-primary sm:h-10 sm:text-[12px]'
              />
            </div>
          </div>

          <div
            className={cn(
              'grid gap-3 md:col-span-4',
              denseContractFields && 'lg:col-span-5'
            )}
          >
            <DocumentEvidenceManager
              evidences={formData.evidences || []}
              onChange={(evs) =>
                setFormData((prev) => ({ ...prev, evidences: evs }))
              }
              disabled={
                readOnly ||
                !SALES_ORDER_EDITABLE_STATUSES.includes(
                  formData.status || 'Draft'
                )
              }
              compact={compactEvidence}
            />
          </div>
        </div>
      </StatusGuard>
    </section>
  )
}
