import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import type {
  PieceworkPayItem,
  PieceworkPayItemWriteRequest,
  FinancePieceworkCalculationOptions,
  FinancePieceworkSalaryCalculationRequest,
  FinancePieceworkSalaryCalculationResult,
} from '../contracts/independent-piecework-payroll-api-contract'

export const IndependentPieceworkPayrollService = {
  listPayItems: async () =>
    ensureArrayResponse<PieceworkPayItem>(
      await apiFetch('/piecework/pay-items'),
      'IndependentPieceworkPayrollService.listPayItems'
    ),
  savePayItem: (request: PieceworkPayItemWriteRequest) =>
    apiFetch<PieceworkPayItem>('/piecework/pay-items', {
      method: 'POST',
      body: JSON.stringify({
        ...(request.id ? { id: request.id, version: request.version } : {}),
        name: request.name,
        unit: request.unit,
        status: request.status,
        remarks: request.remarks,
      }),
    }),
  getCalculationOptions: () =>
    apiFetch<FinancePieceworkCalculationOptions>(
      '/piecework/calculation-options'
    ),
  calculateSalary: (request: FinancePieceworkSalaryCalculationRequest) =>
    apiFetch<FinancePieceworkSalaryCalculationResult>('/piecework/calculate', {
      method: 'POST',
      body: JSON.stringify({
        calculationDate: request.calculationDate,
        rows: request.rows.map(
          ({ employeeId, departmentId, payItemId, quantity }) => ({
            employeeId,
            departmentId,
            payItemId,
            quantity,
          })
        ),
      }),
    }),
}
