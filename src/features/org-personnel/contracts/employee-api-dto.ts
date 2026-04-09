export interface EmployeeApiDTO {
  id: string
  staffId?: string
  name: string
  phone: string
  gender?: string
  birthday?: string | null
  idCard?: string
  emergencyPhone?: string
  address?: string
  bankCard?: string
  bankName?: string
  education?: string
  age?: number
  station?: string
  status: 'active' | 'resigned' | 'on-leave'
  joinedDate?: string | null
  deptId?: string
  lineId?: string
  processId?: string
  deptName?: string
  lineName?: string
  processName?: string
  createdAt?: string
  updatedAt?: string
  version?: number
}
