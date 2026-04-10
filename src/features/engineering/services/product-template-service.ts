import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload } from '@/lib/delta/types'
import { buildProductTemplateDelta, toProductTemplateApiDTO, toProductTemplateContract } from '../adapters/product-template-api-adapter'
import { type ProductTemplateApiDTO } from '../contracts/product-template-api-dto'

import { type ProductTemplate } from '../data/schema'

export { type ProductTemplate }

let templateCache: ProductTemplate[] | null = null
let templateRequest: Promise<ProductTemplate[]> | null = null

function invalidateTemplateCache() {
  templateCache = null
  templateRequest = null
}

export const productTemplateService = {
  getTemplates: async (options?: { fresh?: boolean }): Promise<ProductTemplate[]> => {
    if (options?.fresh) invalidateTemplateCache()
    if (templateCache) return templateCache

    if (!templateRequest) {
      templateRequest = apiFetch<ProductTemplateApiDTO[]>('/engineering/templates?options=true')
        .then((response) => {
          const templates = ensureArrayResponse<ProductTemplateApiDTO>(
            response,
            'productTemplateService.getTemplates'
          ).map(toProductTemplateContract)
          templateCache = templates
          return templates
        })
        .finally(() => {
          templateRequest = null
        })
    }

    return templateRequest
  },

  createTemplate: async (template: Partial<ProductTemplate>): Promise<ProductTemplate> => {
    const saved = await apiFetch<ProductTemplateApiDTO>('/engineering/templates', {
      method: 'POST',
      body: JSON.stringify(toProductTemplateApiDTO({ ...template, id: '', version: 1 })),
    })
    invalidateTemplateCache()
    return toProductTemplateContract(
      ensureObjectResponse<ProductTemplateApiDTO & Record<string, unknown>>(
        saved,
        'productTemplateService.createTemplate'
      ) as ProductTemplateApiDTO
    )
  },

  patchTemplate: async (current: ProductTemplate, next: Partial<ProductTemplate>): Promise<ProductTemplate> => {
    const delta = buildProductTemplateDelta(current, next)
    if (Object.keys(delta).length === 0) {
      return { ...current, ...next }
    }

    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id: current.id, version: current.version },
    }
    const saved = await apiFetch<ProductTemplateApiDTO>(`/engineering/templates/${current.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    invalidateTemplateCache()
    return toProductTemplateContract(
      ensureObjectResponse<ProductTemplateApiDTO & Record<string, unknown>>(
        saved,
        'productTemplateService.patchTemplate'
      ) as ProductTemplateApiDTO
    )
  },

  saveTemplate: async (template: Partial<ProductTemplate>, current?: ProductTemplate): Promise<ProductTemplate> => {
    if (current?.id) {
      return productTemplateService.patchTemplate(current, template)
    }
    return productTemplateService.createTemplate(template)
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiFetch(`/engineering/templates/${id}`, {
      method: 'DELETE',
    })
    invalidateTemplateCache()
  },

  sync: async (templates: ProductTemplate[]) => {
    const result = await apiFetch<{ count: number }>('/engineering/templates/sync', {
      method: 'POST',
      body: JSON.stringify(templates),
    })
    invalidateTemplateCache()
    return result
  },
}
