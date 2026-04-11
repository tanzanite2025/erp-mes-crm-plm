import { useMemo, useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Route } from '@/routes/_authenticated/purchase/orders'
import { PurchaseOrderListToolbar } from './purchase-order-list-toolbar'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { PurchaseOrderDetailSheet } from './purchase-order-detail-sheet'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { PurchaseOrderMaster } from './purchase-order-master'
import { PurchaseOrderActionDialog } from './purchase-order-action-dialog'
import { useGetPurchaseOrders, usePurchaseOrderMutations } from '../../purchase'
import { type PurchaseOrder } from '../../data/schema'
import { useNonBlockingPermissionActions } from '@/features/authz/hooks/use-permission-passthrough'
import { usePurchaseOrderFilterOptions } from '../../hooks/use-purchase-order-filter-options'

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
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL')
  const [paymentTermFilter, setPaymentTermFilter] = useState('ALL')
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

  const { paymentMethodOptions, paymentTermOptions } = usePurchaseOrderFilterOptions(orders)

  const filteredOrders = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return (orders || []).filter((order: PurchaseOrder) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          order.orderNo,
          order.supplierName,
          order.paymentMethod,
          order.paymentMethodName,
          order.paymentTerm,
          order.paymentTermName,
        ].some((value) => (value?.toLowerCase() ?? '').includes(normalizedSearch))

      const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter
      const matchesPaymentMethod =
        paymentMethodFilter === 'ALL' || order.paymentMethod === paymentMethodFilter
      const matchesPaymentTerm = paymentTermFilter === 'ALL' || order.paymentTerm === paymentTermFilter

      return matchesSearch && matchesStatus && matchesPaymentMethod && matchesPaymentTerm
    })
  }, [orders, paymentMethodFilter, paymentTermFilter, searchTerm, statusFilter])

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
      <PurchaseOrderListToolbar
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        paymentMethodFilter={paymentMethodFilter}
        paymentTermFilter={paymentTermFilter}
        paymentMethodOptions={paymentMethodOptions}
        paymentTermOptions={paymentTermOptions}
        onSearchTermChange={setSearchTerm}
        onStatusFilterChange={setStatusFilter}
        onPaymentMethodFilterChange={setPaymentMethodFilter}
        onPaymentTermFilterChange={setPaymentTermFilter}
        onAddOrder={handleAddOrder}
      />

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

      <PurchaseOrderDetailSheet
        open={isDetailOpen}
        order={selectedOrder}
        title={t('purchase.orders.detailTitle')}
        onOpenChange={handleOpenChange}
        onDelete={handleDeleteOrder}
      />

      <PurchaseOrderActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        order={editingOrder}
      />
    </div>
  )
}
