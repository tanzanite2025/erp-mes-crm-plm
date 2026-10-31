import { Package } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import type { SalesOrderLine } from '../../data/schema'

export function SalesOrderProductModelSummary({
  lines,
}: {
  lines: readonly SalesOrderLine[]
}) {
  const { t, locale } = useLanguage()
  const summaryLabel = t('tradingSalesOrder.master.productSummary.title')

  return (
    <section aria-label={summaryLabel} className='min-w-0 space-y-2'>
      <h3 className='flex items-center gap-1.5 text-[10px] font-black tracking-wide text-muted-foreground'>
        <Package aria-hidden='true' className='size-3.5 shrink-0' />
        {summaryLabel}
      </h3>
      {lines.length === 0 ? (
        <p className='text-xs text-muted-foreground'>
          {t('tradingSalesOrder.master.productSummary.empty')}
        </p>
      ) : (
        <ul className='grid min-w-0 gap-2 sm:grid-cols-2 2xl:grid-cols-3'>
          {lines.map((line) => {
            const productModel =
              line.modelCodeSnapshot?.trim() ||
              line.productModel.trim() ||
              line.productDisplayCodeSnapshot?.trim() ||
              line.productCode.trim()
            const productTitle =
              line.productDisplayTitleSnapshot?.trim() ||
              line.productDisplayFullLabelSnapshot?.trim() ||
              productModel ||
              t('tradingSalesOrder.master.productSummary.unknownProduct')
            const specification =
              line.productDisplaySubtitleSnapshot?.trim() ||
              line.engineeringSpecNameSnapshot?.trim() ||
              line.specification.trim()

            return (
              <li
                key={line.id ?? line.lineNo}
                className='flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-border/60 bg-muted/20 px-3 py-2.5'
              >
                <div className='min-w-0 space-y-1 [overflow-wrap:anywhere]'>
                  <div className='flex flex-wrap items-baseline gap-x-2 gap-y-1'>
                    <span className='text-sm font-bold text-foreground'>
                      {productTitle}
                    </span>
                    {productModel && productModel !== productTitle ? (
                      <span className='text-xs font-semibold text-muted-foreground'>
                        {productModel}
                      </span>
                    ) : null}
                  </div>
                  {specification &&
                  specification !== productTitle &&
                  specification !== productModel ? (
                    <p className='text-xs leading-5 text-muted-foreground'>
                      {specification}
                    </p>
                  ) : null}
                </div>
                <span className='shrink-0 pt-0.5 text-xs font-semibold whitespace-nowrap text-foreground/80 tabular-nums'>
                  {line.qty.toLocaleString(locale)} {line.uom.trim()}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
