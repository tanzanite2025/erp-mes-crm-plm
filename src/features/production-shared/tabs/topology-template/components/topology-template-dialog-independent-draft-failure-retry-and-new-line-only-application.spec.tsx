// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  ProductionLine,
  ProductionTopologyTemplate,
} from '../../../data/production-line'
import { TemplateDialog } from './template-dialog'

vi.mock('@/lib/safe-catch', () => ({ failLoudly: vi.fn() }))
afterEach(cleanup)

const independentTemplate: ProductionTopologyTemplate = {
  id: 'snapshot-template',
  name: '车圈结构模板',
  description: '独立副本',
  version: 2,
  createdAt: '',
  updatedAt: '',
  snapshot: {
    productTemplateId: 'product-template',
    productTemplateName: '车圈',
    sourceLineCode: 'SOURCE-L1',
    lineDescription: '原实际说明',
    branches: [
      {
        productId: 'rim-product',
        bomOwnerType: 'INTERNAL',
        bomOwnerCustomerId: '',
        bomVersionLevel: 'standard',
        name: 'RIM-24 · standard',
        productSKU: 'RIM-24',
        description: '原分支说明',
        attributes: { nested: { value: 'source' } },
        operationReferences: [
          {
            name: '成型',
            description: '保存时的工序',
            sortOrder: 0,
            isActive: true,
          },
        ],
      },
    ],
  },
}

describe('independent topology template dialog', () => {
  it('keeps source values independent, preserves a failed draft and supports retry', async () => {
    const original = structuredClone(independentTemplate)
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('拓扑模板已修改，请刷新后重试'))
      .mockResolvedValueOnce({})
    const onOpenChange = vi.fn()
    render(
      <TemplateDialog
        open
        onOpenChange={onOpenChange}
        mode='edit'
        template={independentTemplate}
        lines={[]}
        branches={[]}
        onSave={onSave}
      />
    )
    const nameInput = screen.getByRole('textbox', {
      name: '模板名称',
    }) as HTMLInputElement
    fireEvent.change(nameInput, { target: { value: '保留的模板草稿' } })
    fireEvent.change(screen.getByRole('textbox', { name: '分支说明' }), {
      target: { value: '修改后的分支草稿' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      '拓扑模板已修改'
    )
    expect(nameInput.value).toBe('保留的模板草稿')
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(independentTemplate).toEqual(original)
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onSave).toHaveBeenLastCalledWith(
      expect.objectContaining({
        mode: 'edit',
        template: expect.objectContaining({ name: '保留的模板草稿' }),
      })
    )
    expect(independentTemplate).toEqual(original)
  })

  it('cancelled branch removal changes only the local draft', () => {
    const original = structuredClone(independentTemplate)
    const onSave = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <TemplateDialog
        open
        onOpenChange={onOpenChange}
        mode='edit'
        template={independentTemplate}
        lines={[]}
        branches={[]}
        onSave={onSave}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '移除分支' }))
    expect(screen.queryByRole('textbox', { name: '分支说明' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(onSave).not.toHaveBeenCalled()
    expect(independentTemplate).toEqual(original)
  })

  it('applies to a new line without an existing-line target and prevents duplicate submits', async () => {
    let finishApplication!: () => void
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishApplication = resolve
        })
    )
    render(
      <TemplateDialog
        open
        onOpenChange={vi.fn()}
        mode='apply'
        template={independentTemplate}
        lines={[]}
        branches={[]}
        onSave={onSave}
      />
    )
    fireEvent.change(screen.getByRole('textbox', { name: '新 L1 编码' }), {
      target: { value: ' new- l1-001 ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '创建新 L1' }))
    expect(screen.queryByRole('combobox')).toBeNull()
    const pendingButton = screen.getByRole('button', {
      name: '正在保存…',
    }) as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    fireEvent.click(pendingButton)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith({
      mode: 'apply',
      template: independentTemplate,
      code: 'NEW-L1-001',
    })
    finishApplication()
    await waitFor(() => expect(pendingButton.disabled).toBe(false))
  })

  it('captures the explicitly selected source line and its displayed version', async () => {
    const onSave = vi.fn().mockResolvedValue({})
    const source = {
      id: 'actual-line',
      code: 'SOURCE-001',
      name: '车圈',
      version: 7,
    } as ProductionLine
    render(
      <TemplateDialog
        open
        onOpenChange={vi.fn()}
        mode='capture'
        initialSourceLine={source}
        lines={[source]}
        branches={[]}
        onSave={onSave}
      />
    )
    expect(
      (screen.getByRole('combobox', { name: '来源 L1' }) as HTMLSelectElement)
        .disabled
    ).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: '保存模板' }))
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        mode: 'capture',
        sourceLineId: source.id,
        sourceLineVersion: 7,
        name: '车圈拓扑模板',
        description: '',
      })
    )
  })
})
