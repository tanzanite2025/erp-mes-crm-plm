import { Plus, Search } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { salesOrderStatuses, type SalesOrderStatus } from '../data/schema'

const salesOrderStatusLabelKeyMap: Record<
  SalesOrderStatus,
  'draft' | 'pending' | 'scheduling' | 'inProgress' | 'done' | 'canceled'
> = {
  Draft: 'draft',
  Pending: 'pending',
  Scheduling: 'scheduling',
  InProgress: 'inProgress',
  Done: 'done',
  Canceled: 'canceled',
}

function toSalesOrderStatusKey(status: SalesOrderStatus) {
  return salesOrderStatusLabelKeyMap[status]
}

interface SalesOrderListFilterOption {
  value: string
  label: string
}

interface SalesOrderListToolbarProps {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  paymentMethodFilter: string
  onPaymentMethodFilterChange: (value: string) => void
  paymentTermFilter: string
  onPaymentTermFilterChange: (value: string) => void
  paymentMethodOptions: SalesOrderListFilterOption[]
  paymentTermOptions: SalesOrderListFilterOption[]
  financeFilterStatus: 'error' | 'loading' | 'ready'
  financeFilterErrorMessage?: string
  onRetryFinanceFilters: () => void
  onAddOrder: () => void
  hasCustomerContext: boolean
  customerContextLabel: string
  onClearCustomerContext: () => void
}

export function SalesOrderListToolbar({
  searchTerm,
  onSearchTermChange,
  statusFilter,
  onStatusFilterChange,
  paymentMethodFilter,
  onPaymentMethodFilterChange,
  paymentTermFilter,
  onPaymentTermFilterChange,
  paymentMethodOptions,
  paymentTermOptions,
  financeFilterStatus,
  financeFilterErrorMessage,
  onRetryFinanceFilters,
  onAddOrder,
  hasCustomerContext,
  customerContextLabel,
  onClearCustomerContext,
}: SalesOrderListToolbarProps) {
  const { t } = useLanguage()

  return (
    <>
      <div className='flex flex-col justify-between gap-4 px-1 sm:flex-row sm:items-center'>
        <div className='relative max-w-md flex-1'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('tradingSalesOrder.linesEditor.selectDesktop')}
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            className='h-11 rounded-2xl border-none bg-muted/50 pl-10 text-[13px] font-medium shadow-inner focus-visible:ring-1 focus-visible:ring-primary/20'
          />
        </div>

        <div className='flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end'>
          <div className='grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2'>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className='h-9 w-full min-w-0 rounded-full border-dashed bg-background/80 px-1.5 text-[9px] font-black tracking-tighter shadow-sm sm:h-11 sm:w-[180px] sm:px-3 sm:text-[11px] sm:font-bold sm:tracking-normal'>
                <SelectValue
                  placeholder={t('tradingSalesOrder.master.filters.status')}
                />
              </SelectTrigger>
              <SelectContent className='rounded-2xl'>
                <SelectItem value='all'>
                  {t('tradingSalesOrder.master.filters.allStatuses')}
                </SelectItem>
                {salesOrderStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {t(
                      `tradingSalesOrder.status.${toSalesOrderStatusKey(status.value)}`
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={paymentMethodFilter}
              onValueChange={onPaymentMethodFilterChange}
            >
              <SelectTrigger
                className='h-9 w-full min-w-0 rounded-full border-dashed bg-background/80 px-1.5 text-[9px] font-black tracking-tighter shadow-sm sm:h-11 sm:w-[180px] sm:px-3 sm:text-[11px] sm:font-bold sm:tracking-normal'
                disabled={financeFilterStatus !== 'ready'}
              >
                <SelectValue
                  placeholder={t(
                    'tradingSalesOrder.master.filters.paymentMethod'
                  )}
                />
              </SelectTrigger>
              <SelectContent className='rounded-2xl'>
                <SelectItem value='ALL'>
                  {t('tradingSalesOrder.master.filters.allPaymentMethods')}
                </SelectItem>
                {paymentMethodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={paymentTermFilter}
              onValueChange={onPaymentTermFilterChange}
            >
              <SelectTrigger
                className='h-9 w-full min-w-0 rounded-full border-dashed bg-background/80 px-1.5 text-[9px] font-black tracking-tighter shadow-sm sm:h-11 sm:w-[180px] sm:px-3 sm:text-[11px] sm:font-bold sm:tracking-normal'
                disabled={financeFilterStatus !== 'ready'}
              >
                <SelectValue
                  placeholder={t(
                    'tradingSalesOrder.master.filters.paymentTerm'
                  )}
                />
              </SelectTrigger>
              <SelectContent className='rounded-2xl'>
                <SelectItem value='ALL'>
                  {t('tradingSalesOrder.master.filters.allPaymentTerms')}
                </SelectItem>
                {paymentTermOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={onAddOrder}
            className='h-11 w-full rounded-full bg-primary px-6 text-[10px] font-black tracking-widest text-primary-foreground uppercase shadow-xl shadow-primary/10 sm:w-auto'
          >
            <Plus className='mr-2 size-4' />
            {t('tradingSalesOrder.list.addOrder')}
          </Button>
        </div>
      </div>

      {financeFilterStatus !== 'ready' ? (
        <div className='flex items-center justify-end gap-3 px-1 text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
          <span>
            {financeFilterStatus === 'loading'
              ? t('common.actions.loading')
              : financeFilterErrorMessage || '财务筛选加载失败'}
          </span>
          {financeFilterStatus === 'error' ? (
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 rounded-full border-dashed px-3 text-[10px] font-black tracking-widest uppercase'
              onClick={onRetryFinanceFilters}
            >
              重试
            </Button>
          ) : null}
        </div>
      ) : null}

      {hasCustomerContext ? (
        <div className='flex items-center justify-between rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3'>
          <div className='text-[11px] font-black tracking-wide text-primary'>
            当前客户上下文：{customerContextLabel}
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-8 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest'
            onClick={onClearCustomerContext}
          >
            清除上下文
          </Button>
        </div>
      ) : null}
    </>
  )
}
