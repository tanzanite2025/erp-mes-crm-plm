import { Layers3 } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { LinearBarcodeStatusDefinitionSection } from '@/features/code-center/components/linear-barcode-status-definition-section'
import { LINEAR_BARCODE_PRODUCTION_STATE_DEFINITIONS } from '@/features/code-center/data/linear-barcode-status-definitions'

export function LinearBarcodeProductionStatusDefinitionSection() {
  const { t } = useLanguage()

  return (
    <LinearBarcodeStatusDefinitionSection
      icon={Layers3}
      title={t('codeCenter.linearBarcode.status.categories.production.title')}
      description={t(
        'codeCenter.linearBarcode.status.categories.production.description'
      )}
      definitions={LINEAR_BARCODE_PRODUCTION_STATE_DEFINITIONS}
    />
  )
}
