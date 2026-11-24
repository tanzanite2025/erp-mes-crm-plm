import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'

export const qualityInspectionStageSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  sortOrder: z.number().int().nonnegative(),
  active: z.boolean(),
  version: z.number().int().positive(),
})
export type QualityInspectionStage = z.infer<
  typeof qualityInspectionStageSchema
>
export type QualityInspectionStageSaveInput = Pick<
  QualityInspectionStage,
  'name' | 'description' | 'sortOrder' | 'active'
> & { version?: number }

export async function listQualityInspectionStages(): Promise<
  QualityInspectionStage[]
> {
  return z
    .array(qualityInspectionStageSchema)
    .parse(await apiFetch('/quality/inspection-stages'))
}

export async function saveQualityInspectionStage(
  id: string | undefined,
  input: QualityInspectionStageSaveInput
): Promise<QualityInspectionStage> {
  return qualityInspectionStageSchema.parse(
    await apiFetch(
      id
        ? `/quality/inspection-stages/${encodeURIComponent(id)}`
        : '/quality/inspection-stages',
      {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(input),
      }
    )
  )
}
