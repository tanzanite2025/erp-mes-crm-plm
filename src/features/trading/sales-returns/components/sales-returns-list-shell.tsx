import { Loader2, RotateCcw, Search } from 'lucide-react'
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
import type { SalesReturnRecord } from '@/features/trading/sales/services/sales-return-service'
import { SalesReturnRecordMaster } from './sales-return-record-master'
import { SalesReturnRecordSpotlight } from './sales-return-record-spotlight'

const salesReturnStatusOptions = [
  'Created',
  'InTransit',
  'Received',
  'Closed',
  'Canceled',
]

function getSalesReturnStatusLabel(
  status: string,
  t: ReturnType<typeof useLanguage>['t']
) {
  switch (status) {
    case 'Created':
      return t('trading.salesReturns.statuses.Created')
    case 'InTransit':
      return t('trading.salesReturns.statuses.InTransit')
    case 'Received':
      return t('trading.salesReturns.statuses.Received')
    case 'Completed':
    case 'Closed':
      return t('trading.salesReturns.statuses.Closed')
    case 'Canceled':
      return t('trading.salesReturns.statuses.Canceled')
    default:
      return status
  }
}

type SalesReturnsListShellProps = {
  searchTerm: string
  statusFilter: string
  page: number
  totalPages: number
  filteredRecords: SalesReturnRecord[]
  selectedId?: string
  selectedRecord?: SalesReturnRecord
  isLoading: boolean
  isError: boolean
  error: unknown
  isDetailLoading: boolean
  onRetry: () => void
  onSearchTermChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onSelectOrder: (id: string) => void
  onClearSelectedOrder: () => void
  onPageChange: (page: number) => void
}

export function SalesReturnsListShell({
  searchTerm,
  statusFilter,
  page,
  totalPages,
  filteredRecords,
  selectedId,
  selectedRecord,
  isLoading,
  isError,
  error,
  isDetailLoading,
  onRetry,
  onSearchTermChange,
  onStatusFilterChange,
  onSelectOrder,
  onClearSelectedOrder,
  onPageChange,
}: SalesReturnsListShellProps) {
  const { t } = useLanguage()

  if (isLoading) {
    return (
      <div className='flex h-[60vh] animate-in flex-col items-center justify-center space-y-4 duration-500 fade-in'>
        <div className='relative'>
          <Loader2 className='size-10 animate-spin text-primary opacity-20' />
          <RotateCcw className='absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-primary' />
        </div>
        <p className='animate-pulse text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
          {t('common.actions.loading')}
        </p>
      </div>
    )
  }

  if (isError) {
    if (isForbiddenError(error)) {
      return <ForbiddenState />
    }

    return (
      <TradingQueryErrorState
        title={t('trading.salesReturns.queryShell.loadFailed')}
        error={error}
        onRetry={onRetry}
      />
    )
  }

  return (
    <div className='flex min-h-0 flex-1 animate-in flex-col gap-6 duration-700 fade-in'>
      <div className='flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-center'>
        <div className='relative max-w-md flex-1'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('trading.salesReturns.queryShell.searchPlaceholder')}
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className='h-11 rounded-2xl border-none bg-muted/50 pl-10 text-[13px] font-medium shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
          />
        </div>

        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end'>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className='h-11 w-full rounded-full border-dashed bg-background/80 font-bold shadow-sm sm:w-[180px]'>
              <SelectValue
                placeholder={t('trading.salesReturns.queryShell.statusFilter')}
              />
            </SelectTrigger>
            <SelectContent className='rounded-2xl'>
              <SelectItem value='all'>
                {t('trading.salesReturns.queryShell.allStatuses')}
              </SelectItem>
              {salesReturnStatusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {getSalesReturnStatusLabel(status, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className='px-1 text-sm leading-6 font-bold text-muted-foreground'>
        {t('trading.salesReturns.queryShell.description')}
      </p>

      <div className='grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]'>
        <ScrollArea className='min-h-0 rounded-[32px] border-2 border-dashed border-muted/50 bg-muted/5'>
          <div className='space-y-4 p-4'>
            <SalesReturnRecordMaster
              records={filteredRecords}
              selectedId={selectedId}
              onSelect={onSelectOrder}
            />
          </div>
        </ScrollArea>

        <div className='space-y-4'>
          <SalesReturnRecordSpotlight
            record={selectedRecord}
            isLoading={isDetailLoading}
            onClearSelection={onClearSelectedOrder}
          />
        </div>
      </div>

      {totalPages > 1 ? (
        <CompactPaginationControls
          className='mt-2'
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      ) : null}
    </div>
  )
}
