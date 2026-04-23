import { z } from 'zod'

export const cuttingPlanStatusSchema = z.enum(['Draft', 'Active', 'Archived'])
export type CuttingPlanStatus = z.infer<typeof cuttingPlanStatusSchema>

export const cuttingPlanLineSchema = z.object({
  id: z.string(),
  sequenceNo: z.number(),
  rollOrder: z.string().optional(),
  yarnDirection: z.string().optional(),
  sizeExpression: z.string().optional(),
  faw: z.string().optional(),
  weightG: z.string().optional(),
  areaM2: z.string().optional(),
  operationNote: z.string().optional(),
  manualGroupBreakBefore: z.boolean().optional(),
})

export type CuttingPlanLine = z.infer<typeof cuttingPlanLineSchema>

export const cuttingPlanSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  productId: z.string().optional(),
  productCode: z.string().optional(),
  productName: z.string().optional(),
  holeCount: z.string().optional(),
  documentNo: z.string().optional(),
  revisionNo: z.string().optional(),
  effectiveDate: z.string().optional(),
  carbonFiberModel: z.string().optional(),
  resinModel: z.string().optional(),
  resinContentPercent: z.string().optional(),
  prepregSpecId: z.string().optional(),
  prepregSpecLabel: z.string().optional(),
  totalInnerMaterialWeightG: z.string().optional(),
  totalMaterialWeightG: z.string().optional(),
  status: cuttingPlanStatusSchema.default('Draft'),
  lines: z.array(cuttingPlanLineSchema).default([]),
  version: z.number().default(1),
  createdAt: z.string().optional(),
})

export type CuttingPlan = z.infer<typeof cuttingPlanSchema>

export const cuttingPlanInputSchema = cuttingPlanSchema.omit({ id: true, createdAt: true })
export type CuttingPlanInput = z.input<typeof cuttingPlanInputSchema>

export const EMPTY_CUTTING_PLAN_INPUT: CuttingPlanInput = {
  name: '',
  productId: '',
  productCode: '',
  productName: '',
  holeCount: '',
  documentNo: '',
  revisionNo: 'A1',
  effectiveDate: '',
  carbonFiberModel: '',
  resinModel: '',
  resinContentPercent: '',
  prepregSpecId: '',
  prepregSpecLabel: '',
  totalInnerMaterialWeightG: '',
  totalMaterialWeightG: '',
  status: 'Draft',
  lines: [],
  version: 1,
}

export function createEmptyCuttingPlanLine(sequenceNo: number): CuttingPlanLine {
  return {
    id: `cutting-line-${Date.now()}-${sequenceNo}`,
    sequenceNo,
    rollOrder: '',
    yarnDirection: '',
    sizeExpression: '',
    faw: '',
    weightG: '',
    areaM2: '',
    operationNote: '',
    manualGroupBreakBefore: false,
  }
}

export function normalizeCuttingPlanLine(line: unknown, index: number): CuttingPlanLine {
  const raw = (typeof line === 'object' && line ? line : {}) as Partial<CuttingPlanLine>

  return cuttingPlanLineSchema.parse({
    id: raw.id || `cutting-line-${Date.now()}-${index + 1}`,
    sequenceNo: Number(raw.sequenceNo) || index + 1,
    rollOrder: raw.rollOrder || '',
    yarnDirection: raw.yarnDirection || '',
    sizeExpression: raw.sizeExpression || '',
    faw: raw.faw || '',
    weightG: raw.weightG || '',
    areaM2: raw.areaM2 || '',
    operationNote: raw.operationNote || '',
    manualGroupBreakBefore: Boolean(raw.manualGroupBreakBefore),
  })
}

export function normalizeCuttingPlan(plan: unknown): CuttingPlan {
  const raw = (typeof plan === 'object' && plan ? plan : {}) as Partial<CuttingPlan>

  return cuttingPlanSchema.parse({
    ...EMPTY_CUTTING_PLAN_INPUT,
    ...raw,
    id: raw.id || '',
    lines: Array.isArray(raw.lines) ? raw.lines.map(normalizeCuttingPlanLine) : [],
  })
}

export function buildCuttingPlanName(params: {
  productName?: string
  productCode?: string
  holeCount?: string
}): string {
  const model = params.productName?.trim() || params.productCode?.trim() || ''
  const holeCount = params.holeCount?.trim() || ''
  if (!model || !holeCount) return ''
  return `${model}-${holeCount}孔-裁纱单`
}

export function buildCuttingPlanInput(plan: CuttingPlanInput | CuttingPlan): CuttingPlanInput {
  const generatedName = buildCuttingPlanName({
    productName: plan.productName,
    productCode: plan.productCode,
    holeCount: plan.holeCount,
  })

  return cuttingPlanInputSchema.parse({
    ...EMPTY_CUTTING_PLAN_INPUT,
    ...plan,
    name: generatedName || plan.name.trim(),
    productId: plan.productId?.trim() || '',
    productCode: plan.productCode?.trim() || '',
    productName: plan.productName?.trim() || '',
    holeCount: plan.holeCount?.trim() || '',
    documentNo: plan.documentNo?.trim() || '',
    effectiveDate: plan.effectiveDate?.trim() || '',
    carbonFiberModel: plan.carbonFiberModel?.trim() || '',
    resinModel: plan.resinModel?.trim() || '',
    resinContentPercent: plan.resinContentPercent?.trim() || '',
    prepregSpecId: plan.prepregSpecId?.trim() || '',
    prepregSpecLabel: plan.prepregSpecLabel?.trim() || '',
    totalInnerMaterialWeightG: plan.totalInnerMaterialWeightG?.trim() || '',
    totalMaterialWeightG: plan.totalMaterialWeightG?.trim() || '',
    lines: (plan.lines || []).map((line, index) => ({
      ...line,
      sequenceNo: index + 1,
    })),
  })
}
