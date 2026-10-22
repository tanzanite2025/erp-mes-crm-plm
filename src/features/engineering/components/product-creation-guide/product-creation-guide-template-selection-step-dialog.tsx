import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/context/language-provider'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ProductTemplate } from '../../data/schema'
import {
  localizeTemplateDefinition,
  localizeTemplateDefinitions,
} from '../../data/template-defaults'
import { useProductCreationGuideSubmissionLock } from '../../hooks/use-product-creation-guide-submission-lock'
import { PRODUCT_TEMPLATES_QUERY_KEY } from '../../query-keys'
import { productTemplateService } from '../../services/product-template-service'
import {
  getProductTemplateAttributeLevelOneCategoryName,
  getProductTemplateAttributeLevelTwoOptionLabel,
} from '../../utils/product-attribute-utils'
import { ProductCreationGuideConfigurationDialog } from './product-creation-guide-configuration-dialog-shell'
import { ProductCreationGuideConfigurationRequestState } from './product-creation-guide-configuration-request-state'
import type { ProductCreationGuideOperationDialogProps } from './product-creation-guide-step-dialog-contracts'

export function ProductCreationGuideTemplateSelectionDialog(
  props: ProductCreationGuideOperationDialogProps
) {
  const { t, locale } = useLanguage()
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    props.progress.completedSteps.template?.id ?? ''
  )
  const [isConfirming, setIsConfirming] = useState(false)
  const templatesQuery = useQuery({
    queryKey: PRODUCT_TEMPLATES_QUERY_KEY,
    queryFn: () => productTemplateService.getTemplates({ fresh: true }),
  })
  const templates = localizeTemplateDefinitions(
    (templatesQuery.data ?? []).filter((template) => template.active),
    t
  )
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId
  )
  useProductCreationGuideSubmissionLock(isConfirming, props.onBusyChange)

  function completeSelectedProductCreationTemplate(template: ProductTemplate) {
    if (!template.active) {
      toast.error(t('engineering.productCreationGuide.loadFailed'))
      return
    }
    props.onCompleted({
      id: template.id,
      label: localizeTemplateDefinition(template, t).name,
      version: template.version,
      attributeCategoryKeys: template.attributeBindings
        .filter((binding) => binding.active)
        .map((binding) => binding.categoryKey),
    })
  }

  async function confirmExistingProductCreationTemplate() {
    if (isConfirming) return
    setIsConfirming(true)
    try {
      const freshTemplate = (
        await productTemplateService.getTemplates({ fresh: true })
      ).find((template) => template.id === selectedTemplateId)
      if (!freshTemplate)
        throw new Error(t('engineering.productCreationGuide.loadFailed'))
      completeSelectedProductCreationTemplate(freshTemplate)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t('engineering.productCreationGuide.loadFailed')
      )
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <ProductCreationGuideConfigurationDialog
      {...props}
      disabled={
        !selectedTemplate ||
        !templatesQuery.isSuccess ||
        Boolean(templatesQuery.error)
      }
      isConfirming={isConfirming}
      onConfirm={() => void confirmExistingProductCreationTemplate()}
    >
      <ProductCreationGuideConfigurationRequestState
        isLoading={templatesQuery.isPending}
        error={templatesQuery.error}
        onRetry={() => void templatesQuery.refetch()}
      />
      <div className='space-y-2'>
        <Label htmlFor='product-creation-guide-template-selection'>
          {t('engineering.productCreationGuide.selectTemplate')}
        </Label>
        <Select
          value={selectedTemplateId}
          onValueChange={setSelectedTemplateId}
        >
          <SelectTrigger
            id='product-creation-guide-template-selection'
            className='w-full'
          >
            <SelectValue
              placeholder={t(
                'engineering.productCreationGuide.selectPlaceholder'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {selectedTemplate && (
        <div className='space-y-3 rounded-xl border p-4'>
          <p className='text-xs font-medium text-muted-foreground'>
            {t('engineering.productCreationGuide.templateIncludesAttributes')}
          </p>
          <ul className='space-y-3'>
            {selectedTemplate.attributeBindings
              .filter((binding) => binding.active)
              .sort((left, right) => left.sortOrder - right.sortOrder)
              .map((binding) => {
                const category = { ...binding, key: binding.categoryKey }
                const activeOptions = binding.options
                  .filter((option) => option.active)
                  .sort((left, right) => left.sortOrder - right.sortOrder)
                return (
                  <li
                    key={binding.categoryKey}
                    className='space-y-2 rounded-lg bg-muted/40 p-3'
                  >
                    <div className='flex flex-wrap items-center gap-2'>
                      <h3 className='flex min-w-0 items-center gap-1.5 text-sm font-medium'>
                        <Check
                          aria-hidden='true'
                          className='size-3.5 shrink-0 text-primary'
                        />
                        <span className='break-words'>
                          {getProductTemplateAttributeLevelOneCategoryName(
                            locale,
                            category
                          ) ||
                            t(
                              'engineering.productCreationGuide.attributeCategory'
                            )}
                        </span>
                      </h3>
                      <span className='rounded-md bg-background px-2 py-0.5 text-xs text-muted-foreground'>
                        {t(
                          binding.required
                            ? 'engineering.productCreationGuide.requiredAttribute'
                            : 'engineering.productCreationGuide.optionalAttribute'
                        )}
                      </span>
                      {
                        <span className='text-xs text-muted-foreground sm:ml-auto'>
                          {t('engineering.productCreationGuide.optionCount', {
                            count: activeOptions.length,
                          })}
                        </span>
                      }
                    </div>
                    {category?.description && (
                      <p className='text-xs leading-relaxed break-words text-muted-foreground'>
                        {category.description}
                      </p>
                    )}
                    {activeOptions.length > 0 ? (
                      <ul
                        aria-label={t(
                          'engineering.templateMgmt.assembly.levelTwoOptions'
                        )}
                        className='grid gap-2 sm:grid-cols-2'
                      >
                        {activeOptions.map((option) => (
                          <li
                            key={option.value}
                            className='min-w-0 rounded-md border bg-background px-3 py-2 text-xs'
                          >
                            <p className='font-medium break-words'>
                              {getProductTemplateAttributeLevelTwoOptionLabel(
                                locale,
                                option
                              )}
                            </p>
                            {option.description && (
                              <p className='mt-1 leading-relaxed break-words text-muted-foreground'>
                                {option.description}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className='text-xs text-muted-foreground'>
                        {t(
                          'engineering.productCreationGuide.noActiveAttributeOptions'
                        )}
                      </p>
                    )}
                  </li>
                )
              })}
          </ul>
          <p className='text-xs leading-relaxed text-muted-foreground'>
            {t('engineering.productCreationGuide.templateReuseHint')}
          </p>
        </div>
      )}
      {templatesQuery.isSuccess && !templates.length && (
        <p className='text-sm text-muted-foreground'>
          {t('engineering.productCreationGuide.noTemplatesAvailable')}
        </p>
      )}
      {props.progress.completedSteps.baseModel && (
        <p className='text-xs text-muted-foreground'>
          {t('engineering.productCreationGuide.upstreamChangeHint')}
        </p>
      )}
    </ProductCreationGuideConfigurationDialog>
  )
}
