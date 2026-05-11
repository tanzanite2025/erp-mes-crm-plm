// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createProductDraft } from '@/features/engineering/utils/default-builders'
import { ProductAuditEntry } from './product-audit-entry'
import type { AuditLog } from '../types'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string) => key,
  }),
}))

vi.mock('./audit-entry-shell', () => ({
  AuditEntryShell: ({ children, targetValue }: { children: ReactNode; targetValue: string }) => (
    <div>
      <div>{targetValue}</div>
      {children}
    </div>
  ),
  AuditEntryColumns: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  AuditEntryColumnCard: ({ children, title }: { children: ReactNode; title: string }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  AuditEntrySummaryList: ({ items }: { items: Array<{ label: string; value: string }> }) => (
    <div>
      {items.map((item) => (
        <div key={item.label}>{item.label}: {item.value}</div>
      ))}
    </div>
  ),
}))

describe('ProductAuditEntry', () => {
  it('renders v2 product display and template summary badges when metadata is available', () => {
    const log: AuditLog = {
      id: 'log-1',
      module: 'product',
      target_id: 'product-rim',
      action: 'update',
      diff: [
        {
          f: 'name',
          o: 'Old Rim',
          n: 'Road Rim',
          a: 'name',
        },
      ],
      operator: 'tester',
      ip: '127.0.0.1',
      created_at: '2026-05-11T00:00:00.000Z',
    }

    render(
      <ProductAuditEntry
        log={log}
        actionLabel='Update'
        attributeCategories={[
          {
            id: 'category-series',
            key: 'techSeries',
            nameZh: '工艺系列',
            nameEn: 'Series',
            sortOrder: 0,
            active: true,
            version: 1,
          },
        ]}
        attributeOptions={[
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
        ]}
        productTemplates={[
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
        ]}
        productTypes={[
          {
            id: 'type-rim',
            name: 'Rim',
            code: 'RIM',
            templateId: 'template-rim',
            active: true,
            sortOrder: 0,
            version: 1,
          },
        ]}
        products={[
          createProductDraft({
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
          }),
        ]}
      />,
    )

    expect(screen.getByText('Road Rim (高刚性)')).toBeTruthy()
    expect(screen.getByText('产品对象: Road Rim (高刚性)')).toBeTruthy()
    expect(screen.getByText('工艺系列: 高刚性')).toBeTruthy()
  })

  it('uses the v2 base projection when metadata is unavailable', () => {
    const log: AuditLog = {
      id: 'log-2',
      module: 'product',
      target_id: 'product-r50',
      action: 'update',
      diff: [
        {
          f: 'name',
          o: 'Old Model',
          n: 'R50',
          a: 'name',
        },
      ],
      operator: 'tester',
      ip: '127.0.0.1',
      created_at: '2026-05-11T00:00:00.000Z',
    }

    render(
      <ProductAuditEntry
        log={log}
        actionLabel='Update'
        attributeCategories={[]}
        attributeOptions={[]}
        productTemplates={[]}
        productTypes={[]}
        products={[
          createProductDraft({
            id: 'product-r50',
            name: 'R50',
            sku: 'R50-01',
            attributeValues: [
              {
                categoryKey: 'techSeries',
                optionValue: 'high-tg',
                sortOrder: 0,
                version: 1,
              },
              {
                categoryKey: 'brakeType',
                optionValue: 'disc',
                sortOrder: 1,
                version: 1,
              },
            ],
          }),
        ]}
      />,
    )

    expect(screen.getAllByText('R50').length).toBeGreaterThan(0)
    expect(screen.getByText('产品对象: R50')).toBeTruthy()
  })
})
