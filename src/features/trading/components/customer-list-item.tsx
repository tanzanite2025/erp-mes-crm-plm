import {
  ExternalLink,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  User,
} from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { AuditStamp } from '@/components/common/audit-stamp'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { canOpenWeChat, openWeChat } from '@/features/contact-channels'
import { type CustomerQuoteSummaryItem } from '@/features/quotes/services/customer-quote-summary-service'
import type { Customer } from '../data/schema'
import { CustomerQuoteEntryBlock } from '../customer/components/customer-quote-entry-block'
import { CustomerSalesClosureSummaryBlock } from '../customer/components/customer-sales-closure-summary'
import type { CustomerSalesClosureSummary } from '../customer/services/customer-sales-closure-summary-service'

type CustomerQuoteSummaryState = {
  items: CustomerQuoteSummaryItem[]
  isLoading: boolean
  isError: boolean
}

type CustomerListItemProps = {
  customer: Customer
  quoteSummary?: CustomerQuoteSummaryState
  locale: string
  onEdit: (customer: Customer) => void
  onDelete: (id: string) => void
  onOpenQuote: (quoteId: string) => void
  onCreateQuote: () => void
  onOpenAudit: (customer: Customer) => void
  salesClosureSummary?: CustomerSalesClosureSummary
}

export function CustomerListItem({
  customer,
  quoteSummary,
  locale,
  onEdit,
  onDelete,
  onOpenQuote,
  onCreateQuote,
  onOpenAudit,
  salesClosureSummary,
}: CustomerListItemProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const resolvedQuoteSummary = quoteSummary ?? { items: [], isLoading: false, isError: false }

  const handleOpenCustomerOrders = () => {
    navigate({
      to: '/trading/sales-orders',
      search: (prev) => ({
        ...prev,
        customerId: customer.id,
        customerName: customer.name,
        detailId: undefined,
      }),
    })
  }

  const handleOpenWeChat = () => {
    if (!canOpenWeChat(customer.wechat)) {
      toast.error('未填写微信号')
      return
    }

    openWeChat(customer.wechat)
  }

  const getStatusBadge = () => {
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

  return (
    <Card className='group gap-0 py-0 hover:bg-muted/30 transition-all border-dashed border-muted/50 bg-muted/5 rounded-[24px] overflow-hidden cursor-default relative'>
      <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent pointer-events-none' />
      <CardHeader className='[.border-b]:pb-3 px-4 py-4 pb-3 sm:px-5 sm:py-5 sm:pb-3 border-b border-dashed border-muted/50 relative'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='size-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary text-base shadow-inner'>
              {customer.name?.substring(0, 1) || '?'}
            </div>
            <div>
              <div className='flex items-center gap-2.5'>
                <h4 className='text-sm sm:text-[15px] font-black tracking-tight italic text-foreground'>
                  {customer.name}
                </h4>
                {getStatusBadge()}
              </div>
              <p className='text-[9px] font-black text-muted-foreground uppercase mt-0.5 tracking-widest opacity-50'>
                ID: {customer.code}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' size='icon' className='h-8 w-8 rounded-xl hover:bg-muted/50'>
                <MoreHorizontal className='size-4 text-muted-foreground' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='rounded-[20px] border-2 shadow-xl p-2'>
              <DropdownMenuItem
                onClick={() => onEdit(customer)}
                className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2'
              >
                {t('trading.customers.editCustomer')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleOpenCustomerOrders}
                className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 mt-1'
              >
                查看完整订单
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onOpenAudit(customer)}
                className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 mt-1'
              >
                查看审计记录
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(customer.id)}
                className='rounded-lg font-black text-[10px] uppercase tracking-widest px-4 py-2 mt-1 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10'
              >
                {t('trading.customers.deleteCustomer')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className='px-4 pb-3 pt-2.5 space-y-2.5 sm:px-5 sm:pb-4 sm:pt-3 sm:space-y-3 relative'>
        <CustomerSalesClosureSummaryBlock summary={salesClosureSummary} />
        <CustomerQuoteEntryBlock
          customerName={customer.name}
          quotes={resolvedQuoteSummary.items}
          isLoading={resolvedQuoteSummary.isLoading}
          isError={resolvedQuoteSummary.isError}
          onOpenQuote={onOpenQuote}
          onCreateQuote={onCreateQuote}
        />

        <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
              <User className='size-3' />
              {t('trading.customers.contactPerson')}
            </div>
            <p className='text-[11px] sm:text-[12px] font-black text-foreground'>
              {customer.contactPerson}
            </p>
          </div>

          <div className='space-y-1 sm:text-right'>
            <div className='flex items-center gap-2 text-[8px] sm:text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 sm:justify-end italic'>
              <Phone className='size-3' />
              {t('trading.customers.contactPhone')}
            </div>
            <p className='text-[11px] sm:text-[12px] font-black text-foreground'>
              {customer.contactPhone}
            </p>
          </div>
        </div>

        <div className='space-y-1 pt-2 border-t border-dashed border-muted/50'>
          <div className='flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
            <MapPin className='size-3' />
            {t('trading.customers.address')}
          </div>
          <p className='text-[10px] font-bold text-muted-foreground truncate leading-relaxed'>
            {customer.address}
          </p>
        </div>

        <div className='space-y-1 pt-2 border-t border-dashed border-muted/50'>
          <div className='flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic'>
            <MessageCircle className='size-3' />
            微信
          </div>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-[10px] font-bold text-muted-foreground break-all'>
              {customer.wechat || '未填写'}
            </p>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!canOpenWeChat(customer.wechat)}
              onClick={handleOpenWeChat}
              className='h-7 w-full sm:w-auto rounded-full px-3 text-[8px] font-black uppercase tracking-widest'
            >
              打开微信
              <ExternalLink className='ms-2 size-3' />
            </Button>
          </div>
        </div>

        <div className='pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-dashed border-muted/50'>
          <div className='flex flex-col gap-0.5'>
            <span className='text-[8px] font-black uppercase text-muted-foreground/40 tracking-[0.2em] italic'>
              {t('trading.customers.creditBalance')}
            </span>
            <div className='text-sm sm:text-base font-black italic tracking-tighter tabular-nums'>
              {customer.balance.toLocaleString(locale)}
            </div>
          </div>
          <Button
            variant='secondary'
            size='sm'
            onClick={handleOpenCustomerOrders}
            className='h-8 w-full sm:w-auto px-4 rounded-full font-black text-[8px] uppercase tracking-widest bg-emerald-500/5 text-emerald-500 border border-emerald-500/10 hover:bg-emerald-500/10 transition-colors'
          >
            查看完整订单
            <ExternalLink className='ms-2 size-3 animate-pulse' />
          </Button>
        </div>
      </CardContent>
      <AuditStamp
        module={AUDIT_MODULES.customer}
        targetId={customer.id}
        createdAt={customer.createdAt}
        updatedAt={customer.updatedAt}
        showTimelineButton={false}
        className='border-primary/10 pt-1'
      />
    </Card>
  )
}
