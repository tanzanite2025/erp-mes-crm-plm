export interface CustomerApiDTO {
  id: string
  name: string
  code: string
  contactPerson: string
  contactPhone: string
  email: string
  address: string
  status: 'Active' | 'Inactive' | 'Pending'
  creditLimit: number
  balance: number
  createdAt?: string
  updatedAt?: string
  isDeleted?: boolean
  version?: number
}

export interface CustomerListApiResponseDTO {
  items: CustomerApiDTO[]
  total: number
  page: number
  pageSize: number
  metadata: {
    pagination: {
      total: number
      page: number
      pageSize: number
    }
    stats: {
      total: number
      active: number
      newThisMonth: number
    }
  }
}
