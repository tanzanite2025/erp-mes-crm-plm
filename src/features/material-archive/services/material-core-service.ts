import { type Material } from '../data/schema'
import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'

/**
 * MaterialCoreService: 专注于物料档案的只读查询与数据聚合
 * 遵循 [Backend Authority] 核心哲学：前端仅提供响应式展示，逻辑校验在后端终结。
 */
export const MaterialCoreService = {
  /**
   * 获取物料选项列表 (用于下拉选择)
   */
  async getMaterialOptions(): Promise<Material[]> {
    const res = await apiFetch<Material[]>('/materials?options=true')
    return ensureArrayResponse<Material>(res, 'MaterialCoreService.getMaterialOptions')
  },

  /**
   * 获取分页物料列表 (基础查询)
   */
  async getMaterials(
    category?: string,
    page: number = 1,
    pageSize: number = 20,
    search: string = ''
  ): Promise<{ data: Material[]; total: number }> {
    const { molds: data, total } = await this.getMaterialsWithVersion(category, page, pageSize, search)
    return { data, total }
  },

  /**
   * 获取物料列表及其全局快照版本 (用于 Excel 导出锁定或并发校验)
   */
  async getMaterialsWithVersion(
    category?: string,
    page: number = 1,
    pageSize: number = 20,
    search: string = ''
  ): Promise<{ molds: Material[]; total: number; version: string }> {
    const params = new URLSearchParams()
    if (category && category !== 'all') params.append('category', category.toUpperCase())
    params.append('page', page.toString())
    params.append('pageSize', pageSize.toString())
    if (search) params.append('search', search)

    const endpoint = `/materials?${params.toString()}`

    const res = await apiFetch<{ data: Material[]; total: number; version: string }>(endpoint)
    const checked = ensureObjectResponse<{ data: Material[]; total: number; version: string } & Record<string, unknown>>(
      res,
      'MaterialCoreService.getMaterialsWithVersion'
    )

    return {
      molds: checked.data,
      total: checked.total || 0,
      version: checked.version || '1',
    }
  },
}
