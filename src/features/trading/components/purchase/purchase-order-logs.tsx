import { useState, useEffect, useMemo } from 'react'
import { AuditStatusDisplay, type AuditStatusDisplayMeta } from '@/components/common/audit-status-display'
import { AuditTimelineTriggerButton } from '@/components/common/audit-timeline-trigger-button'
import { ForbiddenState } from '@/components/forbidden-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  History,
  Trash2,
  TrendingUp,
  DollarSign,
  Box,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { isForbiddenError } from '@/lib/error-status'
import { getDeletedPurchaseOrders } from '../../purchase'
import { type PurchaseOrderListItem } from '../../data/schema'

interface PurchaseLogTagMeta {
  label: string
  className: string
}

function getDeletedOrderStatusMeta(locale: string): AuditStatusDisplayMeta {
  return {
    label: locale === 'zh-CN' ? '已归档删除' : 'Archived Delete',
    className: 'bg-rose-50 text-rose-600 border-rose-200',
    dotClassName: 'bg-rose-500',
  }
}

function getPurchaseLogTagMeta(locale: string, kind: 'archive' | 'risk' | 'metric' | 'health'): PurchaseLogTagMeta {
  switch (kind) {
    case 'archive':
      return {
        label: locale === 'zh-CN' ? '归档标签' : 'Archive Tag',
        className: 'bg-rose-500/10 text-rose-600 border border-rose-200',
      }
    case 'risk':
      return {
        label: locale === 'zh-CN' ? '风险提示' : 'Risk Tag',
        className: 'bg-amber-500/10 text-amber-600 border border-amber-200',
      }
    case 'metric':
      return {
        label: locale === 'zh-CN' ? '指标标签' : 'Metric Tag',
        className: 'bg-blue-500/10 text-blue-600 border border-blue-200',
      }
    case 'health':
      return {
        label: locale === 'zh-CN' ? '健康提示' : 'Health Tag',
        className: 'bg-emerald-500/10 text-emerald-600 border border-emerald-200',
      }
  }
}

function PurchaseLogTag({ meta }: { meta: PurchaseLogTagMeta }) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest ${meta.className}`}>
      {meta.label}
    </span>
  )
}

export function PurchaseOrderLogs() {
  const { t, locale } = useLanguage()
  const [orders, setOrders] = useState<PurchaseOrderListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setIsLoading(true)
        setError(null)
        // [ARCHITECTURAL-DEBT]: 目前后端 getDeletedPurchaseOrders 返回的分页数据中缺少全量总计金额
        // 暂时在前端进行分页内统计，但建议后续由后端在元数据中提供。
        const response = await getDeletedPurchaseOrders(1, 100)
        
        if (!response || !Array.isArray(response.items)) {
          throw new Error('[CRITICAL] PurchaseOrderLogs: Invalid response format or items missing');
        }

        setOrders(response.items)
      } catch (loadError) {
        setError(loadError)
        toast.error(t('purchase.logs.loadFailed'))
      } finally {
        setIsLoading(false)
      }
    }

    void loadLogs()
  }, [t])

  /**
   * [UI-ONLY-AGGREGATION] 仅针对当前已加载的分页数据进行汇总。
   * 注意：这不代表全量删除订单的总金额，极致实时性请通过后端聚合接口获取。
   */
  const totalAmount = useMemo(() => {
    return orders.reduce((sum, order) => sum + (Number(order.amount) || 0), 0)
  }, [orders])

  if (isLoading) {
    return (
      <div className='flex h-[60vh] flex-col items-center justify-center space-y-4 animate-in fade-in duration-500'>
        <div className='relative'>
          <History className='size-10 text-primary animate-pulse opacity-20' />
        </div>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground animate-pulse'>
          {t('purchase.logs.deletionArchive')}
        </p>
      </div>
    )
  }

  if (isForbiddenError(error)) {
    return <ForbiddenState />
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-4'>
        <Card className='relative overflow-hidden rounded-[24px] border-none bg-rose-500/5 py-2.5 shadow-sm group'>
          <div className='absolute top-0 right-0 p-2.5 opacity-10 transition-transform group-hover:scale-110'>
            <Trash2 className='size-8' />
          </div>
          <CardContent className='relative z-10 px-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-rose-600/60'>
                {t('purchase.logs.canceledOrders')}
              </p>
              <p className='shrink-0 text-xl font-black italic leading-none tracking-tighter text-rose-600'>
                {orders.length}
              </p>
              <PurchaseLogTag meta={getPurchaseLogTagMeta(locale, 'archive')} />
            </div>
          </CardContent>
        </Card>

        <Card className='relative overflow-hidden rounded-[24px] border-none bg-amber-500/5 py-2.5 shadow-sm group'>
          <div className='absolute top-0 right-0 p-2.5 opacity-10 transition-transform group-hover:scale-110'>
            <DollarSign className='size-8' />
          </div>
          <CardContent className='relative z-10 px-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-amber-600/60'>
                {t('purchase.logs.voidedValue')}
              </p>
              <p className='shrink-0 text-xl font-black italic leading-none tracking-tighter text-amber-600'>
                {totalAmount.toLocaleString()}
              </p>
              <PurchaseLogTag meta={getPurchaseLogTagMeta(locale, 'risk')} />
            </div>
          </CardContent>
        </Card>

        <Card className='relative overflow-hidden rounded-[24px] border-none bg-blue-500/5 py-2.5 shadow-sm group'>
          <div className='absolute top-0 right-0 p-2.5 opacity-10 transition-transform group-hover:scale-110'>
            <History className='size-8' />
          </div>
          <CardContent className='relative z-10 px-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-blue-600/60'>
                {t('purchase.logs.auditFrequency')}
              </p>
              <p className='shrink-0 text-xl font-black italic leading-none tracking-tighter text-blue-600'>
                {t('purchase.logs.daily')}
              </p>
              <PurchaseLogTag meta={getPurchaseLogTagMeta(locale, 'metric')} />
            </div>
          </CardContent>
        </Card>

        <Card className='relative overflow-hidden rounded-[24px] border-none bg-emerald-500/5 py-2.5 shadow-sm group'>
          <div className='absolute top-0 right-0 p-2.5 opacity-10 transition-transform group-hover:scale-110'>
            <TrendingUp className='size-8' />
          </div>
          <CardContent className='relative z-10 px-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-emerald-600/60'>
                {t('purchase.logs.healthStatus')}
              </p>
              <p className='shrink-0 text-xl font-black italic leading-none tracking-tighter text-emerald-600'>
                98.2%
              </p>
              <PurchaseLogTag meta={getPurchaseLogTagMeta(locale, 'health')} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 gap-6'>
        <Card className='flex h-[360px] min-h-0 flex-col gap-2 rounded-[28px] border-dashed border-muted-foreground/20 bg-muted/5 py-3 shadow-none'>
          <CardHeader className='flex flex-row items-center justify-between px-5 pb-1'>
            <div>
              <CardTitle className='text-sm font-black italic uppercase tracking-tighter flex items-center gap-2'>
                <History className='size-4 text-rose-500' /> {t('purchase.logs.deletionArchive')}
              </CardTitle>
              <CardDescription className='text-[10px] font-bold uppercase tracking-widest opacity-60'>
                {t('purchase.logs.deletionArchiveDesc')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className='min-h-0 flex-1 px-5'>
            <ScrollArea className='h-full pr-3'>
              {orders.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-12 opacity-20'>
                  <Box className='mb-3 size-10' />
                  <p className='text-xs font-black uppercase tracking-widest'>{t('purchase.logs.empty')}</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className='group rounded-[20px] border border-transparent bg-background p-4 shadow-sm transition-all hover:border-rose-500/20'
                    >
                      <div className='mb-3 flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <div className='flex size-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600'>
                            <Trash2 className='size-4' />
                          </div>
                          <div>
                            <p className='text-sm font-black uppercase tracking-tight'>{order.orderNo}</p>
                            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60'>
                              {order.supplierName}
                            </p>
                          </div>
                        </div>
                        <div className='flex items-center gap-2'>
                          <AuditTimelineTriggerButton
                            module={AUDIT_MODULES.purchaseOrder}
                            targetId={order.id}
                            targetName={order.orderNo}
                            iconOnly
                            className='size-8 rounded-full border-dashed'
                          />
                          <AuditStatusDisplay meta={getDeletedOrderStatusMeta(locale)} badgeClassName='px-4 py-1' />
                        </div>
                      </div>
                      <div className='grid grid-cols-3 gap-3'>
                        <div>
                          <p className='mb-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-40'>
                            {t('purchase.logs.value')}
                          </p>
                          <p className='text-xs font-black tabular-nums'>
                            {order.amount.toLocaleString()} {order.currency}
                          </p>
                        </div>
                        <div>
                          <p className='mb-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-40'>
                            {t('purchase.logs.purchaser')}
                          </p>
                          <p className='text-xs font-black uppercase'>{order.purchaser}</p>
                        </div>
                        <div>
                          <p className='mb-0.5 text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-40'>
                            {t('purchase.logs.lastUpdate')}
                          </p>
                          <p className='text-xs font-black tabular-nums opacity-60'>
                            {new Date(order.updatedAt || '').toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
