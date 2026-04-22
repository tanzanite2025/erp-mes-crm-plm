import {
  fromLogisticsProviderDtoArray,
  toLogisticsProviderDraft,
  toLogisticsProviderPayload,
} from '@/features/sandbox/logistics-api/adapters/logistics-provider-adapter'
import { type LogisticsProvider, type LogisticsProviderDraft, type LogisticsProviderDto } from '../types'

const STORAGE_KEY = 'xdfc_logistics_sandbox_data'

/**
 * LogisticsMockService - 砂箱本地模拟服务
 * 在正式并网前，通过 localStorage 持久化数据，模拟后端 CRUD 行为。
 * 确保前端交互逻辑的完整性。
 */
export const logisticsMockService = {
  getProviders: (): LogisticsProvider[] => {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? fromLogisticsProviderDtoArray(JSON.parse(data) as LogisticsProviderDto[]) : []
  },

  saveProvider: (provider: LogisticsProviderDraft): LogisticsProvider => {
    const providers = logisticsMockService.getProviders()
    const payload = toLogisticsProviderPayload(provider)
    const now = new Date().toISOString()
    const newProvider = toLogisticsProviderDraft({
      ...payload,
      id: provider.id || Date.now(),
      updatedAt: now,
      createdAt: provider.createdAt || now,
    })

    const index = providers.findIndex(p => p.id === newProvider.id)
    if (index > -1) {
      providers[index] = newProvider
    } else {
      providers.unshift(newProvider)
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(providers))
    return newProvider
  },

  deleteProvider: (id: number): void => {
    const providers = logisticsMockService.getProviders()
    const filtered = providers.filter(p => p.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  }
}
