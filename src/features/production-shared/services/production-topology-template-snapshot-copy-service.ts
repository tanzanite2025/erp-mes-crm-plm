import { apiFetch } from '@/lib/api-client'
import { toProductionLineContract } from '../adapters/production-resource-api-adapter'
import type { ProductionLineApiDTO } from '../contracts/production-resource-api-dto'
import type { ProductionTopologyTemplate } from '../data/production-line'

export const productionTopologyTemplateSnapshotCopyService = {
  async list(): Promise<ProductionTopologyTemplate[]> {
    const response = await apiFetch<{ items: ProductionTopologyTemplate[] }>(
      '/production/topology-templates'
    )
    return response.items
  },
  captureFromLine(input: {
    sourceLineId: string
    sourceLineVersion: number
    name: string
    description: string
  }): Promise<ProductionTopologyTemplate> {
    return apiFetch('/production/topology-templates/from-line', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  update(
    template: ProductionTopologyTemplate
  ): Promise<ProductionTopologyTemplate> {
    return apiFetch(`/production/topology-templates/${template.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: template.name,
        description: template.description || '',
        version: template.version,
        snapshot: template.snapshot,
      }),
    })
  },
  async applyToNewLine(template: ProductionTopologyTemplate, code: string) {
    const response = await apiFetch<ProductionLineApiDTO>(
      `/production/topology-templates/${template.id}/apply`,
      {
        method: 'POST',
        body: JSON.stringify({ version: template.version, code }),
      }
    )
    return toProductionLineContract(response)
  },
  async remove(template: ProductionTopologyTemplate): Promise<void> {
    await apiFetch(`/production/topology-templates/${template.id}`, {
      method: 'DELETE',
      body: JSON.stringify({ version: template.version }),
    })
  },
}
