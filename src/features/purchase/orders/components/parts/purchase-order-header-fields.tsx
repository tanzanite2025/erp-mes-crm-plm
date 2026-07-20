import { useLanguage } from '@/context/language-provider'
import type { Supplier } from '@/features/purchase/suppliers'
import { type PurchaseOrder } from '../../data/schema'
import { usePurchaseOrderHeaderViewModel } from '../../hooks/use-purchase-order-header-view-model'
import { useFinanceResources } from '@/features/finance/hooks/use-finance-resources'
import { PurchaseOrderCoreFieldsGrid } from './purchase-order-core-fields-grid'
import { PurchaseOrderFinanceStatusBanner } from './purchase-order-finance-status-banner'
import { PurchaseOrderSchedulePaymentFieldsGrid } from './purchase-order-schedule-payment-fields-grid'

type PurchaseOrderFieldValue = PurchaseOrder[keyof PurchaseOrder]

interface PurchaseOrderHeaderFieldsProps {
  formData: Partial<PurchaseOrder>
  handleHeaderChange: (
    field: keyof PurchaseOrder,
    value: PurchaseOrderFieldValue
  ) => void
  suppliers: Supplier[]
}

export function PurchaseOrderHeaderFields({
  formData,
  handleHeaderChange,
  suppliers,
}: PurchaseOrderHeaderFieldsProps) {
  const { t } = useLanguage()
  const financeResources = useFinanceResources({
    includeCurrencies: true,
  })
  const { currencies, paymentMethods, paymentTerms } = financeResources
  const isFinanceLoading = financeResources.readResource.status === 'loading'
  const isFinanceError = financeResources.readResource.status === 'error'
  const isFinanceReady = financeResources.readResource.status === 'ready'
  const financeErrorMessage =
    financeResources.readResource.status === 'error'
      ? financeResources.readResource.error.message
      : ''
  const {
    supplierOptions,
    currencyOptions,
    paymentTermOptions,
    paymentMethodOptions,
    baseCurrencyCode,
    effectiveExchangeRate,
    exchangeRateText,
    handleSupplierChange,
    handlePaymentMethodChange,
    handlePaymentTermChange,
  } = usePurchaseOrderHeaderViewModel({
    formData,
    suppliers,
    currencies,
    paymentMethods,
    paymentTerms,
    t,
    handleHeaderChange,
  })

  return (
    <section className='space-y-2.5'>
      <PurchaseOrderFinanceStatusBanner
        isFinanceLoading={isFinanceLoading}
        isFinanceError={isFinanceError}
        financeErrorMessage={financeErrorMessage}
        onRetry={() => {
          void financeResources.retry()
        }}
      />
      <div className='space-y-3 rounded-[32px] border border-dashed border-muted-foreground/20 bg-muted/20 p-4'>
        <PurchaseOrderCoreFieldsGrid
          formData={formData}
          supplierOptions={supplierOptions}
          currencyOptions={currencyOptions}
          isFinanceLoading={isFinanceLoading}
          isFinanceReady={isFinanceReady}
          effectiveExchangeRate={effectiveExchangeRate}
          baseCurrencyCode={baseCurrencyCode}
          exchangeRateText={exchangeRateText}
          handleHeaderChange={handleHeaderChange}
          handleSupplierChange={handleSupplierChange}
        />
        <PurchaseOrderSchedulePaymentFieldsGrid
          formData={formData}
          paymentMethodOptions={paymentMethodOptions}
          paymentTermOptions={paymentTermOptions}
          isFinanceLoading={isFinanceLoading}
          isFinanceReady={isFinanceReady}
          handleHeaderChange={handleHeaderChange}
          handlePaymentMethodChange={handlePaymentMethodChange}
          handlePaymentTermChange={handlePaymentTermChange}
        />
      </div>
    </section>
  )
}
