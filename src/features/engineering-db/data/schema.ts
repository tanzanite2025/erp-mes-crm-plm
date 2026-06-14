import { z } from 'zod'

export const technicalSpecSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Spec name is required'),
  category: z.string().default('SOP'),
  revisionNo: z.string().optional(),
  effectiveFrom: z.string().nullable().optional(),
  effectiveTo: z.string().nullable().optional(),
  changeType: z.enum(['MANUAL', 'ECO', 'ECN']).optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
  fileUrl: z.string().optional(),
  fileExtension: z.string().optional(),
  description: z.string().optional(),
  version: z.number().default(1),
  createdAt: z.string(),
})

export type TechnicalSpec = z.infer<typeof technicalSpecSchema>

export const drillingPlanSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Plan name is required'),
  productId: z.string().min(1, 'Product is required'),
  weavingModeId: z.string().min(1, 'Weaving mode is required'),
  weavingModeLabel: z.string().optional(),
  standardHoles: z.string().optional(),
  fileUrl: z.string().optional(),
  fileExtension: z.string().optional(),
  version: z.number().default(1),
  createdAt: z.string(),
})

export type DrillingPlan = z.infer<typeof drillingPlanSchema>
export const drillingPlanInputSchema = drillingPlanSchema.omit({
  id: true,
  createdAt: true,
})
export type DrillingPlanInput = z.input<typeof drillingPlanInputSchema>

export const labelingDraftSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Draft name is required'),
  type: z.enum(['Water', 'Paint', 'Laser', 'Other']),
  productId: z.string().optional().nullable(),
  fileUrl: z.string().optional(),
  fileExtension: z.string().optional(),
  version: z.number().default(1),
  createdAt: z.string(),
})

export type LabelingDraft = z.infer<typeof labelingDraftSchema>
export const labelingDraftInputSchema = labelingDraftSchema.omit({
  id: true,
  createdAt: true,
})
export type LabelingDraftInput = z.input<typeof labelingDraftInputSchema>

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
  version: z.number().default(1),
  createdAt: z.string(),
})

export type SpokeLength = z.infer<typeof spokeLengthSchema>
export const spokeLengthInputSchema = spokeLengthSchema.omit({
  id: true,
  createdAt: true,
})
export type SpokeLengthInput = z.input<typeof spokeLengthInputSchema>
