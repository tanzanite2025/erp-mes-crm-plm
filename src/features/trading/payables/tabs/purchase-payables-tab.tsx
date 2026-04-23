import { useState } from 'react'
import { BanknoteArrowUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/context/language-provider'
import { PurchasePayableDetailDialog } from '../components/purchase-payable-detail-dialog'
import { useGetPayables } from '../hooks/use-payables'

export function PurchasePayablesTab() {
  const { t } = useLanguage()
  const { data } = useGetPayables()
  const [selectedLedgerId, setSelectedLedgerId] = useState<string | null>(null)

  const summary = data?.summary
  const items = data?.items ?? []

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={BanknoteArrowUp}
        title={t('purchase.payables.title')}
        description={t('purchase.payables.description')}
      />

      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='rounded-2xl md:rounded-[32px] border border-dashed border-primary/20 bg-muted/5 shadow-inner'>
          <CardHeader className='gap-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('purchase.payables.summaryTotal')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tighter'>
              {summary?.totalPayable ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className='rounded-2xl md:rounded-[32px] border border-dashed border-primary/20 bg-muted/5 shadow-inner'>
          <CardHeader className='gap-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('purchase.payables.summaryOverdue')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tighter'>
              {summary?.overduePayable ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className='rounded-2xl md:rounded-[32px] border border-dashed border-primary/20 bg-muted/5 shadow-inner'>
          <CardHeader className='gap-2'>
            <CardDescription className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>
              {t('purchase.payables.summaryPending')}
            </CardDescription>
            <CardTitle className='text-3xl font-black italic tracking-tighter'>
              {summary?.pendingPaymentCount ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

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
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  className='cursor-pointer'
                  onClick={() => setSelectedLedgerId(item.id)}
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PurchasePayableDetailDialog
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
