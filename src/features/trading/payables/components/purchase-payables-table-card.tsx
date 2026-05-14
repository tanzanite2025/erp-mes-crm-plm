import { useLanguage } from '@/context/language-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { PayableRecord } from '../adapters/payable-api-adapter'

interface PurchasePayablesTableCardProps {
  items: PayableRecord[]
  onSelectPayable: (ledgerId: string) => void
}

export function PurchasePayablesTableCard({ items, onSelectPayable }: PurchasePayablesTableCardProps) {
  const { t } = useLanguage()

  return (
    <Card className='rounded-2xl md:rounded-[32px] border border-dashed border-muted/50 bg-muted/5 overflow-hidden shadow-inner'>
      <CardHeader className='gap-2 border-b border-dashed border-muted/50 bg-muted/20 px-5 py-4 md:px-8 md:py-5'>
        <CardTitle className='text-lg font-black italic tracking-tighter uppercase'>
          {t('purchase.payables.tableTitle')}
        </CardTitle>
        <CardDescription className='text-[10px] md:text-[11px] font-medium leading-5 text-muted-foreground/70'>
          {t('purchase.payables.tableDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className='px-0 py-0'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('purchase.payables.columns.documentNo')}</TableHead>
              <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('purchase.payables.columns.supplierName')}</TableHead>
              <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('purchase.payables.columns.invoiceAmount')}</TableHead>
              <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('purchase.payables.columns.paidAmount')}</TableHead>
              <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('purchase.payables.columns.outstandingAmount')}</TableHead>
              <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('purchase.payables.columns.dueDate')}</TableHead>
              <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('purchase.payables.columns.agingBucket')}</TableHead>
              <TableHead className='h-12 px-4 md:px-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{t('purchase.payables.columns.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='h-24 text-center text-[11px] font-bold text-muted-foreground/50'>
                  暂无应付记录
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className='cursor-pointer'
                  onClick={() => onSelectPayable(item.id)}
                >
                  <TableCell className='px-4 md:px-6 py-3 text-sm font-medium'>{item.documentNo}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm'>{item.supplierName}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm tabular-nums'>{item.invoiceAmount}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm tabular-nums'>{item.paidAmount}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm tabular-nums'>{item.outstandingAmount}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm'>{item.dueDate}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm'>{item.agingBucket}</TableCell>
                  <TableCell className='px-4 md:px-6 py-3 text-sm'>{item.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
