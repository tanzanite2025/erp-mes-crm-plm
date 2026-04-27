import { RotateCcw } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { SalesReturnsEntryShell } from '@/features/trading/sales-returns/components/sales-returns-entry-shell'
import { useSalesReturnQueryShell } from '@/features/trading/sales-returns/hooks/use-sales-return-query-shell'

export function SalesReturnsTab() {
  const { t } = useLanguage()
  const queryShell = useSalesReturnQueryShell()

  return (
    <div className='flex min-h-0 flex-1 animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={RotateCcw}
        title={t('trading.salesReturns.title')}
        description={t('trading.salesReturns.description')}
      />

      <div className='flex min-h-0 flex-1'>
        <SalesReturnsEntryShell
          searchTerm={queryShell.sourceSearchTerm}
          statusFilter={queryShell.sourceStatusFilter}
          sourcePage={queryShell.sourcePage}
          sourceTotalPages={queryShell.sourceTotalPages}
          sourceOrdersResource={queryShell.sourceOrdersResource}
          selectedSourceOrderId={queryShell.selectedSourceOrderId}
          selectedSourceOrder={queryShell.selectedSourceOrder}
          isSourceDetailLoading={queryShell.isSourceDetailLoading}
          onRetrySourceOrders={() => {
            void queryShell.refetchSourceOrders()
          }}
          onSearchTermChange={queryShell.handleSourceSearchTermChange}
          onStatusFilterChange={queryShell.handleSourceStatusFilterChange}
          onSelectSourceOrder={queryShell.handleSelectSourceOrder}
          onClearSelectedSourceOrder={queryShell.handleClearSelectedSourceOrder}
          onSourcePageChange={queryShell.handleSourcePageChange}
          returnPage={queryShell.returnPage}
          returnTotalPages={queryShell.returnTotalPages}
          returnsResource={queryShell.returnsResource}
          selectedReturnId={queryShell.selectedReturnId}
          selectedReturnRecord={queryShell.selectedReturnRecord}
          isReturnDetailLoading={queryShell.isReturnDetailLoading}
          onRetryReturns={() => {
            void queryShell.refetchReturns()
          }}
          onSelectReturn={queryShell.handleSelectReturn}
          onClearSelectedReturn={queryShell.handleClearSelectedReturn}
          onReturnPageChange={queryShell.handleReturnPageChange}
        />
      </div>
    </div>
  )
}
