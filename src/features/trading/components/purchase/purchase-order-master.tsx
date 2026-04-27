import {
  AlertCircle,
  Building2,
  Calendar,
  Edit2,
  MoreHorizontal,
  Trash2,
  User,
  Wallet,
} from 'lucide-react'
import { AuditStatusDisplay } from '@/components/common/audit-status-display'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/context/language-provider'
import { type PurchaseOrderListItem } from '../../data/schema'
import { canEditPurchaseOrder, getPurchaseStatusDisplayMeta } from '../../data/purchase-status'

interface PurchaseOrderMasterProps {
  orders: PurchaseOrderListItem[]
  selectedId?: string
  onSelect: (id: string) => void
  onEdit: (order: PurchaseOrderListItem) => void
  onDelete: (id: string) => void
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage()
  const meta = getPurchaseStatusDisplayMeta(status, t)
  if (!meta) return null

  return <AuditStatusDisplay meta={meta} badgeClassName='px-2 py-0.5' />
}

function isOrderOverdue(date?: string, status?: string) {
  if (!date || status === 'Received' || status === 'Canceled') return false
  const today = new Date().toISOString().split('T')[0]
  return date < today
}

export function PurchaseOrderMaster({
  orders,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
}: PurchaseOrderMasterProps) {
  const { t } = useLanguage()

  if (orders.length === 0) {
    return (
      <div className='flex h-[40vh] flex-1 flex-col items-center justify-center space-y-3 rounded-[32px] border border-dashed border-muted/50 bg-muted/5'>
        <div className='mb-2 size-12 animate-pulse rounded-full border-2 border-dashed border-primary' />
        <p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/40'>
          {t('purchase.orders.masterEmpty')}
        </p>
      </div>
    )
  }

  return (
    <div className='flex-1 overflow-hidden rounded-[24px] md:border md:border-dashed md:border-muted/50 md:bg-muted/5 md:shadow-inner'>
      <div className='hidden max-h-[70vh] overflow-y-auto px-1 pt-1 md:block'>
        <table className='min-w-full border-separate border-spacing-y-1.5 text-sm'>
          <thead className='sticky top-0 z-10 bg-background/80 backdrop-blur-md'>
            <tr>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('purchase.orders.columns.orderStatus')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('purchase.orders.columns.supplierChannel')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('purchase.orders.columns.orderDate')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('purchase.orders.columns.expectedArrival')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('purchase.orders.columns.exchangeRate')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('purchase.orders.columns.paymentMethod')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('purchase.orders.columns.paymentTerm')}
              </th>
              <th className='px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('purchase.orders.columns.contractAmount')}
              </th>
              <th className='px-4 py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>
                {t('purchase.orders.columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const active = order.id === selectedId
              const isOverdue = isOrderOverdue(order.expectedDate, order.status)

              return (
                <tr
                  key={order.id}
                  onClick={() => onSelect(order.id)}
                  className={`group animate-in cursor-pointer fade-in slide-in-from-left-2 transition-all duration-300 hover:bg-white hover:shadow-md ${
                    active ? 'bg-white shadow-lg ring-1 ring-primary/30' : 'bg-card'
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
                        <span className='text-[8px] font-black uppercase tracking-widest text-primary'>
                          {t('purchase.orders.buyer')}:
                        </span>
                        <span className='text-[9px] font-bold uppercase'>
                          {order.purchaser || t('purchase.orders.systemBuyer')}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex flex-col'>
                      <span className='max-w-[150px] truncate text-[11px] font-black text-foreground/80'>
                        {order.supplierName}
                      </span>
                      <span className='mt-0.5 text-[8px] font-mono uppercase text-muted-foreground/40'>
                        ID: {order.supplierId}
                      </span>
                    </div>
                  </td>
                  <td className='px-4 py-3 font-mono text-[11px] font-bold text-muted-foreground'>
                    {order.orderDate}
                  </td>
                  <td className='px-4 py-3'>
                    {order.expectedDate ? (
                      <div className='flex flex-col'>
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            isOverdue ? 'text-rose-500' : 'text-muted-foreground'
                          }`}
                        >
                          {order.expectedDate}
                        </span>
                        {isOverdue && (
                          <span className='flex items-center gap-0.5 text-[8px] font-black uppercase tracking-tighter text-rose-500 animate-pulse'>
                            <AlertCircle className='size-2.5' />
                            {t('purchase.orders.overdueWarning')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className='text-[10px] font-bold italic text-muted-foreground/30'>
                        {t('purchase.orders.notSet')}
                      </span>
                    )}
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex flex-col'>
                      <span className='font-mono text-[11px] font-bold text-emerald-600'>
                        {(order.exchangeRate ?? 1).toFixed(4)}
                      </span>
                      <span className='text-[8px] font-black uppercase tracking-widest opacity-30'>
                        {t('purchase.orders.baseCurrency')}
                      </span>
                    </div>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex flex-col'>
                      <span className='max-w-[120px] truncate text-[11px] font-black text-foreground/80'>
                        {order.paymentMethodName || order.paymentMethod || t('purchase.orders.notSet')}
                      </span>
                      <span className='text-[8px] font-mono uppercase text-muted-foreground/40'>
                        {order.paymentMethod || '--'}
                      </span>
                    </div>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex flex-col'>
                      <span className='max-w-[120px] truncate text-[11px] font-black text-foreground/80'>
                        {order.paymentTermName || order.paymentTerm || t('purchase.orders.notSet')}
                      </span>
                      <span className='text-[8px] font-mono uppercase text-muted-foreground/40'>
                        {order.paymentTerm || '--'}
                      </span>
                    </div>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex flex-col'>
                      <span className='text-[12px] font-black tabular-nums text-primary'>
                        {order.amount?.toLocaleString()}
                      </span>
                      <span className='text-[8px] font-black uppercase tracking-widest opacity-30'>
                        {order.currency || 'CNY'}
                      </span>
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
                        className='min-w-[140px] rounded-[20px] border-2 p-1.5 shadow-2xl'
                      >
                        <DropdownMenuItem
                          disabled={!canEditPurchaseOrder(order.status)}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit(order)
                          }}
                          className='gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest'
                        >
                          <Edit2
                            className={`size-3 ${
                              canEditPurchaseOrder(order.status)
                                ? 'text-blue-500'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                          {canEditPurchaseOrder(order.status)
                            ? t('purchase.orders.editOrder')
                            : t('purchase.orders.workflowLocked')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(order.id)
                          }}
                          className='gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-500 focus:text-rose-600'
                        >
                          <Trash2 className='size-3' />
                          {order.status === 'Canceled'
                            ? t('purchase.orders.removePermanently')
                            : t('purchase.orders.voidContract')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className='flex flex-col gap-4 p-2 md:hidden'>
        {orders.map((order) => {
          const active = order.id === selectedId

          return (
            <div
              key={order.id}
              onClick={() => onSelect(order.id)}
              className={`rounded-[28px] border border-dashed p-4 transition-all active:scale-[0.98] ${
                active
                  ? 'border-primary/30 bg-white shadow-xl ring-2 ring-primary/20'
                  : 'border-muted/50 bg-card'
              }`}
            >
              <div className='mb-4 flex items-start justify-between'>
                <div className='space-y-1'>
                  <div className='flex items-center gap-2'>
                    <span className='text-[13px] font-black italic tracking-tighter tabular-nums'>
                      {order.orderNo}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className='flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/40 italic'>
                    <User className='size-2.5' />
                    {t('purchase.orders.buyer')}: {order.purchaser || t('purchase.orders.systemBuyer')}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 rounded-full bg-muted/20'
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className='size-4' />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end' className='rounded-2xl border-2'>
                    <DropdownMenuItem
                      onClick={() => onEdit(order)}
                      className='px-4 py-2 text-[10px] font-black uppercase'
                    >
                      {t('purchase.orders.editOrder')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(order.id)}
                      className='px-4 py-2 text-[10px] font-black uppercase text-rose-500'
                    >
                      {t('purchase.orders.voidContract')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className='space-y-3'>
                <div className='flex items-center gap-3'>
                  <div className='flex size-8 items-center justify-center rounded-xl bg-primary/5'>
                    <Building2 className='size-4 text-primary opacity-50' />
                  </div>
                  <div className='flex flex-col'>
                    <span className='text-[12px] font-black text-foreground'>{order.supplierName}</span>
                    <span className='text-[9px] font-bold uppercase text-muted-foreground opacity-40'>
                      ID: {order.supplierId}
                    </span>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3 rounded-2xl border border-dashed border-primary/10 bg-primary/5 px-3 py-2'>
                  <div className='space-y-1'>
                    <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {t('purchase.orders.columns.paymentMethod')}
                    </p>
                    <p className='truncate text-[10px] font-black text-foreground/80'>
                      {order.paymentMethodName || order.paymentMethod || t('purchase.orders.notSet')}
                    </p>
                  </div>
                  <div className='space-y-1'>
                    <p className='text-[8px] font-black uppercase tracking-widest text-muted-foreground/50'>
                      {t('purchase.orders.columns.paymentTerm')}
                    </p>
                    <p className='truncate text-[10px] font-black text-foreground/80'>
                      {order.paymentTermName || order.paymentTerm || t('purchase.orders.notSet')}
                    </p>
                  </div>
                </div>

                <div className='flex items-center justify-between border-t border-dashed border-primary/10 pt-3'>
                  <div className='flex flex-col gap-1'>
                    <div className='flex items-center gap-1.5 text-[8px] font-black uppercase text-muted-foreground opacity-40 italic'>
                      <Calendar className='size-2.5' />
                      {t('purchase.orders.mobileDate')}
                    </div>
                    <span className='text-[10px] font-black tabular-nums'>{order.orderDate}</span>
                  </div>
                  <div className='flex flex-col gap-1'>
                    <div className='flex items-center justify-center gap-1.5 text-[8px] font-black uppercase text-emerald-600 italic'>
                      {t('purchase.orders.mobileRate')}
                    </div>
                    <span className='text-[10px] font-mono font-bold text-emerald-600'>
                      {(order.exchangeRate ?? 1).toFixed(4)}
                    </span>
                  </div>
                  <div className='flex flex-col gap-1 text-right'>
                    <div className='flex items-center justify-end gap-1.5 text-[8px] font-black uppercase text-secondary italic'>
                      <Wallet className='size-2.5' />
                      {t('purchase.orders.mobileTotal')}
                    </div>
                    <span className='text-[15px] font-black italic tracking-tighter text-primary tabular-nums'>
                      {order.amount?.toLocaleString()}{' '}
                      <span className='text-[9px] opacity-40'>{order.currency || 'CNY'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
