import type { EquipmentPartner } from '../data/schema'
import type {
  EquipmentPartnerApiDTO,
  SaveEquipmentPartnerApiDTO,
} from '../contracts/equipment-partner-api-dto'

function optimisticVersionFromTimestamps(updatedAt?: string, createdAt?: string): number {
  const versionSource = updatedAt || createdAt
  if (!versionSource) return 1

  const version = new Date(versionSource).getTime()
  if (!Number.isFinite(version) || version < 1) return 1
  return version
}

export function toEquipmentPartnerContract(dto: EquipmentPartnerApiDTO): EquipmentPartner {
  return {
    id: dto.id,
    name: dto.name,
    type: dto.type,
    contactPerson: dto.contactPerson || '',
    phone: dto.phone || '',
    address: dto.address || '',
    version: dto.version || optimisticVersionFromTimestamps(dto.updatedAt, dto.createdAt),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function toEquipmentPartnerContracts(dtos: EquipmentPartnerApiDTO[]): EquipmentPartner[] {
  return dtos.map(toEquipmentPartnerContract)
}

export function toSaveEquipmentPartnerApiDTO(
  contract: Partial<EquipmentPartner>
): SaveEquipmentPartnerApiDTO {
  return {
    id: contract.id || undefined,
    name: contract.name || '',
    type: contract.type || 'EXTERNAL',
    contactPerson: contract.contactPerson || '',
    phone: contract.phone || '',
    address: contract.address || '',
  }
}
