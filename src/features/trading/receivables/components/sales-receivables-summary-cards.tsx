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
    { label: totalLabel, value: summary?.totalReceivable ?? 0, bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', labelColor: 'text-blue-600 dark:text-blue-400', valueColor: 'text-blue-700 dark:text-blue-300' },
    { label: overdueLabel, value: summary?.overdueReceivable ?? 0, bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-800', labelColor: 'text-rose-600 dark:text-rose-400', valueColor: 'text-rose-700 dark:text-rose-300' },
    { label: pendingLabel, value: summary?.pendingReceiptCount ?? 0, bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800', labelColor: 'text-amber-600 dark:text-amber-400', valueColor: 'text-amber-700 dark:text-amber-300' },
  ]

  return (
    <div className='grid gap-2 md:grid-cols-3'>
      {cards.map((card) => (
        <div
          key={card.label}
          className={`flex items-center justify-between rounded-lg border px-3 py-1.5 ${card.bg} ${card.border}`}
        >
          <span className={`text-[10px] font-black uppercase tracking-[0.12em] ${card.labelColor}`}>
            {card.label}
          </span>
          <span className={`text-base font-black tabular-nums ${card.valueColor}`}>
            {card.value}
          </span>
        </div>
      ))}
    </div>
  )
}
