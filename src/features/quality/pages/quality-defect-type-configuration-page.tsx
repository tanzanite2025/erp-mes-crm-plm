import { ListChecks } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { QualityDefectTypeConfigurationContent } from '../components/quality-defect-type-configuration-content'

export function QualityDefectTypeConfigurationPage() {
  const { t } = useLanguage()
  return (
    <div className='space-y-6'>
      <IndustrialHeader
        icon={ListChecks}
        title={t('quality.defectConfiguration.title')}
        description={t('quality.defectConfiguration.description')}
      />
      <QualityDefectTypeConfigurationContent />
    </div>
  )
}
