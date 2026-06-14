import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  type SavePackagingRuleInput,
  toPackagingRuleContract,
  toPackagingRuleContracts,
  toSavePackagingRuleApiDTO,
} from '../adapters/packaging-api-adapter'
import { type PackagingRuleApiDTO } from '../contracts/packaging-api-dto'
import { type PackagingRule } from '../data/schema'

export const packagingService = {
  async getRules(): Promise<PackagingRule[]> {
    const data = await apiFetch<PackagingRuleApiDTO[]>('/packaging')
    return toPackagingRuleContracts(
      ensureArrayResponse<PackagingRuleApiDTO>(
        data,
        'packagingService.getRules'
      )
    )
  },

  async getRuleByMaterialId(materialId: string): Promise<PackagingRule | null> {
    const data = await apiFetch<PackagingRuleApiDTO[]>(
      `/packaging?materialId=${materialId}`
    )
    const rules = toPackagingRuleContracts(
      ensureArrayResponse<PackagingRuleApiDTO>(
        data,
        'packagingService.getRuleByMaterialId'
      )
    )
    return rules[0] || null
  },

  async saveRule(rule: SavePackagingRuleInput): Promise<PackagingRule> {
    const result = await apiFetch<PackagingRuleApiDTO>('/packaging', {
      method: 'POST',
      body: JSON.stringify(toSavePackagingRuleApiDTO(rule)),
    })

    const saved = toPackagingRuleContract(
      ensureObjectResponse<PackagingRuleApiDTO & Record<string, unknown>>(
        result,
        'packagingService.saveRule'
      ) as PackagingRuleApiDTO
    )
    return saved
  },

  async deleteRule(id: string): Promise<void> {
    await apiFetch(`/packaging/${id}`, {
      method: 'DELETE',
    })
  },
}
