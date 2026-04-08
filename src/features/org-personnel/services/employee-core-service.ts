import { apiFetch } from '@/lib/api-client'
import { type Employee } from '../data/schema'

/**
 * EmployeeCoreService - 负责员工档案的只读查询与 DTO 校验。
 * 遵循“后端权威”原则。
 */
export const EmployeeCoreService = {
  /**
   * 获取全量员工名册
   * @throws Error 如果获取失败或返回空响应
   */
  getEmployees: async (): Promise<Employee[]> => {
    const data = await apiFetch<Employee[]>('/employees')
    if (!data) {
      throw new Error('[CRITICAL_DATA_PATH] Failed to fetch employee roster: Null response')
    }
    return data
  },

  /**
   * 按 ID 获取单个员工信息 (预留)
   */
  getEmployeeById: async (id: string): Promise<Employee> => {
    const data = await apiFetch<Employee>(`/employees/${id}`)
    if (!data) {
      throw new Error(`[CRITICAL_DATA_PATH] Failed to fetch employee: ${id}`)
    }
    return data
  },
}
