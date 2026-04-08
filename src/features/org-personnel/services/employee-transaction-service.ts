import { apiFetch } from '@/lib/api-client'
import { type Employee } from '../data/schema'

/**
 * EmployeeTransactionService - 负责员工档案的大规模同步或跨模块事务处理情况情况总量情况情况。
 */
export const EmployeeTransactionService = {
  /**
   * 批量同步员工名册 (数据恢复 / 外部同步)
   */
  syncEmployees: async (employees: Employee[]): Promise<unknown> => {
    return await apiFetch('/employees/sync', {
      method: 'POST',
      body: JSON.stringify(employees),
    })
  },
}
