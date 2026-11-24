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
import type { LineMindmapNode } from '../data/line-mindmap-domain'
import { MindmapDetailProcessLibrarySelection } from './mindmap-detail-process-library-selection'

const selectedBranchOperation: ProductionBOMBranchOperation = {
  id: 'branch-operation-cutting',
  productId: 'product-rim',
  bomOwnerType: 'INTERNAL',
  bomOwnerCustomerId: '',
  bomVersionLevel: 'standard',
  name: '裁切',
  description: '裁切工序',
  sortOrder: 0,
  isActive: true,
  processLibraryId: 'process-cutting',
}

const segmentNode: LineMindmapNode = {
  id: 'segment-rim',
  sourceId: 'segment-rim',
  sourceType: 'segment',
  level: 2,
  nameSnapshot: '轮圈标准分支',
  actionType: 'none',
  dialogKey: '',
  note: '',
  readonlyMeta: {
    branchOperations: [selectedBranchOperation],
  },
  children: [],
}

const processLibrary = [
  {
    id: 'process-cutting',
    code: 'CUT',
    name: '裁切',
    description: '裁切工序',
    isActive: true,
  },
  {
    id: 'process-forming',
    code: 'FORM',
    name: '成型',
    description: '成型工序',
    isActive: true,
  },
  {
    id: 'process-disabled',
    code: 'DISABLED',
    name: '已停用工序',
    isActive: false,
  },
]

afterEach(cleanup)

describe('L2 process-library selection', () => {
  it('shows only active library entries and submits the selected IDs for the current segment', async () => {
    const saveSelection = vi.fn().mockResolvedValue([])
    render(
      <MindmapDetailProcessLibrarySelection
        selectedNode={segmentNode}
        standardProcesses={processLibrary}
        onSaveProcessSelection={saveSelection}
      />
    )

    expect(screen.getByText('裁切')).toBeTruthy()
    expect(screen.getByText('成型')).toBeTruthy()
    expect(screen.queryByText('已停用工序')).toBeNull()

    const checkboxes = screen.getAllByRole('checkbox')
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true)
    fireEvent.click(checkboxes[1])
    fireEvent.click(screen.getByRole('button', { name: '保存 L2 工序选配' }))

    await waitFor(() =>
      expect(saveSelection).toHaveBeenCalledWith('segment-rim', [
        'process-cutting',
        'process-forming',
      ])
    )
  })

  it('keeps the draft after a failed save and allows retry with the same selection', async () => {
    const saveSelection = vi
      .fn()
      .mockRejectedValueOnce(new Error('选配保存失败'))
      .mockResolvedValueOnce([])
    render(
      <MindmapDetailProcessLibrarySelection
        selectedNode={segmentNode}
        standardProcesses={processLibrary}
        onSaveProcessSelection={saveSelection}
      />
    )

    const checkboxes = screen.getAllByRole('checkbox')
    fireEvent.click(checkboxes[1])
    fireEvent.click(screen.getByRole('button', { name: '保存 L2 工序选配' }))

    expect((await screen.findByRole('alert')).textContent).toBe('选配保存失败')
    expect((checkboxes[0] as HTMLInputElement).checked).toBe(true)
    expect((checkboxes[1] as HTMLInputElement).checked).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: '保存 L2 工序选配' }))
    await waitFor(() => expect(saveSelection).toHaveBeenCalledTimes(2))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('prevents duplicate submissions while the selection save is pending', async () => {
    let resolveSave!: () => void
    const saveSelection = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve
        })
    )
    render(
      <MindmapDetailProcessLibrarySelection
        selectedNode={segmentNode}
        standardProcesses={processLibrary}
        onSaveProcessSelection={saveSelection}
      />
    )

    const saveButton = screen.getByRole('button', { name: '保存 L2 工序选配' })
    fireEvent.click(saveButton)
    const pendingButton = screen.getByRole('button', {
      name: '正在保存选配…',
    }) as HTMLButtonElement
    expect(pendingButton.disabled).toBe(true)
    fireEvent.click(pendingButton)
    expect(saveSelection).toHaveBeenCalledTimes(1)

    resolveSave()
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: '保存 L2 工序选配' })
      ).not.toBeDisabled()
    )
  })
})
