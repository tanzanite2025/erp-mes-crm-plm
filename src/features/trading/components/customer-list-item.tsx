import { useNavigate } from '@tanstack/react-router'
import {
  ExternalLink,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Phone,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AuditStamp } from '@/components/common/audit-stamp'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { canOpenWeChat, openWeChat } from '@/features/contact-channels'
import {
  CustomerDynamicSummaryLayer,
  type CustomerQuoteSummaryState,
} from '../customer/components/customer-dynamic-summary-layer'
import type { CustomerSalesClosureSummary } from '../customer/services/customer-sales-closure-summary-service'
import type { CustomerSalesReturnSummary } from '../customer/services/customer-sales-return-summary-service'
import type { Customer } from '../data/schema'

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
  salesReturnSummary?: CustomerSalesReturnSummary
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
  salesReturnSummary,
}: CustomerListItemProps) {
  const { t } = useLanguage()
  const navigate = useNavigate()

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

  const handleOpenCustomerSalesReturns = () => {
    navigate({
      to: '/trading/sales-returns',
      search: {
        customerId: customer.id,
        customerName: customer.name,
      },
    })
  }

  const handleOpenWeChat = () => {
    if (!canOpenWeChat(customer.wechat)) {
      toast.error('该客户未填写微信号')
      return
    }

    openWeChat(customer.wechat)
  }

  const getStatusBadge = () => {
    if (customer.isDeleted) {
      return (
        <Badge
          variant='outline'
          className='border-muted-foreground/20 bg-muted text-[10px] font-black text-muted-foreground uppercase'
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
            className='border-green-500/20 bg-green-500/10 text-[8px] font-black whitespace-nowrap text-green-500 uppercase sm:text-[10px]'
          >
            {t('trading.customerStatus.active')}
          </Badge>
        )
      case 'Inactive':
        return (
          <Badge
            variant='outline'
            className='border-red-500/20 bg-red-500/10 text-[8px] font-black whitespace-nowrap text-red-500 uppercase sm:text-[10px]'
          >
            {t('trading.customerStatus.inactive')}
          </Badge>
        )
      case 'Pending':
        return (
          <Badge
            variant='outline'
            className='border-yellow-500/20 bg-yellow-500/10 text-[8px] font-black whitespace-nowrap text-yellow-500 uppercase sm:text-[10px]'
          >
            {t('trading.customerStatus.pending')}
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <Card className='group relative cursor-default gap-0 overflow-hidden rounded-[22px] border-dashed border-muted/50 bg-muted/5 py-0 transition-all hover:bg-muted/30'>
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-primary/5 via-transparent' />
      <CardHeader className='relative border-b border-dashed border-muted/50 px-3.5 py-3 sm:px-4 sm:py-3.5 [.border-b]:pb-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='flex size-9 items-center justify-center rounded-xl bg-primary/10 text-base font-black text-primary shadow-inner'>
              {customer.name?.substring(0, 1) || '?'}
            </div>
            <div>
              <div className='flex items-center gap-2.5'>
                <h4 className='text-sm font-black tracking-tight text-foreground italic sm:text-[15px]'>
                  {customer.name}
                </h4>
                {getStatusBadge()}
              </div>
              <p className='mt-0.5 text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-50'>
                ID: {customer.code}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='h-8 w-8 rounded-xl hover:bg-muted/50'
              >
                <MoreHorizontal className='size-4 text-muted-foreground' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align='end'
              className='rounded-[20px] border-2 p-2 shadow-xl'
            >
              <DropdownMenuItem
                onClick={() => onEdit(customer)}
                className='rounded-lg px-4 py-2 text-[10px] font-black tracking-widest uppercase'
              >
                {t('trading.customers.editCustomer')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleOpenCustomerOrders}
                className='mt-1 rounded-lg px-4 py-2 text-[10px] font-black tracking-widest uppercase'
              >
                {t('trading.customers.viewOrders')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onOpenAudit(customer)}
                className='mt-1 rounded-lg px-4 py-2 text-[10px] font-black tracking-widest uppercase'
              >
                {t('trading.customers.viewAudit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(customer.id)}
                className='mt-1 rounded-lg px-4 py-2 text-[10px] font-black tracking-widest text-rose-500 uppercase focus:bg-rose-500/10 focus:text-rose-500'
              >
                {t('trading.customers.deleteCustomer')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className='relative px-3.5 pt-2.5 pb-3 sm:px-4 sm:pt-2.5 sm:pb-3.5'>
        <div className='space-y-3'>
          <CustomerDynamicSummaryLayer
            customerName={customer.name}
            quoteSummary={quoteSummary}
            salesClosureSummary={salesClosureSummary}
            salesReturnSummary={salesReturnSummary}
            onOpenSalesReturns={handleOpenCustomerSalesReturns}
            onOpenQuote={onOpenQuote}
            onCreateQuote={onCreateQuote}
          />

          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
            <div className='rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2 sm:py-2.5'>
              <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40 sm:text-[9px]'>
                <User className='size-3' />
                {t('trading.customers.contactPerson')}
              </div>
              <p className='mt-1 text-[11px] font-black text-foreground sm:text-[12px]'>
                {customer.contactPerson || t('trading.customers.unfilled')}
              </p>
            </div>

            <div className='rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2 sm:py-2.5'>
              <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40 sm:text-[9px]'>
                <Phone className='size-3' />
                {t('trading.customers.contactPhone')}
              </div>
              <p className='mt-1 text-[11px] font-black text-foreground sm:text-[12px]'>
                {customer.contactPhone || t('trading.customers.unfilled')}
              </p>
            </div>

            <div className='rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2 sm:col-span-2 sm:py-2.5'>
              <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
                <MapPin className='size-3' />
                {t('trading.customers.address')}
              </div>
              <p className='mt-1 truncate text-[10px] leading-relaxed font-bold text-muted-foreground'>
                {customer.address || t('trading.customers.unfilled')}
              </p>
            </div>

            <div className='rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2 sm:col-span-2 sm:py-2.5'>
              <div className='flex items-center gap-2 text-[8px] font-black tracking-widest text-muted-foreground uppercase italic opacity-40'>
                <MessageCircle className='size-3' />
                {t('trading.customers.communication')} /{' '}
                {t('trading.customers.wechat')}
              </div>
              <div className='mt-1 grid gap-2 sm:grid-cols-[minmax(0,1fr)_136px] sm:items-center'>
                <p className='text-[10px] font-bold break-all text-muted-foreground'>
                  {customer.wechat || t('trading.customers.unfilled')}
                </p>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  disabled={!canOpenWeChat(customer.wechat)}
                  onClick={handleOpenWeChat}
                  className='h-9 w-full rounded-full px-4 text-[9px] font-black tracking-widest uppercase sm:justify-self-end'
                >
                  {t('trading.customers.openWechat')}
                  <ExternalLink className='ms-2 size-3' />
                </Button>
              </div>
            </div>

            <div className='rounded-xl border border-dashed border-muted/40 bg-muted/10 px-3 py-2 sm:col-span-2 sm:py-2.5'>
              <div className='grid gap-2 sm:grid-cols-[minmax(0,1fr)_136px] sm:items-center'>
                <div className='flex flex-col gap-0.5'>
                  <span className='text-[8px] font-black tracking-[0.2em] text-muted-foreground/40 uppercase italic'>
                    {t('trading.customers.creditBalance')}
                  </span>
                  <div className='text-sm font-black tracking-tighter italic tabular-nums sm:text-base'>
                    {customer.balance.toLocaleString(locale)}
                  </div>
                </div>
                <Button
                  variant='secondary'
                  size='sm'
                  onClick={handleOpenCustomerOrders}
                  className='h-9 w-full rounded-full border border-emerald-500/10 bg-emerald-500/5 px-4 text-[9px] font-black tracking-widest text-emerald-500 uppercase transition-colors hover:bg-emerald-500/10 sm:justify-self-end'
                >
                  {t('trading.customers.viewOrders')}
                  <ExternalLink className='ms-2 size-3 animate-pulse' />
                </Button>
              </div>
            </div>
          </div>
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
