import { z } from 'zod'

export const productCreationOperationGuideStepKeys = [
  'template',
  'baseModel',
  'product',
  'bom',
] as const

export type ProductCreationOperationGuideStepKey =
  (typeof productCreationOperationGuideStepKeys)[number]

const productCreationGuideStepResultSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  attributeCategoryKeys: z.array(z.string()).optional(),
  code: z.string().optional(),
  version: z.number().optional(),
})

export type ProductCreationGuideStepResult = z.infer<
  typeof productCreationGuideStepResultSchema
>

export const productCreationGuideProgressSchema = z
  .object({
    completedSteps: z.object({
      template: productCreationGuideStepResultSchema.optional(),
      baseModel: productCreationGuideStepResultSchema.optional(),
      product: productCreationGuideStepResultSchema.optional(),
      bom: productCreationGuideStepResultSchema.optional(),
    }),
    bomSkipped: z.boolean(),
  })
  .refine((progress) => {
    const steps = progress.completedSteps
    return (
      productCreationOperationGuideStepKeys.every(
        (key, index) =>
          !steps[key] ||
          productCreationOperationGuideStepKeys
            .slice(0, index)
            .every((previousKey) => Boolean(steps[previousKey]))
      ) &&
      (!progress.bomSkipped || Boolean(steps.product))
    )
  })

export type ProductCreationGuideProgress = z.infer<
  typeof productCreationGuideProgressSchema
>

export function createEmptyProductCreationGuideProgress(): ProductCreationGuideProgress {
  return { completedSteps: {}, bomSkipped: false }
}

export function getCurrentProductCreationGuideStep(
  progress: ProductCreationGuideProgress
): ProductCreationOperationGuideStepKey | null {
  return (
    productCreationOperationGuideStepKeys.find(
      (key) =>
        !progress.completedSteps[key] && !(key === 'bom' && progress.bomSkipped)
    ) ?? null
  )
}

export function completeProductCreationGuideStep(
  progress: ProductCreationGuideProgress,
  stepKey: ProductCreationOperationGuideStepKey,
  result: ProductCreationGuideStepResult
): ProductCreationGuideProgress {
  const stepIndex = productCreationOperationGuideStepKeys.indexOf(stepKey)
  if (
    productCreationOperationGuideStepKeys
      .slice(0, stepIndex)
      .some((key) => !progress.completedSteps[key])
  ) {
    throw new Error(
      'Product creation guide prerequisites must be confirmed first'
    )
  }
  const previousResult = progress.completedSteps[stepKey]
  const selectionChanged =
    !previousResult ||
    previousResult.id !== result.id ||
    previousResult.version !== result.version ||
    JSON.stringify([...(previousResult.attributeCategoryKeys ?? [])].sort()) !==
      JSON.stringify([...(result.attributeCategoryKeys ?? [])].sort())
  const completedSteps = { ...progress.completedSteps, [stepKey]: result }
  if (selectionChanged) {
    for (const dependentStep of productCreationOperationGuideStepKeys.slice(
      stepIndex + 1
    ))
      delete completedSteps[dependentStep]
  }
  return productCreationGuideProgressSchema.parse({
    completedSteps,
    bomSkipped: selectionChanged ? false : progress.bomSkipped,
  })
}
