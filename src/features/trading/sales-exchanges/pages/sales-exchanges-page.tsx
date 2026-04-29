import {
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
} from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { TradingQueryErrorState } from '@/features/trading/components/trading-query-error-state'
import { SalesExchangeCreateDialog } from '../components/sales-exchange-create-dialog'
import { SalesExchangeDraftRecordMaster } from '../components/sales-exchange-draft-record-master'
import { SalesExchangeRecordSpotlight } from '../components/sales-exchange-record-spotlight'
import { SalesExchangeSourceOrderMaster } from '../components/sales-exchange-source-order-master'
import { useSalesExchangeWorkspaceState } from '../hooks/use-sales-exchange-workspace-state'

const salesExchangeSourceOrderStatusOptions = [
  { value: 'all', label: '全部可换订单' },
  { value: 'InProgress', label: '生产中' },
  { value: 'Done', label: '已完成' },
]

export function SalesExchangesPage() {
  const { t } = useLanguage()
  const salesExchangeWorkspaceState = useSalesExchangeWorkspaceState()

  return (
    <div className='flex min-h-0 flex-1 animate-in flex-col gap-8 duration-700 fade-in'>
      <IndustrialHeader
        icon={ArrowLeftRight}
        title={t('trading.salesExchanges.title')}
        description={t('trading.salesExchanges.description')}
      />

      <div className='flex min-h-0 flex-1 flex-col gap-6'>
        <section className='space-y-4'>
          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='relative max-w-xl flex-1'>
              <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={salesExchangeWorkspaceState.sourceSearchTerm}
                onChange={(event) =>
                  salesExchangeWorkspaceState.handleChangeSourceSearchTerm(
                    event.target.value
                  )
                }
                placeholder='搜索客户、销售订单号或订单名称...'
                className='h-12 rounded-full border-primary/15 bg-background pl-11 font-semibold'
              />
            </div>

            <Select
              value={salesExchangeWorkspaceState.sourceStatusFilter}
              onValueChange={
                salesExchangeWorkspaceState.handleChangeSourceStatusFilter
              }
            >
              <SelectTrigger className='h-11 w-[180px] rounded-full border-primary/15 bg-background font-semibold'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {salesExchangeSourceOrderStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {salesExchangeWorkspaceState.sourceSalesOrdersQuery.isError ? (
            <TradingQueryErrorState
              title='可换货销售订单加载失败'
              error={salesExchangeWorkspaceState.sourceSalesOrdersQuery.error}
              onRetry={() =>
                void salesExchangeWorkspaceState.sourceSalesOrdersQuery.refetch()
              }
            />
          ) : salesExchangeWorkspaceState.sourceSalesOrdersQuery.isLoading ? (
            <div className='flex h-40 items-center justify-center'>
              <Loader2 className='size-8 animate-spin text-primary/40' />
            </div>
          ) : (
            <ScrollArea className='min-h-0 rounded-[28px] border border-dashed border-muted/50 bg-background/40'>
              <div className='space-y-4 p-4'>
                <SalesExchangeSourceOrderMaster
                  sourceOrderCandidates={
                    salesExchangeWorkspaceState.sourceSalesOrderCandidates
                  }
                  selectedSourceSalesOrderId={
                    salesExchangeWorkspaceState.selectedSourceSalesOrderId
                  }
                  onSelectSourceSalesOrder={
                    salesExchangeWorkspaceState.handleSelectSourceSalesOrder
                  }
                  onOpenCreateSalesExchangeDialog={(sourceOrderCandidate) =>
                    salesExchangeWorkspaceState.handleOpenCreateSalesExchangeDialog(
                      sourceOrderCandidate.order
                    )
                  }
                />
              </div>
            </ScrollArea>
          )}

          {salesExchangeWorkspaceState.sourceTotalPages > 1 ? (
            <div className='mt-2 flex items-center justify-center gap-4'>
              <Button
                variant='outline'
                size='icon'
                disabled={salesExchangeWorkspaceState.sourcePage === 1}
                onClick={() =>
                  salesExchangeWorkspaceState.handleChangeSourcePage(
                    salesExchangeWorkspaceState.sourcePage - 1
                  )
                }
                className='size-10 rounded-full'
              >
                <ChevronLeft className='size-4' />
              </Button>
              <span className='font-mono text-[10px] font-black'>
                {salesExchangeWorkspaceState.sourcePage} /{' '}
                {salesExchangeWorkspaceState.sourceTotalPages}
              </span>
              <Button
                variant='outline'
                size='icon'
                disabled={
                  salesExchangeWorkspaceState.sourcePage >=
                  salesExchangeWorkspaceState.sourceTotalPages
                }
                onClick={() =>
                  salesExchangeWorkspaceState.handleChangeSourcePage(
                    salesExchangeWorkspaceState.sourcePage + 1
                  )
                }
                className='size-10 rounded-full'
              >
                <ChevronRight className='size-4' />
              </Button>
            </div>
          ) : null}
        </section>

        <section className='rounded-[28px] border border-dashed border-muted/50 bg-muted/5 shadow-none'>
          <div className='px-5 pt-5 pb-2'>
            <div className='text-sm font-black tracking-tight text-foreground'>
              销售换货草稿
            </div>
            <p className='mt-1 text-xs leading-6 font-bold text-muted-foreground'>
              这里先独立承接换货草稿、标签码和补发要求，不复用退货金额和仓库写入逻辑。
            </p>
          </div>
          <div className='grid min-h-0 gap-6 px-5 pb-5 xl:grid-cols-[minmax(0,1fr)_420px]'>
            <ScrollArea className='min-h-0 rounded-[28px] border border-dashed border-muted/50 bg-background/40'>
              <div className='space-y-4 p-4'>
                <SalesExchangeDraftRecordMaster
                  salesExchangeDraftRecords={
                    salesExchangeWorkspaceState.createdSalesExchangeDraftRecords
                  }
                  selectedSalesExchangeDraftRecordId={
                    salesExchangeWorkspaceState.selectedSalesExchangeDraftRecordId
                  }
                  onSelectSalesExchangeDraftRecord={
                    salesExchangeWorkspaceState.handleSelectSalesExchangeDraftRecord
                  }
                  onRemoveSalesExchangeDraftRecord={
                    salesExchangeWorkspaceState.handleRemoveSalesExchangeDraftRecord
                  }
                />
              </div>
            </ScrollArea>
            <SalesExchangeRecordSpotlight
              salesExchangeDraftRecord={
                salesExchangeWorkspaceState.selectedSalesExchangeDraftRecord
              }
            />
          </div>
        </section>
      </div>

      <SalesExchangeCreateDialog
        key={
          salesExchangeWorkspaceState.sourceSalesOrderForCreateDialog?.id ??
          'sales-exchange-create-dialog-closed'
        }
        sourceSalesOrder={
          salesExchangeWorkspaceState.sourceSalesOrderForCreateDialog
        }
        open={Boolean(
          salesExchangeWorkspaceState.sourceSalesOrderForCreateDialog
        )}
        onOpenChange={(open) => {
          if (!open) {
            salesExchangeWorkspaceState.handleCloseCreateSalesExchangeDialog()
          }
        }}
        onCreateSalesExchangeDraftRecord={
          salesExchangeWorkspaceState.handleCreateSalesExchangeDraftRecord
        }
      />
    </div>
  )
}
