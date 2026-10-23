// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LanguageProvider } from '@/context/language-provider'
import { type AuditLog } from '../types'
import { ProductPhysicalSpecificationTemplateAuditEntry } from './product-physical-specification-template-audit-entry'

afterEach(cleanup)

const historicalTemplateAudit: AuditLog = {
  id: 'template-audit',
  module: 'product-template',
  target_id: 'deleted-template',
  action: 'Update',
  operator: '规格管理员',
  ip: '192.0.2.1',
  created_at: '2026-10-23T03:00:00Z',
  diff: [
    { f: 'name', a: 'name', o: '车圈物理规格模板', n: '新版车圈规格模板' },
    {
      f: 'attributeBindings',
      a: 'attributeBindings',
      o: [
        {
          categoryKey: 'techSeries',
          nameZh: '工艺系列',
          required: false,
          active: true,
          options: [
            { value: 'standard', labelZh: '常规系列', active: true },
            {
              value: 'high-tg',
              labelZh: '高温系列',
              labelEn: 'High TG',
              active: true,
            },
          ],
        },
      ],
      n: [
        {
          categoryKey: 'techSeries',
          nameZh: '工艺系列',
          required: true,
          active: true,
          options: [{ value: 'standard', labelZh: '常规系列', active: false }],
        },
      ],
    },
  ],
}

describe('physical specification template history uses stored definitions', () => {
  it('shows the operator, historical names, removed options and required or disabled states without a current template', () => {
    render(
      <LanguageProvider defaultLocale='zh-CN'>
        <ProductPhysicalSpecificationTemplateAuditEntry
          log={historicalTemplateAudit}
          actionLabel='更新'
        />
      </LanguageProvider>
    )
    expect(screen.getByText('规格管理员')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /新版车圈规格模板/ }))
    const attributes = screen.getByRole('heading', {
      name: '规格属性与选项',
    }).parentElement!
    const [before, after] = within(attributes)
      .getAllByText(/工艺系列/)
      .map((name) => name.parentElement!)
    expect(within(before).getByText(/高温系列 \(High TG\)/)).toBeInTheDocument()
    expect(within(after).queryByText(/高温系列/)).not.toBeInTheDocument()
    expect(within(before).getByText(/非必填/)).toBeInTheDocument()
    expect(within(after).getByText(/^必填/)).toBeInTheDocument()
    expect(within(after).getByText(/常规系列.*停用/)).toBeInTheDocument()
    expect(screen.getByText('车圈物理规格模板')).toBeInTheDocument()
  })

  it('identifies a deleted template by its recorded old name', () => {
    render(
      <LanguageProvider defaultLocale='en-US'>
        <ProductPhysicalSpecificationTemplateAuditEntry
          log={{
            ...historicalTemplateAudit,
            action: 'Delete',
            diff: [
              { f: 'name', a: 'name', o: 'Deleted rim template', n: null },
            ],
          }}
          actionLabel='Delete'
        />
      </LanguageProvider>
    )
    fireEvent.click(
      screen.getByRole('button', { name: /Deleted rim template/ })
    )
    expect(screen.getByText('Deleted rim template')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Template name' })
    ).toBeInTheDocument()
  })
})
