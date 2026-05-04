import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  type ColumnDef,
  flexRender,
} from '@tanstack/react-table'
import { Truck, Package, Search, ChevronRight, MapPin, Loader2, RefreshCw } from 'lucide-react'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { toast } from 'sonner'
import { ForbiddenState } from '@/components/forbidden-state'
import { useUdsClientTable } from '@/hooks/use-uds-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { PURCHASE_LOGISTICS_KEYS } from './query-keys'
import {
  PurchaseLogisticsService,
  type PurchaseLogisticsListResponse,
  type PurchaseLogisticsRecord,
} from './services/purchase-logistics-service'
import { PurchaseLogisticsTimeline } from './purchase-logistics-timeline'

function PurchaseLogisticsDetailSheet({ record }: { record: PurchaseLogisticsRecord }) {
  const { locale, t } = useLanguage()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const localEvents = React.useMemo(
    () => (Array.isArray(record.events) ? record.events : []),
    [record.events]
  )
  const { data: controlledTrackingDetail, isLoading: isControlledTrackingLoading } = useQuery({
    queryKey: PURCHASE_LOGISTICS_KEYS.tracking(record.trackingNo),
    queryFn: () => PurchaseLogisticsService.getControlledTrackingDetail(record.trackingNo),
    enabled: open && Boolean(record.trackingNo),
  })
  const refreshTrackingMutation = useMutation({
    mutationFn: async (trackingNo: string) => {
      const detail = await PurchaseLogisticsService.getControlledTrackingDetail(trackingNo, { refresh: true })
      if (detail) {
        queryClient.setQueryData(PURCHASE_LOGISTICS_KEYS.tracking(trackingNo), detail)
      }
      return detail
    },
    onError: (err: Error) => {
      toast.error(t('purchase.logistics.toasts.trackingRefreshFailed', { message: err.message }))
    },
  })

  const displayEvents = controlledTrackingDetail?.events.length ? controlledTrackingDetail.events : localEvents
  const displayCarrier =
    controlledTrackingDetail?.order.carrierName || controlledTrackingDetail?.order.carrierCode || record.carrier
  const latestRefresh = controlledTrackingDetail?.refresh
  const isShowingTrustedTracking = Boolean(controlledTrackingDetail)
  const isSheetLoading = open && Boolean(record.trackingNo) && isControlledTrackingLoading

  const handleRefreshTracking = async () => {
    if (!record.trackingNo) {
      return
    }

    const detail = await refreshTrackingMutation.mutateAsync(record.trackingNo)
    if (!detail) {
      toast.warning(t('purchase.logistics.toasts.trackingRefreshUnavailable'))
      return
    }

    const refresh = detail.refresh
    if (!refresh) {
      toast.success(t('purchase.logistics.toasts.trackingRefreshSuccess'))
      return
    }

    const description = refresh.action || refresh.message || undefined
    switch (refresh.status) {
      case 'refreshed':
        toast.success(t('purchase.logistics.toasts.trackingRefreshSuccess'), {
          description,
        })
        return
      case 'manual_review':
        toast.warning(t('purchase.logistics.toasts.trackingRefreshManualReview'), {
          description,
        })
        return
      case 'invalid_config':
        toast.warning(t('purchase.logistics.toasts.trackingRefreshInvalidConfig'), {
          description,
        })
        return
      default:
        toast.error(
          t('purchase.logistics.toasts.trackingRefreshFailed', {
            message: description ?? refresh.status,
          })
        )
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
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
                  {displayCarrier}
                </Badge>
                <span className='text-[10px] font-mono text-slate-400'>{record.trackingNo}</span>
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 mt-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='outline' className='rounded-full border-dashed bg-white text-[8px] font-mono'>
                {isShowingTrustedTracking
                  ? t('purchase.logistics.detailSourceTrusted')
                  : t('purchase.logistics.detailSourceLocal')}
              </Badge>
              {latestRefresh?.checkedAt ? (
                <span className='text-[8px] font-mono text-slate-400'>
                  {t('purchase.logistics.detailRefreshCheckedAt')}: {new Date(latestRefresh.checkedAt).toLocaleString(locale)}
                </span>
              ) : null}
            </div>

            <div className='flex flex-wrap items-center justify-end gap-2'>
              <AuditTimelineTriggerButton
                module={AUDIT_MODULES.logistics}
                targetId={record.id}
                targetName={record.trackingNo || record.orderNo}
                label={t('common.audit.trigger')}
                className='h-9 rounded-full px-4 text-[10px]'
              />
              <Button
                type='button'
                variant='outline'
                onClick={() => void handleRefreshTracking()}
                disabled={!record.trackingNo || refreshTrackingMutation.isPending}
                className='h-9 rounded-full border-dashed px-4 text-[10px] font-black uppercase tracking-widest'
              >
                {refreshTrackingMutation.isPending ? (
                  <Loader2 className='me-2 size-3.5 animate-spin' />
                ) : (
                  <RefreshCw className='me-2 size-3.5' />
                )}
                {refreshTrackingMutation.isPending
                  ? t('purchase.logistics.detailRefreshing')
                  : t('purchase.logistics.detailRefresh')}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className='flex-1 overflow-auto p-8'>
          {isSheetLoading ? (
            <div className='flex h-full items-center justify-center opacity-20'>
              <Loader2 className='size-12 animate-spin' />
            </div>
          ) : (
            <>
              {latestRefresh ? (
                <div className='mb-6 rounded-[24px] border border-dashed border-emerald-500/20 bg-emerald-500/5 p-4'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='rounded-full border-dashed bg-white text-[8px] font-mono'>
                        {latestRefresh.providerCode || t('purchase.logistics.detailSourceTrusted')}
                      </Badge>
                      <span className='text-[8px] font-mono uppercase text-slate-400'>
                        {latestRefresh.status || t('purchase.logistics.notAvailable')}
                      </span>
                    </div>
                    {latestRefresh.checkedAt ? (
                      <span className='text-[8px] font-mono text-slate-400'>
                        {new Date(latestRefresh.checkedAt).toLocaleString(locale)}
                      </span>
                    ) : null}
                  </div>
                  <p className='mt-3 text-[10px] font-black uppercase tracking-widest text-slate-700'>
                    {latestRefresh.action || latestRefresh.message || t('purchase.logistics.notAvailable')}
                  </p>
                </div>
              ) : !isShowingTrustedTracking && record.trackingNo ? (
                <div className='mb-6 rounded-[24px] border border-dashed border-amber-500/20 bg-amber-500/5 p-4'>
                  <p className='text-[10px] font-black uppercase tracking-widest text-amber-700/80'>
                    {t('purchase.logistics.detailFallback')}
                  </p>
                </div>
              ) : null}

              <PurchaseLogisticsTimeline events={displayEvents} />
            </>
          )}
        </div>

        <div className='p-4 border-t bg-slate-50 flex items-center justify-between'>
          <span className='text-[9px] font-mono text-slate-300 italic'>UUID: {record.id}</span>
          <span className='text-[9px] font-black uppercase tracking-widest text-slate-400'>
            {record.orderNo}
          </span>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function PurchaseLogisticsList() {
  const { t } = useLanguage()
  const [search, setSearch] = React.useState('')

  const { data, error, isLoading } = useQuery<PurchaseLogisticsListResponse>({
    queryKey: PURCHASE_LOGISTICS_KEYS.list(search),
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
        <div className='flex items-center justify-end gap-2'>
          <AuditTimelineTriggerButton
            module={AUDIT_MODULES.logistics}
            targetId={row.original.id}
            targetName={row.original.trackingNo || row.original.orderNo}
            iconOnly
            className='size-8 rounded-full border-dashed'
          />
          <PurchaseLogisticsDetailSheet record={row.original} />
        </div>
      ),
    },
  ]

  const table = useUdsClientTable({
    data: records,
    columns,
    enableSorting: false,
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
