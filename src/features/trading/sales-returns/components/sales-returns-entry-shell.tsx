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
import type { SalesOrder } from '@/features/trading/data/schema'
import { useSalesReturnMutations } from '@/features/trading/sales/hooks/use-sales-returns'
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'
import type {
  SalesReturnRecordsResource,
  SalesReturnSourceOrdersResource,
} from '../hooks/use-sales-return-query-shell'
import { SalesReturnCreateSheet } from './sales-return-create-sheet'
import { SalesReturnRecordMaster } from './sales-return-record-master'
import { SalesReturnRecordSpotlight } from './sales-return-record-spotlight'
import { SalesReturnSourceOrderMaster } from './sales-return-source-order-master'
import { SalesReturnSourceOrderSpotlight } from './sales-return-source-order-spotlight'

const sourceOrderStatusOptions = ['all', 'InProgress', 'Done']

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
  selectedSourceOrderId?: string
  selectedSourceOrder?: SalesOrder
  isSourceDetailLoading: boolean
  onRetrySourceOrders: () => void
  onSearchTermChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onSelectSourceOrder: (id: string) => void
  onClearSelectedSourceOrder: () => void
  onSourcePageChange: (page: number) => void
  returnPage: number
  returnTotalPages: number
  returnsResource: SalesReturnRecordsResource
  selectedReturnId?: string
  selectedReturnRecord?: SalesReturnRecord
  isReturnDetailLoading: boolean
  onRetryReturns: () => void
  onSelectReturn: (id: string) => void
  onClearSelectedReturn: () => void
  onReturnPageChange: (page: number) => void
}

export function SalesReturnsEntryShell({
  searchTerm,
  statusFilter,
  sourcePage,
  sourceTotalPages,
  sourceOrdersResource,
  selectedSourceOrderId,
  selectedSourceOrder,
  isSourceDetailLoading,
  onRetrySourceOrders,
  onSearchTermChange,
  onStatusFilterChange,
  onSelectSourceOrder,
  onClearSelectedSourceOrder,
  onSourcePageChange,
  returnPage,
  returnTotalPages,
  returnsResource,
  selectedReturnId,
  selectedReturnRecord,
  isReturnDetailLoading,
  onRetryReturns,
  onSelectReturn,
  onClearSelectedReturn,
  onReturnPageChange,
}: SalesReturnsEntryShellProps) {
  const { t } = useLanguage()
  const { deleteMutation } = useSalesReturnMutations()
  const [createOrder, setCreateOrder] = useState<SalesOrder | undefined>(
    undefined
  )
  const shouldShowSourceSpotlight =
    isSourceDetailLoading || Boolean(selectedSourceOrder)

  const handleStartReturn = (order: SalesOrder) => {
    if (!canCreateReturn(order)) {
      return
    }
    setCreateOrder(order)
  }

  const handleDeleteReturn = async (record: SalesReturnRecord) => {
    const wasSelected = selectedReturnId === record.id

    if (wasSelected) {
      onClearSelectedReturn()
    }

    try {
      await deleteMutation.mutateAsync({
        salesReturnId: record.id,
        salesOrderId: record.salesOrderId,
      })
    } catch (error) {
      if (wasSelected) {
        onSelectReturn(record.id)
      }
      throw error
    }
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
                        : status}
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
            <div
              className={
                shouldShowSourceSpotlight
                  ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'
                  : 'grid gap-6'
              }
            >
              <ScrollArea className='min-h-0 rounded-[28px] border border-dashed border-muted/50 bg-background/40'>
                <div className='space-y-4 p-4'>
                  <SalesReturnSourceOrderMaster
                    orders={sourceOrdersResource.items}
                    selectedId={selectedSourceOrderId}
                    onSelect={onSelectSourceOrder}
                    onStartReturn={handleStartReturn}
                  />
                </div>
              </ScrollArea>
              {shouldShowSourceSpotlight ? (
                <SalesReturnSourceOrderSpotlight
                  order={selectedSourceOrder}
                  isLoading={isSourceDetailLoading}
                  onClearSelection={onClearSelectedSourceOrder}
                  onStartReturn={handleStartReturn}
                />
              ) : null}
            </div>
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

        <div className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
          <div className='px-5 pt-5 pb-2'>
            <div className='text-sm font-black tracking-tight text-foreground'>
              {t('trading.salesReturns.entryShell.returnsSectionTitle')}
            </div>
            <p className='mt-1 text-xs leading-6 font-bold text-muted-foreground'>
              {t('trading.salesReturns.entryShell.returnsSectionDescription')}
            </p>
          </div>
          <div className='px-5 pb-5'>
            {returnsResource.status === 'error' ? (
              isForbiddenError(returnsResource.error) ? (
                <ForbiddenState />
              ) : (
                <TradingQueryErrorState
                  title={t('trading.salesReturns.queryShell.loadFailed')}
                  error={returnsResource.error}
                  onRetry={onRetryReturns}
                />
              )
            ) : returnsResource.status === 'loading' ? (
              <div className='flex h-40 items-center justify-center'>
                <Loader2 className='size-8 animate-spin text-primary/40' />
              </div>
            ) : (
              <div className='grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]'>
                <ScrollArea className='min-h-0 rounded-[28px] border border-dashed border-muted/50 bg-background/40'>
                  <div className='space-y-4 p-4'>
                    <SalesReturnRecordMaster
                      records={returnsResource.items}
                      selectedId={selectedReturnId}
                      onSelect={onSelectReturn}
                      onDelete={handleDeleteReturn}
                      deletingId={
                        deleteMutation.isPending
                          ? deleteMutation.variables?.salesReturnId
                          : undefined
                      }
                    />
                  </div>
                </ScrollArea>
                <SalesReturnRecordSpotlight
                  record={selectedReturnRecord}
                  isLoading={isReturnDetailLoading}
                  onClearSelection={onClearSelectedReturn}
                />
              </div>
            )}

            {returnTotalPages > 1 ? (
              <CompactPaginationControls
                className='mt-6'
                page={returnPage}
                totalPages={returnTotalPages}
                onPageChange={onReturnPageChange}
              />
            ) : null}
          </div>
        </div>
      </div>

      <SalesReturnCreateSheet
        order={createOrder}
        open={Boolean(createOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOrder(undefined)
          }
        }}
        onCreated={onSelectReturn}
      />
    </>
  )
}
