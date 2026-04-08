import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { type Employee } from '../data/schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { ensureObjectResponse } from '@/lib/api-response'
import { EmployeeCoreService } from './employee-core-service'

const logger = createLogger('EmployeeMaintenanceService')

type EmployeeStatus = Employee['status']

type BulkUpdateEmployeesStatusResponse = {
    status: 'success'
    updated: number
}

/**
 * EmployeeMaintenanceService - 负责员工档案的维护、状态变更及 SDRTS 协议实现。
 * [PURGE SIDE-EFFECTS] 本服务严禁使用 window.dispatchEvent。
 */
export const EmployeeMaintenanceService = {
  /**
   * 保存或更新员工记录 (全量更新)
   */
  saveEmployee: async (employee: Employee): Promise<Employee> => {
    const data = await apiFetch<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(employee),
    })

    if (!data) {
      throw new Error(
        '[CRITICAL_DATA_PATH] Save employee operation returned no data. Entity ID: ' +
          (employee.id || 'NEW')
      )
    }

    return ensureObjectResponse<Employee>(data, 'EmployeeMaintenanceService.saveEmployee') as Employee
  },

  /**
   * 批量更新员工状态 (如 Active -> Resigned)
   */
  updateEmployeesStatus: async (ids: string[], status: EmployeeStatus): Promise<number> => {
    let updated = 0

    try {
      const data = await apiFetch<BulkUpdateEmployeesStatusResponse>('/employees/status', {
        method: 'PATCH',
        body: JSON.stringify({ ids, status }),
      })
      updated = data?.updated ?? 0
    } catch (error) {
      const isMissingBulkEndpoint =
        error instanceof Error &&
        'status' in error &&
        (error as { status?: number }).status === 404

      if (!isMissingBulkEndpoint) {
        throw error
      }

      logger.warn('Bulk status endpoint unavailable, falling back to per-employee updates.')
      updated = await fallbackUpdateEmployeesStatus(ids, status)
    }

    return updated
  },

  /**
   * 物理删除多条员工记录
   */
  deleteEmployees: async (ids: string[]): Promise<void> => {
    await apiFetch(`/employees/${ids.join(',')}`, {
      method: 'DELETE',
    })
  },

  /**
   * 局部更新员工 (SDRTS Delta Protocol)
   */
  patchEmployee: async (id: string, delta: DeltaSet, version: number): Promise<Employee> => {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id, version },
    }

    const res = await apiFetch<Employee>(`/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    if (!res) {
      throw new Error(`[CRITICAL_DATA_PATH] Patch employee failed for ID ${id}. SDRTS Sync halted.`)
    }

    return ensureObjectResponse<Employee & Record<string, unknown>>(
      res,
      'EmployeeMaintenanceService.patchEmployee'
    ) as Employee
  },
}

/**
 * 内部兜底机制：当后端不支持批量状态更新接口时，回退到循环处理
 */
async function fallbackUpdateEmployeesStatus(ids: string[], status: EmployeeStatus): Promise<number> {
  const employees = await EmployeeCoreService.getEmployees()
  const employeesToUpdate = employees.filter((employee) => ids.includes(employee.id))

  if (employeesToUpdate.length === 0) {
    return 0
  }

  await Promise.all(
    employeesToUpdate.map((employee) =>
      apiFetch<Employee>('/employees', {
        method: 'POST',
        body: JSON.stringify({
          ...employee,
          status,
        }),
      })
    )
  )

  return employeesToUpdate.length
}
