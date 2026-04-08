import { useState } from 'react'
import {
  Building2,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ForbiddenState } from '@/components/forbidden-state'
import { useLanguage } from '@/context/language-provider'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { type Customer } from '../data/schema'
import { type DeltaSet } from '@/lib/delta/types'
import { CustomerActionDialog } from './customer-action-dialog'
import { useCustomerMutations, useGetCustomers } from '../customer'

export function CustomerList() {
  const { locale, t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const [searchTerm, setSearchTerm] = useState('')
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [showDeleted, setShowDeleted] = useState(false)
  const {
    data: customers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useGetCustomers()
  const { createMutation, patchMutation, statusChangeMutation, identityChangeMutation, deleteMutation } = useCustomerMutations()
  const loadFailedLabel =
    locale === 'zh-CN' ? '客户数据加载失败，请稍后重试' : 'Failed to load customer data. Please try again.'

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

  const handleSaveCustomer = (payload: { data: Partial<Customer>; isPatch: boolean; delta?: DeltaSet }) => {
    if (!allowsAction('action_trading_customer_manage')) return
    
    if (payload.isPatch && payload.delta && selectedCustomer) {
      const deltaKeys = Object.keys(payload.delta)
      const isStatusOnlyChange = deltaKeys.length > 0 && deltaKeys.every((key) => key === 'status')
      const isIdentityOnlyChange = deltaKeys.length > 0 && deltaKeys.every((key) => key === 'code' || key === 'name')

      if (isStatusOnlyChange) {
        statusChangeMutation.mutate({
          id: selectedCustomer.id,
          status: payload.data.status || selectedCustomer.status,
          operator: 'Unknown',
          expectedVersion: selectedCustomer.version,
        })
        return
      }

      if (isIdentityOnlyChange) {
        identityChangeMutation.mutate({
          id: selectedCustomer.id,
          code: payload.data.code,
          name: payload.data.name,
          operator: 'Unknown',
          expectedVersion: selectedCustomer.version,
        })
        return
      }

      patchMutation.mutate({
        id: selectedCustomer.id,
        delta: payload.delta,
        version: selectedCustomer.version
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

  const getStatusBadge = (customer: Customer) => {
    if (customer.isDeleted) {
      return (
        <Badge
          variant='outline'
          className='bg-muted text-muted-foreground border-muted-foreground/20 text-[10px] font-black uppercase'
        >
          {t('trading.customerStatus.deleted')}
        </Badge>
      )
    }

    switch (customer.status) {
      case 'Active':
        return (
          <Badge
            variant='outline'
            className='bg-green-500/10 text-green-500 border-green-500/20 text-[8px] sm:text-[10px] font-black uppercase whitespace-nowrap'
          >
            {t('trading.customerStatus.active')}
          </Badge>
        )
      case 'Inactive':
        return (
          <Badge
            variant='outline'
            className='bg-red-500/10 text-red-500 border-red-500/20 text-[8px] sm:text-[10px] font-black uppercase whitespace-nowrap'
          >
            {t('trading.customerStatus.inactive')}
          </Badge>
        )
      case 'Pending':
        return (
          <Badge
            variant='outline'
            className='bg-yellow-500/10 text-yellow-500 border-yellow-500/20 text-[8px] sm:text-[10px] font-black uppercase whitespace-nowrap'
          >
            {t('trading.customerStatus.pending')}
          </Badge>
        )
      default:
        return null
    }
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
          onClick={() => void refetch()}
          className='h-12 rounded-full border-dashed border-2 font-black text-[10px] uppercase tracking-widest px-10'
        >
          {locale === 'zh-CN' ? '重试加载' : 'Retry'}
        </Button>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
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
              {customers.length}
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
              {customers.filter((customer) => customer.status === 'Active').length}
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
              +
              {customers.filter((customer) => {
                const oneMonthAgo = new Date()
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
                return new Date(customer.createdAt) > oneMonthAgo
              }).length}
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
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className='group hover:bg-muted/30 transition-all border-dashed border-muted/50 bg-muted/5 rounded-[24px] overflow-hidden cursor-default relative'
              onClick={() => handleEditClick(customer)}
            >
              <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
              <CardHeader className='pb-4 border-b border-dashed border-muted/50 relative'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <div className='size-12 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-lg shadow-inner'>
                      {customer.name?.substring(0, 1) || '?'}
                    </div>
                    <div>
                      <div className='flex items-center gap-3'>
                        <h4 className='text-base font-black tracking-tight italic text-foreground'>
                          {customer.name}
                        </h4>
                        {getStatusBadge(customer)}
                      </div>
                      <p className='text-[10px] font-black text-muted-foreground uppercase mt-1 tracking-widest opacity-50'>
                        ID: {customer.code}
                      </p>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                      <Button variant='ghost' size='icon' className='h-9 w-9 rounded-xl hover:bg-muted/50'>
                        <MoreHorizontal className='size-4 text-muted-foreground' />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align='end' className='rounded-[20px] border-2 shadow-xl p-2'>
                      <DropdownMenuItem
                        onClick={() => handleEditClick(customer)}
                        className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2'
                      >
                        {t('trading.customers.editCustomer')}
                      </DropdownMenuItem>
                      <DropdownMenuItem className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 mt-1'>
                        {t('trading.customers.viewTransactions')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteCustomer(customer.id)
                        }}
                        className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 mt-1 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10'
                      >
                        {t('trading.customers.deleteCustomer')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className='pt-5 sm:pt-6 space-y-4 sm:space-y-5 relative'>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
                  <div className='space-y-1.5'>
                    <div className='flex items-center gap-2 text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
                      <User className='size-3' />
                      {t('trading.customers.contactPerson')}
                    </div>
                    <p className='text-[12px] sm:text-[13px] font-black text-foreground'>
                      {customer.contactPerson}
                    </p>
                  </div>

                  <div className='space-y-1.5 sm:text-right'>
                    <div className='flex items-center gap-2 text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 sm:justify-end italic'>
                      <Phone className='size-3' />
                      {t('trading.customers.contactPhone')}
                    </div>
                    <p className='text-[12px] sm:text-[13px] font-black text-foreground'>
                      {customer.contactPhone}
                    </p>
                  </div>
                </div>

                <div className='space-y-1.5 pt-4 border-t border-dashed border-muted/50'>
                  <div className='flex items-center gap-2 text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
                    <MapPin className='size-3' />
                    {t('trading.customers.address')}
                  </div>
                  <p className='text-[11px] font-bold text-muted-foreground truncate leading-relaxed'>
                    {customer.address}
                  </p>
                </div>

                <div className='pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-dashed border-muted/50'>
                  <div className='flex flex-col gap-0.5'>
                    <span className='text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] italic'>
                      {t('trading.customers.creditBalance')}
                    </span>
                    <div className='text-base sm:text-lg font-black italic tracking-tighter tabular-nums'>
                      {customer.balance.toLocaleString(locale)}
                    </div>
                  </div>
                  <Button
                    variant='secondary'
                    size='sm'
                    className='h-9 w-full sm:w-auto px-5 rounded-full font-black text-[9px] uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors'
                  >
                    {t('trading.customers.ledger')}
                    <ExternalLink className='ms-2 size-3 animate-pulse' />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
    </div>
  )
}
