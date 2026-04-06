import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  type ColumnDef,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  flexRender,
} from '@tanstack/react-table'
import { Truck, Package, Search, ChevronRight, MapPin, ExternalLink } from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { PurchaseLogisticsService, type PurchaseLogisticsRecord } from './services/purchase-logistics-service'
import { PurchaseLogisticsTimeline } from './purchase-logistics-timeline'

type PurchaseLogisticsListResponse = {
  items?: PurchaseLogisticsRecord[]
}

export function PurchaseLogisticsList() {
  const { t } = useLanguage()
  const [search, setSearch] = React.useState('')

  const { data, error, isLoading } = useQuery<PurchaseLogisticsListResponse>({
    queryKey: ['purchase-logistics-list', search],
    queryFn: () => PurchaseLogisticsService.getRecords({ page: 1, pageSize: 100 }),
  })

  const records = React.useMemo(() => data?.items ?? [], [data?.items])

  const columns: ColumnDef<PurchaseLogisticsRecord>[] = [
    {
      accessorKey: 'orderNo',
      header: t('purchase.logistics.columns.orderNo'),
      cell: ({ row }) => (
        <div className='flex items-center gap-2'>
          <Package className='size-3 text-slate-400' />
          <span className='font-mono text-xs font-black italic tracking-tighter text-blue-600'>
            {row.original.orderNo}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'purchaseOrder.supplierName',
      header: t('purchase.logistics.columns.supplier'),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span className='text-[10px] font-black uppercase italic tracking-widest text-slate-700'>
            {row.original.purchaseOrder?.supplierName || t('purchase.logistics.supplierFallback')}
          </span>
          <span className='text-[8px] font-mono text-slate-400 opacity-60'>
            {t('purchase.logistics.supplierHint')}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'carrier',
      header: t('purchase.logistics.columns.carrier'),
      cell: ({ row }) => (
        <span className='text-[10px] font-black uppercase italic tracking-widest text-slate-500'>
          {row.original.carrier}
        </span>
      ),
    },
    {
      accessorKey: 'trackingNo',
      header: t('purchase.logistics.columns.trackingNo'),
      cell: ({ row }) => (
        <span className='font-mono text-xs font-medium text-slate-900 group-hover:text-blue-600 transition-colors'>
          {row.original.trackingNo}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('purchase.logistics.columns.status'),
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge
            className={cn(
              'rounded-full px-2 py-0.5 text-[9px] font-black italic tracking-widest uppercase',
              status === 'Delivered'
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
                : status === 'Pending'
                  ? 'bg-amber-500/10 text-amber-600 border-amber-200'
                  : 'bg-blue-500/10 text-blue-600 border-blue-200'
            )}
          >
            {status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'lastLocation',
      header: t('purchase.logistics.columns.lastLocation'),
      cell: ({ row }) => (
        <div className='flex items-center gap-1.5 overflow-hidden'>
          <MapPin className='size-3 text-slate-400 shrink-0' />
          <span className='truncate text-[10px] font-black italic text-slate-500/70'>
            {row.original.lastLocation || t('purchase.logistics.noLocation')}
          </span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='size-7 rounded-full hover:bg-emerald-50 hover:text-emerald-600'
            >
              <ChevronRight className='size-4' />
            </Button>
          </SheetTrigger>
          <SheetContent side='right' className='w-[400px] sm:w-[500px] sm:max-w-full p-0 flex flex-col'>
            <SheetHeader className='p-6 bg-slate-50 border-b relative'>
              <div className='absolute top-0 right-0 p-4 opacity-5 pointer-events-none'>
                <Truck className='size-32' />
              </div>
              <div className='flex items-center gap-3 mb-2'>
                <div className='size-10 rounded-2xl bg-white border border-dashed border-slate-200 flex items-center justify-center shadow-sm'>
                  <Truck className='size-5 text-emerald-600' />
                </div>
                <div>
                  <SheetTitle className='text-sm font-black italic tracking-tighter uppercase'>
                    {t('purchase.logistics.detailTitle')}
                  </SheetTitle>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-[8px] font-mono border-dashed bg-white'>
                      {row.original.carrier}
                    </Badge>
                    <span className='text-[10px] font-mono text-slate-400'>
                      {row.original.trackingNo}
                    </span>
                  </div>
                </div>
              </div>
            </SheetHeader>

            <div className='flex-1 overflow-auto p-8'>
              <PurchaseLogisticsTimeline events={Array.isArray(row.original.events) ? row.original.events : []} />
            </div>

            <div className='p-4 border-t bg-slate-50 flex items-center justify-between'>
              <span className='text-[9px] font-mono text-slate-300 italic'>UUID: {row.original.id}</span>
              <div className='flex gap-2'>
                <Button variant='outline' size='sm' className='h-8 text-[10px] font-black uppercase rounded-full'>
                  <ExternalLink className='size-3 me-2' />
                  {t('purchase.logistics.courierQuery')}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ),
    },
  ]

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <Card className='border-none shadow-none bg-transparent animate-in fade-in duration-700'>
      <CardHeader className='px-0 pb-6 flex-row items-center justify-between'>
        <div className='space-y-1'>
          <CardTitle className='text-sm font-black italic tracking-tighter uppercase flex items-center gap-2'>
            <Truck className='size-4 text-emerald-600' />
            {t('purchase.logistics.trackingTitle')}
          </CardTitle>
          <p className='text-[9px] font-black uppercase tracking-widest text-slate-400'>
            {t('purchase.logistics.trackingDesc')}
          </p>
        </div>

        <div className='flex items-center gap-2'>
          <div className='relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 size-3 text-slate-400' />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('purchase.logistics.searchPlaceholder')}
              className='h-9 w-64 rounded-full pl-9 pr-4 text-[11px] font-black italic tracking-tight bg-white border-dashed border-slate-200'
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className='px-0'>
        <div className='rounded-[24px] border border-dashed border-slate-200 bg-white/50 overflow-hidden'>
          <table className='w-full'>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className='bg-slate-50/50 border-b border-dashed border-slate-200'>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className='h-10 px-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-400'
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className='h-12 animate-pulse border-b border-dashed border-slate-100 last:border-0'>
                    <td colSpan={columns.length} className='px-4 align-middle'>
                      <div className='h-4 bg-slate-100 rounded-full w-full opacity-50' />
                    </td>
                  </tr>
                ))
              ) : records.length === 0 ? (
                <tr className='h-64'>
                  <td colSpan={columns.length} className='text-center align-middle text-slate-300'>
                    <Package className='size-12 mx-auto mb-2 opacity-10' />
                    <span className='text-[10px] font-black italic uppercase tracking-widest'>
                      {t('purchase.logistics.empty')}
                    </span>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'group hover:bg-emerald-50/30 border-b border-dashed border-slate-100 last:border-0 transition-all h-14',
                      'animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both'
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className='px-4 align-middle'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
