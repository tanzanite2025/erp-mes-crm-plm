import { Truck } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'

export function VehicleSpecsLibraryHeader() {
  const { t } = useLanguage()

  return (
    <PageHeader
      icon={Truck}
      title={t('logisticsConfig.vehicleSpecsLibrary.title')}
      description={t('logisticsConfig.vehicleSpecsLibrary.description')}
    />
  )
}
