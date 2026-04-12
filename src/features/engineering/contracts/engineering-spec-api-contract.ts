import { z } from 'zod'
import { technicalSpecSchema } from '@/features/engineering-db/data/schema'

const optionalControlDateSchema = z.string().trim().nullable().optional()

export const engineeringSpecApiDTOSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  code: z.string(),
  type: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean(),
  revisionNo: z.string().optional(),
  effectiveFrom: optionalControlDateSchema,
  effectiveTo: optionalControlDateSchema,
  changeType: z.enum(['MANUAL', 'ECO', 'ECN']).optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
  specData: z.record(z.string(), z.unknown()).optional(),
  drillingData: z.record(z.string(), z.unknown()).optional(),
  labelingData: z.record(z.string(), z.unknown()).optional(),
  spokeLengthData: z.record(z.string(), z.unknown()).optional(),
  hubData: z.record(z.string(), z.unknown()).optional(),
  nippleData: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  _v: z.number(),
})

export const engineeringSpecApiDTOArraySchema = z.array(engineeringSpecApiDTOSchema)

export const engineeringSpecPatchRequestSchema = z.object({
  delta: z.record(z.string(), z.unknown()),
  version: z.number(),
})

export const engineeringSpecInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  code: z.string().optional(),
  type: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean(),
  revisionNo: z.string().optional(),
  effectiveFrom: optionalControlDateSchema,
  effectiveTo: optionalControlDateSchema,
  changeType: z.enum(['MANUAL', 'ECO', 'ECN']).optional(),
  changeOrderNo: z.string().optional(),
  siteCode: z.string().optional(),
  isDefaultSite: z.boolean().optional(),
  specData: technicalSpecSchema.partial().passthrough().optional(),
  drillingData: z.record(z.string(), z.unknown()).optional(),
  labelingData: z.record(z.string(), z.unknown()).optional(),
  spokeLengthData: z.record(z.string(), z.unknown()).optional(),
  hubData: z.record(z.string(), z.unknown()).optional(),
  nippleData: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  _v: z.number(),
})

export type EngineeringSpecApiDTO = z.infer<typeof engineeringSpecApiDTOSchema>
export type EngineeringSpecInputDTO = z.infer<typeof engineeringSpecInputSchema>
