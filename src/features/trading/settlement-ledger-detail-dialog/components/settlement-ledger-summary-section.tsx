import type { ReactNode } from 'react'

interface SettlementLedgerSummaryItem {
  label: string
  value: ReactNode
}

interface SettlementLedgerSummarySectionProps {
  items: SettlementLedgerSummaryItem[]
}

export function SettlementLedgerSummarySection({
  items,
}: SettlementLedgerSummarySectionProps) {
  return (
    <div className='grid gap-2 md:grid-cols-2 xl:grid-cols-4'>
      {items.map((item) => (
        <div
          key={item.label}
          className='min-h-[62px] rounded-2xl border border-dashed border-muted/60 bg-muted/5 px-4 py-3 shadow-inner'
        >
          <div className='text-[9px] font-black tracking-[0.12em] text-muted-foreground/55 uppercase'>
            {item.label}
          </div>
          <div
            className='mt-1.5 truncate text-xs leading-5 font-semibold text-foreground'
            title={String(item.value ?? '')}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
