import type { FinancePieceworkSalaryCalculatedRow } from '../contracts/independent-piecework-payroll-api-contract'

export function formatFinanceSalaryCurrencyCents(
  value: number | bigint
): string {
  const cents = BigInt(value)
  const absolute = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`
}

export function summarizeFinanceSalaryByEmployeeDepartmentAndCurrency(
  rows: FinancePieceworkSalaryCalculatedRow[],
  groupBy: 'employee' | 'department'
) {
  const groups = new Map<
    string,
    {
      key: string
      name: string
      departmentName: string
      currency: string
      amountCents: bigint
    }
  >()
  for (const row of rows) {
    const key = JSON.stringify([
      groupBy === 'employee' ? row.employeeId : '',
      row.departmentId,
      row.currency,
    ])
    const group = groups.get(key) ?? {
      key,
      name:
        groupBy === 'employee'
          ? `${row.staffId} / ${row.employeeName}`
          : row.departmentName,
      departmentName: row.departmentName,
      currency: row.currency,
      amountCents: 0n,
    }
    group.amountCents += BigInt(row.amountCents)
    groups.set(key, group)
  }
  return [...groups.values()]
}
