import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { type Team, type PieceworkRate } from '../data/schema'

/**
 * PieceworkCoreService - 专门负责计件模块的只读查询逻辑 (Logic-Hook-UI)情况情况总量。
 */
export const PieceworkCoreService = {
  /**
   * 获取所有生产班组
   */
  getTeams: async (): Promise<Team[]> => {
    const res = await apiFetch<Team[]>('/piecework/teams')
    return ensureArrayResponse<Team>(res, 'PieceworkCoreService.getTeams')
  },

  /**
   * 获取所有计件工价规则
   */
  getPieceworkRates: async (): Promise<PieceworkRate[]> => {
    const res = await apiFetch<PieceworkRate[]>('/piecework/rates')
    return ensureArrayResponse<PieceworkRate>(
      res,
      'PieceworkCoreService.getPieceworkRates'
    )
  },
}
