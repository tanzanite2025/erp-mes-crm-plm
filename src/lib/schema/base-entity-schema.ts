import { z } from 'zod'

export const entityIdentitySchema = z.object({
  id: z.string(),
})

export const entityVersionSchema = z.object({
  version: z.number().default(1),
})

export const entityTimestampAuditSchema = z.object({
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const entityOptionalTimestampAuditSchema = z.object({
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const entityCreatedBySchema = z.object({
  createdBy: z.string(),
})

export const entityOptionalActorAuditSchema = z.object({
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
})
