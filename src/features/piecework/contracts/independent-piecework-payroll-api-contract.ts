export interface PieceworkPayItem {
  id: string
  code: string
  name: string
  unit: string
  status: 'active' | 'inactive'
  remarks: string
  version: number
}

export type PieceworkPayItemWriteRequest = Omit<
  PieceworkPayItem,
  'id' | 'code' | 'version'
> & {
  id?: string
  version?: number
}

export interface FinancePieceworkCalculationOptions {
  employees: {
    id: string
    staffId: string
    name: string
    departmentId: string
  }[]
  departments: { id: string; name: string }[]
}

export interface FinancePieceworkSalaryInputRow {
  employeeId: string
  departmentId: string
  payItemId: string
  quantity: number
}

export interface FinancePieceworkSalaryCalculationRequest {
  calculationDate: string
  rows: FinancePieceworkSalaryInputRow[]
}

export interface FinancePieceworkSalaryCalculatedRow extends FinancePieceworkSalaryInputRow {
  employeeName: string
  staffId: string
  departmentName: string
  payItemName: string
  unit: string
  unitPrice: number
  currency: string
  amountCents: number
}

export interface FinancePieceworkSalaryCalculationResult {
  rows: FinancePieceworkSalaryCalculatedRow[]
}
