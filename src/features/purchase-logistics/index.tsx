import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CloudOff, RefreshCw, Trash2, Truck } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import {
  getPurchaseLogisticsOfflineDraftsSnapshot,
  removePurchaseLogisticsOfflineDraft,
  subscribePurchaseLogisticsOfflineDrafts,
  syncPurchaseLogisticsOfflineDrafts,
} from './services/purchase-logistics-offline-draft-service'
import { PurchaseLogisticsDialog } from './purchase-logistics-dialog'
import { PurchaseLogisticsList } from './purchase-logistics-list'

export function PurchaseLogisticsPage() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()
  const drafts = React.useSyncExternalStore(
    subscribePurchaseLogisticsOfflineDrafts,
    getPurchaseLogisticsOfflineDraftsSnapshot,
    () => []
  )
  const [isOnline, setIsOnline] = React.useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )
  const [isSyncing, setIsSyncing] = React.useState(false)
  const isSyncingRef = React.useRef(false)
  const pendingDrafts = drafts.filter((draft) => draft.syncStatus === 'pending')
  const blockedDrafts = drafts.filter((draft) => draft.syncStatus === 'blocked')

  async function performSync(mode: 'auto' | 'manual') {
    if (isSyncingRef.current) return

    isSyncingRef.current = true
    setIsSyncing(true)

    try {
      const result = await syncPurchaseLogisticsOfflineDrafts()

      if (result.syncedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['purchase-logistics-list'] })
        toast.success(t('purchase.logistics.offlineSyncSuccess'), {
          description: t('purchase.logistics.offlineSyncSuccessDesc', { count: result.syncedCount }),
          icon: <Truck className='h-4 w-4' />,
        })
        return
      }

      if (mode === 'manual' && result.remainingCount > 0) {
        toast.error(t('purchase.logistics.offlineSyncPending'), {
          description: t('purchase.logistics.offlineSyncPendingDesc', {
            count: result.remainingCount,
          }),
        })
      }
    } finally {
      isSyncingRef.current = false
      setIsSyncing(false)
    }
  }

  React.useEffect(() => {
    const handleNetworkChange = () => {
      const nextOnline = navigator.onLine
      setIsOnline(nextOnline)

      if (nextOnline) {
        void performSync('auto')
      }
    }

    window.addEventListener('online', handleNetworkChange)
    window.addEventListener('offline', handleNetworkChange)

    return () => {
      window.removeEventListener('online', handleNetworkChange)
      window.removeEventListener('offline', handleNetworkChange)
    }
  }, [queryClient, t])

  // 【副作用解耦】仅在网络恢复或组件挂载时触发一次自动同步情况情况总量针对。情况总量情况情况情况情况。
  React.useEffect(() => {
    if (isOnline && drafts.length > 0) {
      void performSync('auto')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]) // 故意不监听 drafts.length，防止同步过程中的回流引发死循环

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Truck}
        title={t('purchase.logistics.title')}
        description={t('purchase.logistics.description')}
        statusBadge={}
      />

      <div className='space-y-6'>
        {drafts.length > 0 ? (
          <Card className='border-dashed border-amber-300 bg-amber-50/80 shadow-none'>
            <CardHeader className='flex-row items-start justify-between gap-4 space-y-0'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <CloudOff className='size-4 text-amber-700' />
                  <CardTitle className='text-sm font-black italic tracking-tighter uppercase text-amber-900'>
                    {t('purchase.logistics.offlineDraftsTitle')}
                  </CardTitle>
                  <Badge className='rounded-full border border-amber-200 bg-white text-amber-700'>
                    {drafts.length}
                  </Badge>
                </div>

                <p className='text-[10px] font-black uppercase tracking-widest text-amber-700/80'>
                  {t('purchase.logistics.offlineDraftsDesc')}
                </p>

                <div className='flex flex-wrap gap-2'>
                  <Badge variant='outline' className='border-amber-300 bg-white text-amber-700'>
                    {t('purchase.logistics.offlineDraftStatusPending')}: {pendingDrafts.length}
                  </Badge>
                  {blockedDrafts.length > 0 ? (
                    <Badge variant='outline' className='border-rose-300 bg-white text-rose-700'>
                      {t('purchase.logistics.offlineDraftStatusBlocked')}: {blockedDrafts.length}
                    </Badge>
                  ) : null}
                  {!isOnline ? (
                    <Badge variant='outline' className='border-slate-300 bg-white text-slate-500'>
                      {t('purchase.logistics.offlineNetworkStatus')}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <Button
                type='button'
                variant='outline'
                disabled={isSyncing || !isOnline || pendingDrafts.length === 0}
                onClick={() => void performSync('manual')}
                className='rounded-full border-amber-300 bg-white text-[10px] font-black uppercase tracking-widest text-amber-700 hover:bg-amber-100'
              >
                <RefreshCw className={`me-2 size-3 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing
                  ? t('purchase.logistics.offlineSyncing')
                  : t('purchase.logistics.offlineSyncNow')}
              </Button>
            </CardHeader>

            <CardContent className='space-y-3'>
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className='flex items-start justify-between gap-4 rounded-2xl border border-dashed border-amber-200 bg-white px-4 py-3'
                >
                  <div className='space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='font-mono text-xs font-black tracking-tight text-slate-900'>
                        {draft.trackingNo}
                      </span>
                      <Badge
                        variant='outline'
                        className={
                          draft.syncStatus === 'blocked'
                            ? 'border-rose-300 text-rose-700'
                            : 'border-emerald-300 text-emerald-700'
                        }
                      >
                        {draft.syncStatus === 'blocked'
                          ? t('purchase.logistics.offlineDraftStatusBlocked')
                          : t('purchase.logistics.offlineDraftStatusPending')}
                      </Badge>
                    </div>

                    <p className='text-[10px] font-black uppercase tracking-widest text-slate-500'>
                      {draft.orderNo || '--'} / {draft.carrier || '--'}
                    </p>

                    <p className='text-[10px] font-medium text-slate-500'>
                      {t('purchase.logistics.offlineSavedAt', { time: draft.updatedAt })}
                    </p>

                    {draft.lastError ? (
                      <p className='text-[10px] font-medium text-rose-600'>
                        {t('purchase.logistics.offlineLastError', { message: draft.lastError })}
                      </p>
                    ) : null}
                  </div>

                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    onClick={() => {
                      removePurchaseLogisticsOfflineDraft(draft.id)
                      toast.success(t('purchase.logistics.offlineDraftRemoved'))
                    }}
                    className='size-8 rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                  >
                    <Trash2 className='size-4' />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <PurchaseLogisticsList />
      </div>
    </div>
  )
}
