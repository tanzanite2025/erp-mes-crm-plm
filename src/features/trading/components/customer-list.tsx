import { useMemo, useState } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  ExternalLink,
  Filter,
  Loader2,
  Plus,
  Search,
  User,
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { type DeltaSet } from '@/lib/delta/types'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ForbiddenState } from '@/components/forbidden-state'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { QuoteWorkspaceHost } from '@/features/quotes/components/quote-workspace-host'
import { quoteQueryKeys } from '@/features/quotes/query-keys'
import { listCustomerQuoteSummary } from '@/features/quotes/services/customer-quote-summary-service'
import { useCustomerMutations, useGetCustomerList } from '../customer'
import { CustomerAuditTimelineSheet } from '../customer/components/customer-audit-timeline-sheet'
import { useGetCustomerSalesClosureSummary } from '../customer/hooks/use-customer-sales-closure-summary'
import { useGetCustomerSalesReturnSummary } from '../customer/hooks/use-customer-sales-return-summary'
import { type Customer, type CustomerFormValues } from '../data/schema'
import { tradingQueryKeys } from '../query-keys'
import { requireTradingCommandActor } from '../utils/command-actor'
import { CustomerActionDialog } from './customer-action-dialog'
import { CustomerListItem } from './customer-list-item'

type QuoteStatusFilter = 'all' | 'withQuote' | 'withoutQuote'

export function CustomerList() {
  const { locale, t } = useLanguage()
  const queryClient = useQueryClient()
  const { allowsAction } = useNonBlockingPermissionActions()
  const [searchTerm, setSearchTerm] = useState('')
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  )
  const [auditCustomer, setAuditCustomer] = useState<Customer | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [quoteStatusFilter, setQuoteStatusFilter] =
    useState<QuoteStatusFilter>('all')
  const [quoteWorkspaceRequest, setQuoteWorkspaceRequest] = useState<{
    open: boolean
    mode: 'create' | 'detail' | null
    quoteId: string | null
  }>({ open: false, mode: null, quoteId: null })
  const { data: customerList, isLoading, isError, error } = useGetCustomerList()
  const { data: salesClosureSummaryList } = useGetCustomerSalesClosureSummary()
  const { data: salesReturnSummaryList } = useGetCustomerSalesReturnSummary()
  const user = useAuthStore((state) => state.user)
  const { createMutation, saveMutation, deleteMutation } =
    useCustomerMutations()
  const loadFailedLabel =
    locale === 'zh-CN'
      ? '客户数据加载失败，请稍后重试'
      : 'Failed to load customer data. Please try again.'
  const customers = useMemo(
    () => customerList?.items ?? [],
    [customerList?.items]
  )
  const customerStats = customerList?.metadata?.stats
  const customerStatsAvailable =
    typeof customerStats?.total === 'number' &&
    typeof customerStats?.active === 'number' &&
    typeof customerStats?.newThisMonth === 'number'
  const customerStatsMissingLabel =
    locale === 'zh-CN'
      ? '统计暂不可用，请稍后刷新后重试。'
      : 'Stats are temporarily unavailable. Please refresh and try again later.'
  const salesClosureSummaryMap = new Map(
    (salesClosureSummaryList?.items ?? []).map((item) => [
      item.customerId,
      item,
    ])
  )
  const salesReturnSummaryMap = new Map(
    (salesReturnSummaryList?.items ?? []).map((item) => [item.customerId, item])
  )
  const customerQuoteSummaryQueries = useQueries({
    queries: customers.map((customer) => ({
      queryKey: quoteQueryKeys.customerSummary(customer.id),
      queryFn: () => listCustomerQuoteSummary(customer.id),
      enabled: customer.id.trim().length > 0,
    })),
  })
  const customerQuoteSummaryMap = new Map(
    customers.map((customer, index) => [
      customer.id,
      {
        items: customerQuoteSummaryQueries[index]?.data ?? [],
        isLoading: customerQuoteSummaryQueries[index]?.isLoading ?? false,
        isError: customerQuoteSummaryQueries[index]?.isError ?? false,
      },
    ])
  )
  const quoteFilterLabels = {
    all: locale === 'zh-CN' ? '全部客户' : 'All Customers',
    withQuote: locale === 'zh-CN' ? '仅看有报价' : 'With Quotes',
    withoutQuote: locale === 'zh-CN' ? '仅看无报价' : 'Without Quotes',
  } as const

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      (customer.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
      (customer.code?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
      (customer.contactPerson?.toLowerCase() ?? '').includes(
        searchTerm.toLowerCase()
      )
    const quoteSummary = customerQuoteSummaryMap.get(customer.id)
    const hasQuotes = (quoteSummary?.items.length ?? 0) > 0

    if (!showDeleted && customer.isDeleted) return false
    if (quoteStatusFilter === 'withQuote' && !hasQuotes) return false
    if (quoteStatusFilter === 'withoutQuote' && hasQuotes) return false

    return matchesSearch
  })

  const handleAddClick = () => {
    if (!allowsAction('action_trading_customer_manage')) return
    setSelectedCustomer(null)
    setIsActionDialogOpen(true)
  }

  const handleEditClick = (customer: Customer) => {
    if (!allowsAction('action_trading_customer_manage')) return
    setSelectedCustomer(customer)
    setIsActionDialogOpen(true)
  }

  const handleSaveCustomer = (payload: {
    data: Customer | CustomerFormValues
    isPatch: boolean
    delta?: DeltaSet
  }) => {
    if (!allowsAction('action_trading_customer_manage')) return

    if (payload.isPatch && payload.delta && selectedCustomer) {
      const actor = requireTradingCommandActor(
        { operator: user?.accountNo, actorId: user?.id },
        'CustomerList.handleSaveCustomer'
      )
      saveMutation.mutate({
        id: selectedCustomer.id,
        delta: payload.delta,
        finalData: payload.data as Customer,
        operator: actor.operator,
        actorId: actor.actorId,
        expectedVersion: selectedCustomer.version,
      })
    } else {
      createMutation.mutate(payload.data as CustomerFormValues)
    }
  }

  const handleDeleteCustomer = (id: string) => {
    if (!allowsAction('action_trading_customer_delete')) return
    if (confirm(t('trading.customers.deleteConfirm'))) {
      deleteMutation.mutate(id)
    }
  }

  const handleOpenCustomerQuote = (quoteId: string) => {
    setQuoteWorkspaceRequest({ open: true, mode: 'detail', quoteId })
  }

  const handleCreateCustomerQuote = () => {
    setQuoteWorkspaceRequest({ open: true, mode: 'create', quoteId: null })
  }

  if (isLoading) {
    return (
      <div className='flex h-[60vh] animate-in flex-col items-center justify-center space-y-4 duration-500 fade-in'>
        <div className='relative'>
          <Loader2 className='size-10 animate-spin text-primary opacity-20' />
          <Building2 className='absolute top-1/2 left-1/2 size-5 -translate-x-1/2 -translate-y-1/2 text-primary' />
        </div>
        <p className='animate-pulse text-[10px] font-black tracking-[0.2em] text-muted-foreground uppercase'>
          {t('trading.customers.loading')}
        </p>
      </div>
    )
  }

  if (isError) {
    if (isForbiddenError(error)) {
      return <ForbiddenState />
    }

    return (
      <div className='flex h-72 flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-rose-300/50 bg-rose-50/40 px-6 text-center'>
        <Building2 className='mb-4 size-16 text-rose-400/40' />
        <p className='mb-3 text-[10px] font-black tracking-[0.3em] text-rose-600 uppercase'>
          {loadFailedLabel}
        </p>
        <p className='mb-6 text-xs font-bold text-rose-700/70'>
          {error instanceof Error ? error.message : loadFailedLabel}
        </p>
        <Button
          variant='outline'
          onClick={() =>
            void queryClient.invalidateQueries({
              queryKey: tradingQueryKeys.customerList(),
            })
          }
          className='h-12 rounded-full border-2 border-dashed px-10 text-[10px] font-black tracking-widest uppercase'
        >
          {locale === 'zh-CN' ? '重试加载' : 'Retry'}
        </Button>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-5 duration-700 fade-in sm:gap-6'>
      {!customerStatsAvailable && (
        <div className='rounded-[24px] border border-amber-300/60 bg-amber-50/80 px-4 py-3 text-xs font-bold text-amber-800'>
          {customerStatsMissingLabel}
        </div>
      )}

      <div className='grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4'>
        <div className='group relative flex h-24 flex-col justify-between overflow-hidden rounded-[20px] border-2 border-dashed border-muted/50 bg-muted/5 p-4 sm:h-28 sm:p-[18px]'>
          <div className='absolute top-0 right-0 p-4 opacity-[0.03] transition-opacity group-hover:opacity-10'>
            <Building2 className='size-12 sm:size-16' />
          </div>
          <span className='text-[9px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase italic sm:text-[10px]'>
            {t('trading.customers.stats.total')}
          </span>
          <div className='relative flex items-end justify-between'>
            <span className='text-3xl font-black tracking-tighter italic tabular-nums sm:text-4xl'>
              {customerStatsAvailable ? customerStats.total : '—'}
            </span>
            <div className='rounded-xl bg-primary/10 p-2'>
              <Building2 className='size-5 text-primary' />
            </div>
          </div>
        </div>

        <div className='group relative flex h-24 flex-col justify-between overflow-hidden rounded-[20px] border-2 border-dashed border-muted/50 bg-muted/5 p-4 sm:h-28 sm:p-[18px]'>
          <div className='absolute top-0 right-0 p-4 opacity-[0.03] transition-opacity group-hover:opacity-10'>
            <User className='size-12 sm:size-16' />
          </div>
          <span className='text-[9px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase italic sm:text-[10px]'>
            {t('trading.customers.stats.active')}
          </span>
          <div className='relative flex items-end justify-between'>
            <span className='text-3xl font-black tracking-tighter text-emerald-500 italic tabular-nums sm:text-4xl'>
              {customerStatsAvailable ? customerStats.active : '—'}
            </span>
            <div className='rounded-xl bg-emerald-500/10 p-2'>
              <User className='size-5 text-emerald-500' />
            </div>
          </div>
        </div>

        <div className='group relative flex h-24 flex-col justify-between overflow-hidden rounded-[20px] border-2 border-dashed border-muted/50 bg-muted/5 p-4 sm:h-28 sm:p-[18px]'>
          <div className='absolute top-0 right-0 p-4 opacity-[0.03] transition-opacity group-hover:opacity-10'>
            <ExternalLink className='size-12 sm:size-16' />
          </div>
          <span className='text-[9px] font-black tracking-[0.2em] text-muted-foreground/50 uppercase italic sm:text-[10px]'>
            {t('trading.customers.stats.newThisMonth')}
          </span>
          <div className='relative flex items-end justify-between'>
            <span className='text-3xl font-black tracking-tighter text-primary italic tabular-nums sm:text-4xl'>
              {customerStatsAvailable ? `+${customerStats.newThisMonth}` : '—'}
            </span>
            <div className='rounded-full bg-primary px-3 py-1 text-[8px] font-black tracking-widest text-primary-foreground uppercase'>
              {t('trading.customers.stats.newBadge')}
            </div>
          </div>
        </div>
      </div>

      <div className='flex flex-col items-stretch justify-between gap-3 px-1 sm:flex-row sm:items-center sm:gap-4'>
        <div className='relative w-full sm:w-96'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40' />
          <Input
            placeholder={t('trading.customers.searchPlaceholder')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className='h-11 rounded-2xl border-none bg-muted/50 pl-10 text-[13px] font-medium shadow-inner transition-all focus-visible:ring-1 focus-visible:ring-primary/20 sm:h-12'
          />
        </div>

        <div className='flex w-full items-center gap-2 sm:w-auto sm:gap-3'>
          <div className='flex items-center gap-1 rounded-full bg-muted/40 p-1'>
            {(['all', 'withQuote', 'withoutQuote'] as const).map((option) => (
              <Button
                key={option}
                type='button'
                variant='ghost'
                onClick={() => setQuoteStatusFilter(option)}
                className={cn(
                  'h-9 rounded-full px-3 text-[9px] font-black tracking-widest uppercase transition-all sm:text-[10px]',
                  quoteStatusFilter === option
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {quoteFilterLabels[option]}
              </Button>
            ))}
          </div>

          <Button
            variant='ghost'
            onClick={() => setShowDeleted((value) => !value)}
            className={cn(
              'h-11 flex-1 rounded-full px-4 text-[9px] font-black tracking-widest uppercase transition-all sm:flex-none sm:px-6 sm:text-[10px]',
              showDeleted ? 'bg-primary/10 text-primary' : 'opacity-60'
            )}
          >
            <Filter className='mr-2 size-4' />
            {showDeleted
              ? t('trading.customers.hideDeleted')
              : t('trading.customers.showDeleted')}
          </Button>

          <Button
            onClick={handleAddClick}
            className='h-11 flex-1 rounded-full bg-primary px-4 text-[9px] font-black tracking-widest text-primary-foreground uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 sm:flex-none sm:px-8 sm:text-[10px]'
          >
            <Plus className='mr-2 size-4' />
            {t('trading.customers.addCustomer')}
          </Button>
        </div>
      </div>

      {filteredCustomers.length > 0 ? (
        <div className='grid grid-cols-1 gap-3 lg:gap-4 xl:grid-cols-2'>
          {filteredCustomers.map((customer) => (
            <CustomerListItem
              key={customer.id}
              customer={customer}
              quoteSummary={customerQuoteSummaryMap.get(customer.id)}
              locale={locale}
              onEdit={handleEditClick}
              onDelete={handleDeleteCustomer}
              onOpenQuote={handleOpenCustomerQuote}
              onCreateQuote={handleCreateCustomerQuote}
              onOpenAudit={setAuditCustomer}
              salesClosureSummary={salesClosureSummaryMap.get(customer.id)}
              salesReturnSummary={salesReturnSummaryMap.get(customer.id)}
            />
          ))}
        </div>
      ) : (
        <div className='group flex h-72 flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-muted/50 bg-muted/5 text-muted-foreground/20 transition-all hover:bg-muted/10'>
          <Building2 className='mb-4 size-16 opacity-10 transition-all duration-700 group-hover:scale-110 group-hover:opacity-20' />
          <p className='mb-6 animate-pulse text-[10px] font-black tracking-[0.3em] uppercase'>
            {t('trading.customers.empty')}
          </p>
          <Button
            variant='outline'
            onClick={handleAddClick}
            className='h-12 rounded-full border-2 border-dashed px-10 text-[10px] font-black tracking-widest uppercase transition-all duration-500 hover:bg-primary hover:text-primary-foreground'
          >
            {t('trading.customers.firstCustomer')}
          </Button>
        </div>
      )}

      <CustomerActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        customer={selectedCustomer}
        onSave={handleSaveCustomer}
      />
      <CustomerAuditTimelineSheet
        customerId={auditCustomer?.id}
        customerName={auditCustomer?.name}
        open={!!auditCustomer}
        onOpenChange={(open) => {
          if (!open) {
            setAuditCustomer(null)
          }
        }}
      />
      <QuoteWorkspaceHost
        externalOpen={quoteWorkspaceRequest.open}
        externalMode={quoteWorkspaceRequest.mode}
        externalQuoteId={quoteWorkspaceRequest.quoteId}
        onExternalHandled={() =>
          setQuoteWorkspaceRequest({ open: false, mode: null, quoteId: null })
        }
      />
    </div>
  )
}
