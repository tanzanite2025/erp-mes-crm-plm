import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  toProductTemplateApiDTO,
  toProductTemplateContract,
} from '../adapters/product-template-api-adapter'
import { type ProductTemplateApiDTO } from '../contracts/product-template-api-dto'
import { type ProductTemplate } from '../data/schema'
import { type SaveProductTemplateInput } from '../mutation-types'
import { normalizeProductTemplateInput } from '../utils/product-code-normalization'

export { type ProductTemplate }

let templateRequest: Promise<ProductTemplate[]> | null = null

function invalidatePendingProductTemplateReadRequest() {
  templateRequest = null
}

export const productTemplateService = {
  getTemplates: async (options?: {
    fresh?: boolean
  }): Promise<ProductTemplate[]> => {
    if (options?.fresh) invalidatePendingProductTemplateReadRequest()

    if (!templateRequest) {
      const pendingTemplateRequest = apiFetch<ProductTemplateApiDTO[]>(
        '/engineering/templates?options=true'
      )
        .then((response) => {
          return ensureArrayResponse<ProductTemplateApiDTO>(
            response,
            'productTemplateService.getTemplates'
          ).map(toProductTemplateContract)
        })
        .finally(() => {
          if (templateRequest === pendingTemplateRequest) {
            templateRequest = null
          }
        })
      templateRequest = pendingTemplateRequest
    }

    return templateRequest
  },

  createTemplate: async (
    template: SaveProductTemplateInput
  ): Promise<ProductTemplate> => {
    const normalizedTemplate = normalizeProductTemplateInput(template)
    const saved = await apiFetch<ProductTemplateApiDTO>(
      '/engineering/templates',
      {
        method: 'POST',
        body: JSON.stringify(
          toProductTemplateApiDTO({ ...normalizedTemplate, id: '', version: 1 })
        ),
      }
    )
    invalidatePendingProductTemplateReadRequest()
    return toProductTemplateContract(
      ensureObjectResponse<ProductTemplateApiDTO & Record<string, unknown>>(
        saved,
        'productTemplateService.createTemplate'
      ) as ProductTemplateApiDTO
    )
  },

  patchTemplate: async (
    current: ProductTemplate,
    next: SaveProductTemplateInput
  ): Promise<ProductTemplate> => {
    const normalizedNext = normalizeProductTemplateInput(next)
    const saved = await apiFetch<ProductTemplateApiDTO>(
      '/engineering/templates',
      {
        method: 'POST',
        body: JSON.stringify(
          toProductTemplateApiDTO({
            ...current,
            ...normalizedNext,
            id: current.id,
            version: current.version,
          })
        ),
      }
    )
    invalidatePendingProductTemplateReadRequest()
    return toProductTemplateContract(
      ensureObjectResponse<ProductTemplateApiDTO & Record<string, unknown>>(
        saved,
        'productTemplateService.patchTemplate'
      ) as ProductTemplateApiDTO
    )
  },

  saveTemplate: async (
    template: SaveProductTemplateInput,
    current?: ProductTemplate
  ): Promise<ProductTemplate> => {
    if (current?.id) {
      return productTemplateService.patchTemplate(
        current,
        normalizeProductTemplateInput(template)
      )
    }
    return productTemplateService.createTemplate(
      normalizeProductTemplateInput(template)
    )
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiFetch(`/engineering/templates/${id}`, {
      method: 'DELETE',
    })
    invalidatePendingProductTemplateReadRequest()
  },

  sync: async (templates: ProductTemplate[]) => {
    const normalizedTemplates = templates.map(normalizeProductTemplateInput)
    const result = await apiFetch<{ count: number }>(
      '/engineering/templates/sync',
      {
        method: 'POST',
        body: JSON.stringify(normalizedTemplates),
      }
    )
    invalidatePendingProductTemplateReadRequest()
    return result
  },
}
