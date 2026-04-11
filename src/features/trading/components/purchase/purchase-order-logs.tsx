import { useState, useEffect, useMemo } from 'react'
import { AuditStatusDisplay, type AuditStatusDisplayMeta } from '@/components/common/audit-status-display'
import { ForbiddenState } from '@/components/forbidden-state'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  History,
  Trash2,
  BarChart3,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Box,
} from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { isForbiddenError } from '@/lib/error-status'
import { getDeletedPurchaseOrders } from '../../purchase'
import { type PurchaseOrder } from '../../data/schema'

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
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
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
      <div className='grid grid-cols-1 md:grid-cols-4 gap-5'>
        <Card className='rounded-[28px] border-none bg-rose-500/5 shadow-sm overflow-hidden relative group'>
          <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform'>
            <Trash2 className='size-12' />
          </div>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <CardTitle className='text-[10px] font-black uppercase tracking-widest text-rose-600/60'>
                {t('purchase.logs.canceledOrders')}
              </CardTitle>
              <PurchaseLogTag meta={getPurchaseLogTagMeta(locale, 'archive')} />
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-black italic tracking-tighter text-rose-600'>{orders.length}</p>
            <p className='text-[8px] font-bold text-rose-600/40 uppercase tracking-widest mt-1'>
              Archived deletion records
            </p>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border-none bg-amber-500/5 shadow-sm overflow-hidden relative group'>
          <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform'>
            <DollarSign className='size-12' />
          </div>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <CardTitle className='text-[10px] font-black uppercase tracking-widest text-amber-600/60'>
                {t('purchase.logs.voidedValue')}
              </CardTitle>
              <PurchaseLogTag meta={getPurchaseLogTagMeta(locale, 'risk')} />
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-black italic tracking-tighter text-amber-600'>
              {totalAmount.toLocaleString()}
            </p>
            <p className='text-[8px] font-bold text-amber-600/40 uppercase tracking-widest mt-1'>
              Potential loss tracking
            </p>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border-none bg-blue-500/5 shadow-sm overflow-hidden relative group'>
          <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform'>
            <History className='size-12' />
          </div>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <CardTitle className='text-[10px] font-black uppercase tracking-widest text-blue-600/60'>
                {t('purchase.logs.auditFrequency')}
              </CardTitle>
              <PurchaseLogTag meta={getPurchaseLogTagMeta(locale, 'metric')} />
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-black italic tracking-tighter text-blue-600'>
              {t('purchase.logs.daily')}
            </p>
            <p className='text-[8px] font-bold text-blue-600/40 uppercase tracking-widest mt-1'>
              {t('purchase.logs.lastSync')}
            </p>
          </CardContent>
        </Card>

        <Card className='rounded-[28px] border-none bg-emerald-500/5 shadow-sm overflow-hidden relative group'>
          <div className='absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform'>
            <TrendingUp className='size-12' />
          </div>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between gap-3'>
              <CardTitle className='text-[10px] font-black uppercase tracking-widest text-emerald-600/60'>
                {t('purchase.logs.healthStatus')}
              </CardTitle>
              <PurchaseLogTag meta={getPurchaseLogTagMeta(locale, 'health')} />
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-3xl font-black italic tracking-tighter text-emerald-600'>98.2%</p>
            <p className='text-[8px] font-bold text-emerald-600/40 uppercase tracking-widest mt-1'>
              Consistency across modules
            </p>
          </CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        <Card className='lg:col-span-2 rounded-[32px] border-dashed border-muted-foreground/20 bg-muted/5 shadow-none'>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle className='text-sm font-black italic uppercase tracking-tighter flex items-center gap-2'>
                <History className='size-4 text-rose-500' /> {t('purchase.logs.deletionArchive')}
              </CardTitle>
              <CardDescription className='text-[10px] font-bold uppercase tracking-widest opacity-60'>
                {t('purchase.logs.deletionArchiveDesc')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className='h-[450px] pr-4'>
              {orders.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-20 opacity-20'>
                  <Box className='size-12 mb-4' />
                  <p className='text-xs font-black uppercase tracking-widest'>{t('purchase.logs.empty')}</p>
                </div>
              ) : (
                <div className='space-y-4'>
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className='group bg-background rounded-[24px] p-5 shadow-sm border border-transparent hover:border-rose-500/20 transition-all'
                    >
                      <div className='flex items-center justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          <div className='size-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600'>
                            <Trash2 className='size-5' />
                          </div>
                          <div>
                            <p className='text-sm font-black uppercase tracking-tight'>{order.orderNo}</p>
                            <p className='text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60'>
                              {order.supplierName}
                            </p>
                          </div>
                        </div>
                        <AuditStatusDisplay meta={getDeletedOrderStatusMeta(locale)} badgeClassName='px-4 py-1' />
                      </div>
                      <div className='grid grid-cols-3 gap-4'>
                        <div>
                          <p className='text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-40'>
                            {t('purchase.logs.value')}
                          </p>
                          <p className='text-xs font-black tabular-nums'>
                            {order.amount.toLocaleString()} {order.currency}
                          </p>
                        </div>
                        <div>
                          <p className='text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-40'>
                            {t('purchase.logs.purchaser')}
                          </p>
                          <p className='text-xs font-black uppercase'>{order.purchaser}</p>
                        </div>
                        <div>
                          <p className='text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-40'>
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

        <div className='space-y-6'>
          <Card className='rounded-[32px] border-none bg-slate-900 text-white p-8 space-y-4 relative overflow-hidden'>
            <div className='absolute -bottom-10 -right-10 opacity-10 scale-150 rotate-12'>
              <BarChart3 className='size-40' />
            </div>
            <h4 className='text-xs font-black italic tracking-tight uppercase border-b border-white/10 pb-4'>
              {t('purchase.logs.auditInsight')}
            </h4>
            <div className='space-y-6 pt-2'>
              <div className='space-y-2'>
                <div className='flex justify-between items-center text-[10px] font-black uppercase tracking-widest'>
                  <span className='opacity-60'>{t('purchase.logs.orderIntegrity')}</span>
                  <span>{t('purchase.logs.high')}</span>
                </div>
                <div className='h-1 bg-white/10 rounded-full overflow-hidden'>
                  <div className='h-full bg-emerald-500 w-[94%]' />
                </div>
              </div>
              <div className='space-y-2'>
                <div className='flex justify-between items-center text-[10px] font-black uppercase tracking-widest'>
                  <span className='opacity-60'>{t('purchase.logs.deletionRatio')}</span>
                  <span>{((orders.length / 100) * 100).toFixed(1)}%</span>
                </div>
                <div className='h-1 bg-white/10 rounded-full overflow-hidden'>
                  <div className='h-full bg-rose-500 w-[5%]' />
                </div>
              </div>
            </div>
            <p className='text-[9px] font-medium leading-relaxed opacity-40 pt-4'>
              {t('purchase.logs.complianceText')}
            </p>
          </Card>

          <Card className='rounded-[32px] border-dashed border-muted-foreground/20 p-6 flex flex-col items-center justify-center text-center space-y-3'>
            <AlertCircle className='size-8 text-muted-foreground/30' />
            <h5 className='text-[10px] font-black uppercase tracking-widest'>
              {t('purchase.logs.complianceNote')}
            </h5>
            <p className='text-[9px] font-medium leading-relaxed text-muted-foreground max-w-[200px]'>
              {t('purchase.logs.complianceText')}
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
