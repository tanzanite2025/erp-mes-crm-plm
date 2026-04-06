import { apiFetch } from '@/lib/api-client'
import { type LogisticsProvider } from '../types'

const PROVIDERS_ENDPOINT = '/logistics-push/providers'

export const logisticsProviderService = {
  getProviders() {
    return apiFetch<LogisticsProvider[]>(PROVIDERS_ENDPOINT)
  },

  saveProvider(provider: LogisticsProvider) {
    return apiFetch<LogisticsProvider>(PROVIDERS_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify(provider),
    })
  },

  deleteProvider(id: number) {
    return apiFetch<void>(`${PROVIDERS_ENDPOINT}/${id}`, {
      method: 'DELETE',
    })
  },
}
