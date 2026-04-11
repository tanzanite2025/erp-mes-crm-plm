import { useEffect, useMemo, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  Hash,
  History,
  Loader2,
  MapPin,
  Package,
  Phone,
  Plus,
  Search,
  Truck,
} from 'lucide-react'
import { ForbiddenState } from '@/components/forbidden-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { cn } from '@/lib/utils'
import { Route } from '@/routes/_authenticated/trading/logistics'
import { getCarrierLabelKey, logisticsStatuses, type LogisticsRecord } from '../data/schema'
import { useGetLogistics, useGetLogisticsDetail, useLogisticsMutations } from '../hooks/use-logistics'
import { LogisticsActionDialog } from './logistics-action-dialog'
import { LogisticsTimeline } from './logistics-timeline'

export function LogisticsMgmt() {
  const { t } = useLanguage()
  const { bindOrderNo, bindShipmentId } = Route.useSearch()
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const { data, error, isLoading } = useGetLogistics(page, pageSize)
  const records = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total || 0
  const { updateStatusMutation } = useLogisticsMutations()
  const [searchTerm, setSearchTerm] = useState('')
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<LogisticsRecord | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [initialBindInfo, setInitialBindInfo] = useState<{ orderNo?: string; shipmentId?: string } | null>(null)

  const { data: detailedRecord, isLoading: isDetailLoading } = useGetLogisticsDetail(
    selectedRecord?.id || undefined
  )
  const displayRecord = detailedRecord || selectedRecord

  useEffect(() => {
    if (!bindOrderNo) return

    const timer = globalThis.setTimeout(() => {
      setInitialBindInfo({ orderNo: bindOrderNo, shipmentId: bindShipmentId })
      setIsActionDialogOpen(true)
      void router.navigate({
        to: '/trading/logistics',
        search: (prev) => ({ ...prev, bindOrderNo: undefined, bindShipmentId: undefined }),
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
        <div className='h-32 rounded-[32px] bg-muted/30 animate-pulse' />
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {[1, 2, 3].map((index) => (
            <div key={index} className='h-64 rounded-[32px] bg-muted/30 animate-pulse' />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='flex flex-col gap-1 bg-muted/5 p-6 rounded-[32px] border border-dashed border-muted/50'>
        <div className='flex items-center justify-between'>
          <div className='flex flex-col gap-0.5'>
            <h1 className='text-lg font-black tracking-tighter italic uppercase flex items-center gap-2 text-primary'>
              <Truck className='size-5' />
              {t('trading.logistics.pageTitle')}
            </h1>
            <p className='text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-60'>
              {t('trading.logistics.pageDescription')}
            </p>
          </div>
          <Button
            size='sm'
            className='h-11 px-6 rounded-full shadow-lg shadow-primary/20 bg-primary font-black text-[10px] uppercase tracking-widest gap-2'
            onClick={handleAdd}
          >
            <Plus className='h-4 w-4' />
            {t('trading.logistics.bindShipment')}
          </Button>
        </div>
      </div>

      <div className='flex items-center justify-between gap-4 px-2'>
        <div className='relative w-full sm:w-96'>
          <Search className='absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/30' />
          <Input
            placeholder={t('trading.logistics.searchPlaceholder')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className='pl-11 h-12 text-[11px] font-bold rounded-2xl border-none bg-muted/50 focus:bg-background shadow-inner transition-all'
          />
        </div>
        <div className='hidden sm:flex items-center gap-2'>
          <div className='px-4 py-2 rounded-xl bg-muted/20 border border-dashed border-muted/50 flex flex-col items-end'>
            <span className='text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest'>
              {t('trading.logistics.activeFlows')}
            </span>
            <p className='text-[12px] font-black tabular-nums'>{total}</p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredRecords.map((record) => {
          const statusMeta = logisticsStatuses.find((status) => status.value === record.status)
          const carrierLabelKey = getCarrierLabelKey(record.carrier)

          return (
            <Card
              key={record.id}
              className='group relative p-6 rounded-[32px] border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 hover:shadow-2xl hover:bg-white transition-all duration-500 overflow-hidden'
            >
              <div className='absolute top-6 right-6 flex flex-col items-end gap-1.5 z-10'>
                <Badge
                  className={cn(
                    'rounded-lg font-black text-[9px] uppercase tracking-tighter border-none',
                    statusMeta?.color
                  )}
                >
                  {statusMeta ? t(statusMeta.labelKey) : record.status}
                </Badge>
                <span className='text-[8px] font-black tabular-nums opacity-20 uppercase tracking-widest'>
                  {record.type === 'Shipment'
                    ? t('trading.logistics.typeOutbound')
                    : t('trading.logistics.typeInbound')}
                </span>
              </div>

              <div className='space-y-4 pt-2'>
                <div className='space-y-1'>
                  <p className='text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest leading-none'>
                    {t('trading.logistics.reference')}
                  </p>
                  <p className='text-[16px] font-black text-secondary tracking-tighter italic'>
                    {record.orderNo}
                  </p>
                </div>

                <div className='flex items-center gap-4 bg-muted/20 p-4 rounded-2xl border border-dashed border-muted-foreground/10 group-hover:bg-primary/5 group-hover:border-primary/20 transition-colors'>
                  <div className='size-10 rounded-xl bg-white flex items-center justify-center shadow-sm'>
                    <Package className='size-5 text-primary/60' />
                  </div>
                  <div className='flex-1 overflow-hidden'>
                    <p className='text-[10px] font-black uppercase text-secondary truncate'>
                      {carrierLabelKey ? t(carrierLabelKey) : record.carrier}
                    </p>
                    <p className='text-[13px] font-bold text-muted-foreground font-mono truncate tracking-tight'>
                      {record.trackingNo}
                    </p>
                  </div>
                </div>

                <div className='flex items-center justify-between pt-2'>
                  <div className='flex items-center gap-3'>
                    <div className='flex flex-col'>
                      <p className='text-[8px] font-black text-muted-foreground/40 leading-none mb-1 uppercase tracking-widest'>
                        {t('trading.logistics.lastLocation')}
                      </p>
                      <div className='flex items-center gap-1.5'>
                        <MapPin className='size-3 text-primary' />
                        <p className='text-[11px] font-bold truncate max-w-[140px]'>
                          {record.lastLocation || t('trading.logistics.pendingLocation')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Button
                      size='icon'
                      variant='ghost'
                      onClick={() => handleViewDetail(record)}
                      className='size-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-95'
                    >
                      <History className='size-4' />
                    </Button>
                    <Button
                      size='icon'
                      variant='ghost'
                      onClick={() => handleQuickUpdate(record.id)}
                      className='size-9 rounded-xl hover:bg-blue-500/10 hover:text-blue-500 transition-all active:scale-95'
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
          <div className='col-span-full py-32 flex flex-col items-center justify-center space-y-4 border-2 border-dashed border-muted/20 rounded-[40px] bg-muted/5'>
            <div className='size-20 rounded-full border-4 border-dashed border-muted/20 flex items-center justify-center animate-spin-slow'>
              <Truck className='size-8 text-muted/20' />
            </div>
            <p className='text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground italic opacity-40'>
              {t('trading.logistics.empty')}
            </p>
          </div>
        )}
      </div>

      {total > pageSize && (
        <div className='flex items-center justify-center gap-6 py-6 border-t border-dashed'>
          <Button
            variant='ghost'
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
            className='h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-md transition-all'
          >
            {t('trading.logistics.pagination.prev')}
          </Button>
          <div className='flex items-center gap-4 px-6 py-2 bg-muted/30 rounded-full'>
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
            className='h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:shadow-md transition-all'
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
          className='sm:max-w-md w-full p-0 flex flex-col border-l-0 shadow-2xl rounded-l-[40px] overflow-hidden bg-background'
        >
          <SheetHeader className='px-8 py-12 bg-muted/5 border-b border-dashed relative overflow-hidden'>
            <div className='absolute -right-10 -top-10 size-40 bg-primary/5 rounded-full blur-3xl' />

            <div className='relative z-10'>
              <SheetTitle className='text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-4'>
                {t('trading.logistics.detailTitle')}
              </SheetTitle>
              {isDetailLoading ? (
                <div className='flex items-center gap-3 animate-pulse'>
                  <Loader2 className='size-5 animate-spin text-primary' />
                  <span className='text-xs font-bold text-primary'>{t('trading.logistics.syncing')}</span>
                </div>
              ) : (
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-3xl font-black text-secondary tracking-tighter italic'>
                      {displayRecord?.trackingNo}
                    </h2>
                    <Badge className='font-black uppercase text-[10px] rounded-lg bg-primary text-white border-none'>
                      {displayRecord?.carrier
                        ? getCarrierLabelKey(displayRecord.carrier)
                          ? t(getCarrierLabelKey(displayRecord.carrier)!)
                          : displayRecord.carrier
                        : ''}
                    </Badge>
                  </div>
                  <div className='flex items-center gap-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest'>
                    <span className='flex items-center gap-1.5'>
                      <Hash className='size-3 text-primary' />
                      {displayRecord?.orderNo}
                    </span>
                    <span className='flex items-center gap-1.5'>
                      <Phone className='size-3 text-primary' />
                      {displayRecord?.contactPhone || t('trading.logistics.notAvailable')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </SheetHeader>
          <div className='flex-1 overflow-y-auto px-8 py-10 custom-scrollbar'>
            {isDetailLoading ? (
              <div className='h-full flex items-center justify-center opacity-20'>
                <Loader2 className='size-12 animate-spin' />
              </div>
            ) : (
              <LogisticsTimeline events={displayRecord?.events || []} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
