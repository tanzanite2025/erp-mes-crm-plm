import type { ReactNode } from 'react'
import { isBefore, parseISO, startOfDay } from 'date-fns'
import {
  Edit2,
  FileText,
  MoreHorizontal,
  ScanLine,
  Trash2,
} from 'lucide-react'
import { auditUtils } from '@/lib/audit-utils'
import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getSalesOrderClassificationLabel } from '../data/sales-order-options'
import { getSalesStatusLabel, getSalesStatusMeta } from '../data/sales-status'
import type { SalesOrder } from '../data/schema'
import { isSalesOrderPreassembleScanAllowed } from '../utils/sales-order-preassemble'
import { SalesOrderQuantitySummaryCard } from './parts/sales-order-quantity-packaging-cell'
import type {
  SalesOrderCardSection,
  SalesOrderFeatureCardFactory,
} from './sales-order-card/sales-order-card-types'

interface SalesOrderMasterProps {
  orders: SalesOrder[]
  selectedId?: string
  onSelect: (id: string) => void
  onPreassembleScan?: (order: SalesOrder) => void
  onViewReceivable?: (order: SalesOrder) => void
  onEdit?: (order: SalesOrder) => void
  onDelete?: (id: string) => void
  section?: SalesOrderCardSection
  getFeatureCards?: SalesOrderFeatureCardFactory
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  const meta = getSalesStatusMeta(status)
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-black uppercase italic ${meta.color}`}
    >
      {getSalesStatusLabel(status, t)}
    </span>
  )
}

interface SalesOrderInfoCardProps {
  label: string
  children: ReactNode
  className?: string
}

function SalesOrderInfoCard({
  label,
  children,
  className,
}: SalesOrderInfoCardProps) {
  return (
    <div
      className={`relative flex h-full overflow-hidden rounded-[24px] border border-dashed border-muted/40 bg-background/80 p-3 transition-colors ${
        className ?? ''
      }`}
    >
      <div className='absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-transparent' />
      <div className='relative flex h-full flex-1 flex-col gap-3'>
        <div>
          <h3 className='text-sm font-black tracking-tighter italic'>{label}</h3>
        </div>
        <div className='flex-1'>{children}</div>
      </div>
    </div>
  )
}

interface SalesOrderHeaderMetaPillProps {
  label: string
  value: string
  className?: string
  valueClassName?: string
  trailing?: ReactNode
  variant?: 'default' | 'highlight'
}

function SalesOrderHeaderMetaPill({
  label,
  value,
  className,
  valueClassName,
  trailing,
  variant = 'default',
}: SalesOrderHeaderMetaPillProps) {
  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 rounded-full border border-dashed px-2.5 py-1.5 ${
        variant === 'highlight'
          ? 'border-primary/25 bg-primary/5'
          : 'border-muted/35 bg-background/80'
      } ${
        className ?? ''
      }`}
    >
      <span
        className={`shrink-0 text-[8px] font-black uppercase tracking-widest ${
          variant === 'highlight' ? 'text-primary/60' : 'text-muted-foreground/45'
        }`}
      >
        {label}:
      </span>
      <span
        className={`min-w-0 truncate text-[10px] font-black tracking-tight text-foreground/80 ${
          variant === 'highlight' ? 'text-[11px] text-foreground' : ''
        } ${
          valueClassName ?? ''
        }`}
      >
        {value}
      </span>
      {trailing ? trailing : null}
    </div>
  )
}

export function SalesOrderMaster({
  orders,
  selectedId,
  onSelect,
  onPreassembleScan,
  onViewReceivable,
  onEdit,
  onDelete,
  section = 'primary',
  getFeatureCards,
}: SalesOrderMasterProps) {
  const { t, locale } = useLanguage()
  const hasActions = true

  const openScanPreassemble = (order: SalesOrder) => {
    onPreassembleScan?.(order)
  }

  return (
    <div className='w-full overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
      <div className='max-h-[70vh] overflow-y-auto p-2.5'>
        {orders.length === 0 ? (
          <div className='flex min-h-[40vh] flex-col items-center justify-center opacity-30 grayscale'>
            <div className='mb-4 size-12 animate-pulse rounded-full border-2 border-dashed border-primary' />
            <p className='text-[10px] font-black tracking-[0.2em] uppercase'>
              {t('tradingSalesOrder.master.empty')}
            </p>
          </div>
        ) : (
          <div className='flex flex-col gap-3'>
            {orders.map((order) => {
              const active = order.id === selectedId
              const canPreassembleScan = isSalesOrderPreassembleScanAllowed(order)
              const classification =
                getSalesOrderClassificationLabel(order.classification, locale) ||
                order.classification ||
                '-'
              const isOverdue =
                order.status !== 'Done' &&
                order.status !== 'Canceled' &&
                isBefore(parseISO(order.deliveryDate), startOfDay(new Date()))
              const cardContext = {
                section,
                readonly: section === 'canceled' || order.status === 'Canceled',
              }
              const featureCards = (getFeatureCards?.(order, cardContext) ?? [])
                .filter((featureCard) => featureCard.visible !== false)
                .sort((left, right) => left.priority - right.priority)

              return (
                <article
                  key={order.id}
                  className={`group animate-in rounded-[28px] border border-dashed p-3 transition-all duration-200 fade-in slide-in-from-left-2 ${
                    active
                      ? 'border-primary/30 bg-card shadow-xl ring-2 ring-primary/20'
                      : 'border-muted/50 bg-card shadow-sm'
                  }`}
                >
                  <div className='flex flex-col gap-3'>
                    <div className='flex flex-col gap-2.5 border-b border-dashed border-muted/40 pb-3 xl:flex-row xl:items-center xl:justify-between'>
                      <div className='space-y-1.5'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='text-lg font-black tracking-tighter italic uppercase text-foreground'>
                            {order.orderNo}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className='flex flex-wrap items-center gap-2 text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
                          <span className='inline-flex items-center rounded-full border border-dashed border-muted/40 bg-muted/20 px-2 py-1 text-muted-foreground/60'>
                            {t('tradingSalesOrder.master.auditor')}:{' '}
                            {auditUtils.formatOperatorName(order.createdBy) ||
                              t('tradingSalesOrder.master.system')}
                          </span>
                          <span className='inline-flex items-center rounded-full border border-dashed border-primary/15 bg-primary/5 px-2 py-1 text-primary/70'>
                            {t('tradingSalesOrder.master.columns.classification')}: {classification}
                          </span>
                          <span className='inline-flex items-center rounded-full border border-dashed border-muted/40 bg-background/80 px-2 py-1 font-mono text-muted-foreground/60'>
                            {t('tradingSalesOrder.master.columns.orderDate')}: {order.orderDate}
                          </span>
                        </div>
                      </div>

                      {hasActions ? (
                        <div className='flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-end'>
                          <div
                            data-testid={`sales-order-header-secondary-meta-${order.id}`}
                            className='flex min-w-0 flex-wrap items-center justify-end gap-1.5 xl:max-w-[760px]'
                          >
                            <SalesOrderHeaderMetaPill
                              label={t('tradingSalesOrder.master.columns.customer')}
                              value={order.customerName || '-'}
                              className='max-w-full xl:max-w-[280px]'
                              variant='highlight'
                            />
                            <SalesOrderHeaderMetaPill
                              label={t('tradingSalesOrder.master.columns.deliveryDeadline')}
                              value={order.deliveryDate}
                              valueClassName='font-mono'
                              trailing={
                                isOverdue ? (
                                  <span className='inline-flex animate-pulse items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-rose-600'>
                                    {t('tradingSalesOrder.master.overdue')}
                                  </span>
                                ) : (
                                  <span className='inline-flex items-center rounded-full border border-dashed border-muted/35 bg-background/80 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-muted-foreground/45'>
                                    交期正常
                                  </span>
                                )
                              }
                            />
                            <SalesOrderHeaderMetaPill
                              label={t('tradingSalesOrder.master.columns.paymentMethod')}
                              value={order.paymentMethodName || order.paymentMethod || '-'}
                              className='max-w-full xl:max-w-[180px]'
                            />
                            <SalesOrderHeaderMetaPill
                              label={t('tradingSalesOrder.master.columns.paymentTerm')}
                              value={order.paymentTermName || order.paymentTerm || '-'}
                              className='max-w-full xl:max-w-[180px]'
                            />
                          </div>

                          <div
                            data-order-row-action='true'
                            className='flex shrink-0 flex-wrap items-center justify-end gap-1.5 rounded-[20px] border border-dashed border-muted/40 bg-background/70 p-1'
                          >
                            <Button
                              type='button'
                              variant='default'
                              data-order-row-action='true'
                              className='h-8 rounded-full px-4 text-[10px] font-black tracking-widest'
                              onClick={() => onSelect(order.id)}
                            >
                              {t('tradingSalesOrder.master.actions.viewDetail')}
                            </Button>

                            <Button
                              type='button'
                              variant='ghost'
                              disabled={!canPreassembleScan}
                              data-order-row-action='true'
                              className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest'
                              onClick={() => {
                                if (!canPreassembleScan) return
                                openScanPreassemble(order)
                              }}
                            >
                              <ScanLine className='mr-1.5 size-3 text-blue-600' />
                              {t('tradingSalesOrder.master.shipByScan')}
                            </Button>

                            <Button
                              type='button'
                              variant='ghost'
                              disabled={!onViewReceivable}
                              data-order-row-action='true'
                              className='h-8 rounded-full px-3 text-[10px] font-black tracking-widest'
                              onClick={() => onViewReceivable?.(order)}
                            >
                              <FileText className='mr-1.5 size-3 text-emerald-600' />
                              {t('tradingSalesOrder.master.viewReceivable')}
                            </Button>

                            {(onEdit || onDelete) && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant='ghost'
                                    size='icon'
                                    className='h-8 w-8 rounded-full hover:bg-muted'
                                  >
                                    <MoreHorizontal className='size-4' />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align='end'
                                  className='min-w-[144px] rounded-[20px] border-2 p-1.5 shadow-2xl'
                                >
                                  {onEdit && (
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.stopPropagation()
                                        onEdit?.(order)
                                      }}
                                      className='gap-2 rounded-xl px-3 py-2 text-[10px] font-black tracking-widest uppercase'
                                    >
                                      <Edit2 className='size-3 text-blue-500' />
                                      {t('tradingSalesOrder.master.editOrder')}
                                    </DropdownMenuItem>
                                  )}
                                  {onDelete && (
                                    <DropdownMenuItem
                                      onSelect={(e) => {
                                        e.stopPropagation()
                                        onDelete?.(order.id)
                                      }}
                                      className='gap-2 rounded-xl px-3 py-2 text-[10px] font-black tracking-widest text-rose-500 uppercase focus:text-rose-600'
                                    >
                                      <Trash2 className='size-3' />
                                      {order.status === 'Canceled'
                                        ? t(
                                            'tradingSalesOrder.master.removePermanently'
                                          )
                                        : t('tradingSalesOrder.master.voidContract')}
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className='grid items-stretch gap-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.55fr)_minmax(0,1.55fr)]'>
                      <SalesOrderInfoCard label={t('tradingSalesOrder.master.columns.totalQuantity')}>
                        <SalesOrderQuantitySummaryCard order={order} />
                      </SalesOrderInfoCard>

                      {featureCards.map((featureCard) => (
                        <div key={featureCard.id} className='h-full'>
                          {featureCard.render()}
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
