import { ArrowRight, PhoneCall } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ShippingVehicleMatchItem } from './types'

export function ShippingPlaceholderCard({ title, description, actionLabel }: { title: string; description: string; actionLabel: string }) {
  return (
    <Card className='rounded-[28px] border-dashed border-border/60 bg-background/80 p-6 shadow-none'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-2'>
          <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{title}</div>
          <div className='max-w-2xl text-sm leading-relaxed text-muted-foreground'>{description}</div>
        </div>
        <Badge className='h-6 rounded-full border-none bg-primary/10 px-3 text-[10px] font-black text-primary'>
          待接逻辑
        </Badge>
      </div>
      <div className='mt-6 flex flex-wrap gap-3'>
        <Button type='button' className='h-10 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20'>
          {actionLabel}
        </Button>
        <Button type='button' variant='outline' className='h-10 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'>
          预留按钮
        </Button>
      </div>
    </Card>
  )
}

function formatMetric(value: number | null, digits: number, unit: string) {
  if (value === null) return '--'
  return `${value.toFixed(digits)} ${unit}`
}

export function VirtualShipmentRow({ item, onMatchVehicle }: { item: ShippingVehicleMatchItem; onMatchVehicle?: (item: ShippingVehicleMatchItem) => void }) {
  return (
    <Card className='rounded-[24px] border-dashed border-border/60 bg-background/90 p-5 shadow-none'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='space-y-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge className='h-6 rounded-full border-none bg-primary/10 px-3 text-[10px] font-black text-primary'>{item.status}</Badge>
            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{item.warehouseName}</span>
          </div>
          <div>
            <div className='text-sm font-black text-foreground'>{item.customerName || item.materialName || item.orderNo || '未关联客户'}</div>
            <div className='mt-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60'>{item.orderNo || item.materialCode || item.shipmentId}</div>
            <div className='mt-2 text-xs text-muted-foreground'>{[item.materialName, item.materialCode, item.packageProfileName].filter(Boolean).join(' / ')}</div>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-3 md:grid-cols-4 lg:min-w-[520px]'>
          <div className='rounded-2xl border border-dashed border-border/60 bg-muted/[0.03] px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>箱数</div>
            <div className='mt-1 text-sm font-black'>{item.boxCount ?? '--'}</div>
          </div>
          <div className='rounded-2xl border border-dashed border-border/60 bg-muted/[0.03] px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>体积</div>
            <div className='mt-1 text-sm font-black'>{formatMetric(item.volumeM3, 1, 'm³')}</div>
          </div>
          <div className='rounded-2xl border border-dashed border-border/60 bg-muted/[0.03] px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>重量</div>
            <div className='mt-1 text-sm font-black'>{formatMetric(item.weightKg, 0, 'kg')}</div>
          </div>
          <div className='rounded-2xl border border-dashed border-border/60 bg-primary/5 px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-primary/60'>当前动作</div>
            <div className='mt-1 text-sm font-black text-primary'>{item.logisticsStatus || item.shipmentStatus || item.status}</div>
          </div>
        </div>
      </div>

      <div className='mt-5 flex flex-wrap gap-3'>
        <Button type='button' className='h-10 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20' onClick={() => onMatchVehicle?.(item)}>
          车型匹配
          <ArrowRight className='ml-2 size-4' />
        </Button>
        <Button type='button' variant='outline' className='h-10 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'>
          查看详情
        </Button>
        <Button type='button' variant='outline' className='h-10 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'>
          <PhoneCall className='mr-2 size-4' />
          车型联系人
        </Button>
      </div>
    </Card>
  )
}
