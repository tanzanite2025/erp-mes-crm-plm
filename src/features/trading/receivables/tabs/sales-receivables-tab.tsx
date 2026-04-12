import { useState } from 'react'
import { BanknoteArrowDown } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout/page-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import { SalesReceivableDetailDialog } from '../components/sales-receivable-detail-dialog'
import { useGetReceivables } from '../hooks/use-receivables'

export function SalesReceivablesTab() {
  const { t } = useLanguage()
  const { data } = useGetReceivables()
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null)

  const summary = data?.summary
  const items = data?.items ?? []

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={BanknoteArrowDown}
        title={t('trading.receivables.title')}
        description={t('trading.receivables.description')}
      />

      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='rounded-2xl md:rounded-[32px] border border-dashed border-primary/20 bg-muted/5 shadow-inner'>
          <CardHeader className='gap-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('trading.receivables.summaryTotal')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tighter'>
              {summary?.totalReceivable ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className='rounded-2xl md:rounded-[32px] border border-dashed border-primary/20 bg-muted/5 shadow-inner'>
          <CardHeader className='gap-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('trading.receivables.summaryOverdue')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tighter'>
              {summary?.overdueReceivable ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className='rounded-2xl md:rounded-[32px] border border-dashed border-primary/20 bg-muted/5 shadow-inner'>
          <CardHeader className='gap-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('trading.receivables.summaryPending')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tighter'>
              {summary?.pendingReceiptCount ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className='rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner'>
        <CardHeader className='gap-2 border-b border-dashed border-muted/50 bg-muted/20 px-5 py-4 md:px-8 md:py-5'>
          <CardTitle className='text-lg font-black italic tracking-tighter uppercase'>
            {t('trading.receivables.tableTitle')}
          </CardTitle>
          <CardDescription className='text-[10px] md:text-[11px] font-medium leading-5 text-muted-foreground/70'>
            {t('trading.receivables.tableDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className='px-0 py-0'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('trading.receivables.columns.documentNo')}</TableHead>
                <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('trading.receivables.columns.customerName')}</TableHead>
                <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('trading.receivables.columns.invoiceAmount')}</TableHead>
                <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('trading.receivables.columns.receivedAmount')}</TableHead>
                <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('trading.receivables.columns.outstandingAmount')}</TableHead>
                <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('trading.receivables.columns.dueDate')}</TableHead>
                <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('trading.receivables.columns.agingBucket')}</TableHead>
                <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('trading.receivables.columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className='cursor-pointer'
                  onClick={() => setSelectedLedgerId(item.id)}
                >
                  <TableCell className='px-4 md:px-6 py-3 text-sm font-medium'>{item.documentNo}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm'>{item.customerName}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm tabular-nums'>{item.invoiceAmount}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm tabular-nums'>{item.receivedAmount}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm tabular-nums'>{item.outstandingAmount}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm'>{item.dueDate}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm'>{item.agingBucket}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm'>{item.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SalesReceivableDetailDialog
        open={Boolean(selectedLedgerId)}
        ledgerId={selectedLedgerId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedLedgerId(null)
          }
        }}
      />
    </div>
  )
}
