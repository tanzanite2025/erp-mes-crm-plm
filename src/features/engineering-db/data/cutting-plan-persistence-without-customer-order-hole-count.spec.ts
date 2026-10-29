import { describe, expect, it } from 'vitest'
import { normalizeCutSizeUnit } from '@/features/raw-materials/cut-size-library/data/cut-size-library-schema'
import {
  createEmptyCuttingPlanLine,
  EMPTY_CUTTING_PLAN_INPUT,
  normalizeCuttingPlan,
  prepareCuttingPlanForPersistence,
} from './cutting-plan-schema'

const activeCutSizeUnit = normalizeCutSizeUnit({
  id: 'cut-size-1',
  code: 'CUT-100',
  name: '标准裁片',
  widthMm: '100',
  lengthMm: '200',
  areaWeightGsm: '150',
})

const cuttingPlanWithoutOrderHoleCount = {
  ...EMPTY_CUTTING_PLAN_INPUT,
  productId: 'product-1',
  productName: 'R50',
  productCode: 'R50-SKU',
  lines: [
    { ...createEmptyCuttingPlanLine(1), cutSizeId: activeCutSizeUnit.id },
  ],
}

describe('cutting plan persistence without customer-order hole count', () => {
  it('prepares a named plan and authoritative cut-size data without hole count', () => {
    const prepared = prepareCuttingPlanForPersistence(
      cuttingPlanWithoutOrderHoleCount,
      [activeCutSizeUnit]
    )

    expect(prepared.name).toBe('R50-裁纱单')
    expect(prepared).not.toHaveProperty('holeCount')
    expect(prepared.lines[0]).toMatchObject({
      cutSizeId: activeCutSizeUnit.id,
      cutSizeCode: 'CUT-100',
      sizeExpression: '100x200x1',
      areaM2: '0.02',
      weightG: '3',
    })
  })

  it('reads legacy plans and discards retired hole count when preparing a save', () => {
    const legacyPlan = normalizeCuttingPlan({
      ...cuttingPlanWithoutOrderHoleCount,
      id: 'legacy-plan',
      name: 'R50-24孔裁纱单',
      holeCount: '24',
    })

    expect(legacyPlan.id).toBe('legacy-plan')
    expect(legacyPlan).not.toHaveProperty('holeCount')
    const prepared = prepareCuttingPlanForPersistence(legacyPlan, [
      activeCutSizeUnit,
    ])
    expect(prepared.name).toBe('R50-裁纱单')
    expect(prepared).not.toHaveProperty('holeCount')
  })

  it('continues to reject missing products and unbound cutting dimensions', () => {
    expect(() =>
      prepareCuttingPlanForPersistence(
        {
          ...cuttingPlanWithoutOrderHoleCount,
          productId: '',
        },
        [activeCutSizeUnit]
      )
    ).toThrow('Cutting plan preparation failed')
    expect(() =>
      prepareCuttingPlanForPersistence(
        {
          ...cuttingPlanWithoutOrderHoleCount,
          lines: [createEmptyCuttingPlanLine(1)],
        },
        [activeCutSizeUnit]
      )
    ).toThrow('Cutting plan preparation failed')
  })
})
