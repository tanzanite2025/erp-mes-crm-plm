import type { ReactNode } from 'react'
import { isBefore, parseISO, startOfDay } from 'date-fns'
import { useNavigate } from '@tanstack/react-router'
import {
  BanknoteArrowDown,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getSalesOrderClassificationLabel } from '../data/sales-order-options'
import { getSalesStatusLabel, getSalesStatusMeta } from '../data/sales-status'
import type { SalesOrder } from '../data/schema'
import { canRegisterSalesOrderReceipt } from '../utils/sales-order-actions'
import { isSalesOrderPreassembleScanAllowed } from '../utils/sales-order-preassemble'
import { SalesOrderQuantitySummaryCard } from './parts/sales-order-quantity-packaging-cell'

interface SalesOrderMasterProps {
  orders: SalesOrder[]
  selectedId?: string
  onSelect: (id: string) => void
  onPreassembleScan?: (order: SalesOrder) => void
  onEdit?: (order: SalesOrder) => void
  onDelete?: (id: string) => void
  renderFeatureCards?: (order: SalesOrder) => ReactNode
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

function SalesOrderInfoCard({ label, children, className }: SalesOrderInfoCardProps) {
  return (
    <div
      className={`rounded-[24px] border border-dashed border-muted/40 bg-background/80 px-3 py-2.5 ${
        className ?? ''
      }`}
    >
      <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
        {label}
      </p>
      <div className='mt-2'>{children}</div>
    </div>
  )
}

interface SalesOrderMetaStripProps {
  label: string
  primary: string
  secondary?: string
  trailing?: ReactNode
  className?: string
  primaryMono?: boolean
}

function SalesOrderMetaStrip({
  label,
  primary,
  secondary,
  trailing,
  className,
  primaryMono = false,
}: SalesOrderMetaStripProps) {
  return (
    <div
      className={`rounded-[20px] border border-dashed border-muted/35 bg-background/70 px-2.5 py-2 ${
        className ?? ''
      }`}
    >
      <p className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/45'>
        {label}
      </p>
      <div className='mt-1 flex items-center justify-between gap-2'>
        <p
          className={`truncate text-[11px] font-black tracking-tight text-foreground/80 ${
            primaryMono ? 'font-mono' : ''
          }`}
        >
          {primary}
        </p>
        {trailing ? (
          trailing
        ) : secondary ? (
          <span className='font-mono text-[8px] font-black uppercase tracking-widest text-muted-foreground/40'>
            {secondary}
          </span>
        ) : null}
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
}

function SalesOrderHeaderMetaPill({
  label,
  value,
  className,
  valueClassName,
  trailing,
}: SalesOrderHeaderMetaPillProps) {
  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 rounded-full border border-dashed border-muted/35 bg-background/80 px-2.5 py-1.5 ${
        className ?? ''
      }`}
    >
      <span className='shrink-0 text-[8px] font-black uppercase tracking-widest text-muted-foreground/45'>
        {label}:
      </span>
      <span
        className={`min-w-0 truncate text-[10px] font-black tracking-tight text-foreground/80 ${
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
  onEdit,
  onDelete,
  renderFeatureCards,
}: SalesOrderMasterProps) {
  const { t, locale } = useLanguage()
  const navigate = useNavigate()
  const hasActions = true

  const openReceivables = (order: SalesOrder, autoOpen: boolean) => {
    navigate({
      to: '/trading/receivables',
      search: {
        sourceType: 'SALES_ORDER',
        sourceRefId: order.id,
        autoOpen: autoOpen || undefined,
      },
    })
  }

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
              const canRegisterReceipt = canRegisterSalesOrderReceipt(order)
              const classification =
                getSalesOrderClassificationLabel(order.classification, locale) ||
                order.classification ||
                '-'
              const isOverdue =
                order.status !== 'Done' &&
                order.status !== 'Canceled' &&
                isBefore(parseISO(order.deliveryDate), startOfDay(new Date()))

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
                            className='flex min-w-0 flex-wrap items-center justify-end gap-1.5 xl:max-w-[440px]'
                          >
                            <SalesOrderHeaderMetaPill
                              label={t('tradingSalesOrder.master.columns.customer')}
                              value={order.customerName || '-'}
                              className='max-w-full xl:max-w-[240px]'
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
                                <DropdownMenuItem
                                  disabled={!canPreassembleScan}
                                  onSelect={(e) => {
                                    e.stopPropagation()
                                    if (!canPreassembleScan) return
                                    openScanPreassemble(order)
                                  }}
                                  className='gap-2 rounded-xl px-3 py-2 text-[10px] font-black tracking-widest uppercase'
                                >
                                  <ScanLine className='size-3 text-blue-600' />
                                  {t('tradingSalesOrder.master.shipByScan')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.stopPropagation()
                                    openReceivables(order, false)
                                  }}
                                  className='gap-2 rounded-xl px-3 py-2 text-[10px] font-black tracking-widest uppercase'
                                >
                                  <FileText className='size-3 text-emerald-600' />
                                  {t('tradingSalesOrder.master.viewReceivable')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={!canRegisterReceipt}
                                  onSelect={(e) => {
                                    e.stopPropagation()
                                    if (!canRegisterReceipt) return
                                    openReceivables(order, true)
                                  }}
                                  className='gap-2 rounded-xl px-3 py-2 text-[10px] font-black tracking-widest uppercase'
                                >
                                  <BanknoteArrowDown className='size-3 text-emerald-600' />
                                  {t('tradingSalesOrder.master.registerReceipt')}
                                </DropdownMenuItem>
                                {(onEdit || onDelete) && (
                                  <DropdownMenuSeparator className='my-1' />
                                )}
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
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className='grid gap-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.55fr)_minmax(0,0.95fr)_minmax(0,0.95fr)]'>
                      <SalesOrderInfoCard label={t('tradingSalesOrder.master.columns.totalQuantity')}>
                        <SalesOrderQuantitySummaryCard order={order} />
                      </SalesOrderInfoCard>

                      {renderFeatureCards ? renderFeatureCards(order) : null}

                      <SalesOrderMetaStrip
                        label={t('tradingSalesOrder.master.columns.paymentMethod')}
                        primary={order.paymentMethodName || order.paymentMethod || '-'}
                        secondary={order.paymentMethod || '--'}
                      />

                      <SalesOrderMetaStrip
                        label={t('tradingSalesOrder.master.columns.paymentTerm')}
                        primary={order.paymentTermName || order.paymentTerm || '-'}
                        secondary={order.paymentTerm || '--'}
                      />
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
