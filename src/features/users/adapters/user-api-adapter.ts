import type {
  User,
  UserAccessSnapshot,
  UserListPage,
  UserOption,
  UserPermissionItem,
  UserPermissionsReplaceResult,
  UserPermissionsResponse,
} from '../data/schema'
import type {
  UserAccessSnapshotApiDTO,
  UserApiDTO,
  UserListPageApiDTO,
  UserOptionApiDTO,
  UserPermissionItemApiDTO,
  UserPermissionsApiDTO,
  UserPermissionsReplaceResultApiDTO,
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
    status: contract.status,
    role: contract.role,
    employeeId: contract.employeeId,
    password: contract.password,
    createdAt: contract.createdAt?.toISOString(),
    updatedAt: contract.updatedAt?.toISOString(),
    version: contract.version,
  }
}

export function toUserPermissionItemContract(dto: UserPermissionItemApiDTO): UserPermissionItem {
  return {
    permissionId: dto.permissionId,
    source: dto.source,
    grantedBy: dto.grantedBy,
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : undefined,
  }
}

export function toUserPermissionsResponseContract(dto: UserPermissionsApiDTO): UserPermissionsResponse {
  return {
    userId: dto.userId,
    username: dto.username,
    status: dto.status,
    employeeId: dto.employeeId,
    permissions: (dto.permissions || []).map(toUserPermissionItemContract),
    total: dto.total,
  }
}

export function toUserPermissionsReplaceResultContract(
  dto: UserPermissionsReplaceResultApiDTO,
): UserPermissionsReplaceResult {
  return {
    userId: dto.userId,
    permissions: Array.isArray(dto.permissions) ? dto.permissions : [],
    changeSummary: {
      added: dto.changeSummary?.added ?? 0,
      removed: dto.changeSummary?.removed ?? 0,
      unchanged: dto.changeSummary?.unchanged ?? 0,
    },
  }
}

export function toUserAccessSnapshotContract(dto: UserAccessSnapshotApiDTO): UserAccessSnapshot {
  return {
    userId: dto.userId,
    username: dto.username,
    employeeId: dto.employeeId,
    status: dto.status,
    permissions: Array.isArray(dto.permissions) ? dto.permissions : [],
    diagnostics: Array.isArray(dto.diagnostics) ? dto.diagnostics : [],
  }
}
