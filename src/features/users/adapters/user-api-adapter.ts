import type { User, UserListPage, UserOption, UserRoleBinding, UserRoleBindingsResponse } from '../data/schema'
import type {
  UserApiDTO,
  UserListPageApiDTO,
  UserOptionApiDTO,
  UserRoleBindingApiDTO,
  UserRoleBindingsApiDTO,
} from '../contracts/user-api-dto'

export function toUserContract(dto: UserApiDTO): User {
  return {
    id: dto.id,
    employeeId: dto.employeeId,
    firstName: dto.firstName ?? '',
    lastName: dto.lastName ?? '',
    username: dto.username,
    phoneNumber: dto.phoneNumber ?? '',
    status: dto.status,
    role: dto.role,
    version: dto.version ?? 1,
    password: dto.password,
    resolvedRole: dto.resolvedRole,
    roleInfo: dto.roleInfo,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(0),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(0),
  }
}

export function toUserContracts(dtos: UserApiDTO[]): User[] {
  return dtos.map(toUserContract)
}

export function toUserOptionContract(dto: UserOptionApiDTO): UserOption {
  return {
    id: dto.id,
    username: dto.username,
    employeeId: dto.employeeId,
    firstName: dto.firstName,
    lastName: dto.lastName,
    role: dto.role,
    status: dto.status,
  }
}

export function toUserOptionContracts(dtos: UserOptionApiDTO[]): UserOption[] {
  return dtos.map(toUserOptionContract)
}

export function toUserListPageContract(dto: UserListPageApiDTO): UserListPage {
  return {
    items: toUserContracts(dto.items),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
  }
}

export function toUserApiDTO(contract: User): UserApiDTO {
  return {
    id: contract.id,
    username: contract.username,
    email: undefined,
    phoneNumber: contract.phoneNumber,
    firstName: contract.firstName,
    lastName: contract.lastName,
    role: contract.role,
    status: contract.status,
    employeeId: contract.employeeId,
    password: contract.password,
    resolvedRole: contract.resolvedRole,
    roleInfo: contract.roleInfo,
    createdAt: contract.createdAt?.toISOString(),
    updatedAt: contract.updatedAt?.toISOString(),
    version: contract.version,
  }
}

export function toUserRoleBindingContract(dto: UserRoleBindingApiDTO): UserRoleBinding {
  return {
    bindingId: dto.bindingId,
    roleId: dto.roleId,
    roleLabel: dto.roleLabel,
    roleColor: dto.roleColor,
    isPrimary: dto.isPrimary,
    status: dto.status,
    source: dto.source,
    startDate: dto.startDate ? new Date(dto.startDate) : undefined,
    endDate: dto.endDate ? new Date(dto.endDate) : undefined,
  }
}

export function toUserRoleBindingsResponseContract(dto: UserRoleBindingsApiDTO): UserRoleBindingsResponse {
  return {
    userId: dto.userId,
    username: dto.username,
    primaryRoleId: dto.primaryRoleId,
    effectiveRoles: Array.isArray(dto.effectiveRoles) ? dto.effectiveRoles : [],
    roleBindings: (dto.roleBindings || []).map(toUserRoleBindingContract),
  }
}
