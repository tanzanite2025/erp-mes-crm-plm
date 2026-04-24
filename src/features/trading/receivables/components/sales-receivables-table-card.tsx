import { useLanguage } from '@/context/language-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getTradingLedgerAgingLabel, getTradingLedgerStatusLabel } from '@/features/trading/utils/ledger-display'
import type { ReceivableRecord } from '../adapters/receivable-api-adapter'

interface SalesReceivablesTableColumnLabels {
  documentNo: string
  customerName: string
  orderAmount: string
  receivedAmount: string
  outstandingAmount: string
  dueDate: string
  agingBucket: string
  status: string
}

interface SalesReceivablesTableCardProps {
  title: string
  description: string
  items: ReceivableRecord[]
  columnLabels: SalesReceivablesTableColumnLabels
  onSelectReceivable: (receivableId: string) => void
}

const moneyFormatter = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
})

function formatAmount(value: number, currency: string) {
  return `${currency} ${moneyFormatter.format(value)}`
}

function getStatusClassName(status: string) {
  switch (status.toUpperCase()) {
    case 'SETTLED':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    case 'OVERDUE':
      return 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300'
    case 'PARTIAL':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300'
    default:
      return 'border-muted-foreground/20 bg-muted/30 text-muted-foreground'
  }
}

export function SalesReceivablesTableCard({
  title,
  description,
  items,
  columnLabels,
  onSelectReceivable,
}: SalesReceivablesTableCardProps) {
  const { t } = useLanguage()

  return (
    <Card className='overflow-hidden rounded-[24px] border border-dashed border-muted/60 bg-muted/5 shadow-inner'>
      <CardHeader className='gap-2 border-b border-dashed border-muted/50 bg-muted/20 px-5 py-4'>
        <CardTitle className='text-base font-black leading-tight tracking-tight'>{title}</CardTitle>
        <CardDescription className='max-w-3xl text-[11px] font-medium leading-5 text-muted-foreground/70'>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className='p-0'>
        <Table>
          <TableHeader className='bg-background/60'>
            <TableRow className='hover:bg-transparent'>
              <TableHead className='h-11 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>
                {columnLabels.documentNo}
              </TableHead>
              <TableHead className='h-11 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>
                {columnLabels.customerName}
              </TableHead>
              <TableHead className='h-11 px-4 text-right text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>
                {columnLabels.orderAmount}
              </TableHead>
              <TableHead className='h-11 px-4 text-right text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>
                {columnLabels.receivedAmount}
              </TableHead>
              <TableHead className='h-11 px-4 text-right text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>
                {columnLabels.outstandingAmount}
              </TableHead>
              <TableHead className='h-11 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>
                {columnLabels.dueDate}
              </TableHead>
              <TableHead className='h-11 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>
                {columnLabels.agingBucket}
              </TableHead>
              <TableHead className='h-11 px-4 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55'>
                {columnLabels.status}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='h-24 text-center text-[11px] font-bold text-muted-foreground/50'>
                  暂无应收记录
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className='cursor-pointer border-muted/40 transition-colors hover:bg-muted/25'
                  onClick={() => onSelectReceivable(item.id)}
                >
                  <TableCell className='px-4 py-3 text-xs font-black tracking-tight'>{item.documentNo}</TableCell>
                  <TableCell className='px-4 py-3 text-xs font-medium text-muted-foreground'>{item.customerName}</TableCell>
                  <TableCell className='px-4 py-3 text-right text-xs font-semibold tabular-nums'>
                    {formatAmount(item.orderAmount, item.currency)}
                  </TableCell>
                  <TableCell className='px-4 py-3 text-right text-xs font-semibold tabular-nums'>
                    {formatAmount(item.receivedAmount, item.currency)}
                  </TableCell>
                  <TableCell className='px-4 py-3 text-right text-xs font-black tabular-nums'>
                    {formatAmount(item.outstandingAmount, item.currency)}
                  </TableCell>
                  <TableCell className='px-4 py-3 text-xs font-medium text-muted-foreground'>{item.dueDate}</TableCell>
                  <TableCell className='px-4 py-3 text-xs font-medium text-muted-foreground'>{getTradingLedgerAgingLabel(item.agingBucket, t)}</TableCell>
                  <TableCell className='px-4 py-3 text-xs'>
                    <span
                      className={cn(
                        'inline-flex h-6 items-center rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.12em]',
                        getStatusClassName(item.status)
                      )}
                    >
                      {getTradingLedgerStatusLabel(item.status, t)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
