import { z } from 'zod'
import { type BusinessStatus } from './business-event-source-types'

export const businessEventPhaseSemanticSchema = z.enum([
  'draft',
  'pending',
  'active',
  'done',
  'cancelled',
  'terminal',
  'custom',
])

export const businessEventPhaseCatalogItemSchema = z.object({
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
  semantic: businessEventPhaseSemanticSchema,
  order: z.number().int().nonnegative(),
})

export type BusinessEventPhaseSemantic = z.infer<
  typeof businessEventPhaseSemanticSchema
>

export type BusinessEventPhaseCatalogItem = z.infer<
  typeof businessEventPhaseCatalogItemSchema
>

export type BusinessEventPhaseOption = {
  value: string
  label: string
  semantic: BusinessEventPhaseSemantic
  known: boolean
}

export function deserializeBusinessEventPhaseCatalog(
  input: unknown
): BusinessEventPhaseCatalogItem[] {
  return z
    .array(businessEventPhaseCatalogItemSchema)
    .parse(input)
    .slice()
    .sort((a, b) => (a.order === b.order ? a.code.localeCompare(b.code) : a.order - b.order))
}

export function buildBusinessEventPhaseOptions(
  catalog: BusinessEventPhaseCatalogItem[],
  statuses: Pick<BusinessStatus, 'phase'>[] = []
): BusinessEventPhaseOption[] {
  const options = new Map<string, BusinessEventPhaseOption>()

  for (const item of catalog) {
    options.set(item.code, {
      value: item.code,
      label: item.label,
      semantic: item.semantic,
      known: true,
    })
  }

  for (const status of statuses) {
    const phase = status.phase.trim()
    if (!phase || options.has(phase)) {
      continue
    }
    options.set(phase, {
      value: phase,
      label: `${phase}（未注册）`,
      semantic: 'custom',
      known: false,
    })
  }

  return Array.from(options.values())
}
