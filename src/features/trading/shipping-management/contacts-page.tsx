import { PhoneCall, Truck, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { categoryLabel } from '@/features/logistics-config/vehicle-loading/data/vehicle-loading.utils'
import { useVehicleSpecsQuery } from '@/features/logistics-config/vehicle-loading/hooks/use-vehicle-specs-query'
import { SHIPPING_VEHICLE_CONTACT_BINDINGS } from './contact-bindings.mock'
import { ShippingContactsEmptyState, ShippingContactsErrorState, ShippingContactsLoadingState } from './contacts-boundary'

export function ShippingContactsPage() {
  const { t } = useLanguage()
  const { vehicleSpecs, isLoadingSpecs, specsError, reload } = useVehicleSpecsQuery()

  const vehicleCards = vehicleSpecs
    .map((spec) => ({
      spec,
      binding: SHIPPING_VEHICLE_CONTACT_BINDINGS.find((item) => item.vehicleId === spec.id),
    }))
    .filter((item) => item.binding)

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={Users}
        title={t('trading.shippingManagement.contacts.title')}
        description={t('trading.shippingManagement.contacts.description')}
      />

      {specsError ? <ShippingContactsErrorState message={specsError.message} onRetry={() => void reload()} /> : null}
      {!specsError && isLoadingSpecs ? <ShippingContactsLoadingState /> : null}
      {!specsError && !isLoadingSpecs && vehicleCards.length === 0 ? <ShippingContactsEmptyState /> : null}

      {!specsError && !isLoadingSpecs && vehicleCards.length > 0 ? (
        <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
          {vehicleCards.map(({ spec, binding }) => (
            <Card key={spec.id} className='rounded-[28px] border-dashed border-border/60 bg-background/90 p-5 shadow-none'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2 text-primary'>
                    <Truck className='size-4 shrink-0' />
                    <div className='text-sm font-black tracking-tight'>{spec.name}</div>
                  </div>
                  <div className='mt-2 flex flex-wrap gap-2'>
                    <Badge className='border-none bg-primary/10 text-primary'>{categoryLabel(spec.category)}</Badge>
                    <Badge variant='outline' className='border-dashed'>{`${spec.volumeM3.toFixed(1)} m³`}</Badge>
                    <Badge variant='outline' className='border-dashed'>{`${spec.payloadKg.toFixed(0)} kg`}</Badge>
                  </div>
                </div>
                <div className='rounded-full border border-dashed border-border/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground/70'>
                  {binding!.contacts.length} 位联系人
                </div>
              </div>

              <div className='mt-4 rounded-[22px] border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-[11px] leading-relaxed text-primary/80'>
                {binding!.dispatchAdvice}
              </div>

              <div className='mt-4 space-y-3'>
                {binding!.contacts.map((contact) => (
                  <div key={contact.id} className='rounded-[22px] border border-dashed border-border/55 bg-muted/[0.04] px-4 py-4'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div>
                        <div className='text-sm font-black text-foreground'>{contact.contactName}</div>
                        <div className='mt-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60'>{contact.supplierName}</div>
                      </div>
                      <div className='flex items-center gap-2 text-sm font-semibold text-primary'>
                        <PhoneCall className='size-4' />
                        {contact.phone}
                      </div>
                    </div>

                    <div className='mt-3 flex flex-wrap gap-2'>
                      {contact.channels.map((channel) => (
                        <Badge key={channel} variant='outline' className='border-dashed'>
                          {channel}
                        </Badge>
                      ))}
                      <Badge variant='outline' className='border-dashed'>
                        {contact.region}
                      </Badge>
                    </div>

                    <div className='mt-3 text-sm leading-relaxed text-muted-foreground'>
                      {contact.note}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  )
}
