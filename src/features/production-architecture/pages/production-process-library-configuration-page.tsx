import { Workflow } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { ProductionProcessLibraryConfigurationContent } from '@/features/production-shared/components/production-process-library-configuration-content'

export function ProductionProcessLibraryConfigurationPage() {
  const { t } = useLanguage()
  return (
    <div className='space-y-6'>
      <IndustrialHeader
        icon={Workflow}
        title={t('productionArchitecture.processLibrary.title')}
        description={t('productionArchitecture.processLibrary.descriptionText')}
      />
      <ProductionProcessLibraryConfigurationContent />
    </div>
  )
}
