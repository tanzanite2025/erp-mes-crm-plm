import { Truck } from 'lucide-react'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'

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
