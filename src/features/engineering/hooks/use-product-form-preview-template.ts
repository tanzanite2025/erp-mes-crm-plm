import { useEffect, useMemo, useState } from 'react'
import { type UseFormReturn, useWatch } from 'react-hook-form'
import { createLogger } from '@/lib/logger'
import {
  type Product,
  type ProductTemplate,
  type ProductType,
} from '../data/schema'
import { productTemplateService } from '../services/product-template-service'
import {
  ProductTypeService,
  type ProductTypeTemplateResolution,
} from '../services/product-type-service'
import { resolveAuthoritativeTemplate } from '../utils/product-template-resolution'

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
  const resolvedTemplateKey =
    currentRow?.resolvedTemplateKey?.trim() ||
    currentRow?.templateKey?.trim() ||
    ''
  const resolvedTemplateId = currentRow?.resolvedTemplateId?.trim() || ''
  const templateResolutionError =
    currentRow?.templateResolutionError?.trim() || ''
  const templateResolutionSource =
    currentRow?.templateResolutionSource?.trim() || ''
  const usesExistingProductAuthority = Boolean(
    isEdit && watchedTypeId === currentRow?.typeId
  )
  const selectedType = productTypes.find((type) => type.id === watchedTypeId)
  const selectedTypeId = selectedType?.id
  const selectedTypeName = selectedType?.name
  const templateResolutionRequestIdentity = useMemo(
    () => ({
      open,
      watchedTypeId,
      usesExistingProductAuthority,
      resolvedTemplateId,
      resolvedTemplateKey,
      templateResolutionError,
      templateResolutionSource,
      selectedTypeId,
      selectedTypeName,
    }),
    [
      open,
      watchedTypeId,
      usesExistingProductAuthority,
      resolvedTemplateId,
      resolvedTemplateKey,
      templateResolutionError,
      templateResolutionSource,
      selectedTypeId,
      selectedTypeName,
    ]
  )
  const [templateResolutionState, setTemplateResolutionState] = useState<{
    requestIdentity: typeof templateResolutionRequestIdentity
    template: ProductTemplate | null
    error: string | null
  } | null>(null)
  const hasCurrentTemplateResolution =
    open &&
    templateResolutionState?.requestIdentity ===
      templateResolutionRequestIdentity
  const boundTemplate = hasCurrentTemplateResolution
    ? (templateResolutionState?.template ?? null)
    : null
  const templateResolveError = hasCurrentTemplateResolution
    ? (templateResolutionState?.error ?? null)
    : null

  useEffect(() => {
    if (!open || !watchedTypeId) return
    let cancelled = false

    const resolveBoundTemplate = async () => {
      const authorityTemplateId = usesExistingProductAuthority
        ? resolvedTemplateId
        : ''
      const authorityTemplateKey = usesExistingProductAuthority
        ? resolvedTemplateKey
        : ''
      const authorityResolutionError = usesExistingProductAuthority
        ? templateResolutionError
        : ''

      try {
        const resolveTemplateEntity = async (params: {
          templateId?: string
          templateKey?: string
        }) => {
          const findTemplate = (templates: ProductTemplate[]) =>
            resolveAuthoritativeTemplate(templates, {
              productTypes: [],
              resolvedTemplateId: params.templateId,
              resolvedTemplateKey: params.templateKey,
            }).template

          const templates = await productTemplateService.getTemplates()
          const matchedTemplate = findTemplate(templates)
          if (matchedTemplate) {
            return matchedTemplate
          }

          const freshTemplates = await productTemplateService.getTemplates({
            fresh: true,
          })
          return findTemplate(freshTemplates)
        }

        const resolvedAuthority: ProductTypeTemplateResolution =
          usesExistingProductAuthority
            ? {
                resolvedTemplateId: authorityTemplateId,
                resolvedTemplateKey: authorityTemplateKey,
                templateResolutionSource:
                  templateResolutionSource || 'backendResolvedTemplate',
                templateResolutionError: authorityResolutionError,
              }
            : await ProductTypeService.getTemplateResolution(
                watchedTypeId || ''
              )
        const authorityTemplate = await resolveTemplateEntity({
          templateId: resolvedAuthority.resolvedTemplateId,
          templateKey: resolvedAuthority.resolvedTemplateKey,
        })

        if (cancelled) return

        if (!authorityTemplate) {
          const selectedTypeLabel = selectedTypeId
            ? `${selectedTypeName} (${selectedTypeId})`
            : `unknown product type (${watchedTypeId || 'missing'})`
          const resolutionError =
            resolvedAuthority.templateResolutionError || ''
          const resolutionTemplateKey =
            resolvedAuthority.resolvedTemplateKey || ''
          const message =
            resolutionTemplateKey || resolutionError
              ? `Template binding resolution failed: product type ${selectedTypeLabel} could not resolve an effective template. backendResolution=${resolutionError || 'unknown'} templateKey=${resolutionTemplateKey || 'missing'}.`
              : `Template binding resolution failed: product type ${selectedTypeLabel} has no resolvable template binding in service authority.`
          setTemplateResolutionState({
            requestIdentity: templateResolutionRequestIdentity,
            template: null,
            error: message,
          })
          logger.error(
            'Template binding resolution failed: authority template could not be mapped',
            {
              productTypeId: selectedTypeId,
              templateId: resolvedAuthority.resolvedTemplateId,
              productTemplateKey: resolutionTemplateKey || undefined,
              resolvedTemplateId: resolvedAuthority.resolvedTemplateId,
              templateResolutionError: resolutionError || undefined,
              mode: isEdit ? 'edit' : 'create',
            }
          )
          return
        }

        setTemplateResolutionState({
          requestIdentity: templateResolutionRequestIdentity,
          template: authorityTemplate,
          error: null,
        })
        logger.info('Resolved authority template for product form preview', {
          productTypeId: selectedTypeId,
          templateId: authorityTemplate.id,
          source:
            resolvedAuthority.templateResolutionSource ||
            (isEdit
              ? 'backendResolvedTemplate'
              : 'backendCreateTypeResolution'),
          mode: isEdit ? 'edit' : 'create',
        })
      } catch (error) {
        if (cancelled) return

        const message =
          error instanceof Error
            ? `Template binding resolution failed: ${error.message}`
            : 'Template binding resolution failed: unknown error while loading template metadata.'
        setTemplateResolutionState({
          requestIdentity: templateResolutionRequestIdentity,
          template: null,
          error: message,
        })
        logger.error(
          'Template binding resolution failed while loading template metadata',
          error
        )
      }
    }

    void resolveBoundTemplate()

    return () => {
      cancelled = true
    }
  }, [
    isEdit,
    open,
    selectedTypeId,
    selectedTypeName,
    resolvedTemplateId,
    resolvedTemplateKey,
    templateResolutionError,
    templateResolutionSource,
    templateResolutionRequestIdentity,
    usesExistingProductAuthority,
    watchedTypeId,
  ])

  const templateResolutionPending = Boolean(
    open &&
    !templateResolveError &&
    !boundTemplate &&
    (watchedTypeId || resolvedTemplateKey || resolvedTemplateId)
  )

  return {
    boundTemplate,
    templateResolveError,
    templateResolutionPending,
  }
}
