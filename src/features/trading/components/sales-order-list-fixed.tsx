import { useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/context/language-provider'
import { useConfirmedActionFlow } from '@/hooks/use-protected-action'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { type SalesOrder, type SalesOrderStatus, salesOrderStatuses } from '../data/schema'
import { useGetSalesOrders, useSalesOrderMutations } from '../sales'
import { SalesOrderActionDialog } from './sales-order-action-dialog'
import { SalesOrderDetail } from './sales-order-detail'
import { SalesOrderMaster } from './sales-order-master'

const salesOrderStatusLabelKeyMap: Record<SalesOrderStatus, 'draft' | 'pending' | 'inProgress' | 'done' | 'canceled'> = {
	Draft: 'draft',
	Pending: 'pending',
	InProgress: 'inProgress',
	Done: 'done',
	Canceled: 'canceled',
}

function toSalesOrderStatusKey(status: SalesOrderStatus) {
	return salesOrderStatusLabelKeyMap[status]
}

export function SalesOrderList() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const search = useSearch({ from: '/_authenticated/trading/sales-orders' })
  
  // UI States
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedId, setSelectedId] = useState<string | null>(search.detailId || null)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null)

  // Data Fetching
  const { data, isLoading, isError, error } = useGetSalesOrders(page, pageSize)
  const { deleteMutation } = useSalesOrderMutations()

  const orders = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total || 0

  // Filtering Logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        (order.orderNo?.toLowerCase() ?? '').includes(searchTerm.toLowerCase()) ||
        (order.customerName?.toLowerCase() ?? '').includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || order.status.toLowerCase() === statusFilter.toLowerCase()

      return matchesSearch && matchesStatus
    })
  }, [orders, searchTerm, statusFilter])

  const { runConfirmedAction } = useConfirmedActionFlow()

  // Handlers
  const handleAddOrder = () => {
    runConfirmedAction({
      permission: 'action_trading_sales_order_manage',
      onAction: () => {
        setEditingOrder(null)
        setIsActionDialogOpen(true)
      }
    })
  }

  const handleEditOrder = (order: SalesOrder) => {
    runConfirmedAction({
      permission: 'action_trading_sales_order_manage',
      onAction: () => {
        setEditingOrder(order)
        setIsActionDialogOpen(true)
      }
    })
  }

  const handleDeleteOrder = (id: string) => {
    runConfirmedAction({
      permission: 'action_trading_sales_order_delete',
      confirmKey: 'common.actions.delete',
      onAction: () => deleteMutation.mutate(id)
    })
  }

  const handleOpenDetail = (id: string) => {
    setSelectedId(id)
    navigate({
      to: '/trading/sales-orders',
      search: (prev) => ({ ...prev, detailId: id }),
    })
  }

  if (isLoading) {
    return (
      <div className='flex h-[60vh] flex-col items-center justify-center space-y-4 animate-in fade-in duration-500'>
        <div className='relative'>
          <Loader2 className='size-10 text-primary animate-spin opacity-20' />
          <ShoppingCart className='size-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' />
        </div>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse'>
          {t('common.actions.loading')}
        </p>
      </div>
    )
  }

  if (isError) {
    if (isForbiddenError(error)) return <ForbiddenState />
    return (
      <div className='flex h-72 flex-col items-center justify-center rounded-[40px] border-2 border-dashed border-rose-300/50 bg-rose-50/40 px-6 text-center'>
        <AlertCircle className='mb-4 size-12 text-rose-400/40' />
        <p className='text-[10px] font-black uppercase tracking-[0.3em] text-rose-600'>
          {t('common.actions.retry')}
        </p>
      </div>
    )
  }

  return (
    <div className='flex h-[calc(100vh-220px)] gap-6 overflow-hidden animate-in fade-in duration-700'>
      {/* Master View (List) */}
      <div className={cn(
        'flex flex-col gap-6 transition-all duration-500',
        selectedId ? 'w-1/3' : 'w-full'
      )}>
        {/* Tools */}
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center justify-between px-1'>
          <div className='relative flex-1 max-w-md'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40' />
            <Input
              placeholder={t('tradingSalesOrder.linesEditor.selectDesktop')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-10 h-11 rounded-2xl border-none bg-muted/50 focus-visible:ring-1 focus-visible:ring-primary/20 text-[13px] font-medium shadow-inner'
            />
          </div>

          <div className='flex items-center gap-2'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='h-11 rounded-full px-4 font-black text-[10px] uppercase tracking-widest opacity-60'>
                  <Filter className='mr-2 size-4' />
                  {statusFilter === 'all' 
                    ? t('tradingSalesOrder.tabs.list') 
                    : t(`tradingSalesOrder.status.${toSalesOrderStatusKey(statusFilter as SalesOrderStatus)}`)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='rounded-[20px] p-2'>
                <DropdownMenuItem onClick={() => setStatusFilter('all')} className='text-[10px] font-black uppercase tracking-widest px-4 py-2'>
                  {t('tradingSalesOrder.tabs.list')}
                </DropdownMenuItem>
                {salesOrderStatuses.map((s) => (
                  <DropdownMenuItem 
                    key={s.value} 
                    onClick={() => setStatusFilter(s.value)}
                    className='text-[10px] font-black uppercase tracking-widest px-4 py-2'
                  >
                    {t(`tradingSalesOrder.status.${toSalesOrderStatusKey(s.value)}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleAddOrder}
              className='h-11 px-6 rounded-full bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/10'
            >
              <Plus className='mr-2 size-4' />
              {t('tradingSalesOrder.linesEditor.addLine')}
            </Button>
          </div>
        </div>

        {/* List Content */}
        <ScrollArea className='flex-1 border-2 border-dashed border-muted/50 rounded-[32px] bg-muted/5'>
          <div className='p-4 space-y-4'>
            <SalesOrderMaster
              orders={filteredOrders}
              selectedId={selectedId || undefined}
              onSelect={handleOpenDetail}
              onEdit={handleEditOrder}
              onDelete={handleDeleteOrder}
            />
          </div>
        </ScrollArea>

        {/* Pagination Panel */}
        {total > pageSize && (
          <div className='mt-2 flex items-center justify-center gap-4'>
            <Button
              variant='outline'
              size='icon'
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className='size-10 rounded-full'
            >
              <ChevronLeft className='size-4' />
            </Button>
            <span className='font-mono text-[10px] font-black'>
              {page} / {Math.ceil(total / pageSize)}
            </span>
            <Button
              variant='outline'
              size='icon'
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className='size-10 rounded-full'
            >
              <ChevronRight className='size-4' />
            </Button>
          </div>
        )}
      </div>

      {/* Detail View (Right Panel) */}
      {selectedId && (
        <div className='relative flex flex-1 flex-col rounded-[40px] border-2 border-dashed border-primary/20 bg-primary/2 shadow-2xl animate-in slide-in-from-right-8 duration-500'>
          <ScrollArea className='flex-1'>
            <div className='p-8'>
              <SalesOrderDetail
                order={orders.find((o) => o.id === selectedId)}
                onDelete={(id) => {
                  setSelectedId(null)
                  handleDeleteOrder(id)
                }}
              />
            </div>
          </ScrollArea>
          
          <Button
            variant='ghost'
            size='icon'
            className='absolute top-6 right-6 rounded-full hover:bg-primary/10'
            onClick={() => {
              setSelectedId(null)
              navigate({
                to: '/trading/sales-orders',
                search: (prev) => ({ ...prev, detailId: undefined }),
              })
            }}
          >
            <AlertCircle className='size-5 rotate-45 opacity-40' />
          </Button>
        </div>
      )}

      <SalesOrderActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        order={editingOrder}
      />
    </div>
  )
}
