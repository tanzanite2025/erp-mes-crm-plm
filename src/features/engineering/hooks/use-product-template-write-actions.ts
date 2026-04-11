import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type ProductTemplate } from '../data/schema'
import { type SaveProductTemplateInput } from '../mutation-types'
import { PRODUCT_TEMPLATES_QUERY_KEY } from '../query-keys'
import { productTemplateService } from '../services/product-template-service'

interface SaveProductTemplateParams {
  formData: SaveProductTemplateInput
  currentRow?: ProductTemplate
}

export function useProductTemplateWriteActions() {
  const queryClient = useQueryClient()

  const saveTemplateMutation = useMutation({
    mutationFn: ({ formData, currentRow }: SaveProductTemplateParams) =>
      productTemplateService.saveTemplate(formData, currentRow),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCT_TEMPLATES_QUERY_KEY })
    },
  })

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => productTemplateService.deleteTemplate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PRODUCT_TEMPLATES_QUERY_KEY })
    },
  })

  return {
    saveTemplate: saveTemplateMutation.mutateAsync,
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    isSavingTemplate: saveTemplateMutation.isPending,
    isDeletingTemplate: deleteTemplateMutation.isPending,
  }
}
