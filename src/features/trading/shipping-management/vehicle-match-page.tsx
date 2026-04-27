import { useState } from 'react'
import { AlertCircle, Truck } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ForbiddenState } from '@/components/forbidden-state'
import { isForbiddenError } from '@/lib/error-status'
import { ShippingVehicleMatchRecommendationDialog } from './components/shipping-vehicle-match-recommendation-dialog'
import { useShippingVehicleMatch } from './hooks/use-shipping-vehicle-match'
import { VirtualShipmentRow } from './shared'
import type { ShippingVehicleMatchItem } from './types'

export function ShippingVehicleMatchPage() {
  const { t } = useLanguage()
  const { readResource, retryRead } = useShippingVehicleMatch()
  const [selectedItem, setSelectedItem] = useState<ShippingVehicleMatchItem | null>(null)
  const [recommendationDialogOpen, setRecommendationDialogOpen] = useState(false)

  if (readResource.status === 'error' && isForbiddenError(readResource.error)) {
    return <ForbiddenState />
  }

  const readyItems = readResource.status === 'ready' ? readResource.data : []

  const handleMatchVehicle = (item: ShippingVehicleMatchItem) => {
    setSelectedItem(item)
    setRecommendationDialogOpen(true)
  }

  const handleRecommendationDialogOpenChange = (open: boolean) => {
    setRecommendationDialogOpen(open)
    if (!open) {
      setSelectedItem(null)
    }
  }

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <IndustrialHeader
        icon={Truck}
        title={t('trading.shippingManagement.vehicleMatch.title')}
        description={t('trading.shippingManagement.vehicleMatch.description')}
      />

      <Card className='rounded-[28px] border-dashed border-border/60 bg-primary/5 p-5 shadow-none'>
        <div className='flex items-center justify-between gap-4'>
          <div>
            <div className='text-[10px] font-black uppercase tracking-widest text-primary/70'>虚拟发货仓</div>
            <div className='mt-2 text-sm font-black'>待发货货物列表</div>
          </div>
          <Badge className='h-6 rounded-full border-none bg-white/70 px-3 text-[10px] font-black text-primary'>系统保护仓</Badge>
        </div>
      </Card>

      {readResource.status === 'loading' ? (
        <div className='space-y-4'>
          <Card className='rounded-[24px] border-dashed border-border/60 bg-background/90 p-5 shadow-none'>
            <div className='space-y-4'>
              <Skeleton className='h-5 w-40' />
              <div className='grid grid-cols-2 gap-3 md:grid-cols-4'>
                <Skeleton className='h-16 w-full rounded-2xl' />
                <Skeleton className='h-16 w-full rounded-2xl' />
                <Skeleton className='h-16 w-full rounded-2xl' />
                <Skeleton className='h-16 w-full rounded-2xl' />
              </div>
            </div>
          </Card>
        </div>
      ) : readResource.status === 'error' ? (
        <Card className='rounded-[24px] border-dashed border-destructive/40 bg-destructive/5 p-5 shadow-none'>
          <div className='space-y-3'>
            <div className='flex items-center gap-2 text-sm font-black text-destructive'>
              <AlertCircle className='size-4' />
              真实待匹配发货数据加载失败
            </div>
            <div className='text-xs leading-relaxed text-muted-foreground'>{readResource.error.message}</div>
            <div>
              <Button type='button' variant='outline' className='h-10 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest' onClick={() => void retryRead()}>
                重新加载
              </Button>
            </div>
          </div>
        </Card>
      ) : readyItems.length === 0 ? (
        <Card className='rounded-[24px] border-dashed border-border/60 bg-background/90 p-5 shadow-none'>
          <div className='space-y-2'>
            <div className='text-sm font-black'>暂无待匹配发货数据</div>
            <div className='text-xs leading-relaxed text-muted-foreground'>当前虚拟发货仓下没有可用于车型匹配的真实发货记录。</div>
          </div>
        </Card>
      ) : (
        <div className='space-y-4'>
          {readyItems.map((item) => (
            <VirtualShipmentRow key={item.id} item={item} onMatchVehicle={handleMatchVehicle} />
          ))}
        </div>
      )}

      <ShippingVehicleMatchRecommendationDialog
        item={selectedItem}
        open={recommendationDialogOpen}
        onOpenChange={handleRecommendationDialogOpenChange}
      />
    </div>
  )
}
