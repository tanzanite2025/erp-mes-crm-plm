import { Truck } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'

export function VehicleSpecsLibraryHeader() {
  const { t } = useLanguage()

  return (
    <IndustrialHeader
      icon={Truck}
      title={t('logisticsConfig.vehicleSpecsLibrary.title')}
      description={t('logisticsConfig.vehicleSpecsLibrary.description')}
    />
  )
}
