import { apiFetch } from '@/lib/api-client'
import {
  fromLogisticsProviderDto,
  fromLogisticsProviderDtoArray,
  toLogisticsProviderPayload,
} from '@/features/sandbox/logistics-api/adapters/logistics-provider-adapter'
import { type LogisticsProvider, type LogisticsProviderDraft, type LogisticsProviderDto } from '../types'

const PROVIDERS_ENDPOINT = '/logistics-push/providers'

export const logisticsProviderService = {
  async getProviders(): Promise<LogisticsProvider[]> {
    const response = await apiFetch<LogisticsProviderDto[]>(PROVIDERS_ENDPOINT)
    return fromLogisticsProviderDtoArray(response)
  },

  async saveProvider(provider: LogisticsProviderDraft): Promise<LogisticsProvider> {
    const response = await apiFetch<LogisticsProviderDto>(PROVIDERS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(toLogisticsProviderPayload(provider)),
    })
    return fromLogisticsProviderDto(response)
  },

  deleteProvider(id: number) {
    return apiFetch<void>(`${PROVIDERS_ENDPOINT}/${id}`, {
      method: 'DELETE',
    })
  },

  async verifyProvider(id: number): Promise<LogisticsProvider> {
    const response = await apiFetch<LogisticsProviderDto>(`${PROVIDERS_ENDPOINT}/${id}/verify`, {
      method: 'POST',
    })
    return fromLogisticsProviderDto(response)
  },
}
