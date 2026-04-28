import { z } from 'zod'
import {
  type CutSizeUnit,
} from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import {
  deriveCutSizeAreaM2,
  deriveCutSizeWeightG,
  formatCutSizeExpression,
} from '@/features/raw-materials/cut-size-library/domain/cut-size-geometry'

export const cuttingPlanStatusSchema = z.enum(['Draft', 'Active', 'Archived'])
export type CuttingPlanStatus = z.infer<typeof cuttingPlanStatusSchema>

export const cuttingPlanLineConstraintProfileSchema = z.object({
  rollGroupKey: z.string().optional(),
  orderSequence: z.string().optional(),
  yarnDirectionMode: z.string().optional(),
  processTags: z.array(z.string()).default([]),
  noteKeywords: z.array(z.string()).default([]),
})

export type CuttingPlanLineConstraintProfile = z.infer<typeof cuttingPlanLineConstraintProfileSchema>

export const EMPTY_CUTTING_PLAN_LINE_CONSTRAINT_PROFILE: CuttingPlanLineConstraintProfile = {
  rollGroupKey: '',
  orderSequence: '',
  yarnDirectionMode: '',
  processTags: [],
  noteKeywords: [],
}

export const cuttingPlanLineSchema = z.object({
  id: z.string(),
  sequenceNo: z.number(),
  rollOrder: z.string().optional(),
  yarnDirection: z.string().optional(),
  cutSizeId: z.string().optional(),
  cutSizeCode: z.string().optional(),
  cutSizeName: z.string().optional(),
  sizeExpression: z.string().optional(),
  requiredSets: z.string().optional(),
  priority: z.string().optional(),
  mustFulfill: z.boolean().optional(),
  allowMixedPlan: z.boolean().optional(),
  faw: z.string().optional(),
  weightG: z.string().optional(),
  areaM2: z.string().optional(),
  operationNote: z.string().optional(),
  constraintProfile: cuttingPlanLineConstraintProfileSchema.optional(),
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
export type CuttingPlanInput = z.infer<typeof cuttingPlanInputSchema>

export type CuttingPlanLineAuthorityIssue = {
  sequenceNo: number
  kind: 'missing_cut_size_binding' | 'missing_cut_size_unit'
}

export type CuttingPlanPreparationIssue =
  | CuttingPlanLineAuthorityIssue
  | { kind: 'missing_product_binding' }
  | { kind: 'missing_hole_count' }
  | { kind: 'empty_lines' }
  | { kind: 'name_generate_failed' }

export class CuttingPlanPreparationError extends Error {
  readonly issues: CuttingPlanPreparationIssue[]

  constructor(issues: CuttingPlanPreparationIssue[]) {
    super('Cutting plan preparation failed')
    this.name = 'CuttingPlanPreparationError'
    this.issues = issues
  }
}

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

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function createEmptyCuttingPlanLine(sequenceNo: number): CuttingPlanLine {
  return {
    id: `cutting-line-${Date.now()}-${sequenceNo}`,
    sequenceNo,
    rollOrder: '',
    yarnDirection: '',
    cutSizeId: '',
    cutSizeCode: '',
    cutSizeName: '',
    sizeExpression: '',
    requiredSets: '1',
    priority: '',
    mustFulfill: true,
    allowMixedPlan: false,
    faw: '',
    weightG: '',
    areaM2: '',
    operationNote: '',
    constraintProfile: { ...EMPTY_CUTTING_PLAN_LINE_CONSTRAINT_PROFILE },
    manualGroupBreakBefore: false,
  }
}

function trimLineValue(value?: string): string {
  return value?.trim() || ''
}

function buildCuttingPlanLineSnapshotFromCutSizeUnit(unit: CutSizeUnit) {
  const areaM2 = trimLineValue(unit.areaM2) || deriveCutSizeAreaM2(unit)
  const weightG =
    trimLineValue(unit.weightG) ||
    deriveCutSizeWeightG({
      widthMm: unit.widthMm,
      lengthMm: unit.lengthMm,
      pieceCount: unit.pieceCount,
      areaM2,
      areaWeightGsm: unit.areaWeightGsm,
    })

  return {
    cutSizeId: unit.id,
    cutSizeCode: trimLineValue(unit.code),
    cutSizeName: trimLineValue(unit.name),
    sizeExpression: formatCutSizeExpression(unit),
    faw: trimLineValue(unit.areaWeightGsm),
    weightG,
    areaM2,
  }
}

function clearCuttingPlanLineAuthoritySnapshot(line: CuttingPlanLine): CuttingPlanLine {
  return {
    ...line,
    cutSizeId: trimLineValue(line.cutSizeId),
    cutSizeCode: '',
    cutSizeName: '',
    sizeExpression: '',
    faw: '',
    weightG: '',
    areaM2: '',
  }
}

export function syncCuttingPlanLineWithCutSizeUnit(
  line: CuttingPlanLine,
  cutSizeUnit?: CutSizeUnit | null,
): CuttingPlanLine {
  if (!cutSizeUnit || !trimLineValue(line.cutSizeId)) {
    return clearCuttingPlanLineAuthoritySnapshot(line)
  }

  return {
    ...line,
    ...buildCuttingPlanLineSnapshotFromCutSizeUnit(cutSizeUnit),
  }
}

export function collectCuttingPlanLineAuthorityIssues(
  lines: Array<CuttingPlanLine | CuttingPlanInput['lines'][number]>,
  cutSizeUnits: CutSizeUnit[],
): CuttingPlanLineAuthorityIssue[] {
  const issues: CuttingPlanLineAuthorityIssue[] = []

  lines.forEach((line, index) => {
    const sequenceNo = Number(line.sequenceNo) || index + 1
    const cutSizeId = trimLineValue(line.cutSizeId)
    if (!cutSizeId) {
      issues.push({ sequenceNo, kind: 'missing_cut_size_binding' })
      return
    }

    const unit = cutSizeUnits.find((item) => item.id === cutSizeId)
    if (!unit) {
      issues.push({ sequenceNo, kind: 'missing_cut_size_unit' })
    }
  })

  return issues
}

export function collectCuttingPlanPreparationIssues(
  plan: CuttingPlanInput | CuttingPlan,
  cutSizeUnits: CutSizeUnit[],
): CuttingPlanPreparationIssue[] {
  const issues: CuttingPlanPreparationIssue[] = []

  if (!plan.productId?.trim()) {
    issues.push({ kind: 'missing_product_binding' })
  }

  if (!plan.holeCount?.trim()) {
    issues.push({ kind: 'missing_hole_count' })
  }

  if ((plan.lines || []).length === 0) {
    issues.push({ kind: 'empty_lines' })
  }

  const generatedName = buildCuttingPlanName({
    productName: plan.productName,
    productCode: plan.productCode,
    holeCount: plan.holeCount,
  })
  if (!generatedName) {
    issues.push({ kind: 'name_generate_failed' })
  }

  issues.push(...collectCuttingPlanLineAuthorityIssues(plan.lines || [], cutSizeUnits))

  return issues
}

export function normalizeCuttingPlanLine(line: unknown, index: number): CuttingPlanLine {
  const raw = (typeof line === 'object' && line ? line : {}) as Partial<CuttingPlanLine>

  return cuttingPlanLineSchema.parse({
    id: raw.id || `cutting-line-${Date.now()}-${index + 1}`,
    sequenceNo: Number(raw.sequenceNo) || index + 1,
    rollOrder: raw.rollOrder || '',
    yarnDirection: raw.yarnDirection || '',
    cutSizeId: raw.cutSizeId || '',
    cutSizeCode: raw.cutSizeCode || '',
    cutSizeName: raw.cutSizeName || '',
    sizeExpression: raw.sizeExpression || '',
    requiredSets: raw.requiredSets || '1',
    priority: raw.priority || '',
    mustFulfill: raw.mustFulfill ?? true,
    allowMixedPlan: raw.allowMixedPlan ?? false,
    faw: raw.faw || '',
    weightG: raw.weightG || '',
    areaM2: raw.areaM2 || '',
    operationNote: raw.operationNote || '',
    constraintProfile: {
      rollGroupKey: raw.constraintProfile?.rollGroupKey || '',
      orderSequence: raw.constraintProfile?.orderSequence || '',
      yarnDirectionMode: raw.constraintProfile?.yarnDirectionMode || '',
      processTags: normalizeStringArray(raw.constraintProfile?.processTags),
      noteKeywords: normalizeStringArray(raw.constraintProfile?.noteKeywords),
    },
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
  return `${model}-${holeCount}孔裁纱单`
}

export function buildCuttingPlanInput(plan: CuttingPlanInput | CuttingPlan, cutSizeUnits: CutSizeUnit[]): CuttingPlanInput {
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
    lines: (plan.lines || []).map((line, index) => {
      const syncedLine = syncCuttingPlanLineWithCutSizeUnit(
        line,
        cutSizeUnits.find((item) => item.id === trimLineValue(line.cutSizeId)),
      )

      return {
        ...syncedLine,
        sequenceNo: index + 1,
        rollOrder: syncedLine.rollOrder?.trim() || '',
        yarnDirection: syncedLine.yarnDirection?.trim() || '',
        cutSizeId: syncedLine.cutSizeId?.trim() || '',
        cutSizeCode: syncedLine.cutSizeCode?.trim() || '',
        cutSizeName: syncedLine.cutSizeName?.trim() || '',
        sizeExpression: syncedLine.sizeExpression?.trim() || '',
        requiredSets: syncedLine.requiredSets?.trim() || '1',
        priority: syncedLine.priority?.trim() || '',
        mustFulfill: syncedLine.mustFulfill ?? true,
        allowMixedPlan: syncedLine.allowMixedPlan ?? false,
        faw: syncedLine.faw?.trim() || '',
        weightG: syncedLine.weightG?.trim() || '',
        areaM2: syncedLine.areaM2?.trim() || '',
        operationNote: syncedLine.operationNote?.trim() || '',
        constraintProfile: {
          rollGroupKey: syncedLine.constraintProfile?.rollGroupKey?.trim() || '',
          orderSequence: syncedLine.constraintProfile?.orderSequence?.trim() || '',
          yarnDirectionMode: syncedLine.constraintProfile?.yarnDirectionMode?.trim() || '',
          processTags: normalizeStringArray(syncedLine.constraintProfile?.processTags),
          noteKeywords: normalizeStringArray(syncedLine.constraintProfile?.noteKeywords),
        },
        manualGroupBreakBefore: Boolean(syncedLine.manualGroupBreakBefore),
      }
    }),
  })
}

export function prepareCuttingPlanForPersistence(
  plan: CuttingPlanInput | CuttingPlan,
  cutSizeUnits: CutSizeUnit[],
): CuttingPlanInput {
  const issues = collectCuttingPlanPreparationIssues(plan, cutSizeUnits)
  if (issues.length > 0) {
    throw new CuttingPlanPreparationError(issues)
  }

  return buildCuttingPlanInput(plan, cutSizeUnits)
}
