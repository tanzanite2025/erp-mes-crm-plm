// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProductionBOMBranchOperation } from '../../../data/production-line'
import { MindmapDetailProcessEntityEditor } from './mindmap-detail-process-entity-editor'

vi.mock('@/lib/safe-catch', () => ({ failLoudly: vi.fn() }))

const originalBranchOperation: ProductionBOMBranchOperation = {
  id: 'forming-operation',
  productId: 'rim-product',
  bomOwnerType: 'INTERNAL',
  bomOwnerCustomerId: '',
  bomVersionLevel: 'standard',
  name: '成型',
  description: '原工序说明',
  sortOrder: 1,
  isActive: true,
}

afterEach(cleanup)

describe('branch operation reference protection in the mindmap editor', () => {
  it('displays the actual 409 reason, keeps the draft, and permits a successful retry', async () => {
    const conflictReason = '工序已被已发布生产路线引用，不能停用'
    const saveBranchOperation = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error(conflictReason), { status: 409 })
      )
      .mockResolvedValueOnce({
        ...originalBranchOperation,
        description: '保留的工序说明',
      })
    render(
      <MindmapDetailProcessEntityEditor
        levelNames={{ 1: 'L1', 2: 'L2', 3: 'L3' }}
        processEntity={originalBranchOperation}
        onSaveProcessEntity={saveBranchOperation}
      />
    )
    const descriptionInput = screen.getByPlaceholderText(
      '补充L3说明'
    ) as HTMLTextAreaElement
    fireEvent.change(descriptionInput, { target: { value: '保留的工序说明' } })
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('option', { name: '停用' }))
    fireEvent.click(screen.getByRole('button', { name: '保存L3工序' }))
    expect((await screen.findByRole('alert')).textContent).toBe(conflictReason)
    expect(descriptionInput.value).toBe('保留的工序说明')
    expect(saveBranchOperation).toHaveBeenCalledWith({
      ...originalBranchOperation,
      description: '保留的工序说明',
      isActive: false,
    })
    expect(originalBranchOperation.description).toBe('原工序说明')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    fireEvent.click(await screen.findByRole('option', { name: '启用' }))
    fireEvent.click(screen.getByRole('button', { name: '保存L3工序' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(saveBranchOperation).toHaveBeenCalledTimes(2)
    expect(saveBranchOperation).toHaveBeenLastCalledWith({
      ...originalBranchOperation,
      description: '保留的工序说明',
    })
  })

  it('prevents repeated submissions while a save is pending', async () => {
    let completePendingBranchOperationSave!: () => void
    const saveBranchOperation = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          completePendingBranchOperationSave = resolve
        })
    )
    render(
      <MindmapDetailProcessEntityEditor
        levelNames={{ 1: 'L1', 2: 'L2', 3: 'L3' }}
        processEntity={originalBranchOperation}
        onSaveProcessEntity={saveBranchOperation}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '保存L3工序' }))
    const pendingSaveButton = screen.getByRole('button', {
      name: '正在保存…',
    }) as HTMLButtonElement
    expect(pendingSaveButton.disabled).toBe(true)
    fireEvent.click(pendingSaveButton)
    expect(saveBranchOperation).toHaveBeenCalledTimes(1)
    completePendingBranchOperationSave()
    await waitFor(() =>
      expect(
        (
          screen.getByRole('button', {
            name: '保存L3工序',
          }) as HTMLButtonElement
        ).disabled
      ).toBe(false)
    )
  })
})
