import { z } from 'zod'

export const outsourcePartnerStatuses = [
  'ACTIVE',
  'ON_REVIEW',
  'INACTIVE',
] as const

export const outsourcePartnerQualityGrades = ['A', 'B', 'C'] as const

export type OutsourcePartnerStatus = (typeof outsourcePartnerStatuses)[number]
export type OutsourcePartnerQualityGrade =
  (typeof outsourcePartnerQualityGrades)[number]

export const outsourcePartnerSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  code: z.string(),
  name: z.string(),
  supplierId: z.string(),
  supplierNameSnapshot: z.string(),
  contactPerson: z.string(),
  contactPhone: z.string(),
  email: z.string(),
  address: z.string(),
  qualityGrade: z.union([z.enum(outsourcePartnerQualityGrades), z.literal('')]),
  status: z.enum(outsourcePartnerStatuses),
  leadTimeDays: z.number(),
  settlementPolicy: z.string(),
  notes: z.string(),
  operator: z.string(),
  version: z.number(),
})

export const outsourcePartnerArraySchema = z.array(outsourcePartnerSchema)

export type OutsourcePartner = z.infer<typeof outsourcePartnerSchema>

export type OutsourcePartnerFormValues = Pick<
  OutsourcePartner,
  | 'code'
  | 'name'
  | 'supplierId'
  | 'contactPerson'
  | 'contactPhone'
  | 'email'
  | 'address'
  | 'qualityGrade'
  | 'status'
  | 'leadTimeDays'
  | 'settlementPolicy'
  | 'notes'
>

export interface OutsourcePartnerListStats {
  total: number
  active: number
  onReview: number
  inactive: number
}

export interface OutsourcePartnerListResponse {
  items: OutsourcePartner[]
  metadata: OutsourcePartnerListStats
}
