// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WeavingMode, WeavingModeDraft } from '../data/weaving-mode-schema'

const {
  useWeavingModeMgmtMock,
  toolbarMock,
  listCardMock,
  dialogMock,
  setSearchTermMock,
  refetchWeavingModesMock,
  saveWeavingModeMock,
  deleteWeavingModeMock,
} = vi.hoisted(() => ({
  useWeavingModeMgmtMock: vi.fn(),
  toolbarMock: vi.fn(),
  listCardMock: vi.fn(),
  dialogMock: vi.fn(),
  setSearchTermMock: vi.fn(),
  refetchWeavingModesMock: vi.fn(),
  saveWeavingModeMock: vi.fn(async () => undefined),
  deleteWeavingModeMock: vi.fn(async () => undefined),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => {
      if (vars && 'count' in vars) {
        return `${key}:${String(vars.count)}`
      }
      if (vars && 'name' in vars) {
        return `${key}:${String(vars.name)}`
      }
      return key
    },
  }),
}))

vi.mock('../hooks/use-weaving-mode-mgmt', () => ({
  useWeavingModeMgmt: useWeavingModeMgmtMock,
}))

vi.mock('../components/weaving-mode-toolbar', () => ({
  WeavingModeToolbar: (props: {
    searchTerm: string
    onSearchTermChange: (value: string) => void
    onCreate: () => void
  }) => {
    toolbarMock(props)
    return (
      <div data-testid='weaving-toolbar'>
        <button type='button' onClick={() => props.onSearchTermChange('next-keyword')}>
          搜索变化
        </button>
        <button type='button' onClick={props.onCreate}>
          新建
        </button>
      </div>
    )
  },
}))

vi.mock('../components/weaving-mode-list-card', () => ({
  WeavingModeListCard: (props: {
    data: WeavingMode[]
    isLoading: boolean
    isLoadError: boolean
    onRetry: () => void
    onEdit: (item: WeavingMode) => void
    onDelete: (item: WeavingMode) => Promise<void>
  }) => {
    listCardMock(props)
    const firstItem = props.data[0]
    return (
      <div data-testid='weaving-list-card'>
        <button type='button' onClick={props.onRetry}>
          重试
        </button>
        <button type='button' onClick={() => firstItem && props.onEdit(firstItem)}>
          编辑首项
        </button>
        <button type='button' onClick={() => firstItem && void props.onDelete(firstItem)}>
          删除首项
        </button>
      </div>
    )
  },
}))

vi.mock('../components/weaving-mode-action-dialog', () => ({
  WeavingModeActionDialog: (props: {
    open: boolean
    onOpenChange: (open: boolean) => void
    currentRow?: WeavingMode | null
    onSave: (draft: WeavingModeDraft) => Promise<void>
    isLoading?: boolean
  }) => {
    dialogMock(props)
    return (
      <div data-testid='weaving-action-dialog'>
        <button
          type='button'
          onClick={() => void props.onSave({ ratioNumerator: 3, ratioDenominator: 2, description: 'save-from-dialog', active: true })}
        >
          弹窗保存
        </button>
        <button type='button' onClick={() => props.onOpenChange(false)}>
          关闭弹窗
        </button>
      </div>
    )
  },
}))

import { EngineeringMasterWeavingModeTab } from './engineering-master-weaving-mode-tab'

function buildWeavingMode(overrides: Partial<WeavingMode> = {}): WeavingMode {
  return {
    id: 'wm-1',
    code: 'ENGINEERING_MASTER_WEAVING_MODE_1_1',
    label: '1:1',
    ratioNumerator: 1,
    ratioDenominator: 1,
    normalizedRatioKey: '1:1',
    description: '',
    active: true,
    isSystemPreset: true,
    sortOrder: 1,
    version: 1,
    createdAt: '2026-04-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('EngineeringMasterWeavingModeTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.confirm = vi.fn(() => true)
    useWeavingModeMgmtMock.mockReturnValue({
      filteredData: [
        buildWeavingMode({ id: 'wm-1', label: '1:1', active: true, isSystemPreset: true }),
        buildWeavingMode({ id: 'wm-2', label: '2:1', active: false, isSystemPreset: false, ratioNumerator: 2, normalizedRatioKey: '2:1', code: 'ENGINEERING_MASTER_WEAVING_MODE_2_1' }),
      ],
      isLoading: false,
      isLoadError: false,
      searchTerm: 'current-search',
      setSearchTerm: setSearchTermMock,
      refetchWeavingModes: refetchWeavingModesMock,
      saveWeavingMode: saveWeavingModeMock,
      deleteWeavingMode: deleteWeavingModeMock,
      isSaving: true,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders metrics and wires toolbar, list card and dialog props through the page container', async () => {
    const user = userEvent.setup()
    render(<EngineeringMasterWeavingModeTab />)

    expect(screen.getByText('engineering.masterData.weavingMode.metrics.total:2')).toBeTruthy()
    expect(screen.getByText('engineering.masterData.weavingMode.metrics.active:1')).toBeTruthy()
    expect(screen.getByText('engineering.masterData.weavingMode.metrics.presets:1')).toBeTruthy()

    expect(toolbarMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searchTerm: 'current-search',
        onSearchTermChange: expect.any(Function),
        onCreate: expect.any(Function),
      })
    )
    expect(listCardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ id: 'wm-1' })]),
        isLoading: false,
        isLoadError: false,
        onRetry: expect.any(Function),
        onEdit: expect.any(Function),
        onDelete: expect.any(Function),
      })
    )

    await user.click(screen.getByRole('button', { name: '搜索变化' }))
    expect(setSearchTermMock).toHaveBeenCalledWith('next-keyword')

    await user.click(screen.getByRole('button', { name: '重试' }))
    expect(refetchWeavingModesMock).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '新建' }))
    expect(dialogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        currentRow: null,
        onSave: expect.any(Function),
        isLoading: true,
      })
    )

    await user.click(screen.getByRole('button', { name: '编辑首项' }))
    expect(dialogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        open: true,
        currentRow: expect.objectContaining({ id: 'wm-1', label: '1:1' }),
      })
    )

    await user.click(screen.getByRole('button', { name: '弹窗保存' }))
    expect(saveWeavingModeMock).toHaveBeenCalledWith({
      ratioNumerator: 3,
      ratioDenominator: 2,
      description: 'save-from-dialog',
      active: true,
    })
  })

  it('only deletes after confirmation and blocks delete when confirm is cancelled', async () => {
    const user = userEvent.setup()
    const confirmMock = vi.spyOn(window, 'confirm')

    render(<EngineeringMasterWeavingModeTab />)

    await user.click(screen.getByRole('button', { name: '删除首项' }))
    expect(confirmMock).toHaveBeenCalledWith('engineering.masterData.weavingMode.toasts.deleteConfirm:1:1')
    expect(deleteWeavingModeMock).toHaveBeenCalledWith(expect.objectContaining({ id: 'wm-1' }))

    deleteWeavingModeMock.mockClear()
    confirmMock.mockReturnValueOnce(false)

    await user.click(screen.getByRole('button', { name: '删除首项' }))
    expect(deleteWeavingModeMock).not.toHaveBeenCalled()
  })
})
