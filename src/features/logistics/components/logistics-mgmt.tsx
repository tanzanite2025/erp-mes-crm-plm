import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Route } from '@/routes/_authenticated/shipping-management/logistics'
import {
  Hash,
  History,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import {
  getCarrierLabelKey,
  logisticsStatuses,
  type LogisticsRecord,
} from '../data/schema'
import {
  useGetControlledTrackingDetail,
  useGetLogistics,
  useGetLogisticsDetail,
  useLogisticsMutations,
} from '../hooks/use-logistics'
import { LogisticsActionDialog } from './logistics-action-dialog'
import { LogisticsTimeline } from './logistics-timeline'

export function LogisticsMgmt() {
  const { locale, t } = useLanguage()
  const { bindOrderNo, bindShipmentId } = Route.useSearch()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const { data, error, isLoading } = useGetLogistics(page, pageSize)
  const records = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total || 0
  const { refreshTrackingMutation, updateStatusMutation } =
    useLogisticsMutations()
  const [searchTerm, setSearchTerm] = useState('')
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<LogisticsRecord | null>(
    null
  )
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [initialBindInfo, setInitialBindInfo] = useState<{
    orderNo?: string
    shipmentId?: string
  } | null>(null)

  const { data: detailedRecord, isLoading: isDetailLoading } =
    useGetLogisticsDetail(selectedRecord?.id || undefined)
  const displayRecord = detailedRecord || selectedRecord
  const selectedTrackingNo =
    selectedRecord?.trackingNo || detailedRecord?.trackingNo
  const {
    data: controlledTrackingDetail,
    isLoading: isControlledTrackingLoading,
  } = useGetControlledTrackingDetail(selectedTrackingNo, isDetailOpen)
  const displayEvents = controlledTrackingDetail?.events.length
    ? controlledTrackingDetail.events
    : displayRecord?.events || []
  const displayCarrier =
    controlledTrackingDetail?.order.carrierName ||
    controlledTrackingDetail?.order.carrierCode ||
    displayRecord?.carrier ||
    ''
  const displayCarrierLabelKey = getCarrierLabelKey(displayCarrier)
  const latestRefresh = controlledTrackingDetail?.refresh
  const isShowingTrustedTracking = Boolean(controlledTrackingDetail)
  const isSheetLoading =
    isDetailLoading ||
    (isDetailOpen && Boolean(selectedTrackingNo) && isControlledTrackingLoading)

  const handleRefreshTracking = async () => {
    if (!selectedTrackingNo) {
      return
    }

    const detail = await refreshTrackingMutation.mutateAsync(selectedTrackingNo)
    if (!detail) {
      toast.warning(t('trading.logistics.toasts.trackingRefreshUnavailable'))
      return
    }

    const refresh = detail.refresh
    if (!refresh) {
      toast.success(t('trading.logistics.toasts.trackingRefreshSuccess'))
      return
    }

    const description = refresh.action || refresh.message || undefined
    switch (refresh.status) {
      case 'refreshed':
        toast.success(t('trading.logistics.toasts.trackingRefreshSuccess'), {
          description,
        })
        return
      case 'manual_review':
        toast.warning(
          t('trading.logistics.toasts.trackingRefreshManualReview'),
          {
            description,
          }
        )
        return
      case 'invalid_config':
        toast.warning(
          t('trading.logistics.toasts.trackingRefreshInvalidConfig'),
          {
            description,
          }
        )
        return
      default:
        toast.error(
          t('trading.logistics.toasts.trackingRefreshFailed', {
            message: description ?? refresh.status,
          })
        )
    }
  }

  useEffect(() => {
    if (!bindOrderNo) return

    const timer = globalThis.setTimeout(() => {
      setInitialBindInfo({ orderNo: bindOrderNo, shipmentId: bindShipmentId })
      setIsActionDialogOpen(true)
      void router.navigate({
        to: '/shipping-management/logistics',
        search: (prev) => ({
          ...prev,
          bindOrderNo: undefined,
          bindShipmentId: undefined,
        }),
        replace: true,
      })
    }, 0)

    return () => {
      globalThis.clearTimeout(timer)
    }
  }, [bindOrderNo, bindShipmentId, router])

  const filteredRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          record.orderNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.trackingNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.carrier.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [records, searchTerm]
  )

  const handleAdd = () => {
    setSelectedRecord(null)
    setInitialBindInfo(null)
    setIsActionDialogOpen(true)
  }

  const handleViewDetail = (record: LogisticsRecord) => {
    setSelectedRecord(record)
    setIsDetailOpen(true)
  }

  const handleQuickUpdate = (id: string) => {
    const description = prompt(
      t('trading.logistics.quickUpdatePrompt'),
      t('trading.logistics.quickUpdateDefault')
    )
    if (!description) return

    const targetRecord = records.find((record) => record.id === id)
    if (!targetRecord) return

    updateStatusMutation.mutate({
      id,
      status: 'InTransit',
      location: t('trading.logistics.quickUpdateLocation'),
      description,
      currentVersion: targetRecord.version,
      currentEvents: targetRecord.events,
    })
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  if (isLoading && records.length === 0) {
    return (
      <div className='flex flex-col gap-8'>
        <div className='h-32 animate-pulse rounded-[32px] bg-muted/30' />
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className='h-64 animate-pulse rounded-[32px] bg-muted/30'
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex items-center justify-between'>
          <div className='flex flex-col gap-0.5'>
            <h1 className='flex items-center gap-2 text-lg font-black tracking-tighter text-primary uppercase italic'>
              <Truck className='size-5' />
              {t('trading.logistics.pageTitle')}
            </h1>
            <p className='text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
              {t('trading.logistics.pageDescription')}
            </p>
          </div>
          <div className='flex items-center gap-3'>
            <AuditTimelineTriggerButton
              module={AUDIT_MODULES.logistics}
              targetName={t('trading.logistics.pageTitle')}
              label={t('common.audit.trigger')}
              className='h-11 rounded-full px-5'
            />
            <Button
              size='sm'
              className='h-11 gap-2 rounded-full bg-primary px-6 text-[10px] font-black tracking-widest uppercase shadow-lg shadow-primary/20'
              onClick={handleAdd}
            >
              <Plus className='h-4 w-4' />
              {t('trading.logistics.bindShipment')}
            </Button>
          </div>
        </div>
      </div>

      <div className='flex items-center justify-between gap-4 px-2'>
        <div className='relative w-full sm:w-96'>
          <Search className='absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground/30' />
          <Input
            placeholder={t('trading.logistics.searchPlaceholder')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className='h-12 rounded-2xl border-none bg-muted/50 pl-11 text-[11px] font-bold shadow-inner transition-all focus:bg-background'
          />
        </div>
        <div className='hidden items-center gap-2 sm:flex'>
          <div className='flex flex-col items-end rounded-xl border border-dashed border-muted/50 bg-muted/20 px-4 py-2'>
            <span className='text-[8px] font-black tracking-widest text-muted-foreground/40 uppercase'>
              {t('trading.logistics.activeFlows')}
            </span>
            <p className='text-[12px] font-black tabular-nums'>{total}</p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
        {filteredRecords.map((record) => {
          const statusMeta = logisticsStatuses.find(
            (status) => status.value === record.status
          )
          const carrierLabelKey = getCarrierLabelKey(record.carrier)

          return (
            <Card
              key={record.id}
              className='group relative overflow-hidden rounded-[32px] border-none bg-background/60 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-500 hover:bg-white hover:shadow-2xl'
            >
              <div className='absolute top-6 right-6 z-10 flex flex-col items-end gap-1.5'>
                <Badge
                  className={cn(
                    'rounded-lg border-none text-[9px] font-black tracking-tighter uppercase',
                    statusMeta?.color
                  )}
                >
                  {statusMeta ? t(statusMeta.labelKey) : record.status}
                </Badge>
                <span className='text-[8px] font-black tracking-widest uppercase tabular-nums opacity-20'>
                  {record.type === 'Shipment'
                    ? t('trading.logistics.typeOutbound')
                    : t('trading.logistics.typeInbound')}
                </span>
              </div>

              <div className='space-y-4 pt-2'>
                <div className='space-y-1'>
                  <p className='text-[8px] leading-none font-black tracking-widest text-muted-foreground/40 uppercase'>
                    {t('trading.logistics.reference')}
                  </p>
                  <p className='text-[16px] font-black tracking-tighter text-secondary italic'>
                    {record.orderNo}
                  </p>
                </div>

                <div className='flex items-center gap-4 rounded-2xl border border-dashed border-muted-foreground/10 bg-muted/20 p-4 transition-colors group-hover:border-primary/20 group-hover:bg-primary/5'>
                  <div className='flex size-10 items-center justify-center rounded-xl bg-white shadow-sm'>
                    <Package className='size-5 text-primary/60' />
                  </div>
                  <div className='flex-1 overflow-hidden'>
                    <p className='truncate text-[10px] font-black text-secondary uppercase'>
                      {carrierLabelKey ? t(carrierLabelKey) : record.carrier}
                    </p>
                    <p className='truncate font-mono text-[13px] font-bold tracking-tight text-muted-foreground'>
                      {record.trackingNo}
                    </p>
                  </div>
                </div>

                <div className='flex items-center justify-between pt-2'>
                  <div className='flex items-center gap-3'>
                    <div className='flex flex-col'>
                      <p className='mb-1 text-[8px] leading-none font-black tracking-widest text-muted-foreground/40 uppercase'>
                        {t('trading.logistics.lastLocation')}
                      </p>
                      <div className='flex items-center gap-1.5'>
                        <MapPin className='size-3 text-primary' />
                        <p className='max-w-[140px] truncate text-[11px] font-bold'>
                          {record.lastLocation ||
                            t('trading.logistics.pendingLocation')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-1'>
                    <AuditTimelineTriggerButton
                      module={AUDIT_MODULES.logistics}
                      targetId={record.id}
                      targetName={record.trackingNo || record.orderNo}
                      iconOnly
                      className='size-9 rounded-xl border-dashed hover:bg-primary/10 hover:text-primary'
                    />
                    <Button
                      size='icon'
                      variant='ghost'
                      onClick={() => handleViewDetail(record)}
                      className='size-9 rounded-xl transition-all hover:bg-primary/10 hover:text-primary active:scale-95'
                    >
                      <History className='size-4' />
                    </Button>
                    <Button
                      size='icon'
                      variant='ghost'
                      onClick={() => handleQuickUpdate(record.id)}
                      className='size-9 rounded-xl transition-all hover:bg-blue-500/10 hover:text-blue-500 active:scale-95'
                    >
                      <MapPin className='size-4' />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}

        {filteredRecords.length === 0 && (
          <div className='col-span-full flex flex-col items-center justify-center space-y-4 rounded-[40px] border-2 border-dashed border-muted/20 bg-muted/5 py-32'>
            <div className='animate-spin-slow flex size-20 items-center justify-center rounded-full border-4 border-dashed border-muted/20'>
              <Truck className='size-8 text-muted/20' />
            </div>
            <p className='text-[11px] font-black tracking-[0.3em] text-muted-foreground uppercase italic opacity-40'>
              {t('trading.logistics.empty')}
            </p>
          </div>
        )}
      </div>

      {total > pageSize && (
        <div className='flex items-center justify-center gap-6 border-t border-dashed py-6'>
          <Button
            variant='ghost'
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
            className='h-10 rounded-xl px-6 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-white hover:shadow-md'
          >
            {t('trading.logistics.pagination.prev')}
          </Button>
          <div className='flex items-center gap-4 rounded-full bg-muted/30 px-6 py-2'>
            <span className='text-[10px] font-black text-muted-foreground/40 tabular-nums'>
              {t('trading.logistics.pagination.page', {
                page,
                totalPages: Math.ceil(total / pageSize),
              })}
            </span>
          </div>
          <Button
            variant='ghost'
            disabled={page >= Math.ceil(total / pageSize)}
            onClick={() => setPage((value) => value + 1)}
            className='h-10 rounded-xl px-6 text-[10px] font-black tracking-widest uppercase transition-all hover:bg-white hover:shadow-md'
          >
            {t('trading.logistics.pagination.next')}
          </Button>
        </div>
      )}

      <LogisticsActionDialog
        open={isActionDialogOpen}
        onOpenChange={setIsActionDialogOpen}
        record={selectedRecord}
        defaultOrderNo={initialBindInfo?.orderNo}
        defaultShipmentId={initialBindInfo?.shipmentId}
      />

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent
          side='right'
          className='flex w-full flex-col overflow-hidden rounded-l-[40px] border-l-0 bg-background p-0 shadow-2xl sm:max-w-md'
        >
          <SheetHeader className='relative overflow-hidden border-b border-dashed bg-muted/5 px-8 py-12'>
            <div className='absolute -top-10 -right-10 size-40 rounded-full bg-primary/5 blur-3xl' />

            <div className='relative z-10'>
              <SheetTitle className='mb-4 text-[10px] font-black tracking-[0.4em] text-muted-foreground uppercase'>
                {t('trading.logistics.detailTitle')}
              </SheetTitle>
              {isSheetLoading ? (
                <div className='flex animate-pulse items-center gap-3'>
                  <Loader2 className='size-5 animate-spin text-primary' />
                  <span className='text-xs font-bold text-primary'>
                    {t('trading.logistics.syncing')}
                  </span>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-3xl font-black tracking-tighter text-secondary italic'>
                      {displayRecord?.trackingNo}
                    </h2>
                    <Badge className='rounded-lg border-none bg-primary text-[10px] font-black text-white uppercase'>
                      {displayCarrier
                        ? displayCarrierLabelKey
                          ? t(displayCarrierLabelKey)
                          : displayCarrier
                        : ''}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-4 text-[10px] font-black tracking-widest text-muted-foreground uppercase'>
                    <span className='flex items-center gap-1.5'>
                      <Hash className='size-3 text-primary' />
                      {displayRecord?.orderNo}
                    </span>
                    <span className='flex items-center gap-1.5'>
                      <Phone className='size-3 text-primary' />
                      {displayRecord?.contactPhone ||
                        t('trading.logistics.notAvailable')}
                    </span>
                  </div>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <Badge
                        variant='outline'
                        className='rounded-full border-dashed bg-white font-mono text-[8px]'
                      >
                        {isShowingTrustedTracking
                          ? t('trading.logistics.detailSourceTrusted')
                          : t('trading.logistics.detailSourceLocal')}
                      </Badge>
                      {latestRefresh?.checkedAt ? (
                        <span className='font-mono text-[8px] text-muted-foreground/60'>
                          {t('trading.logistics.detailRefreshCheckedAt')}:{' '}
                          {new Date(latestRefresh.checkedAt).toLocaleString(
                            locale
                          )}
                        </span>
                      ) : null}
                    </div>
                    <div className='flex flex-wrap items-center justify-end gap-2'>
                      {displayRecord ? (
                        <AuditTimelineTriggerButton
                          module={AUDIT_MODULES.logistics}
                          targetId={displayRecord.id}
                          targetName={
                            displayRecord.trackingNo || displayRecord.orderNo
                          }
                          label={t('common.audit.trigger')}
                          className='h-9 rounded-full px-4 text-[10px]'
                        />
                      ) : null}
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => void handleRefreshTracking()}
                        disabled={
                          !selectedTrackingNo ||
                          refreshTrackingMutation.isPending
                        }
                        className='h-9 rounded-full border-dashed px-4 text-[10px] font-black tracking-widest uppercase'
                      >
                        {refreshTrackingMutation.isPending ? (
                          <Loader2 className='me-2 size-3.5 animate-spin' />
                        ) : (
                          <RefreshCw className='me-2 size-3.5' />
                        )}
                        {refreshTrackingMutation.isPending
                          ? t('trading.logistics.detailRefreshing')
                          : t('trading.logistics.detailRefresh')}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SheetHeader>
          <div className='custom-scrollbar flex-1 overflow-y-auto px-8 py-10'>
            {isSheetLoading ? (
              <div className='flex h-full items-center justify-center opacity-20'>
                <Loader2 className='size-12 animate-spin' />
              </div>
            ) : (
              <>
                {latestRefresh ? (
                  <div className='mb-6 rounded-[24px] border border-dashed border-primary/20 bg-primary/5 p-4'>
                    <div className='flex flex-wrap items-center justify-between gap-3'>
                      <div className='flex items-center gap-2'>
                        <Badge
                          variant='outline'
                          className='rounded-full border-dashed bg-white font-mono text-[8px]'
                        >
                          {latestRefresh.providerCode ||
                            t('trading.logistics.detailSourceTrusted')}
                        </Badge>
                        <span className='font-mono text-[8px] text-muted-foreground/60 uppercase'>
                          {latestRefresh.status ||
                            t('trading.logistics.notAvailable')}
                        </span>
                      </div>
                      {latestRefresh.checkedAt ? (
                        <span className='font-mono text-[8px] text-muted-foreground/60'>
                          {new Date(latestRefresh.checkedAt).toLocaleString(
                            locale
                          )}
                        </span>
                      ) : null}
                    </div>
                    <p className='mt-3 text-[10px] font-black tracking-widest text-secondary/80 uppercase'>
                      {latestRefresh.action ||
                        latestRefresh.message ||
                        t('trading.logistics.notAvailable')}
                    </p>
                  </div>
                ) : !isShowingTrustedTracking && selectedTrackingNo ? (
                  <div className='mb-6 rounded-[24px] border border-dashed border-amber-500/20 bg-amber-500/5 p-4'>
                    <p className='text-[10px] font-black tracking-widest text-amber-700/80 uppercase'>
                      {t('trading.logistics.detailFallback')}
                    </p>
                  </div>
                ) : null}
                <LogisticsTimeline events={displayEvents} />
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
