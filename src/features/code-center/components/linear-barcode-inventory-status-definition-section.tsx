import { Database } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { LinearBarcodeStatusDefinitionSection } from '@/features/code-center/components/linear-barcode-status-definition-section'
import { type LinearBarcodeStatusDefinition } from '@/features/code-center/data/linear-barcode-status-definitions'

export function LinearBarcodeInventoryStatusDefinitionSection({
  definitions,
}: {
  definitions: readonly LinearBarcodeStatusDefinition[]
}) {
  const { t } = useLanguage()

  return (
    <LinearBarcodeStatusDefinitionSection
      icon={Database}
      title={t('codeCenter.linearBarcode.status.categories.inventory.title')}
      description={t(
        'codeCenter.linearBarcode.status.categories.inventory.description'
      )}
      definitions={definitions}
    />
  )
}
