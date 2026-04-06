import { z } from 'zod'

export const technicalSpecSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Spec name is required'),
  category: z.string().default('SOP'),
  version: z.string().default('V1.0'),
  revisionNo: z.string().optional(),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
  changeType: z.enum(['MANUAL', 'ECO', 'ECN']).optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
  _v: z.number().int().positive().optional(),
  fileUrl: z.string().optional(),
  fileExtension: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string(),
})

export type TechnicalSpec = z.infer<typeof technicalSpecSchema>

export const drillingPlanSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Plan name is required'),
  productId: z.string().min(1, 'Product is required'),
  lacingPattern: z.string().optional(),
  standardHoles: z.string().optional(),
  fileUrl: z.string().optional(),
  fileExtension: z.string().optional(),
  createdAt: z.string(),
})

export type DrillingPlan = z.infer<typeof drillingPlanSchema>

export const labelingDraftSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Draft name is required'),
  type: z.enum(['Water', 'Paint', 'Laser', 'Other']),
  productId: z.string().optional().nullable(),
  fileUrl: z.string().optional(),
  fileExtension: z.string().optional(),
  createdAt: z.string(),
})

export type LabelingDraft = z.infer<typeof labelingDraftSchema>

export const spokeLengthSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Record name is required'),
  productId: z.string().min(1, 'Product is required'),
  hubId: z.string().optional(),
  nippleId: z.string().optional(),
  length: z.string().min(1, 'Length is required'),
  material: z.string().optional(),
  fileUrl: z.string().optional(),
  fileExtension: z.string().optional(),
  createdAt: z.string(),
})

export type SpokeLength = z.infer<typeof spokeLengthSchema>
