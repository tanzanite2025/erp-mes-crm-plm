export interface OutsourcePartnerApiDTO {
  id?: string
  createdAt?: string
  updatedAt?: string
  code?: string
  name?: string
  supplierId?: string
  supplierNameSnapshot?: string
  contactPerson?: string
  contactPhone?: string
  email?: string
  address?: string
  qualityGrade?: string
  status?: string
  leadTimeDays?: number
  settlementPolicy?: string
  notes?: string
  operator?: string
  version?: number
}

export interface OutsourcePartnerListApiResponseDTO {
  items?: OutsourcePartnerApiDTO[]
  metadata?: {
    total?: number
    active?: number
    onReview?: number
    inactive?: number
  }
}
