export type EquipmentPartnerTypeApiDTO = 'INTERNAL' | 'EXTERNAL'

export interface EquipmentPartnerApiDTO {
  id: string
  name: string
  type: EquipmentPartnerTypeApiDTO
  contactPerson?: string
  phone?: string
  address?: string
  createdAt: string
  updatedAt?: string
  version?: number
}

export interface SaveEquipmentPartnerApiDTO {
  id?: string
  name: string
  type: EquipmentPartnerTypeApiDTO
  contactPerson?: string
  phone?: string
  address?: string
}

export interface DeleteEquipmentPartnerApiDTO {
  status: string
}
