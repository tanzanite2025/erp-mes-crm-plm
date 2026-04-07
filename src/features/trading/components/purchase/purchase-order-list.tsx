import { useMemo, useState, useEffect } from 'react'
import { Plus, Loader2, ClipboardList } from 'lucide-react'
import { Route } from '@/routes/_authenticated/purchase/orders'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { PurchaseOrderMaster } from './purchase-order-master'
import { PurchaseOrderDetail } from './purchase-order-detail'
import { PurchaseOrderActionDialog } from './purchase-order-action-dialog'
import { useGetPurchaseOrders, usePurchaseOrderMutations } from '../../purchase'
import { type PurchaseOrder } from '../../data/schema'
import { getPurchaseStatusLabel } from '../../data/purchase-status'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'

export function PurchaseOrderList() {
  const { t } = useLanguage()
  const { allowsAction } = useNonBlockingPermissionActions()
  const { search, detailId } = Route.useSearch()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const { data, isLoading, error } = useGetPurchaseOrders(page, pageSize)
  const orders = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total || 0
  const { deleteMutation } = usePurchaseOrderMutations()
  const [selectedId, setSelectedId] = useState<string | undefined>(detailId || undefined)
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(!!detailId)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState(search || '')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const navigate = Route.useNavigate()

  useEffect(() => {
    if (search) {
      const syncSearchTimer = globalThis.setTimeout(() => {
        setSearchTerm(search)
      }, 0)

      return () => {
        globalThis.clearTimeout(syncSearchTimer)
      }
    }

    if (detailId) {
      const syncDetailTimer = globalThis.setTimeout(() => {
        setSelectedId(detailId)
        setIsDetailOpen(true)
      }, 0)

      return () => {
        globalThis.clearTimeout(syncDetailTimer)
      }
    }
  }, [search, detailId])

  const filteredOrders = useMemo(() => {
    return (orders || []).filter((order: PurchaseOrder) => {
      const matchesSearch =
        (order.orderNo?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (order.supplierName?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  const selectedOrder = useMemo(
    () =>
      filteredOrders.find((order: PurchaseOrder) => order.id === (selectedId || filteredOrders[0]?.id)) ??
      filteredOrders[0],
    [filteredOrders, selectedId]
  )

  const handleAddOrder = () => {
    if (!allowsAction('action_trading_purchase_order_manage')) return
    setEditingOrder(null)
    setIsActionDialogOpen(true)
  }

  const handleEditOrder = (order: PurchaseOrder) => {
    if (!allowsAction('action_trading_purchase_order_manage')) return
    setEditingOrder(order)
    setIsActionDialogOpen(true)
  }

  const handleDeleteOrder = (id: string) => {
    if (!allowsAction('action_trading_purchase_order_delete')) return
    const order = orders.find((item) => item.id === id)
    if (order?.status !== 'Canceled' && !confirm(t('purchase.orders.deleteConfirm'))) return
    deleteMutation.mutate(id)
  }

  if (isLoading) {
    return (
      <div className='h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500'>
        <Loader2 className='size-10 text-primary animate-spin opacity-20' />
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse'>
          {t('purchase.orders.loading')}
        </p>
      </div>
    )
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  const handleOpenChange = (open: boolean) => {
    setIsDetailOpen(open)
    if (!open) {
      navigate({
        search: (prev) => ({
          search: prev.search,
          detailId: '',
        }),
        replace: true,
      })
      setSelectedId(undefined)
    }
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col md:flex-row items-center justify-between gap-4 px-2'>
        <div className='relative w-full md:w-80'>
          <ClipboardList className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
          <Input
            placeholder={t('purchase.orders.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-11 h-12 text-[11px] font-bold rounded-2xl border-none bg-muted/50 focus:bg-background transition-all shadow-inner w-full'
          />
        </div>
        <div className='flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto'>
          <div className='flex items-center gap-1 p-1.5 bg-muted/30 rounded-2xl border border-dashed overflow-x-auto max-w-full font-bold w-full sm:w-auto no-scrollbar'>
            {['ALL', 'Draft', 'Sent', 'Awaiting', 'Received', 'Canceled'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-[9px] font-black uppercase tracking-tighter rounded-xl transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted opacity-60 hover:opacity-100'
                }`}
              >
                {status === 'ALL' ? t('purchase.orders.all') : getPurchaseStatusLabel(status, t)}
              </button>
            ))}
          </div>
          <Button
            size='sm'
            className='h-11 w-full sm:w-auto px-8 rounded-full shadow-xl shadow-primary/20 bg-primary font-black text-[10px] uppercase tracking-widest gap-2 active:scale-95 transition-all'
            onClick={handleAddOrder}
          >
            <Plus className='h-4 w-4' />
            {t('purchase.orders.addOrder')}
          </Button>
        </div>
      </div>

      <div className='flex flex-col gap-4 bg-background/50 rounded-[32px] border border-dashed border-muted/50 p-2 shadow-sm'>
        <PurchaseOrderMaster
          orders={filteredOrders}
          selectedId={selectedId}
          onSelect={(id: string) => {
            setSelectedId(id)
            setIsDetailOpen(true)
          }}
          onEdit={handleEditOrder}
          onDelete={handleDeleteOrder}
        />

        {total > pageSize && (
          <div className='flex items-center justify-center gap-6 py-4 bg-muted/5 rounded-2xl border border-dashed border-muted/30'>
            <Button
              variant='ghost'
              size='sm'
              disabled={page === 1}
              onClick={() => setPage((prev) => prev - 1)}
              className='h-9 px-6 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-md transition-all'
            >
              {t('purchase.orders.prevPage')}
            </Button>
            <div className='flex items-center gap-2'>
              <span className='text-[10px] font-black text-muted-foreground/40'>
                {t('purchase.orders.page')}
              </span>
              <span className='text-[12px] font-black tabular-nums border-b-2 border-primary/20 pb-0.5'>
                {page}
              </span>
              <span className='text-[10px] font-black text-muted-foreground/40'>
                / {Math.ceil(total / pageSize)}
              </span>
            </div>
            <Button
              variant='ghost'
              size='sm'
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((prev) => prev + 1)}
              className='h-9 px-6 text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-md transition-all'
            >
              {t('purchase.orders.nextPage')}
            </Button>
          </div>
        )}
      </div>

      <Sheet open={isDetailOpen} onOpenChange={handleOpenChange}>
        <SheetContent side='bottom' className='w-full h-[60vh] overflow-y-auto p-0 pt-2 rounded-t-[32px] border-t-2 shadow-2xl'>
          <SheetHeader className='px-6 pb-2 border-b border-dashed'>
            <div className='flex items-center gap-2'>
              <div className='size-2 rounded-full bg-primary animate-pulse' />
              <SheetTitle className='text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground'>
                {t('purchase.orders.detailTitle')}
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className='p-2'>
            <PurchaseOrderDetail order={selectedOrder} onDelete={handleDeleteOrder} />
          </div>
        </SheetContent>
      </Sheet>

      <PurchaseOrderActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        order={editingOrder}
      />
    </div>
  )
}
