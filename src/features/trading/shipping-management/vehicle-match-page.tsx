import { Truck } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { VirtualShipmentRow } from './shared'
import { virtualWarehouseShipments } from './shipping-data'

export function ShippingVehicleMatchPage() {
  const { t } = useLanguage()

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
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
        <div className='mt-4 text-[11px] leading-relaxed text-primary/80'>
          后续这里会直接拉取仓库侧的“虚拟发货仓”数据，用来承接待发货货物、真实占库存并进入车型计算流程。
        </div>
      </Card>

      <div className='space-y-4'>
        {virtualWarehouseShipments.map((item) => (
          <VirtualShipmentRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
