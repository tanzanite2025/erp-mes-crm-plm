import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { isForbiddenError } from '@/lib/error-status'
import { useLanguage } from '@/context/language-provider'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ForbiddenState } from '@/components/forbidden-state'
import { CompactPaginationControls } from '@/components/pagination/compact-pagination-controls'
import { TradingQueryErrorState } from '@/features/trading/components/trading-query-error-state'
import {
  getSalesStatusLabel,
  salesStatusMeta,
} from '@/features/trading/data/sales-status'
import type { SalesOrder } from '@/features/trading/data/schema'
import type {
  SalesReturnRecordsResource,
  SalesReturnSourceOrdersResource,
} from '../hooks/use-sales-return-query-shell'
import {
  SalesReturnCreateSheet,
  type SalesReturnCreateInitialValues,
} from './sales-return-create-sheet'
import { SalesReturnSourceOrderMaster } from './sales-return-source-order-master'

const sourceOrderStatusOptions = [
  'all',
  ...salesStatusMeta
    .filter((status) => status.value !== 'Canceled')
    .map((status) => status.value),
]

function canCreateReturn(order: SalesOrder) {
  if (!order.availableActions || order.availableActions.length === 0) {
    return false
  }

  return order.availableActions.some(
    (item) => item.action === 'createReturn' && item.allowed
  )
}

type SalesReturnsEntryShellProps = {
  searchTerm: string
  statusFilter: string
  sourcePage: number
  sourceTotalPages: number
  sourceOrdersResource: SalesReturnSourceOrdersResource
  returnsResource: SalesReturnRecordsResource
  onRetrySourceOrders: () => void
  onSearchTermChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onSourcePageChange: (page: number) => void
}

export function SalesReturnsEntryShell({
  searchTerm,
  statusFilter,
  sourcePage,
  sourceTotalPages,
  sourceOrdersResource,
  returnsResource,
  onRetrySourceOrders,
  onSearchTermChange,
  onStatusFilterChange,
  onSourcePageChange,
}: SalesReturnsEntryShellProps) {
  const { t } = useLanguage()
  const [createOrder, setCreateOrder] = useState<SalesOrder | undefined>(
    undefined
  )
  const [createInitialValues, setCreateInitialValues] = useState<
    SalesReturnCreateInitialValues | undefined
  >(undefined)
  const returnRecords =
    returnsResource.status === 'ready' ? returnsResource.items : []

  const handleStartReturnLine = (order: SalesOrder, lineId: number) => {
    if (!canCreateReturn(order)) {
      return
    }
    setCreateInitialValues({ initialLineId: lineId })
    setCreateOrder(order)
  }

  return (
    <>
      <div className='flex min-h-0 flex-1 animate-in flex-col gap-6 duration-700 fade-in'>
        <div className='space-y-5'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='relative max-w-xl flex-1'>
              <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
                placeholder={t(
                  'trading.salesReturns.entryShell.searchPlaceholder'
                )}
                className='h-12 rounded-full border-primary/15 bg-background pl-11 font-semibold'
              />
            </div>

            <div className='flex items-center gap-3'>
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className='h-11 w-[180px] rounded-full border-primary/15 bg-background font-semibold'>
                  <SelectValue
                    placeholder={t(
                      'trading.salesReturns.entryShell.statusFilter'
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sourceOrderStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === 'all'
                        ? t('trading.salesReturns.entryShell.allStatuses')
                        : getSalesStatusLabel(status, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {sourceOrdersResource.status === 'error' ? (
            isForbiddenError(sourceOrdersResource.error) ? (
              <ForbiddenState />
            ) : (
              <TradingQueryErrorState
                title={t('trading.salesReturns.entryShell.sourceLoadFailed')}
                error={sourceOrdersResource.error}
                onRetry={onRetrySourceOrders}
              />
            )
          ) : sourceOrdersResource.status === 'loading' ? (
            <div className='flex h-40 items-center justify-center'>
              <Loader2 className='size-8 animate-spin text-primary/40' />
            </div>
          ) : (
            <ScrollArea className='min-h-0 rounded-[28px] border border-dashed border-muted/50 bg-background/40'>
              <div className='space-y-4 p-4'>
                <SalesReturnSourceOrderMaster
                  orders={sourceOrdersResource.items}
                  returnRecords={returnRecords}
                  onStartReturnLine={handleStartReturnLine}
                />
              </div>
            </ScrollArea>
          )}

          {sourceTotalPages > 1 ? (
            <CompactPaginationControls
              className='mt-2'
              page={sourcePage}
              totalPages={sourceTotalPages}
              onPageChange={onSourcePageChange}
            />
          ) : null}
        </div>
      </div>

      <SalesReturnCreateSheet
        order={createOrder}
        open={Boolean(createOrder)}
        initialValues={createInitialValues}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOrder(undefined)
            setCreateInitialValues(undefined)
          }
        }}
      />
    </>
  )
}
