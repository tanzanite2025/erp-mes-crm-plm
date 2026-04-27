export interface UserApiDTO {
  id: string
  username: string
  email?: string
  phoneNumber?: string
  firstName?: string
  lastName?: string
  status: 'active' | 'inactive' | 'suspended'
  employeeId?: string
  password?: string
  createdAt?: string
  updatedAt?: string
  version?: number
}

export interface UserOptionApiDTO {
  id: string
  username: string
  employeeId?: string
  firstName?: string
  lastName?: string
  status?: 'active' | 'inactive' | 'suspended'
}

export interface UserListPageApiDTO {
  items: UserApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface UserPermissionItemApiDTO {
  permissionId: string
  source?: string
  grantedBy?: string
  updatedAt?: string
}

export interface UserPermissionsApiDTO {
  userId: string
  username: string
  status: 'active' | 'inactive' | 'suspended'
  employeeId?: string
  permissions: UserPermissionItemApiDTO[]
  total: number
}

export interface UserPermissionsReplaceResultApiDTO {
  userId: string
  permissions: string[]
  changeSummary?: {
    added?: number
    removed?: number
    unchanged?: number
  }
}

export interface UserAccessSnapshotApiDTO {
  userId: string
  username: string
  employeeId?: string
  status?: 'active' | 'inactive' | 'suspended'
  permissions: string[]
  diagnostics?: string[]
}
