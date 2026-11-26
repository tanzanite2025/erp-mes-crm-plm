import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'

export interface BOMProductionLineOption {
  id: string
  code: string
  name: string
}

interface BOMProductionLineOptionsResponse {
  items: BOMProductionLineOption[]
}

export const BOMProductionLineOptionService = {
  async getActiveProductionLines(): Promise<BOMProductionLineOption[]> {
    const response = await apiFetch<BOMProductionLineOptionsResponse>(
      '/engineering/production-line-options'
    )
    const checked = ensureObjectResponse<
      BOMProductionLineOptionsResponse & Record<string, unknown>
    >(response, 'BOMProductionLineOptionService.getActiveProductionLines')
    return checked.items
  },
}
