import { Database } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { LinearBarcodeStatusDefinitionSection } from '@/features/code-center/components/linear-barcode-status-definition-section'
import { LINEAR_BARCODE_INVENTORY_STATUS_DEFINITIONS } from '@/features/code-center/data/linear-barcode-status-definitions'

export function LinearBarcodeInventoryStatusDefinitionSection() {
  const { t } = useLanguage()

  return (
    <LinearBarcodeStatusDefinitionSection
      icon={Database}
      title={t('codeCenter.linearBarcode.status.categories.inventory.title')}
      description={t(
        'codeCenter.linearBarcode.status.categories.inventory.description'
      )}
      definitions={LINEAR_BARCODE_INVENTORY_STATUS_DEFINITIONS}
    />
  )
}
