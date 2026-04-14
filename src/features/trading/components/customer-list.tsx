import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  ExternalLink,
  Filter,
  Loader2,
  Plus,
  Search,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import { type Customer } from '../data/schema'
import { type DeltaSet } from '@/lib/delta/types'
import { tradingQueryKeys } from '../query-keys'
import { requireTradingCommandActor } from '../utils/command-actor'
import { CustomerAuditTimelineSheet } from '../customer/components/customer-audit-timeline-sheet'
import { CustomerListItem } from './customer-list-item'
import { CustomerActionDialog } from './customer-action-dialog'
import { QuoteWorkspaceHost } from '@/features/quotes/components/quote-workspace-host'
import { useCustomerMutations, useGetCustomerList } from '../customer'
import { useGetCustomerSalesClosureSummary } from '../customer/hooks/use-customer-sales-closure-summary'

export function CustomerList() {
  const { locale, t } = useLanguage()
  const queryClient = useQueryClient()
  const { allowsAction } = useNonBlockingPermissionActions()
  const [searchTerm, setSearchTerm] = useState('')
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [auditCustomer, setAuditCustomer] = useState<Customer | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const [quoteWorkspaceRequest, setQuoteWorkspaceRequest] = useState<{
    open: boolean
    mode: 'create' | 'detail' | null
    quoteId: string | null
  }>({ open: false, mode: null, quoteId: null })
  const {
    data: customerList,
    isLoading,
    isError,
    error,
  } = useGetCustomerList()
  const { data: salesClosureSummaryList } = useGetCustomerSalesClosureSummary()
  const user = useAuthStore((state) => state.user)
  const { createMutation, saveMutation, deleteMutation } = useCustomerMutations()
  const loadFailedLabel =
    locale === 'zh-CN' ? '客户数据加载失败，请稍后重试' : 'Failed to load customer data. Please try again.'
  const customers = customerList?.items ?? []
  const customerStats = customerList?.metadata?.stats
  const customerStatsAvailable =
    typeof customerStats?.total === 'number' &&
    typeof customerStats?.active === 'number' &&
    typeof customerStats?.newThisMonth === 'number'
  const customerStatsMissingLabel =
    locale === 'zh-CN'
      ? '统计暂不可用：列表响应缺少 metadata.stats，当前不再回退前端本地重算。'
      : 'Stats unavailable: list response is missing metadata.stats and no local fallback recalculation is used.'
  const salesClosureSummaryMap = new Map((salesClosureSummaryList?.items ?? []).map((item) => [item.customerId, item]))

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      (customer.name?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
      (customer.code?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
      (customer.contactPerson?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())

    if (!showDeleted && customer.isDeleted) return false

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

  const handleSaveCustomer = (payload: { data: Customer; isPatch: boolean; delta?: DeltaSet }) => {
    if (!allowsAction('action_trading_customer_manage')) return

    if (payload.isPatch && payload.delta && selectedCustomer) {
      const actor = requireTradingCommandActor(
        { operator: user?.accountNo, actorId: user?.id },
        'CustomerList.handleSaveCustomer',
      )
      saveMutation.mutate({
        id: selectedCustomer.id,
        delta: payload.delta,
        finalData: payload.data,
        operator: actor.operator,
        actorId: actor.actorId,
        expectedVersion: selectedCustomer.version,
      })
    } else {
      createMutation.mutate(payload.data as Omit<Customer, 'id' | 'version'>)
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
      <div className='h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500'>
        <div className='relative'>
          <Loader2 className='size-10 text-primary animate-spin opacity-20' />
          <Building2 className='size-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' />
        </div>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse'>
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
      <div className='rounded-[40px] border-2 border-dashed border-rose-300/50 h-72 flex flex-col items-center justify-center text-center px-6 bg-rose-50/40'>
        <Building2 className='size-16 mb-4 text-rose-400/40' />
        <p className='text-[10px] font-black uppercase tracking-[0.3em] mb-3 text-rose-600'>
          {loadFailedLabel}
        </p>
        <p className='mb-6 text-xs font-bold text-rose-700/70'>
          {error instanceof Error ? error.message : loadFailedLabel}
        </p>
        <Button
          variant='outline'
          onClick={() => void queryClient.invalidateQueries({ queryKey: tradingQueryKeys.customerList() })}
          className='h-12 rounded-full border-dashed border-2 font-black text-[10px] uppercase tracking-widest px-10'
        >
          {locale === 'zh-CN' ? '重试加载' : 'Retry'}
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      {!customerStatsAvailable && (
        <div className='rounded-[24px] border border-amber-300/60 bg-amber-50/80 px-4 py-3 text-xs font-bold text-amber-800'>
          {customerStatsMissingLabel}
        </div>
      )}

      <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6'>
        <div className='p-5 sm:p-6 rounded-[24px] bg-muted/5 border-2 border-dashed border-muted/50 flex flex-col justify-between h-32 sm:h-36 relative overflow-hidden group'>
          <div className='absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity'>
            <Building2 className='size-12 sm:size-16' />
          </div>
          <span className='text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic'>
            {t('trading.customers.stats.total')}
          </span>
          <div className='flex items-end justify-between relative'>
            <span className='text-3xl sm:text-4xl font-black italic tracking-tighter tabular-nums'>
              {customerStatsAvailable ? customerStats.total : '—'}
            </span>
            <div className='p-2 bg-primary/10 rounded-xl'>
              <Building2 className='size-5 text-primary' />
            </div>
          </div>
        </div>

        <div className='p-5 sm:p-6 rounded-[24px] bg-muted/5 border-2 border-dashed border-muted/50 flex flex-col justify-between h-32 sm:h-36 relative overflow-hidden group'>
          <div className='absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity'>
            <User className='size-12 sm:size-16' />
          </div>
          <span className='text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic'>
            {t('trading.customers.stats.active')}
          </span>
          <div className='flex items-end justify-between relative'>
            <span className='text-3xl sm:text-4xl font-black italic tracking-tighter tabular-nums text-emerald-500'>
              {customerStatsAvailable ? customerStats.active : '—'}
            </span>
            <div className='p-2 bg-emerald-500/10 rounded-xl'>
              <User className='size-5 text-emerald-500' />
            </div>
          </div>
        </div>

        <div className='p-5 sm:p-6 rounded-[24px] bg-muted/5 border-2 border-dashed border-muted/50 flex flex-col justify-between h-32 sm:h-36 relative overflow-hidden group'>
          <div className='absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity'>
            <ExternalLink className='size-12 sm:size-16' />
          </div>
          <span className='text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 italic'>
            {t('trading.customers.stats.newThisMonth')}
          </span>
          <div className='flex items-end justify-between relative'>
            <span className='text-3xl sm:text-4xl font-black italic tracking-tighter tabular-nums text-primary'>
              {customerStatsAvailable ? `+${customerStats.newThisMonth}` : '—'}
            </span>
            <div className='px-3 py-1 bg-primary text-primary-foreground rounded-full text-[8px] font-black uppercase tracking-widest'>
              {t('trading.customers.stats.newBadge')}
            </div>
          </div>
        </div>
      </div>

      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 px-1'>
        <div className='relative w-full sm:w-96'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
          <Input
            placeholder={t('trading.customers.searchPlaceholder')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className='pl-10 h-11 sm:h-12 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-[13px] font-medium transition-all shadow-inner'
          />
        </div>

        <div className='flex items-center gap-2 sm:gap-3 w-full sm:w-auto'>
          <Button
            variant='ghost'
            onClick={() => setShowDeleted((value) => !value)}
            className={cn(
              'flex-1 sm:flex-none h-11 px-4 sm:px-6 rounded-full font-black text-[9px] sm:text-[10px] uppercase tracking-widest transition-all',
              showDeleted ? 'bg-primary/10 text-primary' : 'opacity-60'
            )}
          >
            <Filter className='mr-2 size-4' />
            {showDeleted ? t('trading.customers.hideDeleted') : t('trading.customers.showDeleted')}
          </Button>

          <Button
            onClick={handleAddClick}
            className='flex-1 sm:flex-none h-11 px-4 sm:px-8 rounded-full bg-primary text-primary-foreground font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95'
          >
            <Plus className='mr-2 size-4' />
            {t('trading.customers.addCustomer')}
          </Button>
        </div>
      </div>

      {filteredCustomers.length > 0 ? (
        <div className='grid grid-cols-1 gap-4'>
          {filteredCustomers.map((customer) => (
            <CustomerListItem
              key={customer.id}
              customer={customer}
              locale={locale}
              onEdit={handleEditClick}
              onDelete={handleDeleteCustomer}
              onOpenQuote={handleOpenCustomerQuote}
              onCreateQuote={handleCreateCustomerQuote}
              onOpenAudit={setAuditCustomer}
              salesClosureSummary={salesClosureSummaryMap.get(customer.id)}
            />
          ))}
        </div>
      ) : (
        <div className='rounded-[40px] border-2 border-dashed border-muted/50 h-72 flex flex-col items-center justify-center text-muted-foreground/20 bg-muted/5 group transition-all hover:bg-muted/10'>
          <Building2 className='size-16 mb-4 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all duration-700' />
          <p className='text-[10px] font-black uppercase tracking-[0.3em] mb-6 animate-pulse'>
            {t('trading.customers.empty')}
          </p>
          <Button
            variant='outline'
            onClick={handleAddClick}
            className='h-12 rounded-full border-dashed border-2 font-black text-[10px] uppercase tracking-widest px-10 hover:bg-primary hover:text-primary-foreground transition-all duration-500'
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
        onExternalHandled={() => setQuoteWorkspaceRequest({ open: false, mode: null, quoteId: null })}
      />
    </div>
  )
}
