import type { OutsourcePartnerApiDTO } from '../contracts/outsource-partner-api-dto'
import type {
  OutsourcePartner,
  OutsourcePartnerFormValues,
  OutsourcePartnerQualityGrade,
  OutsourcePartnerStatus,
} from '../data/outsource-partner'

function normalizeStatus(status: unknown): OutsourcePartnerStatus {
  if (status === 'ON_REVIEW' || status === 'INACTIVE') {
    return status
  }
  return 'ACTIVE'
}

function normalizeQualityGrade(
  qualityGrade: unknown
): OutsourcePartnerQualityGrade | '' {
  if (qualityGrade === 'A' || qualityGrade === 'B' || qualityGrade === 'C') {
    return qualityGrade
  }
  return ''
}

export function toOutsourcePartnerContract(
  dto: OutsourcePartnerApiDTO
): OutsourcePartner {
  return {
    id: String(dto.id ?? ''),
    createdAt: String(dto.createdAt ?? ''),
    updatedAt: String(dto.updatedAt ?? ''),
    code: String(dto.code ?? ''),
    name: String(dto.name ?? ''),
    supplierId: String(dto.supplierId ?? ''),
    supplierNameSnapshot: String(dto.supplierNameSnapshot ?? ''),
    contactPerson: String(dto.contactPerson ?? ''),
    contactPhone: String(dto.contactPhone ?? ''),
    email: String(dto.email ?? ''),
    address: String(dto.address ?? ''),
    qualityGrade: normalizeQualityGrade(dto.qualityGrade),
    status: normalizeStatus(dto.status),
    leadTimeDays: Number(dto.leadTimeDays ?? 0),
    settlementPolicy: String(dto.settlementPolicy ?? ''),
    notes: String(dto.notes ?? ''),
    operator: String(dto.operator ?? ''),
    version: Number(dto.version ?? 1),
  }
}

export function toOutsourcePartnerContracts(
  dtos: OutsourcePartnerApiDTO[]
): OutsourcePartner[] {
  return dtos.map(toOutsourcePartnerContract)
}

export function toOutsourcePartnerApiDTO(
  values: OutsourcePartnerFormValues,
  current?: OutsourcePartner
): OutsourcePartnerApiDTO {
  return {
    id: current?.id ?? '',
    createdAt: current?.createdAt ?? '',
    updatedAt: current?.updatedAt ?? '',
    code: values.code,
    name: values.name,
    supplierId: values.supplierId,
    contactPerson: values.contactPerson,
    contactPhone: values.contactPhone,
    email: values.email,
    address: values.address,
    qualityGrade: values.qualityGrade,
    status: values.status,
    leadTimeDays: values.leadTimeDays,
    settlementPolicy: values.settlementPolicy,
    notes: values.notes,
    operator: current?.operator ?? '',
    version: current?.version ?? 1,
  }
}
