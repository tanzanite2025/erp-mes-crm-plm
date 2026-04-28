import { describe, expect, it } from 'vitest'
import {
  buildCuttingPlanInput,
  collectCuttingPlanLineAuthorityIssues,
  createEmptyCuttingPlanLine,
  EMPTY_CUTTING_PLAN_INPUT,
} from './cutting-plan-schema'
import type { CutSizeUnit } from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'

const CUT_SIZE_UNIT: CutSizeUnit = {
  id: 'cut-size-1',
  code: 'CS-001',
  name: '主纱 980x34x4',
  widthMm: '980',
  lengthMm: '34',
  pieceCount: '4',
  areaM2: '0.13328',
  areaWeightGsm: '260',
  weightG: '34.6528',
  cutAngle: '45',
  layupCount: '1',
  layupMode: '',
  usageType: '主纱',
  notes: '',
  status: 'Active',
  version: 1,
}

describe('cutting-plan-schema authority sync', () => {
  it('syncs cut-size-derived snapshot fields from the cut-size library', () => {
    const line = {
      ...createEmptyCuttingPlanLine(1),
      cutSizeId: CUT_SIZE_UNIT.id,
      cutSizeCode: 'OLD',
      cutSizeName: 'OLD',
      sizeExpression: 'manual',
      faw: '999',
      weightG: '999',
      areaM2: '999',
      requiredSets: '2',
      operationNote: '保留工艺备注',
    }

    const result = buildCuttingPlanInput(
      {
        ...EMPTY_CUTTING_PLAN_INPUT,
        productId: 'product-1',
        productCode: 'P-001',
        productName: '产品A',
        holeCount: '14',
        lines: [line],
      },
      [CUT_SIZE_UNIT],
    )

    expect(result.lines[0].cutSizeCode).toBe('CS-001')
    expect(result.lines[0].cutSizeName).toBe('主纱 980x34x4')
    expect(result.lines[0].sizeExpression).toBe('980x34x4')
    expect(result.lines[0].faw).toBe('260')
    expect(result.lines[0].weightG).toBe('34.6528')
    expect(result.lines[0].areaM2).toBe('0.13328')
    expect(result.lines[0].requiredSets).toBe('2')
    expect(result.lines[0].operationNote).toBe('保留工艺备注')
  })

  it('reports missing or unavailable cut-size bindings', () => {
    const issues = collectCuttingPlanLineAuthorityIssues(
      [
        createEmptyCuttingPlanLine(1),
        {
          ...createEmptyCuttingPlanLine(2),
          cutSizeId: 'missing-unit',
        },
      ],
      [CUT_SIZE_UNIT],
    )

    expect(issues).toEqual([
      { sequenceNo: 1, kind: 'missing_cut_size_binding' },
      { sequenceNo: 2, kind: 'missing_cut_size_unit' },
    ])
  })

  it('clears stale authority snapshots when the cut-size binding is unavailable', () => {
    const result = buildCuttingPlanInput(
      {
        ...EMPTY_CUTTING_PLAN_INPUT,
        productId: 'product-1',
        productCode: 'P-001',
        productName: '产品A',
        holeCount: '14',
        lines: [
          {
            ...createEmptyCuttingPlanLine(1),
            cutSizeId: 'missing-unit',
            cutSizeCode: 'OLD-CODE',
            cutSizeName: 'OLD-NAME',
            sizeExpression: '980x34x4',
            faw: '260',
            weightG: '34.6528',
            areaM2: '0.13328',
          },
        ],
      },
      [CUT_SIZE_UNIT],
    )

    expect(result.lines[0].cutSizeId).toBe('missing-unit')
    expect(result.lines[0].cutSizeCode).toBe('')
    expect(result.lines[0].cutSizeName).toBe('')
    expect(result.lines[0].sizeExpression).toBe('')
    expect(result.lines[0].faw).toBe('')
    expect(result.lines[0].weightG).toBe('')
    expect(result.lines[0].areaM2).toBe('')
  })
})
