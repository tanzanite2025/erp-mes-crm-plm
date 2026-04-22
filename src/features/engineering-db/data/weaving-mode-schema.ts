import { z } from 'zod'

export const WEAVING_MODE_SPEC_TYPE = 'ENGINEERING_MASTER_WEAVING_MODE'

export const weavingModeSchema = z.object({
  id: z.string(),
  code: z.string().min(1),
  label: z.string().min(1),
  ratioNumerator: z.number().int().positive(),
  ratioDenominator: z.number().int().positive(),
  normalizedRatioKey: z.string().min(3),
  description: z.string().default(''),
  active: z.boolean().default(true),
  isSystemPreset: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative().default(0),
  version: z.number().default(1),
  createdAt: z.string(),
})

export type WeavingMode = z.infer<typeof weavingModeSchema>

export const weavingModeDraftSchema = z.object({
  id: z.string().optional(),
  ratioNumerator: z.number().int().positive(),
  ratioDenominator: z.number().int().positive(),
  description: z.string().default(''),
  active: z.boolean().default(true),
  isSystemPreset: z.boolean().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  version: z.number().optional(),
  createdAt: z.string().optional(),
})

export type WeavingModeDraft = z.infer<typeof weavingModeDraftSchema>

export const DEFAULT_WEAVING_MODE_PRESETS: WeavingModeDraft[] = [
  {
    ratioNumerator: 1,
    ratioDenominator: 1,
    active: true,
    isSystemPreset: true,
    sortOrder: 1,
    description: '',
  },
  {
    ratioNumerator: 2,
    ratioDenominator: 1,
    active: true,
    isSystemPreset: true,
    sortOrder: 2,
    description: '',
  },
]
