// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ENGINEERING_DB_WEAVING_MODES_QUERY_KEY } from '../query-keys'
import type { WeavingMode, WeavingModeDraft } from '../data/weaving-mode-schema'

const {
  getWeavingModesMock,
  ensureWeavingModePresetsMock,
  saveWeavingModeMock,
  deleteWeavingModeMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  getWeavingModesMock: vi.fn(),
  ensureWeavingModePresetsMock: vi.fn(),
  saveWeavingModeMock: vi.fn(),
  deleteWeavingModeMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('../services/weaving-mode-service', () => ({
  weavingModeService: {
    getWeavingModes: getWeavingModesMock,
    ensureWeavingModePresets: ensureWeavingModePresetsMock,
    saveWeavingMode: saveWeavingModeMock,
    deleteWeavingMode: deleteWeavingModeMock,
  },
}))

import { useWeavingModeQueryState } from './use-weaving-mode-query-state'

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

function buildDraft(overrides: Partial<WeavingModeDraft> = {}): WeavingModeDraft {
  return {
    ratioNumerator: 3,
    ratioDenominator: 2,
    description: 'test',
    active: true,
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
      mutations: {
        retry: false,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('useWeavingModeQueryState', () => {
  it('ensures presets once when query returns empty data and can retry after refetch', async () => {
    getWeavingModesMock.mockResolvedValue([])
    ensureWeavingModePresetsMock.mockResolvedValue([])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useWeavingModeQueryState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(ensureWeavingModePresetsMock).toHaveBeenCalledTimes(1)
    })

    await act(async () => {
      await result.current.refetchWeavingModes()
    })

    await waitFor(() => {
      expect(ensureWeavingModePresetsMock).toHaveBeenCalledTimes(2)
    })
  })

  it('invalidates query and shows success toasts after save and delete succeed', async () => {
    getWeavingModesMock.mockResolvedValue([buildWeavingMode()])
    saveWeavingModeMock.mockResolvedValue(buildWeavingMode({ id: 'wm-2', label: '3:2', normalizedRatioKey: '3:2' }))
    deleteWeavingModeMock.mockResolvedValue(undefined)

    const queryClient = createQueryClient()
    const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useWeavingModeQueryState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })

    await act(async () => {
      await result.current.saveWeavingMode(buildDraft())
      await result.current.deleteWeavingMode(buildWeavingMode())
    })

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ENGINEERING_DB_WEAVING_MODES_QUERY_KEY })
    expect(saveWeavingModeMock).toHaveBeenCalledWith(buildDraft())
    expect(deleteWeavingModeMock).toHaveBeenCalledWith(buildWeavingMode())
    expect(toastSuccessMock).toHaveBeenCalledWith('engineering.masterData.weavingMode.toasts.saveSuccess')
    expect(toastSuccessMock).toHaveBeenCalledWith('engineering.masterData.weavingMode.toasts.deleteSuccess')
  })

  it('maps duplicate key save error to duplicate toast', async () => {
    getWeavingModesMock.mockResolvedValue([buildWeavingMode()])
    saveWeavingModeMock.mockRejectedValue(new Error('engineering spec duplicate normalized ratio key'))

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useWeavingModeQueryState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })

    await act(async () => {
      await expect(result.current.saveWeavingMode(buildDraft())).rejects.toThrow('engineering spec duplicate normalized ratio key')
    })

    expect(toastErrorMock).toHaveBeenCalledWith('engineering.masterData.weavingMode.toasts.duplicate')
  })

  it('maps preset delete protection error to preset blocked toast', async () => {
    getWeavingModesMock.mockResolvedValue([buildWeavingMode()])
    deleteWeavingModeMock.mockRejectedValue(new Error('System preset weaving mode cannot be deleted'))

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useWeavingModeQueryState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })

    await act(async () => {
      await expect(result.current.deleteWeavingMode(buildWeavingMode())).rejects.toThrow('System preset weaving mode cannot be deleted')
    })

    expect(toastErrorMock).toHaveBeenCalledWith('engineering.masterData.weavingMode.toasts.presetDeleteBlocked')
  })

  it('maps linked drilling delete error to explicit blocking toast', async () => {
    getWeavingModesMock.mockResolvedValue([buildWeavingMode()])
    deleteWeavingModeMock.mockRejectedValue(new Error('engineering spec linked by drilling plan'))

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useWeavingModeQueryState(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.data).toHaveLength(1)
    })

    await act(async () => {
      await expect(result.current.deleteWeavingMode(buildWeavingMode())).rejects.toThrow('engineering spec linked by drilling plan')
    })

    expect(toastErrorMock).toHaveBeenCalledWith('该编织方式已被打孔方案引用，暂不允许删除')
  })
})
