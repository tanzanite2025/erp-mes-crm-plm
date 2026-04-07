import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type MaterialRequirement, type MrpStats } from '../data/requirement-schema'

type MrpRequirementsResponse = {
  requirements: MaterialRequirement[]
  stats: MrpStats
}

export const requirementService = {
  async getMrpRequirements(selectedKeys: string[] = []): Promise<MrpRequirementsResponse> {
    const params = new URLSearchParams()
    if (selectedKeys.length > 0) {
      params.set('selectedKeys', selectedKeys.join(','))
    }

    const query = params.toString()
    const endpoint = query ? `/mrp/requirements?${query}` : '/mrp/requirements'
    const res = await apiFetch<MrpRequirementsResponse>(endpoint)
    return ensureObjectResponse<MrpRequirementsResponse & Record<string, unknown>>(res, 'RequirementService.getMrpRequirements') as MrpRequirementsResponse
  },
}
