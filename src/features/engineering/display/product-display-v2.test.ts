import { describe, expect, it } from 'vitest'
import { createProductDraft } from '../utils/default-builders'
import {
  resolveProductDisplaySummaryItemsV2,
  resolveProductDisplayV2,
  PRODUCT_DISPLAY_V2_STRATEGY_VERSION,
} from './product-display-v2'

describe('product-display-v2', () => {
  it('builds template-driven structured summary items in binding order', () => {
    const product = createProductDraft({
      name: 'Road Rim',
      sku: 'RR-01',
      attributeValues: [
        {
          categoryKey: 'techSeries',
          optionValue: 'high-tg',
          sortOrder: 0,
          version: 1,
        },
        {
          categoryKey: 'versionLevel',
          optionValue: 'reinforced',
          sortOrder: 1,
          version: 1,
        },
      ],
    })

    expect(resolveProductDisplayV2({
      locale: 'zh-CN',
      product,
      template: {
        attributeBindings: [
          {
            categoryKey: 'techSeries',
            sortOrder: 0,
            required: true,
            active: true,
            version: 1,
          },
          {
            categoryKey: 'versionLevel',
            sortOrder: 1,
            required: true,
            active: true,
            version: 1,
          },
        ],
      },
      categories: [
        {
          key: 'techSeries',
          nameZh: '工艺系列',
          nameEn: 'Series',
        },
        {
          key: 'versionLevel',
          nameZh: '版本等级',
          nameEn: 'Version',
        },
      ],
      options: [
        {
          categoryKey: 'techSeries',
          value: 'high-tg',
          labelZh: '高刚性',
          labelEn: 'High TG',
        },
        {
          categoryKey: 'versionLevel',
          value: 'reinforced',
          labelZh: '加强版',
          labelEn: 'Reinforced',
        },
      ],
    })).toEqual({
      title: 'Road Rim',
      code: 'RR-01',
      summaryItems: [
        {
          key: 'techseries',
          label: '工艺系列',
          value: '高刚性',
          empty: false,
        },
        {
          key: 'versionlevel',
          label: '版本等级',
          value: '加强版',
          empty: false,
        },
      ],
      summaryText: '高刚性 / 加强版',
      fullLabel: 'Road Rim (高刚性 / 加强版)',
      strategyVersion: PRODUCT_DISPLAY_V2_STRATEGY_VERSION,
    })
  })

  it('supports custom empty value when building template-driven summary items', () => {
    const product = createProductDraft({
      name: 'Road Rim',
      sku: 'RR-01',
      attributeValues: [],
    })

    expect(resolveProductDisplaySummaryItemsV2({
      locale: 'zh-CN',
      product,
      emptyValue: '未绑定',
      template: {
        attributeBindings: [
          {
            categoryKey: 'techSeries',
            sortOrder: 0,
            required: true,
            active: true,
            version: 1,
          },
        ],
      },
      categories: [
        {
          key: 'techSeries',
          nameZh: '工艺系列',
          nameEn: 'Series',
        },
      ],
      options: [],
    })).toEqual([
      {
        key: 'techseries',
        label: '工艺系列',
        value: '未绑定',
        empty: true,
      },
    ])
  })

  it('prefers localized option label when raw attribute value is stored as english text', () => {
    const product = createProductDraft({
      name: 'Road Rim',
      sku: 'RR-01',
      attributeValues: [
        {
          categoryKey: 'versionLevel',
          optionValue: 'Reinforced',
          sortOrder: 0,
          version: 1,
        },
      ],
    })

    expect(resolveProductDisplaySummaryItemsV2({
      locale: 'zh-CN',
      product,
      template: {
        attributeBindings: [
          {
            categoryKey: 'versionLevel',
            sortOrder: 0,
            required: true,
            active: true,
            version: 1,
          },
        ],
      },
      categories: [
        {
          key: 'versionLevel',
          nameZh: '版本等级',
          nameEn: 'Version',
        },
      ],
      options: [
        {
          categoryKey: 'versionLevel',
          value: 'reinforced',
          labelZh: '加强版',
          labelEn: 'Reinforced',
        },
      ],
    })).toEqual([
      {
        key: 'versionlevel',
        label: '版本等级',
        value: '加强版',
        empty: false,
      },
    ])
  })
})
