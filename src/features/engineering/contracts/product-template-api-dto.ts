import { type DeltaPayload } from '@/lib/delta/types'

export interface ProductTemplateApiDTO {
  id: string
  name: string
  code: string
  componentKey: 'RIM' | 'STEM' | 'FORK' | 'GENERAL'
  description?: string
  active: boolean
  createdAt?: string
  updatedAt?: string
  _v?: number
}

export type ProductTemplatePatchApiDTO = DeltaPayload
