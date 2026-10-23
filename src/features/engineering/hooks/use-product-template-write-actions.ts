import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AUDIT_MODULES } from '@/features/audit-timeline/data/audit-modules'
import { auditTimelineQueryKeys } from '@/features/audit-timeline/query-keys'
import { type ProductTemplate } from '../data/schema'
import { type SaveProductTemplateInput } from '../mutation-types'
import {
  PRODUCT_TEMPLATES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
  PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
} from '../query-keys'
import { productTemplateService } from '../services/product-template-service'
import { normalizeProductTemplateInput } from '../utils/product-code-normalization'

interface SaveProductTemplateParams {
  formData: SaveProductTemplateInput
  currentRow?: ProductTemplate
}

export function useProductTemplateWriteActions() {
  const queryClient = useQueryClient()

  const saveTemplateMutation = useMutation({
    mutationFn: ({ formData, currentRow }: SaveProductTemplateParams) =>
      productTemplateService.saveTemplate(
        normalizeProductTemplateInput(formData),
        currentRow
      ),
    onSuccess: async () => {
      await Promise.all(
        [
          PRODUCT_TEMPLATES_QUERY_KEY,
          PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
          PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
          [...auditTimelineQueryKeys.all, AUDIT_MODULES.productTemplate],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      )
    },
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => productTemplateService.deleteTemplate(id),
    onSuccess: async () => {
      await Promise.all(
        [
          PRODUCT_TEMPLATES_QUERY_KEY,
          PRODUCT_ATTRIBUTE_CATEGORIES_QUERY_KEY,
          PRODUCT_ATTRIBUTE_OPTIONS_QUERY_KEY,
          [...auditTimelineQueryKeys.all, AUDIT_MODULES.productTemplate],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      )
    },
  })

  return {
    saveTemplate: saveTemplateMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    isSavingTemplate: saveTemplateMutation.isPending,
    isDeletingTemplate: deleteTemplateMutation.isPending,
  }
}
