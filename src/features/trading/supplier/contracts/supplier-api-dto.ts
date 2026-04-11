export interface SupplierApiDTO {
  id: string
  name: string
  code: string
  category: string
  mainProducts: string | string[]
  contactPerson: string
  contactPhone: string
  email: string
  address: string
  status: 'Active' | 'Inactive' | 'OnReview'
  rating: number
  createdAt?: string
  updatedAt?: string
  isDeleted?: boolean
  version?: number
}

export interface SupplierListApiResponseDTO {
  items: SupplierApiDTO[]
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
      pendingReview: number
    }
  }
}
