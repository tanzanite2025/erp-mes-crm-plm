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
import { failLoudly } from '@/lib/safe-catch'
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
import { SalesOrderPackagingSummaryInline } from './parts/sales-order-packaging-summary-inline'

interface SalesOrderMasterProps {
  orders: SalesOrder[]
  selectedId?: string
  onSelect: (id: string) => void
  onPreassembleScan?: (order: SalesOrder) => void
  onEdit?: (order: SalesOrder) => void
  onDelete?: (id: string) => void
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

export function SalesOrderMaster({
  orders,
  selectedId,
  onSelect,
  onPreassembleScan,
  onEdit,
  onDelete,
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
      <div className='max-h-[70vh] overflow-y-auto px-1 pt-1'>
        <table className='min-w-full border-separate border-spacing-y-1.5 text-sm'>
          <thead className='sticky top-0 z-10 bg-background/80 backdrop-blur-md'>
            <tr>
              <th className='px-4 py-3 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                {t('tradingSalesOrder.master.columns.orderStatus')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                {t('tradingSalesOrder.master.columns.customer')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                {t('tradingSalesOrder.master.columns.classificationDate')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                {t('tradingSalesOrder.master.columns.totalQuantity')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                {t('tradingSalesOrder.master.columns.paymentMethod')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                {t('tradingSalesOrder.master.columns.paymentTerm')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                {t('tradingSalesOrder.master.columns.deliveryDeadline')}
              </th>
              {hasActions ? (
                <th className='px-4 py-3 text-center text-[10px] font-black tracking-widest text-muted-foreground/50 uppercase italic'>
                  {t('tradingSalesOrder.master.columns.actions')}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={hasActions ? 8 : 7} className='py-20'>
                  <div className='flex flex-col items-center justify-center opacity-30 grayscale'>
                    <div className='mb-4 size-12 animate-pulse rounded-full border-2 border-dashed border-primary' />
                    <p className='text-[10px] font-black tracking-[0.2em] uppercase'>
                      {t('tradingSalesOrder.master.empty')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const active = order.id === selectedId
                const canPreassembleScan =
                  isSalesOrderPreassembleScanAllowed(order)
                const canRegisterReceipt = canRegisterSalesOrderReceipt(order)
                const classification =
                  getSalesOrderClassificationLabel(
                    order.classification,
                    locale
                  ) ||
                  order.classification ||
                  '-'

                return (
                  <tr
                    key={order.id}
                    onClick={(event) => {
                      const target = event.target as HTMLElement | null
                      if (target?.closest('[data-order-row-action="true"]')) {
                        return
                      }
                      onSelect(order.id)
                    }}
                    className={`group animate-in cursor-pointer transition-all duration-200 fade-in slide-in-from-left-2 hover:bg-white hover:shadow-md ${
                      active
                        ? 'bg-white shadow-lg ring-1 ring-primary/30'
                        : 'bg-card'
                    }`}
                  >
                    <td className='rounded-l-2xl px-4 py-3'>
                      <div className='flex flex-col'>
                        <div className='flex items-center gap-2'>
                          <span className='text-[12px] font-black tracking-tight text-foreground'>
                            {order.orderNo}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className='mt-0.5 flex items-center gap-1.5 opacity-40'>
                          <span className='text-[8px] font-black tracking-widest uppercase italic'>
                            {t('tradingSalesOrder.master.auditor')}:
                          </span>
                          <span className='max-w-[80px] truncate text-[9px] font-bold'>
                            {auditUtils.formatOperatorName(order.createdBy) ||
                              t('tradingSalesOrder.master.system')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className='max-w-[120px] truncate px-4 py-3 text-[11px] font-bold text-foreground/80'>
                      {order.customerName}
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex flex-col'>
                        <span className='text-[10px] font-black tracking-tight text-primary/80 uppercase italic'>
                          {classification}
                        </span>
                        <span className='mt-0.5 font-mono text-[10px] text-muted-foreground'>
                          {order.orderDate}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex flex-col gap-1.5'>
                        <span className='text-[12px] font-black tabular-nums'>
                          {order.quantity?.toLocaleString() || 0} PCS
                        </span>
                        <SalesOrderPackagingSummaryInline order={order} />
                        {order.status !== 'Draft' && (
                          <div className='flex flex-col gap-1'>
                            {typeof order.fulfillmentRate === 'number' ? (
                              <div className='h-1.5 w-full max-w-[60px] overflow-hidden rounded-full bg-muted shadow-inner'>
                                <div
                                  className='h-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] transition-all duration-1000'
                                  style={{
                                    width: `${Math.min(100, Math.max(0, order.fulfillmentRate))}%`,
                                  }}
                                />
                              </div>
                            ) : (
                              <>
                                {(() => {
                                  const error = new Error(
                                    '[CRITICAL] Missing fulfillmentRate from sales order DTO'
                                  )
                                  failLoudly(
                                    error,
                                    'SalesOrderMaster.fulfillmentRate'
                                  )
                                  return null
                                })()}
                                <span className='text-[9px] font-black tracking-widest text-muted-foreground/30 uppercase italic'>
                                  --
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex flex-col'>
                        <span className='max-w-[120px] truncate text-[11px] font-black text-foreground/80'>
                          {order.paymentMethodName ||
                            order.paymentMethod ||
                            '-'}
                        </span>
                        <span className='font-mono text-[8px] text-muted-foreground/40 uppercase italic'>
                          {order.paymentMethod || '--'}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex flex-col'>
                        <span className='max-w-[120px] truncate text-[11px] font-black text-foreground/80'>
                          {order.paymentTermName || order.paymentTerm || '-'}
                        </span>
                        <span className='font-mono text-[8px] text-muted-foreground/40 uppercase italic'>
                          {order.paymentTerm || '--'}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <span className='font-mono text-[11px] font-bold text-muted-foreground'>
                          {order.deliveryDate}
                        </span>
                        {order.status !== 'Done' &&
                          order.status !== 'Canceled' &&
                          isBefore(
                            parseISO(order.deliveryDate),
                            startOfDay(new Date())
                          ) && (
                            <span className='inline-flex animate-pulse items-center gap-0.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[8px] font-black text-rose-600 uppercase italic'>
                              {t('tradingSalesOrder.master.overdue')}
                            </span>
                          )}
                      </div>
                    </td>
                    {hasActions ? (
                      <td
                        data-order-row-action='true'
                        className='rounded-r-2xl px-4 py-3 text-center'
                        onClick={(event) => event.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              className='h-8 w-8 rounded-full group-hover:bg-muted/50 hover:bg-muted'
                              onClick={(event) => event.stopPropagation()}
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
                      </td>
                    ) : null}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
