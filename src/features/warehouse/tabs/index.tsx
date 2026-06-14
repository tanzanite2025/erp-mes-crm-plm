import { useLanguage } from '@/context/language-provider'
import ProductInbound from './product-inbound'
import ProductShipment from './product-shipment'
import { WarehouseReports } from './warehouse-reports'

export { ProductInbound, ProductShipment, WarehouseReports }
export function ReturnInventory() {
  const { t } = useLanguage()
  return <Placeholder title={t('warehouse.inbound.title')} />
}
export function ReturnSales() {
  const { t } = useLanguage()
  return <Placeholder title={t('warehouse.shipment.title')} />
}
export function OutsourcingOut() {
  const { t } = useLanguage()
  return <Placeholder title={t('warehouse.category.title')} />
}

function Placeholder({ title }: { title: string }) {
  const { t } = useLanguage()
  return (
    <div className='flex animate-in flex-col gap-8 duration-700 fade-in'>
      <div className='flex flex-col gap-1 rounded-[32px] border border-dashed border-muted/50 bg-muted/5 p-6'>
        <div className='flex items-center gap-2 text-primary'>
          <h3 className='text-lg font-black tracking-tighter uppercase italic'>
            {t('warehouse.placeholder.title', { title })}
          </h3>
        </div>
        <p className='text-[9px] font-black tracking-widest text-muted-foreground uppercase opacity-60'>
          {t('warehouse.placeholder.subtitle', { title })}
        </p>
      </div>

      <div className='flex h-96 flex-col items-center justify-center rounded-[24px] border border-dashed border-muted/50 bg-muted/5 text-muted-foreground/30'>
        <p className='text-xs font-black tracking-[0.3em] uppercase italic'>
          {t('warehouse.placeholder.devMode', { title })}
        </p>
        <p className='mt-2 text-[9px] leading-none tracking-widest uppercase'>
          {t('warehouse.placeholder.syncing')}
        </p>
      </div>
    </div>
  )
}
