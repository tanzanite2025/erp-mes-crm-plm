import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FinancePieceworkSalaryCalculatedRow } from '../contracts/independent-piecework-payroll-api-contract'
import {
  formatFinanceSalaryCurrencyCents,
  summarizeFinanceSalaryByEmployeeDepartmentAndCurrency,
} from './finance-salary-currency-cent-formatting-and-personnel-department-summary'
import { IndependentPieceworkPayrollService } from './independent-piecework-payroll-service'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/lib/api-client', () => ({ apiFetch }))

const salaryRow: FinancePieceworkSalaryCalculatedRow = {
  employeeId: 'person-1',
  employeeName: 'Person',
  staffId: 'E001',
  departmentId: 'dept-1',
  departmentName: 'Department',
  payItemId: 'step-1',
  payItemName: 'Step',
  quantity: 3,
  unit: 'PCS',
  unitPrice: 2,
  currency: 'CNY',
  amountCents: 600,
}

describe('finance salary calculation', () => {
  beforeEach(() => apiFetch.mockReset())
  it('sends only financial calculation inputs without report or payment fields', async () => {
    apiFetch.mockResolvedValue({ rows: [salaryRow] })
    await IndependentPieceworkPayrollService.calculateSalary({
      calculationDate: '2026-10-15',
      rows: [salaryRow],
    })
    expect(apiFetch).toHaveBeenCalledExactlyOnceWith('/piecework/calculate', {
      method: 'POST',
      body: JSON.stringify({
        calculationDate: '2026-10-15',
        rows: [
          {
            employeeId: 'person-1',
            departmentId: 'dept-1',
            payItemId: 'step-1',
            quantity: 3,
          },
        ],
      }),
    })
  })
  it('allows changing quantity and recalculating directly', async () => {
    apiFetch.mockResolvedValue({ rows: [] })
    for (const quantity of [3, 4])
      await IndependentPieceworkPayrollService.calculateSalary({
        calculationDate: '2026-10-15',
        rows: [{ ...salaryRow, quantity }],
      })
    expect(apiFetch).toHaveBeenCalledTimes(2)
    expect(JSON.parse(apiFetch.mock.calls[1][1].body).rows[0].quantity).toBe(4)
  })
  it('groups people by department and keeps currencies separate', () => {
    const rows = [
      salaryRow,
      { ...salaryRow, payItemId: 'step-2', amountCents: 1500 },
      { ...salaryRow, employeeId: 'person-2', amountCents: 800 },
      { ...salaryRow, currency: 'USD', amountCents: 100 },
    ]
    expect(
      summarizeFinanceSalaryByEmployeeDepartmentAndCurrency(
        rows,
        'employee'
      ).map((group) => group.amountCents)
    ).toEqual([2100n, 800n, 100n])
    expect(
      summarizeFinanceSalaryByEmployeeDepartmentAndCurrency(
        rows,
        'department'
      ).map((group) => group.amountCents)
    ).toEqual([2900n, 100n])
  })
  it('sums integer cents without binary decimal rounding', () => {
    const groups = summarizeFinanceSalaryByEmployeeDepartmentAndCurrency(
      [
        { ...salaryRow, amountCents: 10 },
        { ...salaryRow, amountCents: 20 },
      ],
      'employee'
    )
    expect(formatFinanceSalaryCurrencyCents(groups[0].amountCents)).toBe('0.30')
    expect(formatFinanceSalaryCurrencyCents(999999999999)).toBe('9999999999.99')
  })
})
