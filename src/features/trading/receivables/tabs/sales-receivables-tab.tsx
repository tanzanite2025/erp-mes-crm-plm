import { useMemo } from 'react'
import { BanknoteArrowDown } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { Route } from '@/routes/_authenticated/trading/receivables'
import { SalesReceivablesSummaryCards } from '../components/sales-receivables-summary-cards'
import { SalesReceivablesTableCard } from '../components/sales-receivables-table-card'
import { SalesReceivableDetailDialog } from '../components/sales-receivable-detail-dialog'
import { useSalesReceivablesPageState } from '../hooks/use-sales-receivables-page-state'
import { useGetReceivables } from '../hooks/use-receivables'

export function SalesReceivablesTab() {
  const { t } = useLanguage()
  const search = Route.useSearch()
  const listQueryParams = useMemo(
    () => ({
      sourceType: search.sourceType,
      sourceRefId: search.sourceRefId,
    }),
    [search.sourceRefId, search.sourceType]
  )
  const { data } = useGetReceivables(listQueryParams)

  const summary = data?.summary
  const items = useMemo(() => data?.items ?? [], [data?.items])
  const { activeReceivableId, handleSelectReceivable, handleDetailOpenChange } = useSalesReceivablesPageState({
    sourceType: search.sourceType,
    sourceRefId: search.sourceRefId,
    autoOpen: search.autoOpen,
    items,
  })

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={BanknoteArrowDown}
        title={t('trading.receivables.title')}
        description={t('trading.receivables.description')}
      />

      <SalesReceivablesSummaryCards
        summary={summary}
        totalLabel={t('trading.receivables.summaryTotal')}
        overdueLabel={t('trading.receivables.summaryOverdue')}
        pendingLabel={t('trading.receivables.summaryPending')}
      />

      <SalesReceivablesTableCard
        title={t('trading.receivables.tableTitle')}
        description={t('trading.receivables.tableDescription')}
        items={items}
        columnLabels={{
          documentNo: t('trading.receivables.columns.documentNo'),
          customerName: t('trading.receivables.columns.customerName'),
          orderAmount: t('trading.receivables.columns.orderAmount'),
          receivedAmount: t('trading.receivables.columns.receivedAmount'),
          outstandingAmount: t('trading.receivables.columns.outstandingAmount'),
          dueDate: t('trading.receivables.columns.dueDate'),
          agingBucket: t('trading.receivables.columns.agingBucket'),
          status: t('trading.receivables.columns.status'),
        }}
        onSelectReceivable={handleSelectReceivable}
      />

      <SalesReceivableDetailDialog
        open={Boolean(activeReceivableId)}
        receivableId={activeReceivableId}
        onOpenChange={handleDetailOpenChange}
      />
    </div>
  )
}
