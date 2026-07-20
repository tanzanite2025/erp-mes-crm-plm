import { useLanguage } from '@/context/language-provider'
import { OrderEvidenceGallery } from '@/features/sales-document/components/order-evidence-gallery'
import { type SalesOrder } from '../../data/schema'
import { useSalesOrderDetailSummaryViewModel } from '../../hooks/use-sales-order-detail-summary-view-model'

function InfoRow({
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
    <div className='group flex min-w-[72px] flex-col'>
      <span
        className={`uppercase transition-colors group-hover:text-primary ${
          isAmount
            ? 'text-[9px] font-black tracking-wide text-muted-foreground/50'
            : 'text-[9px] font-black tracking-wide text-muted-foreground/50'
        }`}
      >
        {label}
      </span>
      <span
        className={`truncate ${
          isAmount
            ? 'text-sm font-black tracking-tight text-foreground'
            : 'text-[11px] font-black tracking-tight'
        } ${
          highlight
            ? 'text-primary'
            : isAmount
              ? 'text-foreground'
              : 'text-foreground/90'
        }`}
      >
        {value || '-'}
      </span>
    </div>
  )
}

export function SalesOrderDetailSummary({ order }: { order: SalesOrder }) {
  const { t, locale } = useLanguage()
  const { infoRows, requirementsText, evidences } =
    useSalesOrderDetailSummaryViewModel({ order, locale, t })

  return (
    <div className='space-y-2 rounded-xl border border-dashed border-muted/50 bg-muted/5 px-4 py-2.5 shadow-inner'>
      <div className='grid grid-cols-2 gap-x-3 gap-y-1.5 md:grid-cols-4 lg:grid-cols-7'>
        {infoRows.map((row) => (
          <InfoRow
            key={row.label}
            label={row.label}
            value={row.value}
            highlight={row.highlight}
            variant={row.variant}
          />
        ))}
      </div>

      <OrderEvidenceGallery
        evidences={evidences}
        titleKey='tradingSalesOrder.detail.evidenceTitle'
      />

      <div className='border-t border-muted-foreground/10 pt-2'>
        <div className='flex items-start gap-2'>
          <div className='min-w-0 flex-1'>
            <p className='mb-1 text-[9px] leading-none font-black tracking-wide text-muted-foreground/60 uppercase'>
              {t('tradingSalesOrder.detail.requirementsTitle')}
            </p>
            <p className='max-h-10 overflow-y-auto pr-2 text-[11px] leading-snug font-medium text-foreground/80'>
              {requirementsText}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
