import type { Supplier } from '../../data/schema'
import type { SupplierApiDTO } from '../contracts/supplier-api-dto'

function normalizeMainProducts(value: string | string[]): string[] {
  if (Array.isArray(value)) {
    return value
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return []
  }

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function toSupplierContract(dto: SupplierApiDTO): Supplier {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    category: dto.category,
    mainProducts: normalizeMainProducts(dto.mainProducts),
    contactPerson: dto.contactPerson,
    contactPhone: dto.contactPhone,
    wechat: dto.wechat ?? '',
    whatsapp: dto.whatsapp ?? '',
    facebook: dto.facebook ?? '',
    instagram: dto.instagram ?? '',
    telegram: dto.telegram ?? '',
    email: dto.email,
    address: dto.address,
    status: dto.status,
    rating: dto.rating,
    createdAt: dto.createdAt ?? '',
    updatedAt: dto.updatedAt ?? '',
    isDeleted: dto.isDeleted ?? false,
    version: dto.version ?? 1,
  }
}

export function toSupplierContracts(dtos: SupplierApiDTO[]): Supplier[] {
  return dtos.map(toSupplierContract)
}

export function toSupplierApiDTO(contract: Supplier): SupplierApiDTO {
  return {
    id: contract.id,
    name: contract.name,
    code: contract.code,
    category: contract.category,
    mainProducts: contract.mainProducts,
    contactPerson: contract.contactPerson,
    contactPhone: contract.contactPhone,
    wechat: contract.wechat,
    whatsapp: contract.whatsapp,
    facebook: contract.facebook,
    instagram: contract.instagram,
    telegram: contract.telegram,
    email: contract.email,
    address: contract.address,
    status: contract.status,
    rating: contract.rating,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    isDeleted: contract.isDeleted,
    version: contract.version,
  }
}
