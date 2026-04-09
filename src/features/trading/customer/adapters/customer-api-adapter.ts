import type { Customer } from '../../data/schema'
import type { CustomerApiDTO } from '../contracts/customer-api-dto'

export function toCustomerContract(dto: CustomerApiDTO): Customer {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.code,
    contactPerson: dto.contactPerson,
    contactPhone: dto.contactPhone,
    email: dto.email,
    address: dto.address,
    status: dto.status,
    creditLimit: dto.creditLimit,
    balance: dto.balance,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    isDeleted: dto.isDeleted ?? false,
    version: dto._v ?? 1,
  }
}

export function toCustomerContracts(dtos: CustomerApiDTO[]): Customer[] {
  return dtos.map(toCustomerContract)
}

export function toCustomerApiDTO(contract: Customer): CustomerApiDTO {
  return {
    id: contract.id,
    name: contract.name,
    code: contract.code,
    contactPerson: contract.contactPerson,
    contactPhone: contract.contactPhone,
    email: contract.email,
    address: contract.address,
    status: contract.status,
    creditLimit: contract.creditLimit,
    balance: contract.balance,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    isDeleted: contract.isDeleted,
    _v: contract.version,
  }
}
