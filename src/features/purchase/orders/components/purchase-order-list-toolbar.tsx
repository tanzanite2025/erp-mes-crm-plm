import { ClipboardList, Plus } from 'lucide-react'
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
import {
  type AuditStatusDisplayMeta,
  AuditStatusDisplay,
} from '@/components/common/audit-status-display'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { getPurchaseStatusDisplayMeta } from '../data/purchase-status'
import { type PurchaseOrder } from '../data/schema'

type PaymentOption = {
  value: string
  label: string
}

interface PurchaseOrderListToolbarProps {
  searchTerm: string
  statusFilter: string
  paymentMethodFilter: string
  paymentTermFilter: string
  financeFilterStatus: 'loading' | 'error' | 'ready'
  financeFilterErrorMessage?: string
  onRetryFinanceFilters?: () => void
  paymentMethodOptions: PaymentOption[]
  paymentTermOptions: PaymentOption[]
  onSearchTermChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onPaymentMethodFilterChange: (value: string) => void
  onPaymentTermFilterChange: (value: string) => void
  onAddOrder: () => void
}

const PURCHASE_ORDER_STATUSES: PurchaseOrder['status'][] = [
  'Draft',
  'Sent',
  'Awaiting',
  'Received',
  'Canceled',
]

export function PurchaseOrderListToolbar({
  searchTerm,
  statusFilter,
  paymentMethodFilter,
  paymentTermFilter,
  financeFilterStatus,
  financeFilterErrorMessage,
  onRetryFinanceFilters,
  paymentMethodOptions,
  paymentTermOptions,
  onSearchTermChange,
  onStatusFilterChange,
  onPaymentMethodFilterChange,
  onPaymentTermFilterChange,
  onAddOrder,
}: PurchaseOrderListToolbarProps) {
  const { t } = useLanguage()
  const isFinanceFilterReady = financeFilterStatus === 'ready'
  const allStatusMeta: AuditStatusDisplayMeta = {
    label: t('purchase.orders.all'),
    className: 'bg-muted/30 text-muted-foreground border-muted/20',
    dotClassName: 'bg-muted-foreground/60',
  }

  return (
    <div className='flex flex-col gap-3 px-2'>
      <div className='flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between'>
        <div className='flex min-w-0 flex-1 flex-col gap-3'>
          <div className='relative w-full xl:max-w-80'>
            <ClipboardList className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/40' />
            <Input
              placeholder={t('purchase.orders.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className='h-12 w-full rounded-2xl border-none bg-muted/50 pl-11 text-[11px] font-bold shadow-inner transition-all focus:bg-background'
            />
          </div>

          <div className='flex min-w-0 flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-start'>
            <div className='no-scrollbar flex w-full min-w-0 items-center gap-0.5 overflow-x-auto rounded-2xl border border-dashed bg-muted/30 p-1 font-bold sm:gap-1 sm:p-1.5 lg:flex-1'>
              {['ALL', ...PURCHASE_ORDER_STATUSES].map((status) => {
                const meta =
                  status === 'ALL'
                    ? allStatusMeta
                    : getPurchaseStatusDisplayMeta(status, t)
                const isActive = statusFilter === status

                return (
                  <button
                    key={status}
                    onClick={() => onStatusFilterChange(status)}
                    className={`shrink-0 rounded-xl px-0.5 py-0.5 whitespace-nowrap transition-all sm:px-1.5 sm:py-1 ${
                      isActive
                        ? 'bg-background shadow-md ring-1 ring-primary/10'
                        : 'opacity-65 hover:bg-muted/60 hover:opacity-100'
                    }`}
                  >
                    <AuditStatusDisplay
                      meta={meta}
                      badgeClassName={`gap-1 px-1.5 py-1 sm:gap-1.5 sm:px-3 sm:py-1.5 ${
                        isActive ? '' : 'shadow-none'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            <div className='grid w-full grid-cols-2 gap-1.5 sm:gap-2 lg:w-auto lg:flex-none'>
              <Select
                value={paymentMethodFilter}
                onValueChange={onPaymentMethodFilterChange}
                disabled={!isFinanceFilterReady}
              >
                <SelectTrigger className='h-11 w-full rounded-2xl border-dashed bg-background/80 font-bold shadow-sm lg:w-[180px]'>
                  <SelectValue
                    placeholder={t('purchase.orders.filters.paymentMethod')}
                  />
                </SelectTrigger>
                <SelectContent className='rounded-2xl'>
                  <SelectItem value='ALL'>
                    {t('purchase.orders.filters.allPaymentMethods')}
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
                disabled={!isFinanceFilterReady}
              >
                <SelectTrigger className='h-11 w-full rounded-2xl border-dashed bg-background/80 font-bold shadow-sm lg:w-[180px]'>
                  <SelectValue
                    placeholder={t('purchase.orders.filters.paymentTerm')}
                  />
                </SelectTrigger>
                <SelectContent className='rounded-2xl'>
                  <SelectItem value='ALL'>
                    {t('purchase.orders.filters.allPaymentTerms')}
                  </SelectItem>
                  {paymentTermOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className='flex w-full flex-row gap-1.5 sm:gap-2 xl:w-auto xl:flex-none xl:items-center xl:justify-end'>
          <Button
            size='sm'
            className='h-10 flex-1 shrink-0 gap-1.5 rounded-full bg-primary px-3 text-[9px] font-black tracking-widest uppercase shadow-xl shadow-primary/20 transition-all active:scale-95 sm:h-11 sm:gap-2 sm:px-8 sm:text-[10px] xl:w-auto xl:flex-none'
            onClick={onAddOrder}
          >
            <Plus className='h-4 w-4' />
            {t('purchase.orders.addOrder')}
          </Button>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.purchaseOrder}
            targetName={t('purchase.orders.title')}
            label={t('common.audit.trigger')}
            className='h-10 flex-1 shrink-0 rounded-full px-3 text-[9px] sm:h-11 sm:px-6 sm:text-[10px] xl:w-auto xl:flex-none'
          />
        </div>
      </div>

      {financeFilterStatus !== 'ready' ? (
        <div className='flex w-full flex-wrap items-center justify-end gap-3 text-right text-[9px] font-black tracking-widest text-muted-foreground/50 uppercase'>
          <span>
            {financeFilterStatus === 'loading'
              ? t('purchase.orders.loading')
              : financeFilterErrorMessage || '支付筛选加载失败'}
          </span>
          {financeFilterStatus === 'error' && onRetryFinanceFilters ? (
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
    </div>
  )
}
