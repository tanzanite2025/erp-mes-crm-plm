import { type DeltaPayload } from '@/lib/delta/types'

export interface ProductTemplateAttributeBindingApiDTO {
  id?: string
  templateId?: string
  categoryKey: string
  sortOrder: number
  required: boolean
  active: boolean
  version?: number
}

export interface ProductTemplateApiDTO {
  id: string
  name: string
  code: string
  componentKey: 'RIM' | 'STEM' | 'FORK' | 'GENERAL'
  description?: string
  active: boolean
  attributeBindings?: ProductTemplateAttributeBindingApiDTO[]
  createdAt?: string
  updatedAt?: string
  version?: number
}

export type ProductTemplatePatchApiDTO = DeltaPayload
