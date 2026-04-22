import { Card } from '@/components/ui/card'
import type { ReceivableSummary } from '../adapters/receivable-api-adapter'

interface SalesReceivablesSummaryCardsProps {
  summary: ReceivableSummary | undefined
  totalLabel: string
  overdueLabel: string
  pendingLabel: string
}

export function SalesReceivablesSummaryCards({
  summary,
  totalLabel,
  overdueLabel,
  pendingLabel,
}: SalesReceivablesSummaryCardsProps) {
  const cards = [
    { label: totalLabel, value: summary?.totalReceivable ?? 0, tone: 'text-slate-900 dark:text-slate-100' },
    { label: overdueLabel, value: summary?.overdueReceivable ?? 0, tone: 'text-rose-600 dark:text-rose-300' },
    { label: pendingLabel, value: summary?.pendingReceiptCount ?? 0, tone: 'text-blue-600 dark:text-blue-300' },
  ]

  return (
    <div className='grid gap-3 md:grid-cols-3'>
      {cards.map((card) => (
        <Card
          key={card.label}
          className='rounded-[24px] border border-dashed border-muted/60 bg-muted/5 shadow-inner'
        >
          <div className='flex min-h-[112px] flex-col justify-between gap-3 p-5'>
            <div className='text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground/55'>
              {card.label}
            </div>
            <div className={`text-2xl font-black leading-none tracking-tight tabular-nums ${card.tone}`}>
              {card.value}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
