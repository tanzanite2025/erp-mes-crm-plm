export interface EmployeeApiDTO {
  id: string
  staffId?: string
  name: string
  phone: string
  gender?: string
  birthday?: string | null
  idCard?: string
  maskedIdCard?: string
  emergencyPhone?: string
  address?: string
  bankCard?: string
  maskedBankCard?: string
  bankName?: string
  education?: string
  age?: number
  status: 'active' | 'resigned' | 'on-leave'
  joinedDate?: string | null
  workYears?: string
  deptId?: string
  lineId?: string
  processId?: string
  positionId?: string
  deptName?: string
  lineName?: string
  processName?: string
  positionName?: string
  createdAt?: string
  updatedAt?: string
  version?: number
}

export interface EmployeeAssignmentCommandApiDTO {
  employee: EmployeeApiDTO
  assignment: {
    assignmentId: string
    employeeId: string
    orgUnitId?: string
    positionId?: string
    productionUnitId?: string
    assignmentType: string
    isPrimary: boolean
    startDate: string
    endDate?: string | null
    status: string
    source: string
    remarks?: string
  }
}
