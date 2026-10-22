import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import type { ProductTemplate, ProductType } from '../../data/schema'
import { resolveEffectiveTemplate } from '../../utils/product-template-resolution'
import { buildProductTypeHierarchyMetaMap } from '../../utils/product-type-tree'

export function ProductCreationGuideBaseModelSelectionAvailabilityNotice({
  types,
  templates,
  availableBaseModels,
  selectedTemplateId,
  selectedTemplateLabel,
  selectedBaseModelId,
  isRefreshing,
  onReload,
}: {
  types: ProductType[]
  templates: ProductTemplate[]
  availableBaseModels: ProductType[]
  selectedTemplateId: string
  selectedTemplateLabel: string
  selectedBaseModelId: string
  isRefreshing: boolean
  onReload: () => void
}) {
  const { t } = useLanguage()
  const hierarchy = buildProductTypeHierarchyMetaMap(types)
  const levelOneCount = types.filter(
    (type) => hierarchy.get(type.id)?.level === 0
  ).length
  const levelTwoCount = types.filter(
    (type) => hierarchy.get(type.id)?.level === 1
  ).length
  const baseModels = types.filter((type) => hierarchy.get(type.id)?.level === 2)
  const inactiveCount = baseModels.filter((type) => !type.active).length
  const activeTemplateResolutions = baseModels
    .filter((type) => type.active)
    .map((type) =>
      resolveEffectiveTemplate(templates, {
        productTypes: types,
        typeId: type.id,
      })
    )
  const unresolvedTemplateCount = activeTemplateResolutions.filter(
    (resolution) => !resolution.template
  ).length
  const otherTemplateCount = activeTemplateResolutions.filter(
    (resolution) =>
      resolution.template && resolution.template.id !== selectedTemplateId
  ).length
  const selectedBaseModelIsUnavailable =
    Boolean(selectedBaseModelId) &&
    !availableBaseModels.some((type) => type.id === selectedBaseModelId)
  const selectedRecord = types.find((type) => type.id === selectedBaseModelId)
  const selectedRecordIsStructuralCategory =
    selectedRecord && hierarchy.get(selectedRecord.id)?.level !== 2

  return (
    <div className='space-y-2 rounded-lg border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground'>
      <p role='status'>
        {t('engineering.productCreationGuide.baseModelCatalogSummary', {
          levelOneCount,
          levelTwoCount,
          baseModelCount: baseModels.length,
          availableCount: availableBaseModels.length,
        })}
      </p>
      {!types.length ? (
        <p>{t('engineering.productCreationGuide.baseModelCatalogEmpty')}</p>
      ) : !baseModels.length ? (
        <p>
          {t(
            levelTwoCount === 0
              ? 'engineering.productCreationGuide.baseModelMissingSecondLevel'
              : 'engineering.productCreationGuide.baseModelMissingThirdLevel'
          )}
        </p>
      ) : null}
      {inactiveCount > 0 && (
        <p>
          {t('engineering.productCreationGuide.baseModelInactiveCount', {
            count: inactiveCount,
          })}
        </p>
      )}
      {unresolvedTemplateCount > 0 && (
        <p>
          {t(
            'engineering.productCreationGuide.baseModelUnresolvedTemplateCount',
            { count: unresolvedTemplateCount }
          )}
        </p>
      )}
      {otherTemplateCount > 0 && (
        <p>
          {t('engineering.productCreationGuide.baseModelOtherTemplateCount', {
            count: otherTemplateCount,
            template: selectedTemplateLabel,
          })}
        </p>
      )}
      {selectedBaseModelIsUnavailable && (
        <p role='alert' className='text-foreground'>
          {t(
            selectedRecordIsStructuralCategory
              ? 'engineering.productCreationGuide.baseModelSelectedStructuralCategory'
              : 'engineering.productCreationGuide.baseModelSelectionUnavailable'
          )}
        </p>
      )}
      {(!availableBaseModels.length || selectedBaseModelIsUnavailable) && (
        <Button
          variant='outline'
          size='sm'
          className='rounded-full'
          disabled={isRefreshing}
          onClick={onReload}
        >
          {t('engineering.productCreationGuide.retry')}
        </Button>
      )}
    </div>
  )
}
