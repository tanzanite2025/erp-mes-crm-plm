// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DrillingPlan, DrillingPlanInput } from '../data/schema'
import type { WeavingMode } from '../data/weaving-mode-schema'

const {
  getWeavingModesMock,
  toastErrorMock,
  useEngineeringDbProductDisplayOptionsMock,
  useDeltaTrackerMock,
  deltaCommitMock,
  deltaIsDirtyMock,
} = vi.hoisted(() => ({
  getWeavingModesMock: vi.fn(),
  toastErrorMock: vi.fn(),
  useEngineeringDbProductDisplayOptionsMock: vi.fn(),
  useDeltaTrackerMock: vi.fn(),
  deltaCommitMock: vi.fn(),
  deltaIsDirtyMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: toastErrorMock,
  },
}))

vi.mock('./use-engineering-db-product-display-options', () => ({
  useEngineeringDbProductDisplayOptions: useEngineeringDbProductDisplayOptionsMock,
}))

vi.mock('@/hooks/use-delta-tracker', () => ({
  useDeltaTracker: useDeltaTrackerMock,
}))

vi.mock('../services/weaving-mode-service', () => ({
  weavingModeService: {
    getWeavingModes: getWeavingModesMock,
  },
}))

import { useDrillingActionDialogState } from './use-drilling-action-dialog-state'

function buildDrillingPlan(overrides: Partial<DrillingPlan> = {}): DrillingPlan {
  return {
    id: 'plan-1',
    name: 'Existing Plan',
    productId: 'product-1',
    weavingModeId: 'wm-2',
    weavingModeLabel: '2:1',
    standardHoles: '32',
    fileUrl: '/files/plan.pdf',
    fileExtension: 'pdf',
    version: 2,
    createdAt: '2026-04-22T00:00:00.000Z',
    ...overrides,
  }
}

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

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useDrillingActionDialogState', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useEngineeringDbProductDisplayOptionsMock.mockReturnValue({
      productOptions: [
        { label: 'Product One (高刚性)', value: 'product-1' },
        { label: 'Product Two (舒适)', value: 'product-2' },
      ],
      productDisplayLabelMap: new Map([
        ['product-1', 'Product One (高刚性)'],
        ['product-2', 'Product Two (舒适)'],
      ]),
      products: [],
      isLoading: false,
    })

    deltaCommitMock.mockReturnValue({})
    deltaIsDirtyMock.mockReturnValue(false)
    useDeltaTrackerMock.mockImplementation((initialData: DrillingPlanInput & { id?: string; createdAt?: string }) => {
      const data = structuredClone(initialData)
      return {
        data,
        tracker: {
          commit: deltaCommitMock,
        },
        isDirty: deltaIsDirtyMock,
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds default create state with authority productOptions and only exposes active weaving modes for new forms', async () => {
    getWeavingModesMock.mockResolvedValue([
      buildWeavingMode({ id: 'wm-1', label: '1:1', active: true }),
      buildWeavingMode({ id: 'wm-2', label: '2:1', active: false, isSystemPreset: false }),
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useDrillingActionDialogState(undefined, true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.weavingModeItems).toHaveLength(1)
    })

    expect(result.current.isEdit).toBe(false)
    expect(result.current.formData.name).toBe('')
    expect(result.current.formData.fileExtension).toBe('pdf')
    expect(result.current.productOptions).toEqual([
      { label: 'Product One (高刚性)', value: 'product-1' },
      { label: 'Product Two (舒适)', value: 'product-2' },
    ])
    expect(result.current.weavingModeItems).toEqual([
      { label: '1:1', value: 'wm-1' },
    ])
    expect(result.current.noWeavingModesAvailable).toBe(false)
  })

  it('keeps current inactive weaving mode available in edit mode and syncs label on change', async () => {
    getWeavingModesMock.mockResolvedValue([
      buildWeavingMode({ id: 'wm-1', label: '1:1', active: true }),
      buildWeavingMode({ id: 'wm-2', label: '2:1', active: false, isSystemPreset: false }),
    ])

    const queryClient = createQueryClient()
    const currentRow = buildDrillingPlan({ weavingModeId: 'wm-2', weavingModeLabel: '2:1' })
    const { result } = renderHook(() => useDrillingActionDialogState(currentRow, true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.weavingModeItems).toHaveLength(2)
    })

    act(() => {
      result.current.handleWeavingModeChange('wm-1')
    })

    expect(result.current.isEdit).toBe(true)
    expect(result.current.formData.weavingModeId).toBe('wm-1')
    expect(result.current.formData.weavingModeLabel).toBe('1:1')
  })

  it('blocks save params when weaving modes failed to load', async () => {
    getWeavingModesMock.mockRejectedValue(new Error('load failed'))

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useDrillingActionDialogState(undefined, true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.isWeavingModesError).toBe(true)
    })

    let saveParams = null
    await act(async () => {
      saveParams = await result.current.buildSaveParams()
    })

    expect(saveParams).toBeNull()
    expect(toastErrorMock).toHaveBeenCalledWith('编织方式主数据加载失败，请稍后重试')
  })

  it('blocks save params when no weaving modes are available', async () => {
    getWeavingModesMock.mockResolvedValue([])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useDrillingActionDialogState(undefined, true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.noWeavingModesAvailable).toBe(true)
    })

    let saveParams = null
    await act(async () => {
      saveParams = await result.current.buildSaveParams()
    })

    expect(saveParams).toBeNull()
    expect(toastErrorMock).toHaveBeenCalledWith('当前没有可用的编织方式，请先到工程主数据中维护')
  })

  it('blocks save params when schema validation fails', async () => {
    getWeavingModesMock.mockResolvedValue([buildWeavingMode()])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useDrillingActionDialogState(undefined, true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.weavingModeItems).toHaveLength(1)
    })

    let saveParams = null
    await act(async () => {
      saveParams = await result.current.buildSaveParams()
    })

    expect(saveParams).toBeNull()
    expect(toastErrorMock).toHaveBeenCalled()
  })

  it('returns create save params for valid new form data', async () => {
    getWeavingModesMock.mockResolvedValue([buildWeavingMode()])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useDrillingActionDialogState(undefined, true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.weavingModeItems).toHaveLength(1)
    })

    act(() => {
      result.current.updateField('name', 'Create Plan')
      result.current.updateField('productId', 'product-1')
      result.current.handleWeavingModeChange('wm-1')
      result.current.updateField('standardHoles', '28')
      result.current.updateField('fileUrl', '/files/new.pdf')
    })

    let saveParams = null
    await act(async () => {
      saveParams = await result.current.buildSaveParams()
    })

    expect(saveParams).toEqual({
      data: {
        name: 'Create Plan',
        productId: 'product-1',
        weavingModeId: 'wm-1',
        weavingModeLabel: '1:1',
        standardHoles: '28',
        fileUrl: '/files/new.pdf',
        fileExtension: 'pdf',
        version: 1,
      },
      isPatch: false,
    })
  })

  it('returns patch params for edit mode in both no-change and changed scenarios', async () => {
    getWeavingModesMock.mockResolvedValue([buildWeavingMode({ id: 'wm-2', label: '2:1', active: false, isSystemPreset: false })])
    const currentRow = buildDrillingPlan({ weavingModeId: 'wm-2', weavingModeLabel: '2:1', version: 5 })

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useDrillingActionDialogState(currentRow, true), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.formData.id).toBe('plan-1')
    })

    deltaCommitMock.mockReturnValueOnce({})
    let noChangeParams = null
    await act(async () => {
      noChangeParams = await result.current.buildSaveParams()
    })

    expect(noChangeParams).toEqual({
      data: {
        name: 'Existing Plan',
        productId: 'product-1',
        weavingModeId: 'wm-2',
        weavingModeLabel: '2:1',
        standardHoles: '32',
        fileUrl: '/files/plan.pdf',
        fileExtension: 'pdf',
        version: 5,
      },
      isPatch: true,
      delta: {},
      version: 5,
    })

    deltaCommitMock.mockReturnValueOnce({ standardHoles: '28' })
    act(() => {
      result.current.updateField('standardHoles', '28')
    })

    let changedParams = null
    await act(async () => {
      changedParams = await result.current.buildSaveParams()
    })

    expect(changedParams).toEqual({
      data: {
        name: 'Existing Plan',
        productId: 'product-1',
        weavingModeId: 'wm-2',
        weavingModeLabel: '2:1',
        standardHoles: '28',
        fileUrl: '/files/plan.pdf',
        fileExtension: 'pdf',
        version: 5,
      },
      isPatch: true,
      delta: { standardHoles: '28' },
      version: 5,
    })
  })
})
