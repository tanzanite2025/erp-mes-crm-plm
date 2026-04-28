import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import type { BatchOptimizerSolveRequest, BatchOptimizerSolveResponse } from '../types/batch-engine-api'

export const BatchEngineApi = {
  async solve(request: BatchOptimizerSolveRequest): Promise<BatchOptimizerSolveResponse> {
    const res = await apiFetch<BatchOptimizerSolveResponse>('/raw-materials/batch-optimizer/solve', {
      method: 'POST',
      body: JSON.stringify(request),
    })

    return ensureObjectResponse<BatchOptimizerSolveResponse & Record<string, unknown>>(
      res,
      'BatchEngineApi.solve'
    )
  },
}
