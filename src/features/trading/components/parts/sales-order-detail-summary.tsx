import { useLanguage } from '@/context/language-provider'
import { type SalesOrder } from '../../data/schema'
import { useSalesOrderDetailSummaryViewModel } from '../../hooks/use-sales-order-detail-summary-view-model'
import { OrderEvidenceGallery } from './order-evidence-gallery'

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
    <div className='group flex min-w-[80px] flex-col'>
      <span className={`uppercase transition-colors group-hover:text-primary ${
        isAmount
          ? 'text-[9px] font-black tracking-[0.18em] text-muted-foreground/50'
          : 'text-[10px] font-black tracking-widest text-muted-foreground/40'
      }`}>
        {label}
      </span>
      <span
        className={`truncate ${
          isAmount
            ? 'text-[15px] font-black tracking-tight text-foreground'
            : 'text-[12px] font-black tracking-tight'
        } ${
          highlight ? 'text-primary' : isAmount ? 'text-foreground' : 'text-foreground/90'
        }`}
      >
        {value || '-'}
      </span>
    </div>
  )
}

export function SalesOrderDetailSummary({ order }: { order: SalesOrder }) {
  const { t, locale } = useLanguage()
  const {
    infoRows,
    requirementsText,
    evidences,
  } = useSalesOrderDetailSummaryViewModel({ order, locale, t })

  return (
    <div className='space-y-4 rounded-[24px] border border-dashed border-muted/50 bg-muted/5 px-6 py-5 shadow-inner'>
      <div className='grid grid-cols-2 gap-x-4 gap-y-2.5 md:grid-cols-4 lg:grid-cols-6'>
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

      <div className='border-t border-muted-foreground/10 pt-4'>
        <div className='flex items-start gap-3'>
          <div className='size-1.5 shrink-0 translate-y-1.5 rounded-full bg-primary/40' />
          <div className='space-y-1.5'>
            <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none'>
              {t('tradingSalesOrder.detail.requirementsTitle')}
            </p>
            <p className='text-[12px] font-medium leading-relaxed text-foreground/80'>
              {requirementsText}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
