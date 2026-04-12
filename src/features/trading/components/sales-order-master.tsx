import { Edit2, MoreHorizontal, Trash2 } from 'lucide-react'
import { isBefore, parseISO, startOfDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/context/language-provider'
import { auditUtils } from '@/lib/audit-utils'
import { failLoudly } from '@/lib/safe-catch'
import type { SalesOrder } from '../data/schema'
import { getSalesOrderClassificationLabel } from '../data/sales-order-options'
import { getSalesStatusLabel, getSalesStatusMeta } from '../data/sales-status'

interface SalesOrderMasterProps {
  orders: SalesOrder[]
  selectedId?: string
  onSelect: (id: string) => void
  onEdit?: (order: SalesOrder) => void
  onDelete?: (id: string) => void
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  const meta = getSalesStatusMeta(status)
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-black uppercase italic ${meta.color}`}>
      {getSalesStatusLabel(status, t)}
    </span>
  )
}

export function SalesOrderMaster({
  orders,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: SalesOrderMasterProps) {
  const { t, locale } = useLanguage()

  return (
    <div className='w-full overflow-hidden rounded-[24px] border border-dashed border-muted/50 bg-muted/5 shadow-inner'>
      <div className='max-h-[70vh] overflow-y-auto px-1 pt-1'>
        <table className='min-w-full border-separate border-spacing-y-1.5 text-sm'>
          <thead className='sticky top-0 z-10 bg-background/80 backdrop-blur-md'>
            <tr>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/50'>
                {t('tradingSalesOrder.master.columns.orderStatus')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/50'>
                {t('tradingSalesOrder.master.columns.customer')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/50'>
                {t('tradingSalesOrder.master.columns.classificationDate')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/50'>
                {t('tradingSalesOrder.master.columns.totalQuantity')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/50'>
                {t('tradingSalesOrder.master.columns.paymentMethod')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/50'>
                {t('tradingSalesOrder.master.columns.paymentTerm')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/50'>
                {t('tradingSalesOrder.master.columns.deliveryDeadline')}
              </th>
              <th className='px-4 py-3 text-center text-[10px] font-black uppercase italic tracking-widest text-muted-foreground/50'>
                {t('tradingSalesOrder.master.columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className='py-20'>
                  <div className='flex flex-col items-center justify-center opacity-30 grayscale'>
                    <div className='mb-4 size-12 animate-pulse rounded-full border-2 border-dashed border-primary' />
                    <p className='text-[10px] font-black uppercase tracking-[0.2em]'>
                      {t('tradingSalesOrder.master.empty')}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const active = order.id === selectedId
                const classification =
                  getSalesOrderClassificationLabel(order.classification, locale) ||
                  order.classification ||
                  '-'

                return (
                  <tr
                    key={order.id}
                    onClick={() => onSelect(order.id)}
                    className={`group animate-in cursor-pointer fade-in slide-in-from-left-2 transition-all duration-200 hover:bg-white hover:shadow-md ${
                      active ? 'bg-white shadow-lg ring-1 ring-primary/30' : 'bg-card'
                    }`}
                  >
                    <td className='rounded-l-2xl px-4 py-3'>
                      <div className='flex flex-col'>
                        <div className='flex items-center gap-2'>
                          <span className='text-[12px] font-black tracking-tight text-foreground'>{order.orderNo}</span>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className='mt-0.5 flex items-center gap-1.5 opacity-40'>
                          <span className='text-[8px] font-black uppercase italic tracking-widest'>
                            {t('tradingSalesOrder.master.auditor')}:
                          </span>
                          <span className='max-w-[80px] truncate text-[9px] font-bold'>
                            {auditUtils.formatOperatorName(order.createdBy) || t('tradingSalesOrder.master.system')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className='max-w-[120px] truncate px-4 py-3 text-[11px] font-bold text-foreground/80'>
                      {order.customerName}
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex flex-col'>
                        <span className='text-[10px] font-black uppercase italic tracking-tight text-primary/80'>
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
                                  const error = new Error('[CRITICAL] Missing fulfillmentRate from sales order DTO')
                                  failLoudly(error, 'SalesOrderMaster.fulfillmentRate')
                                  return null
                                })()}
                                <span className='text-[9px] font-black uppercase italic tracking-widest text-muted-foreground/30'>
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
                          {order.paymentMethodName || order.paymentMethod || '-'}
                        </span>
                        <span className='text-[8px] font-mono uppercase italic text-muted-foreground/40'>
                          {order.paymentMethod || '--'}
                        </span>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex flex-col'>
                        <span className='max-w-[120px] truncate text-[11px] font-black text-foreground/80'>
                          {order.paymentTermName || order.paymentTerm || '-'}
                        </span>
                        <span className='text-[8px] font-mono uppercase italic text-muted-foreground/40'>
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
                          isBefore(parseISO(order.deliveryDate), startOfDay(new Date())) && (
                            <span className='inline-flex items-center gap-0.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[8px] font-black uppercase italic text-rose-600 animate-pulse'>
                              {t('tradingSalesOrder.master.overdue')}
                            </span>
                          )}
                      </div>
                    </td>
                    <td className='rounded-r-2xl px-4 py-3 text-center'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 rounded-full hover:bg-muted group-hover:bg-muted/50'
                          >
                            <MoreHorizontal className='size-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align='end'
                          className='min-w-[120px] rounded-[20px] border-2 p-1.5 shadow-2xl'
                        >
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onEdit?.(order)
                            }}
                            className='gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest'
                          >
                            <Edit2 className='size-3 text-blue-500' />
                            {t('tradingSalesOrder.master.editOrder')}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              onDelete?.(order.id)
                            }}
                            className='gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 focus:text-rose-600'
                          >
                            <Trash2 className='size-3' />
                            {order.status === 'Canceled'
                              ? t('tradingSalesOrder.master.removePermanently')
                              : t('tradingSalesOrder.master.voidContract')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
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
