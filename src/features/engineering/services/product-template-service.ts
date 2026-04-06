import { apiFetch } from '@/lib/api-client'

import { type ProductTemplate } from '../data/schema'

export { type ProductTemplate }

export const productTemplateService = {
  getTemplates: async (): Promise<ProductTemplate[]> => {
    return apiFetch<ProductTemplate[]>('/engineering/templates')
  },

  saveTemplate: async (template: Partial<ProductTemplate>): Promise<ProductTemplate> => {
    return apiFetch<ProductTemplate>('/engineering/templates', {
      method: 'POST',
      body: JSON.stringify(template),
    })
  },

  deleteTemplate: async (id: string): Promise<void> => {
    return apiFetch(`/engineering/templates/${id}`, {
      method: 'DELETE',
    })
  },

  sync: async (templates: ProductTemplate[]) => {
    return apiFetch<{ count: number }>('/engineering/templates/sync', {
      method: 'POST',
      body: JSON.stringify(templates),
    })
  },
}
