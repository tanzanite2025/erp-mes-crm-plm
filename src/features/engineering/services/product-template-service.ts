import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload } from '@/lib/delta/types'
import { normalizeComponentKey, normalizeMachineCode } from '@/lib/codecs/code-normalization'
import { buildProductTemplateDelta, toProductTemplateApiDTO, toProductTemplateContract } from '../adapters/product-template-api-adapter'
import { type ProductTemplateApiDTO } from '../contracts/product-template-api-dto'

import { type ProductTemplate } from '../data/schema'
import { type SaveProductTemplateInput } from '../mutation-types'

export { type ProductTemplate }

let templateCache: ProductTemplate[] | null = null
let templateRequest: Promise<ProductTemplate[]> | null = null

function invalidateTemplateCache() {
  templateCache = null
  templateRequest = null
}

function normalizeProductTemplateInput(template: SaveProductTemplateInput): SaveProductTemplateInput {
  return {
    ...template,
    code: normalizeMachineCode(template.code),
    componentKey: normalizeComponentKey(template.componentKey) as SaveProductTemplateInput['componentKey'],
  }
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

  createTemplate: async (template: SaveProductTemplateInput): Promise<ProductTemplate> => {
    const normalizedTemplate = normalizeProductTemplateInput(template)
    const saved = await apiFetch<ProductTemplateApiDTO>('/engineering/templates', {
      method: 'POST',
      body: JSON.stringify(toProductTemplateApiDTO({ ...normalizedTemplate, id: '', version: 1 })),
    })
    invalidateTemplateCache()
    return toProductTemplateContract(
      ensureObjectResponse<ProductTemplateApiDTO & Record<string, unknown>>(
        saved,
        'productTemplateService.createTemplate'
      ) as ProductTemplateApiDTO
    )
  },

  patchTemplate: async (current: ProductTemplate, next: SaveProductTemplateInput): Promise<ProductTemplate> => {
    const normalizedNext = normalizeProductTemplateInput(next)
    const delta = buildProductTemplateDelta(current, normalizedNext)
    if (Object.keys(delta).length === 0) {
      return { ...current, ...normalizedNext }
    }

    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id: current.id, version: current.version, intent: 'ENGINEERING_PRODUCT_TEMPLATE_UPDATE' },
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

  saveTemplate: async (template: SaveProductTemplateInput, current?: ProductTemplate): Promise<ProductTemplate> => {
    if (current?.id) {
      return productTemplateService.patchTemplate(current, normalizeProductTemplateInput(template))
    }
    return productTemplateService.createTemplate(normalizeProductTemplateInput(template))
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
