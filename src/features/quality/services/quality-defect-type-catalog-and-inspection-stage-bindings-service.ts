import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'

export const qualityDefectTypeSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  sortOrder: z.number().int().nonnegative(),
  active: z.boolean(),
  version: z.number().int().positive(),
})

export type QualityDefectType = z.infer<typeof qualityDefectTypeSchema>
export type SaveQualityDefectTypeInput = Pick<
  QualityDefectType,
  'name' | 'description' | 'sortOrder' | 'active'
> & { version?: number }

const qualityInspectionStageDefectTypeBindingsSchema = z.object({
  inspectionStageId: z.string().min(1),
  defectTypeIds: z.array(z.string().min(1)),
  version: z.number().int().positive(),
})

export type QualityInspectionStageDefectTypeBindings = z.infer<
  typeof qualityInspectionStageDefectTypeBindingsSchema
>

export async function listQualityDefectTypes(): Promise<QualityDefectType[]> {
  return z
    .array(qualityDefectTypeSchema)
    .parse(await apiFetch('/quality/defect-types'))
}

export async function saveQualityDefectType(
  id: string | undefined,
  input: SaveQualityDefectTypeInput
): Promise<QualityDefectType> {
  return qualityDefectTypeSchema.parse(
    await apiFetch(
      id
        ? `/quality/defect-types/${encodeURIComponent(id)}`
        : '/quality/defect-types',
      {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(input),
      }
    )
  )
}

export async function getQualityInspectionStageDefectTypeBindings(
  inspectionStageId: string
): Promise<QualityInspectionStageDefectTypeBindings> {
  return qualityInspectionStageDefectTypeBindingsSchema.parse(
    await apiFetch(
      `/quality/inspection-stages/${encodeURIComponent(inspectionStageId)}/defect-types`
    )
  )
}

export async function replaceQualityInspectionStageDefectTypeBindings(
  input: QualityInspectionStageDefectTypeBindings
): Promise<QualityInspectionStageDefectTypeBindings> {
  return qualityInspectionStageDefectTypeBindingsSchema.parse(
    await apiFetch(
      `/quality/inspection-stages/${encodeURIComponent(input.inspectionStageId)}/defect-types`,
      {
        method: 'PUT',
        body: JSON.stringify({
          defectTypeIds: input.defectTypeIds,
          version: input.version,
        }),
      }
    )
  )
}
