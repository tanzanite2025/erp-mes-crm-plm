import { describe, expect, it } from 'vitest'
import { buildControlledProtocolStandard } from './controlled-protocol-standard-factory'

describe('buildControlledProtocolStandard', () => {
  it('builds a product-linked draft quality standard from controlled protocol criteria', () => {
    const standard = buildControlledProtocolStandard(
      {
        productId: '550e8400-e29b-41d4-a716-446655440000',
        productName: 'T700 标准件',
        criteria: [
          {
            id: 'criterion-1',
            itemName: '成品重量',
            inspectionStageId: 'finished-weight',
            inspectionStageName: '成品称重',
            targetWeight: 150,
            unit: 'g',
            gradingMode: 'DEVIATION_BANDS',
            levels: [
              {
                level: 'S',
                lowerTolerance: 0,
                upperTolerance: 0,
                result: 'PASS',
              },
              {
                level: 'A',
                lowerTolerance: 5,
                upperTolerance: 5,
                result: 'PASS',
              },
              {
                level: 'B',
                lowerTolerance: 10,
                upperTolerance: 10,
                result: 'PASS',
              },
            ],
          },
        ],
      },
      {
        now: new Date('2026-07-24T08:00:00.000Z'),
        codeSuffix: 'ABC12345',
      }
    )

    expect(standard).toMatchObject({
      code: 'QCP-20260724-ABC12345',
      name: 'T700 标准件 受控品质协议',
      productId: '550e8400-e29b-41d4-a716-446655440000',
      productName: 'T700 标准件',
      type: 'FQC',
      status: 'DRAFT',
    })
    expect(standard.items).toEqual([
      {
        id: 'criterion-1',
        name: '成品重量',
        inspectionStageId: 'finished-weight',
        inspectionStageName: '成品称重',
        order: 1,
        centerValue: 150,
        unit: 'g',
        isRequired: true,
        gradingMode: 'DEVIATION_BANDS',
        remarks: '超出全部等级范围为不合格，处置另行记录。',
        levels: [
          {
            level: 'S',
            lowerTolerance: 0,
            upperTolerance: 0,
            result: 'PASS',
          },
          {
            level: 'A',
            lowerTolerance: 5,
            upperTolerance: 5,
            result: 'PASS',
          },
          {
            level: 'B',
            lowerTolerance: 10,
            upperTolerance: 10,
            result: 'PASS',
          },
        ],
      },
    ])
  })
})
