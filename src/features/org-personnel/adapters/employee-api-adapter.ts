import type { Employee } from '../data/schema'
import type { EmployeeApiDTO } from '../contracts/employee-api-dto'

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

function normalizeOptionalDate(value: string | null | undefined): string | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized === '' ? undefined : normalized
}

export function toEmployeeContract(dto: EmployeeApiDTO): Employee {
  return {
    id: dto.id,
    staffId: normalizeOptionalString(dto.staffId),
    name: dto.name,
    phone: dto.phone,
    gender: normalizeOptionalString(dto.gender),
    birthday: normalizeOptionalDate(dto.birthday),
    idCard: normalizeOptionalString(dto.idCard),
    maskedIdCard: normalizeOptionalString(dto.maskedIdCard),
    emergencyPhone: normalizeOptionalString(dto.emergencyPhone),
    address: normalizeOptionalString(dto.address),
    bankCard: normalizeOptionalString(dto.bankCard),
    maskedBankCard: normalizeOptionalString(dto.maskedBankCard),
    bankName: normalizeOptionalString(dto.bankName),
    education: normalizeOptionalString(dto.education),
    age: dto.age,
    status: dto.status,
    joinedDate: normalizeOptionalDate(dto.joinedDate),
    workYears: normalizeOptionalString(dto.workYears),
    deptId: normalizeOptionalString(dto.deptId),
    lineId: normalizeOptionalString(dto.lineId),
    processId: normalizeOptionalString(dto.processId),
    positionId: normalizeOptionalString(dto.positionId),
    deptName: normalizeOptionalString(dto.deptName),
    lineName: normalizeOptionalString(dto.lineName),
    processName: normalizeOptionalString(dto.processName),
    positionName: normalizeOptionalString(dto.positionName),
    createdAt: normalizeOptionalDate(dto.createdAt),
    updatedAt: normalizeOptionalDate(dto.updatedAt),
    version: dto.version ?? 1,
  }
}

export function toEmployeeApiDTO(contract: Employee): EmployeeApiDTO {
  return {
    id: contract.id,
    staffId: normalizeOptionalString(contract.staffId),
    name: contract.name,
    phone: contract.phone,
    gender: normalizeOptionalString(contract.gender),
    birthday: normalizeOptionalDate(contract.birthday) ?? null,
    idCard: normalizeOptionalString(contract.idCard),
    maskedIdCard: normalizeOptionalString(contract.maskedIdCard),
    emergencyPhone: normalizeOptionalString(contract.emergencyPhone),
    address: normalizeOptionalString(contract.address),
    bankCard: normalizeOptionalString(contract.bankCard),
    maskedBankCard: normalizeOptionalString(contract.maskedBankCard),
    bankName: normalizeOptionalString(contract.bankName),
    education: normalizeOptionalString(contract.education),
    age: contract.age,
    status: contract.status,
    joinedDate: normalizeOptionalDate(contract.joinedDate) ?? null,
    workYears: normalizeOptionalString(contract.workYears),
    deptId: normalizeOptionalString(contract.deptId),
    lineId: normalizeOptionalString(contract.lineId),
    processId: normalizeOptionalString(contract.processId),
    positionId: normalizeOptionalString(contract.positionId),
    deptName: normalizeOptionalString(contract.deptName),
    lineName: normalizeOptionalString(contract.lineName),
    processName: normalizeOptionalString(contract.processName),
    positionName: normalizeOptionalString(contract.positionName),
    createdAt: normalizeOptionalDate(contract.createdAt),
    updatedAt: normalizeOptionalDate(contract.updatedAt),
    version: contract.version,
  }
}

export function toEmployeeContracts(dtos: EmployeeApiDTO[]): Employee[] {
  return dtos.map(toEmployeeContract)
}
