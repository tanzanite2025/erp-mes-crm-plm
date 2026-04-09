export interface UserApiDTO {
  id: string
  username: string
  email?: string
  phoneNumber?: string
  firstName?: string
  lastName?: string
  role: string
  status: 'active' | 'inactive' | 'suspended'
  employeeId?: string
  password?: string
  resolvedRole?: string
  roleInfo?: {
    isStale?: boolean
    isInvalid?: boolean
    [key: string]: unknown
  }
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
  role?: string
  status?: 'active' | 'inactive' | 'suspended'
}

export interface UserListPageApiDTO {
  items: UserApiDTO[]
  total: number
  page: number
  pageSize: number
}
