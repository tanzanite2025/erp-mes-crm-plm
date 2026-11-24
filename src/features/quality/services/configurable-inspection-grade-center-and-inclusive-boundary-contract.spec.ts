import { describe, expect, it } from 'vitest'
import { toQualityStandardContract } from '../adapters/quality-standard-api-adapter'
import {
  buildConfigurableInspectionGradeRules,
  hasValidConfigurableInspectionGradeFormValues,
} from './configurable-inspection-deviation-grade-rules'

function createInspectionGradeFormValuesForBoundaryVerification(
  firstTolerance = 5,
  secondTolerance = 10
) {
  return [
    {
      level: '优',
      lowerTolerance: '0',
      upperTolerance: '0',
      result: 'PASS' as const,
    },
    {
      level: '合格',
      lowerTolerance: String(firstTolerance),
      upperTolerance: String(firstTolerance),
      result: 'PASS' as const,
    },
    {
      level: '普通',
      lowerTolerance: String(secondTolerance),
      upperTolerance: String(secondTolerance),
      result: 'PASS' as const,
    },
  ]
}

describe('configurable inspection grade center and inclusive boundaries', () => {
  it.each([
    [450, '优'],
    [449.999, '合格'],
    [450.001, '合格'],
    [445, '合格'],
    [455, '合格'],
    [444.999, '普通'],
    [455.001, '普通'],
    [440, '普通'],
    [460, '普通'],
    [439.999, 'OUT_OF_RANGE'],
    [460.001, 'OUT_OF_RANGE'],
  ])(
    'represents measurement %s as %s using the first inclusive matching range',
    (measurement, expectedGrade) => {
      const grades = buildConfigurableInspectionGradeRules(
        createInspectionGradeFormValuesForBoundaryVerification()
      )
      const matchingGrade = grades.find(
        (grade) =>
          measurement >= 450 - grade.lowerTolerance! &&
          measurement <= 450 + grade.upperTolerance!
      )
      expect(matchingGrade?.level ?? 'OUT_OF_RANGE').toBe(expectedGrade)
    }
  )

  it.each([
    [450, 0, 10],
    [450, -5, 10],
    [450, 5, 5],
    [450, 10, 5],
    [Infinity, 5, 10],
    [450, NaN, 10],
    [450, 5, Infinity],
    [450, 5, -Infinity],
    [Number.MAX_VALUE, 5, 10],
  ])(
    'rejects invalid or unrepresentable center and ranges %s/%s/%s',
    (center, firstTolerance, secondTolerance) => {
      expect(
        hasValidConfigurableInspectionGradeFormValues(
          createInspectionGradeFormValuesForBoundaryVerification(
            firstTolerance,
            secondTolerance
          ),
          center
        )
      ).toBe(false)
    }
  )

  it('supports a zero center and decimal deviation ranges', () => {
    const grades = createInspectionGradeFormValuesForBoundaryVerification(
      0.05,
      0.1
    )
    expect(hasValidConfigurableInspectionGradeFormValues(grades, 0)).toBe(true)
    expect(buildConfigurableInspectionGradeRules(grades)).toMatchObject([
      { level: '优', lowerTolerance: 0, upperTolerance: 0 },
      { level: '合格', lowerTolerance: 0.05, upperTolerance: 0.05 },
      { level: '普通', lowerTolerance: 0.1, upperTolerance: 0.1 },
    ])
  })
})

describe('quality standard API accepts only the complete three-level contract', () => {
  const item = {
    id: 'weight',
    name: '重量',
    inspectionStageId: 'stage',
    inspectionStageName: '称重',
    centerValue: 450,
    unit: 'G',
    gradingMode: 'DEVIATION_BANDS',
    levels: [
      { level: '合格', lowerTolerance: 5, upperTolerance: 8, result: 'PASS' },
    ],
  }
  const response = {
    id: 'standard',
    code: 'STD',
    name: '标准',
    type: 'FQC',
    status: 'DRAFT',
    items: [item],
  }
  it.each([
    { ...item, inspectionStageId: undefined },
    { ...item, gradingMode: undefined },
    { ...item, levels: [{ level: 'A', tolerance: 5, min: 445, max: 455 }] },
    { ...item, levels: [{ ...item.levels[0], tolerance: 5 }] },
    { ...item, formula: 'measuredWeight' },
    { ...item, isRequired: null },
    { ...item, order: null },
    { ...item, remarks: null },
  ])('rejects incomplete or unsupported project fields %#', (invalidItem) => {
    expect(() =>
      toQualityStandardContract({ ...response, items: [invalidItem] })
    ).toThrow()
  })
  it('reads valid stage, weight and independent grade rules', () => {
    const standard = toQualityStandardContract(response)
    expect(standard.items[0]).toMatchObject(item)
  })
  it('counts a supplementary Chinese character as one character in the grade name limit', () => {
    const makeResponseWithGradeName = (name: string) => ({
      ...response,
      items: [{ ...item, levels: [{ ...item.levels[0], level: name }] }],
    })
    expect(
      toQualityStandardContract(makeResponseWithGradeName('𠮷'.repeat(40)))
        .items[0].levels[0].level
    ).toBe('𠮷'.repeat(40))
    expect(() =>
      toQualityStandardContract(makeResponseWithGradeName('𠮷'.repeat(41)))
    ).toThrow()
  })
})
