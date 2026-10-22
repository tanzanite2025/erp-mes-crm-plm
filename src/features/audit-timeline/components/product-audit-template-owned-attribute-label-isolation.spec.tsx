// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { type ProductType } from '@/features/engineering/data/schema'
import {
  createProductDraft,
  createProductTemplateDraft,
} from '@/features/engineering/utils/default-builders'
import { projectProductTemplateOwnedAttributesForProductDisplay } from '@/features/engineering/utils/product-template-owned-attribute-catalog-projection'
import { type AuditLog } from '../types'
import { ProductAuditEntry } from './product-audit-entry'

afterEach(cleanup)

const templates = ['车圈', '前叉'].map((name, index) =>
  createProductTemplateDraft({
    id: `template-${index}`,
    name,
    attributeBindings: [
      {
        categoryKey: 'color',
        nameZh: `${name}颜色`,
        active: true,
        required: false,
        sortOrder: 1,
        version: 1,
        options: [
          {
            value: 'blue',
            labelZh: `${name}蓝色`,
            active: false,
            sortOrder: 1,
          },
          { value: 'red', labelZh: `${name}红色`, active: true, sortOrder: 2 },
        ],
      },
    ],
  })
)
const types: ProductType[] = templates.map((template, index) => ({
  id: `type-${index}`,
  name: `型号${index}`,
  code: `TYPE-${index}`,
  templateId: template.id,
  active: true,
  sortOrder: index,
  version: 1,
}))
const catalogs = templates.map(
  projectProductTemplateOwnedAttributesForProductDisplay
)
const baseLog: AuditLog = {
  id: 'audit-1',
  module: 'product',
  target_id: 'product-1',
  action: 'UPDATE',
  operator: '管理员',
  ip: '',
  created_at: '2026-10-22T00:00:00Z',
  diff: [
    {
      f: 'attributeValues',
      a: '属性',
      o: [],
      n: [{ categoryKey: 'color', optionValue: 'blue' }],
    },
  ],
}

function renderProductAuditForTemplateScope(
  log: AuditLog,
  includeCurrentProduct = true
) {
  const result = render(
    <ProductAuditEntry
      log={log}
      actionLabel='更新产品'
      attributeCategories={catalogs.flatMap((catalog) => catalog.categories)}
      attributeOptions={catalogs.flatMap((catalog) => catalog.options)}
      productTemplates={templates}
      productTypes={types}
      products={
        includeCurrentProduct
          ? [
              createProductDraft({
                id: baseLog.target_id,
                name: 'R50',
                typeId: types[0].id,
              }),
            ]
          : []
      }
    />
  )
  fireEvent.click(screen.getByRole('button', { name: /更新产品/ }))
  return result
}

describe('product audit labels follow the template recorded for each side', () => {
  it('uses the product template instead of another template with the same keys and values', () => {
    renderProductAuditForTemplateScope(baseLog)
    expect(screen.queryAllByText('车圈蓝色').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('前叉蓝色')).toHaveLength(0)
  })

  it('resolves a removed product using the type recorded in its audit entry', () => {
    renderProductAuditForTemplateScope(
      {
        ...baseLog,
        diff: [
          ...baseLog.diff,
          { f: 'typeId', a: '分类', o: types[0].id, n: types[0].id },
        ],
      },
      false
    )
    expect(screen.queryAllByText('车圈蓝色').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('前叉蓝色')).toHaveLength(0)
  })

  it('uses separate templates for values before and after a product type change', () => {
    renderProductAuditForTemplateScope({
      ...baseLog,
      diff: [
        { f: 'typeId', a: '分类', o: types[0].id, n: types[1].id },
        {
          f: 'attributeValues',
          a: '属性',
          o: [{ categoryKey: 'color', optionValue: 'blue' }],
          n: [{ categoryKey: 'color', optionValue: 'red' }],
        },
      ],
    })
    expect(screen.queryAllByText('车圈蓝色').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('前叉红色').length).toBeGreaterThan(0)
  })

  it('keeps recorded machine values visible when no template can be resolved', () => {
    renderProductAuditForTemplateScope(baseLog, false)
    expect(screen.queryAllByText('blue').length).toBeGreaterThan(0)
    expect(screen.queryAllByText('前叉蓝色')).toHaveLength(0)
  })
})
