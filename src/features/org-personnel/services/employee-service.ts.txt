import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { type Employee } from '../data/schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { ensureObjectResponse } from '@/lib/api-response'

const logger = createLogger('EmployeeService')

export type EmployeeStatus = Employee['status']

type BulkUpdateEmployeesStatusResponse = {
    status: 'success'
    updated: number
}

/**
 * EmployeeService - Core service for managing employee profiles, statuses, and bulk operations.
 */
export class EmployeeService {
    /**
     * Fallback mechanism for bulk status updates when a specialized endpoint is unavailable.
     */
    private static async fallbackUpdateEmployeesStatus(ids: string[], status: EmployeeStatus): Promise<number> {
        const employees = await this.getEmployees()
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
                }),
            ),
        )

        return employeesToUpdate.length
    }

    /**
     * Fetch the full roster of employees.
     * @throws Error if the data fetch fails or returns invalid results.
     */
    static async getEmployees(): Promise<Employee[]> {
        const data = await apiFetch<Employee[]>('/employees')
        if (!data) throw new Error('[CRITICAL_DATA_PATH] Failed to fetch employee roster: Null response')
        return data
    }

    /**
     * Create or update an employee record.
     */
    static async saveEmployee(employee: Employee): Promise<Employee> {
        const data = await apiFetch<Employee>('/employees', {
            method: 'POST',
            body: JSON.stringify(employee)
        })
        
        if (!data) {
            throw new Error('[CRITICAL_DATA_PATH] Save employee operation returned no data. Entity ID: ' + (employee.id || 'NEW'))
        }
        
        window.dispatchEvent(new CustomEvent('xdfc_employees_data_updated'))
        return ensureObjectResponse<Employee>(data, 'EmployeeService.saveEmployee') as Employee
    }

    /**
     * Bulk update treatment for employee statuses (e.g., Active -> Resigned).
     */
    static async updateEmployeesStatus(ids: string[], status: EmployeeStatus): Promise<number> {
        let updated = 0

        try {
            const data = await apiFetch<BulkUpdateEmployeesStatusResponse>('/employees/status', {
                method: 'PATCH',
                body: JSON.stringify({ ids, status })
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
            updated = await this.fallbackUpdateEmployeesStatus(ids, status)
        }

        window.dispatchEvent(new CustomEvent('xdfc_employees_data_updated'))
        return updated
    }

    /**
     * Delete multiple employee records permanently.
     */
    static async deleteEmployees(ids: string[]): Promise<void> {
        await apiFetch(`/employees/${ids.join(',')}`, {
            method: 'DELETE'
        })
        window.dispatchEvent(new CustomEvent('xdfc_employees_data_updated'))
    }

    /**
     * Bulk synchronize roster data (Data recovery / External sync).
     */
    static async syncEmployees(employees: Employee[]): Promise<unknown> {
        return await apiFetch('/employees/sync', {
            method: 'POST',
            body: JSON.stringify(employees)
        })
    }

    /**
     * Patch Employee (SDRTS Delta Protocol)
     */
    static async patchEmployee(id: string, delta: DeltaSet, version: number): Promise<Employee> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id, version }
        };

        const res = await apiFetch<Employee>(`/employees/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        
        if (!res) {
            throw new Error(`[CRITICAL_DATA_PATH] Patch employee failed for ID ${id}. SDRTS Sync halted.`)
        }

        window.dispatchEvent(new CustomEvent('xdfc_employees_data_updated'));
        return ensureObjectResponse<Employee & Record<string, unknown>>(res, 'EmployeeService.patchEmployee') as Employee;
    }
}
