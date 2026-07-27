import { useState } from 'react'
import { ArrowLeftRight, Loader2, Search } from 'lucide-react'
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
import { CompactPaginationControls } from '@/components/pagination/compact-pagination-controls'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { TradingQueryErrorState } from '@/features/trading/components/trading-query-error-state'
import {
  getSalesStatusLabel,
  salesStatusMeta,
} from '@/features/trading/data/sales-status'
import {
  SalesExchangeCreateDialog,
  type SalesExchangeCreateInitialValues,
} from '../components/sales-exchange-create-dialog'
import { SalesExchangeSourceOrderMaster } from '../components/sales-exchange-source-order-master'
import { useSalesExchangeWorkspaceState } from '../hooks/use-sales-exchange-workspace-state'

const salesExchangeSourceOrderStatusOptions = [
  'all',
  ...salesStatusMeta
    .filter((status) => status.value !== 'Canceled')
    .map((status) => status.value),
]

export function SalesExchangesPage() {
  const { t } = useLanguage()
  const salesExchangeWorkspaceState = useSalesExchangeWorkspaceState()
  const [createInitialValues, setCreateInitialValues] = useState<
    SalesExchangeCreateInitialValues | undefined
  >(undefined)

  const handleOpenCreateSalesExchangeDialog = (
    sourceSalesOrder: NonNullable<
      typeof salesExchangeWorkspaceState.selectedSourceSalesOrder
    >,
    initialValues?: SalesExchangeCreateInitialValues
  ) => {
    setCreateInitialValues(initialValues)
    salesExchangeWorkspaceState.handleOpenCreateSalesExchangeDialog(
      sourceSalesOrder
    )
  }

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
                  <SelectItem key={option} value={option}>
                    {option === 'all'
                      ? t('trading.salesReturns.entryShell.allStatuses')
                      : getSalesStatusLabel(option, t)}
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
                  salesExchangeDraftRecords={
                    salesExchangeWorkspaceState.createdSalesExchangeDraftRecords
                  }
                  onOpenCreateSalesExchangeDialog={(
                    sourceOrderCandidate,
                    lineId
                  ) => {
                    const sourceLine =
                      sourceOrderCandidate.order.lines.find(
                        (line) => line.id === lineId
                      )
                    handleOpenCreateSalesExchangeDialog(
                      sourceOrderCandidate.order,
                      {
                        initialLineId: lineId,
                        defaultReplacementProductCode:
                          sourceLine?.productCode ?? '',
                      }
                    )
                  }}
                />
              </div>
            </ScrollArea>
          )}

          {salesExchangeWorkspaceState.sourceTotalPages > 1 ? (
            <CompactPaginationControls
              className='mt-2'
              page={salesExchangeWorkspaceState.sourcePage}
              totalPages={salesExchangeWorkspaceState.sourceTotalPages}
              onPageChange={salesExchangeWorkspaceState.handleChangeSourcePage}
            />
          ) : null}
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
        initialValues={createInitialValues}
        open={Boolean(
          salesExchangeWorkspaceState.sourceSalesOrderForCreateDialog
        )}
        onOpenChange={(open) => {
          if (!open) {
            setCreateInitialValues(undefined)
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
