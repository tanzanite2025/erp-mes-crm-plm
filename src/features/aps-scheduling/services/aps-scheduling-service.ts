import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toApsSchedulingContract,
  type ApsSchedulingContract,
} from '../adapters/aps-scheduling-api-adapter'
import type { ApsSchedulingListApiDTO } from '../contracts/aps-scheduling-api-dto'

export type GetApsSchedulingOptions = {
  page?: number
  pageSize?: number
  lineName?: string
  status?: string[]
}

export const getApsScheduling = async (
  options: GetApsSchedulingOptions = {}
): Promise<ApsSchedulingContract> => {
  const { page = 1, pageSize = 50, lineName, status } = options
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })

  if (lineName) params.set('lineName', lineName)
  if (status && status.length > 0) params.set('status', status.join(','))

  const res = await apiFetch<ApsSchedulingListApiDTO>(
    `/aps-scheduling/plans?${params.toString()}`
  )
  const response = ensureObjectResponse<
    ApsSchedulingListApiDTO & Record<string, unknown>
  >(res, 'ApsSchedulingService.getApsScheduling')
  return toApsSchedulingContract(response)
}
