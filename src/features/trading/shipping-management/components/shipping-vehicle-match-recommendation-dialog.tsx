import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { ConfigErrorPanel } from '@/features/logistics-config/vehicle-loading/components/config-error-panel'
import { getVehicleLoadingSourceConfig } from '@/features/logistics-config/vehicle-loading/data/vehicle-loading-sources'
import { VehicleRecommendationPanel } from '@/features/logistics-config/vehicle-loading/components/vehicle-recommendation-panel'
import type { ShipmentSummary } from '@/features/logistics-config/vehicle-loading/data/vehicle-loading.types'
import { resolveShippingVehicleMatchRecommendationSummary } from '../adapters/shipping-vehicle-match-recommendation'
import { useShippingVehicleMatchRecommendation } from '../hooks/use-shipping-vehicle-match-recommendation'
import type { ShippingVehicleMatchItem } from '../types'

type Props = {
  item: ShippingVehicleMatchItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SummaryMetricCard({ title, value }: { title: string; value: string }) {
  return (
    <div className='rounded-2xl border border-dashed border-border/60 bg-muted/3 px-4 py-3'>
      <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>{title}</div>
      <div className='mt-1 text-sm font-black'>{value}</div>
    </div>
  )
}

function ShippingVehicleMatchRecommendationResolvedContent({ item, summary }: { item: ShippingVehicleMatchItem; summary: ShipmentSummary }) {
  const {
    sourceLabel,
    packageInputNotice,
    readResource,
    retryRead,
  } = useShippingVehicleMatchRecommendation(item, summary)
  const fallbackSourceLabel = item.packageProfileId.trim()
    ? getVehicleLoadingSourceConfig('packing-rule').label
    : getVehicleLoadingSourceConfig('manual').label
  const metricSourceLabel = readResource.status === 'ready' ? readResource.data.sourceLabel : sourceLabel || fallbackSourceLabel

  const errorTitle =
    readResource.status === 'error'
      ? readResource.scope.includes('vehicleSpecs')
        ? '车型加载失败'
        : readResource.scope.includes('recommendations')
          ? '推荐计算失败'
          : '推荐输入准备失败'
      : null
  const retryLabel =
    readResource.status === 'error'
      ? readResource.scope.includes('vehicleSpecs')
        ? '重新加载车型'
        : readResource.scope.includes('recommendations')
          ? '重新计算推荐'
          : '重新加载'
      : '重新加载'

  return (
    <div className='space-y-5'>
      <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
        <SummaryMetricCard title='箱数' value={`${summary.boxes}`} />
        <SummaryMetricCard title='体积' value={`${summary.totalVolumeM3.toFixed(1)} m³`} />
        <SummaryMetricCard title='重量' value={`${summary.totalWeightKg.toFixed(0)} kg`} />
        <SummaryMetricCard title='来源' value={metricSourceLabel} />
      </div>

      {packageInputNotice ? (
        <Card className='rounded-[22px] border-dashed border-primary/30 bg-primary/5 shadow-none'>
          <CardContent className='px-5 py-4 text-[11px] leading-relaxed text-primary/80'>{packageInputNotice}</CardContent>
        </Card>
      ) : null}

      {readResource.status === 'error' ? (
        <ConfigErrorPanel title={errorTitle || '车型推荐失败'} error={readResource.error} retryLabel={retryLabel} onRetry={() => void retryRead()} />
      ) : null}

      {readResource.status === 'loading' ? (
        <Card className='rounded-[22px] border-dashed border-primary/20 bg-primary/5 shadow-none'>
          <CardContent className='px-5 py-6 text-[10px] font-black uppercase tracking-widest text-primary/70'>车型推荐计算中...</CardContent>
        </Card>
      ) : null}

      {readResource.status === 'ready' ? (
        <VehicleRecommendationPanel recommendations={readResource.data.recommendations} />
      ) : null}
    </div>
  )
}

export function ShippingVehicleMatchRecommendationDialog({ item, open, onOpenChange }: Props) {
  const summaryResolution = resolveShippingVehicleMatchRecommendationSummary(item)
  const resolvedSummary = summaryResolution.summary

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-[95vw] sm:max-w-[1100px] p-0 overflow-hidden rounded-2xl md:rounded-[32px] border-none shadow-2xl'>
        <div className='relative p-5 md:p-8 space-y-6'>
          <DialogHeader className='text-left'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge className='border-none bg-primary/10 text-primary'>车型推荐</Badge>
              {item?.warehouseName ? <Badge variant='outline'>{item.warehouseName}</Badge> : null}
              {item?.packageProfileName ? <Badge variant='outline'>{item.packageProfileName}</Badge> : null}
            </div>
            <DialogTitle>{item ? `${item.customerName || item.materialName || item.orderNo} · 车型匹配` : '车型匹配'}</DialogTitle>
            <DialogDescription>
              {item ? `${item.orderNo || item.shipmentId} / ${item.materialName || item.materialCode || '未关联货物'}` : '根据当前行数据计算可复用的车型推荐结果。'}
            </DialogDescription>
          </DialogHeader>

          {item && resolvedSummary ? (
            <ShippingVehicleMatchRecommendationResolvedContent item={item} summary={resolvedSummary} />
          ) : (
            <ConfigErrorPanel
              title='无法计算车型推荐'
              error={summaryResolution.error ?? new Error('未选择待匹配发货记录')}
              retryLabel='关闭'
              onRetry={() => onOpenChange(false)}
            />
          )}

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
