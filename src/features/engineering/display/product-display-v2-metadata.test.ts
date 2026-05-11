import { describe, expect, it } from 'vitest'
import { createProductDraft } from '../utils/default-builders'
import { resolveProductDisplayMetadataV2 } from './product-display-v2-metadata'

describe('product-display-v2-metadata', () => {
  it('resolves authority template and builds v2 projection metadata', () => {
    const product = createProductDraft({
      id: 'product-rim',
      name: 'Road Rim',
      sku: 'RR-01',
      typeId: 'type-rim',
      resolvedTemplateId: 'template-rim',
      resolvedTemplateKey: 'RIM',
      attributeValues: [
        {
          categoryKey: 'techSeries',
          optionValue: 'high-tg',
          sortOrder: 0,
          version: 1,
        },
      ],
    })

    expect(resolveProductDisplayMetadataV2({
      locale: 'zh-CN',
      product,
      templates: [
        {
          id: 'template-rim',
          name: '车圈规格',
          code: 'RIM_TEMPLATE',
          componentKey: 'RIM',
          description: '',
          active: true,
          attributeBindings: [
            {
              id: 'template-binding-series',
              templateId: 'template-rim',
              categoryKey: 'techSeries',
              required: true,
              active: true,
              sortOrder: 0,
              version: 1,
            },
          ],
          createdAt: '2026-04-29T00:00:00.000Z',
          version: 1,
        },
      ],
      productTypes: [
        {
          id: 'type-rim',
          name: 'Rim',
          code: 'RIM',
          templateId: 'template-rim',
          active: true,
          sortOrder: 0,
          version: 1,
        },
      ],
      categories: [
        {
          id: 'category-series',
          key: 'techSeries',
          nameZh: '工艺系列',
          nameEn: 'Series',
          sortOrder: 0,
          active: true,
          version: 1,
        },
      ],
      options: [
        {
          id: 'option-series',
          categoryKey: 'techSeries',
          value: 'high-tg',
          labelZh: '高刚性',
          labelEn: 'High TG',
          sortOrder: 0,
          active: true,
          version: 1,
        },
      ],
    })).toEqual(expect.objectContaining({
      resolvedTemplate: expect.objectContaining({
        id: 'template-rim',
      }),
      templateResolution: expect.objectContaining({
        source: 'resolvedTemplateId',
      }),
      projection: expect.objectContaining({
        title: 'Road Rim',
        fullLabel: 'Road Rim (高刚性)',
      }),
    }))
  })

  it('forwards custom empty value into projection summary items', () => {
    const product = createProductDraft({
      id: 'product-rim',
      name: 'Road Rim',
      sku: 'RR-01',
      typeId: 'type-rim',
      resolvedTemplateId: 'template-rim',
      resolvedTemplateKey: 'RIM',
      attributeValues: [],
    })

    expect(resolveProductDisplayMetadataV2({
      locale: 'zh-CN',
      product,
      emptyValue: '未绑定',
      templates: [
        {
          id: 'template-rim',
          name: '车圈规格',
          code: 'RIM_TEMPLATE',
          componentKey: 'RIM',
          description: '',
          active: true,
          attributeBindings: [
            {
              id: 'template-binding-series',
              templateId: 'template-rim',
              categoryKey: 'techSeries',
              required: true,
              active: true,
              sortOrder: 0,
              version: 1,
            },
          ],
          createdAt: '2026-04-29T00:00:00.000Z',
          version: 1,
        },
      ],
      productTypes: [
        {
          id: 'type-rim',
          name: 'Rim',
          code: 'RIM',
          templateId: 'template-rim',
          active: true,
          sortOrder: 0,
          version: 1,
        },
      ],
      categories: [
        {
          id: 'category-series',
          key: 'techSeries',
          nameZh: '工艺系列',
          nameEn: 'Series',
          sortOrder: 0,
          active: true,
          version: 1,
        },
      ],
      options: [],
    }).projection?.summaryItems).toEqual([
      {
        key: 'techseries',
        label: '工艺系列',
        value: '未绑定',
        empty: true,
      },
    ])
  })
})
