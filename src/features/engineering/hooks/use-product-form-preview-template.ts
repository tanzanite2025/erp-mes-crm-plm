import { useEffect, useState } from 'react'
import { type UseFormReturn, useWatch } from 'react-hook-form'
import { createLogger } from '@/lib/logger'
import {
  type Product,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'
import {
  ProductTypeService,
  type ProductTypeTemplateResolution,
} from '../services/product-type-service'
import { productTemplateService } from '../services/product-template-service'

const logger = createLogger('useProductFormPreviewTemplate')

interface UseProductFormPreviewTemplateParams {
  currentRow?: Product
  form: UseFormReturn<Product>
  isEdit: boolean
  open: boolean
  productTypes: ProductType[]
}

interface UseProductFormPreviewTemplateResult {
  boundTemplate: ProductTemplate | null
  templateResolveError: string | null
  templateResolutionPending: boolean
}

export function useProductFormPreviewTemplate({
  currentRow,
  form,
  isEdit,
  open,
  productTypes,
}: UseProductFormPreviewTemplateParams): UseProductFormPreviewTemplateResult {
  const watchedTypeId = useWatch({ control: form.control, name: 'typeId' })
  const [boundTemplate, setBoundTemplate] = useState<ProductTemplate | null>(null)
  const [templateResolveError, setTemplateResolveError] = useState<string | null>(null)
  const resolvedTemplateKey = currentRow?.resolvedTemplateKey?.trim() || currentRow?.templateKey?.trim() || ''
  const resolvedTemplateId = currentRow?.resolvedTemplateId?.trim() || ''
  const templateResolutionError = currentRow?.templateResolutionError?.trim() || ''
  const templateResolutionSource = currentRow?.templateResolutionSource?.trim() || ''

  useEffect(() => {
    let cancelled = false

    const resolveBoundTemplate = async () => {
      const authorityTemplateId = isEdit ? resolvedTemplateId : ''
      const authorityTemplateKey = isEdit ? resolvedTemplateKey : ''
      const authorityResolutionError = isEdit ? templateResolutionError : ''

      if (!isEdit && !watchedTypeId) {
        if (!cancelled) {
          setBoundTemplate(null)
          setTemplateResolveError(null)
        }
        return
      }

      const selectedType = productTypes.find((type) => type.id === watchedTypeId)
      try {
        const resolveTemplateEntity = async (params: { templateId?: string; templateKey?: string }) => {
          const findTemplate = (templates: ProductTemplate[]) => {
            const normalizedTemplateId = params.templateId?.trim() || ''
            const normalizedTemplateKey = params.templateKey?.trim().toUpperCase() || ''

            return templates.find((item) => item.id === normalizedTemplateId)
              || templates.find((item) => item.componentKey.trim().toUpperCase() === normalizedTemplateKey)
              || null
          }

          const templates = await productTemplateService.getTemplates()
          const cachedMatch = findTemplate(templates)
          if (cachedMatch) {
            return cachedMatch
          }

          const freshTemplates = await productTemplateService.getTemplates({ fresh: true })
          return findTemplate(freshTemplates)
        }

        const resolvedAuthority: ProductTypeTemplateResolution = isEdit
          ? {
              resolvedTemplateId: authorityTemplateId,
              resolvedTemplateKey: authorityTemplateKey,
              templateResolutionSource: templateResolutionSource || 'backendResolvedTemplate',
              templateResolutionError: authorityResolutionError,
            }
          : await ProductTypeService.getTemplateResolution(watchedTypeId || '')
        const authorityTemplate = await resolveTemplateEntity({
          templateId: resolvedAuthority.resolvedTemplateId,
          templateKey: resolvedAuthority.resolvedTemplateKey,
        })

        if (cancelled) return

        if (!authorityTemplate) {
          const selectedTypeLabel = selectedType
            ? `${selectedType.name} (${selectedType.id})`
            : `unknown product type (${watchedTypeId || 'missing'})`
          const resolutionError = resolvedAuthority.templateResolutionError || ''
          const resolutionTemplateKey = resolvedAuthority.resolvedTemplateKey || ''
          const message = resolutionTemplateKey || resolutionError
            ? `Template binding resolution failed: product type ${selectedTypeLabel} could not resolve an effective template. backendResolution=${resolutionError || 'unknown'} templateKey=${resolutionTemplateKey || 'missing'}.`
            : `Template binding resolution failed: product type ${selectedTypeLabel} has no resolvable template binding in service authority.`
          setBoundTemplate(null)
          setTemplateResolveError(message)
          logger.error('Template binding resolution failed: authority template could not be mapped', {
            productTypeId: selectedType?.id,
            templateId: resolvedAuthority.resolvedTemplateId,
            productTemplateKey: resolutionTemplateKey || undefined,
            resolvedTemplateId: resolvedAuthority.resolvedTemplateId,
            templateResolutionError: resolutionError || undefined,
            mode: isEdit ? 'edit' : 'create',
          })
          return
        }

        setBoundTemplate(authorityTemplate)
        setTemplateResolveError(null)
        logger.info('Resolved authority template for product form preview', {
          productTypeId: selectedType?.id,
          templateId: authorityTemplate.id,
          source: resolvedAuthority.templateResolutionSource || (isEdit ? 'backendResolvedTemplate' : 'backendCreateTypeResolution'),
          mode: isEdit ? 'edit' : 'create',
        })
      } catch (error) {
        if (cancelled) return

        const message = error instanceof Error
          ? `Template binding resolution failed: ${error.message}`
          : 'Template binding resolution failed: unknown error while loading template metadata.'
        setBoundTemplate(null)
        setTemplateResolveError(message)
        logger.error('Template binding resolution failed while loading template metadata', error)
      }
    }

    void resolveBoundTemplate()

    return () => {
      cancelled = true
    }
  }, [isEdit, productTypes, resolvedTemplateId, resolvedTemplateKey, templateResolutionError, templateResolutionSource, watchedTypeId])

  const templateResolutionPending = Boolean(
    open
      && !templateResolveError
      && !boundTemplate
      && (watchedTypeId || resolvedTemplateKey || resolvedTemplateId)
  )

  return {
    boundTemplate,
    templateResolveError,
    templateResolutionPending,
  }
}
