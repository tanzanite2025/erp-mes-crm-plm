import { useLanguage } from '@/context/language-provider'
import { OrderEvidenceGallery } from '@/features/sales-document/components/order-evidence-gallery'
import { type SalesOrder } from '../../data/schema'
import { useSalesOrderDetailSummaryViewModel } from '../../hooks/use-sales-order-detail-summary-view-model'

function SalesOrderSummaryInformationField({
  label,
  value,
  highlight = false,
  variant,
}: {
  label: string
  value?: string | number
  highlight?: boolean
  variant?: 'amount'
}) {
  const isAmount = variant === 'amount'

  return (
    <div className='flex min-w-0 items-baseline gap-2'>
      <dt className='shrink-0 text-xs leading-5 text-muted-foreground'>
        {label}
      </dt>
      <dd
        className={`min-w-0 leading-5 [overflow-wrap:anywhere] ${
          isAmount
            ? 'text-base font-semibold text-foreground'
            : 'text-sm font-medium'
        } ${
          highlight
            ? 'text-primary'
            : isAmount
              ? 'text-foreground'
              : 'text-foreground'
        }`}
      >
        {value === '' || value == null ? '—' : value}
      </dd>
    </div>
  )
}

export function SalesOrderDetailSummary({ order }: { order: SalesOrder }) {
  const { t, locale } = useLanguage()
  const { infoRows, recordInfoRows, requirementsText, evidences } =
    useSalesOrderDetailSummaryViewModel({ order, locale, t })

  return (
    <section className='min-w-0 space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4'>
      <h2 className='text-base font-semibold'>
        {t('tradingSalesOrder.detail.summary')}
      </h2>
      <dl className='grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'>
        {infoRows.map((row) => (
          <SalesOrderSummaryInformationField
            key={row.label}
            label={row.label}
            value={row.value}
            highlight={row.highlight}
            variant={row.variant}
          />
        ))}
      </dl>

      <OrderEvidenceGallery
        evidences={evidences}
        titleKey='tradingSalesOrder.detail.evidenceTitle'
        presentation='detail'
      />

      <div className='flex min-w-0 items-baseline gap-3 border-t border-border pt-3'>
        <h3 className='shrink-0 text-xs leading-5 text-muted-foreground'>
          {t('tradingSalesOrder.detail.requirementsTitle')}
        </h3>
        <p className='min-w-0 text-sm leading-5 [overflow-wrap:anywhere] whitespace-pre-wrap text-foreground'>
          {requirementsText}
        </p>
      </div>
      <details className='border-t border-border pt-3'>
        <summary className='cursor-pointer text-sm leading-6 font-medium text-muted-foreground'>
          {t('tradingSalesOrder.detail.readingLayout.recordInformation')}
        </summary>
        <dl className='mt-3 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 xl:grid-cols-4'>
          {recordInfoRows.map((row) => (
            <SalesOrderSummaryInformationField
              key={row.label}
              label={row.label}
              value={row.value}
            />
          ))}
        </dl>
      </details>
    </section>
  )
}
