import { describe, expect, it } from 'vitest'
import {
  type ProductTemplateAttributeBinding,
  type ProductTemplateAttributeLevelTwoOption,
  type ProductType,
} from '../data/schema'
import { resolveProductDisplaySummaryItemsV2 } from '../display/product-display-v2'
import { resolveProductAggregateDisplay } from './product-display-aggregate'
import {
  resolveAuthoritativeTemplate,
  resolveEffectiveTemplate,
  resolveTemplateFromComponentKey,
} from './product-template-resolution'

const productTypes: ProductType[] = [
  {
    id: 'rim-root',
    name: '车圈',
    code: 'rim',
    templateId: 'rim-template',
    active: true,
    sortOrder: 0,
    version: 1,
  },
  {
    id: 'rim-r50',
    parentId: 'rim-root',
    name: 'R50',
    code: 'r50',
    active: true,
    sortOrder: 0,
    version: 1,
  },
  {
    id: 'fork-f50',
    name: 'F50',
    code: 'f50',
    templateId: 'fork-template',
    active: true,
    sortOrder: 0,
    version: 1,
  },
]
const options: ProductTemplateAttributeLevelTwoOption[] = [
  {
    id: 'old',
    categoryKey: 'brakeType',
    value: 'disc',
    labelZh: '旧公共碟刹',
    active: true,
    sortOrder: 0,
    version: 1,
  },
  {
    id: 'fork',
    templateId: 'fork-template',
    categoryKey: 'brakeType',
    value: 'disc',
    labelZh: '前叉独立碟刹',
    active: true,
    sortOrder: 1,
    version: 1,
  },
  {
    id: 'rim',
    templateId: 'rim-template',
    categoryKey: 'brakeType',
    value: 'disc',
    labelZh: '车圈独立碟刹',
    active: true,
    sortOrder: 1,
    version: 1,
  },
  {
    id: 'grade',
    categoryKey: 'versionLevel',
    value: 'std',
    labelZh: '标准版',
    active: true,
    sortOrder: 1,
    version: 1,
  },
]

describe('template-owned product attribute labels', () => {
  it('never replaces an explicitly identified missing template with another template using the same form component', () => {
    const templates = [
      { id: 'fork-template', componentKey: 'GENERAL', active: true },
    ] as Parameters<typeof resolveAuthoritativeTemplate>[0]
    expect(
      resolveAuthoritativeTemplate(templates, {
        productTypes,
        typeId: 'rim-r50',
        resolvedTemplateId: 'rim-template',
        resolvedTemplateKey: 'GENERAL',
      }).template
    ).toBeNull()
    expect(
      resolveEffectiveTemplate(templates, {
        productTypes,
        typeId: 'rim-r50',
        productTemplateKey: 'GENERAL',
      }).template
    ).toBeNull()
  })

  it('uses the category’s explicit template identity ahead of a form component key', () => {
    const templates = [
      { id: 'rim-template', componentKey: 'RIM', active: true },
      { id: 'fork-template', componentKey: 'GENERAL', active: true },
    ] as Parameters<typeof resolveAuthoritativeTemplate>[0]
    expect(
      resolveAuthoritativeTemplate(templates, {
        productTypes,
        typeId: 'rim-r50',
        resolvedTemplateKey: 'GENERAL',
      }).template?.id
    ).toBe('rim-template')
  })

  it('does not guess a template when several templates reuse one form component', () => {
    const templates = [
      { id: 'rim-template', componentKey: 'GENERAL', active: true },
      { id: 'fork-template', componentKey: 'GENERAL', active: true },
    ] as Parameters<typeof resolveAuthoritativeTemplate>[0]
    expect(resolveTemplateFromComponentKey(templates, 'GENERAL')).toBeNull()
    expect(resolveTemplateFromComponentKey([templates[0]], 'GENERAL')?.id).toBe(
      'rim-template'
    )
  })

  it('resolves equal attribute keys and option values using each product’s own template', () => {
    const resolveLabel = (typeId: string) =>
      resolveProductAggregateDisplay({
        locale: 'zh-CN',
        product: {
          name: '',
          typeId,
          attributeValues: [
            {
              categoryKey: 'brakeType',
              optionValue: 'disc',
              sortOrder: 1,
              version: 1,
            },
          ],
        },
        productTypes,
        options,
        ownerTypeInternalLabel: '内部',
        unknownCustomerLabel: '未知',
      }).label
    expect(resolveLabel('rim-r50')).toBe('R50 (车圈独立碟刹)')
    expect(resolveLabel('fork-f50')).toBe('F50 (前叉独立碟刹)')
  })

  it('retains the independent BOM grade label alongside the product template’s brake label', () => {
    const display = resolveProductAggregateDisplay({
      locale: 'zh-CN',
      product: {
        name: '',
        typeId: 'rim-r50',
        attributeValues: [
          {
            categoryKey: 'brakeType',
            optionValue: 'disc',
            sortOrder: 1,
            version: 1,
          },
        ],
      },
      productTypes,
      options,
      bom: {
        bomType: 'EBOM',
        ownerType: 'INTERNAL',
        versionLevel: 'std',
        measuredWeight: 0,
        measuredWeightUnit: 'g',
      },
      ownerTypeInternalLabel: '内部',
      unknownCustomerLabel: '未知',
    })
    expect(display.label).toBe('R50 (标准版 / 车圈独立碟刹)')
  })

  it('does not borrow labels from other templates when the product template is unavailable', () => {
    const display = resolveProductAggregateDisplay({
      locale: 'zh-CN',
      product: {
        name: '待配置',
        typeId: 'missing',
        attributeValues: [
          {
            categoryKey: 'brakeType',
            optionValue: 'disc',
            sortOrder: 1,
            version: 1,
          },
        ],
      },
      productTypes,
      options,
      ownerTypeInternalLabel: '内部',
      unknownCustomerLabel: '未知',
    })
    expect(display.label).toBe('待配置 (disc)')
  })

  it('builds product summaries directly from the bound template definitions', () => {
    const definition: ProductTemplateAttributeBinding = {
      categoryKey: 'brakeType',
      nameZh: '本模板制动类型',
      nameEn: 'Local brake',
      options: [
        {
          value: 'disc',
          labelZh: '本模板碟刹',
          labelEn: 'Local disc',
          active: false,
          sortOrder: 1,
        },
      ],
      active: true,
      required: false,
      sortOrder: 1,
      version: 1,
    }
    const product = {
      name: 'R50',
      sku: 'R50-01',
      modelCode: '01',
      attributeValues: [
        {
          categoryKey: 'brakeType',
          optionValue: 'disc',
          sortOrder: 1,
          version: 1,
        },
      ],
    }
    const summary = resolveProductDisplaySummaryItemsV2({
      locale: 'en-US',
      product,
      template: { attributeBindings: [definition] },
      options,
    })
    expect(summary).toMatchObject([
      { label: 'Local brake', value: 'Local disc', empty: false },
    ])
    const aggregate = resolveProductAggregateDisplay({
      locale: 'zh-CN',
      product: { ...product, typeId: 'rim-r50' },
      productTypes,
      template: { id: 'rim-template', attributeBindings: [definition] },
      options: [],
      ownerTypeInternalLabel: '内部',
      unknownCustomerLabel: '未知',
    })
    expect(aggregate.label).toBe('R50 (本模板碟刹)')
  })

  it('continues to display recorded values after their template attribute is disabled', () => {
    const definition: ProductTemplateAttributeBinding = {
      categoryKey: 'color',
      nameZh: '颜色',
      options: [
        { value: 'blue', labelZh: '车圈蓝色', active: false, sortOrder: 1 },
      ],
      active: false,
      required: false,
      sortOrder: 1,
      version: 1,
    }
    const product = {
      name: 'R50',
      sku: 'R50-01',
      modelCode: '01',
      attributeValues: [
        { categoryKey: 'color', optionValue: 'blue', sortOrder: 1, version: 1 },
      ],
    }
    expect(
      resolveProductDisplaySummaryItemsV2({
        locale: 'zh-CN',
        product,
        template: { attributeBindings: [definition] },
      })
    ).toMatchObject([{ label: '颜色', value: '车圈蓝色' }])
    expect(
      resolveProductDisplaySummaryItemsV2({
        locale: 'zh-CN',
        product: { ...product, attributeValues: [] },
        template: { attributeBindings: [definition] },
      })
    ).toEqual([])
  })
})
