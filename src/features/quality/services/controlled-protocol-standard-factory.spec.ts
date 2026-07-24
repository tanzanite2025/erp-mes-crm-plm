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
            targetWeight: 150,
            unit: 'g',
            qualifiedMin: 145,
            qualifiedMax: 155,
            scrapBelow: 130,
            scrapAbove: 170,
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
        order: 1,
        centerValue: 150,
        unit: 'g',
        isRequired: true,
        remarks: '合格范围：145 ~ 155g；低于 130g 判定报废；高于 170g 判定报废',
        levels: [
          {
            level: 'A',
            min: 145,
            max: 155,
          },
          {
            level: 'S',
            min: 130,
            max: 170,
            errorCodeLower: 'CONTROLLED_PROTOCOL_SCRAP_BELOW',
            errorCodeUpper: 'CONTROLLED_PROTOCOL_SCRAP_ABOVE',
          },
        ],
      },
    ])
  })
})
