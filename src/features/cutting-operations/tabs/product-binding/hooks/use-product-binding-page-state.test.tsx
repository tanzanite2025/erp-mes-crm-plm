// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  submitBindingMock,
  listBindingsMock,
  createCaptureSessionMock,
  getCaptureSessionMock,
  invalidateProductBindingHistoryQueriesMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  submitBindingMock: vi.fn(),
  listBindingsMock: vi.fn(),
  createCaptureSessionMock: vi.fn(),
  getCaptureSessionMock: vi.fn(),
  invalidateProductBindingHistoryQueriesMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string) => key,
  }),
}))

vi.mock('../services/product-binding-service', () => ({
  getProductBindingSubmissionOutcome: (record: { message?: string }) =>
    record.message?.includes('重复提交') ? 'duplicate' : 'bound',
  productBindingService: {
    submitBinding: submitBindingMock,
    listBindings: listBindingsMock,
  },
}))

vi.mock('../services/product-barcode-capture-session-service', () => ({
  ProductBarcodeCaptureSessionService: {
    create: createCaptureSessionMock,
    get: getCaptureSessionMock,
  },
}))

vi.mock('./use-product-binding-history-query', () => ({
  invalidateProductBindingHistoryQueries: invalidateProductBindingHistoryQueriesMock,
}))

import { useProductBindingPageState } from './use-product-binding-page-state'

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
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useProductBindingPageState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    submitBindingMock.mockResolvedValue({
      id: 'binding-1',
      productBarcode: 'PROD-1',
      prepregRollInstanceId: 'roll-1',
      prepregRollInstance: null,
      prepregQrCode: 'QR-1',
      prepregBindingToken: 'PREPREG-BIND-1',
      barcodeProtocol: 'CODE128',
      barcodeSummary: 'summary',
      boundAt: '2026-04-30T00:00:00.000Z',
      boundBy: 'tester',
      source: 'manual',
      status: 'BOUND',
      message: '',
    })
    invalidateProductBindingHistoryQueriesMock.mockResolvedValue(undefined)
    listBindingsMock.mockResolvedValue({
      items: [],
      total: 0,
    })
    createCaptureSessionMock.mockResolvedValue(undefined)
    getCaptureSessionMock.mockResolvedValue(undefined)
  })

  it('marks missing barcode before submit', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useProductBindingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    await act(async () => {
      await result.current.handleSubmitBinding()
    })

    expect(result.current.feedbackState).toBe('missingBarcode')
    expect(submitBindingMock).not.toHaveBeenCalled()
  })

  it('marks missing qr before submit when barcode is present', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useProductBindingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.setProductBarcode('PROD-1')
    })

    await act(async () => {
      await result.current.handleSubmitBinding()
    })

    expect(result.current.feedbackState).toBe('missingQr')
    expect(submitBindingMock).not.toHaveBeenCalled()
  })

  it('submits trimmed payload and invalidates history queries on success', async () => {
    const queryClient = createQueryClient()
    const { result } = renderHook(() => useProductBindingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.setProductBarcode('  PROD-2  ')
      result.current.setPrepregQrCode('  QR-2  ')
    })

    await act(async () => {
      await result.current.handleSubmitBinding()
    })

    await waitFor(() => {
      expect(submitBindingMock).toHaveBeenCalledWith({
        productBarcode: 'PROD-2',
        prepregQrCode: 'QR-2',
      })
    })
    expect(invalidateProductBindingHistoryQueriesMock).toHaveBeenCalledWith(queryClient)
    expect(result.current.feedbackState).toBe('success')
    expect(result.current.bindingResult?.id).toBe('binding-1')
    expect(result.current.latestBindingId).toBe('binding-1')
  })

  it('marks duplicate when backend replays an existing binding from the same roll', async () => {
    submitBindingMock.mockResolvedValueOnce({
      id: 'binding-duplicate',
      productBarcode: 'PROD-2',
      prepregRollInstanceId: 'roll-1',
      prepregRollInstance: null,
      prepregQrCode: 'QR-2',
      prepregBindingToken: 'PREPREG-BIND-1',
      barcodeProtocol: 'CODE128',
      barcodeSummary: 'summary',
      boundAt: '2026-04-30T00:00:00.000Z',
      boundBy: 'tester',
      source: 'manual',
      status: 'BOUND',
      message: '重复提交已按既有绑定记录回显',
    })

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useProductBindingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.setProductBarcode('PROD-2')
      result.current.setPrepregQrCode('QR-2')
    })

    await act(async () => {
      await result.current.handleSubmitBinding()
    })

    await waitFor(() => {
      expect(result.current.feedbackState).toBe('duplicate')
    })
    expect(result.current.bindingResult?.message).toBe('重复提交已按既有绑定记录回显')
  })

  it('marks conflict and replays the latest existing binding snapshot on 409', async () => {
    submitBindingMock.mockRejectedValueOnce({
      status: 409,
      message: '该产品码已绑定到其它预浸料卷，不允许重复绑定',
    })
    listBindingsMock.mockResolvedValueOnce({
      items: [
        {
          id: 'binding-conflict',
          productBarcode: 'PROD-9',
          prepregRollInstanceId: 'roll-9',
          prepregRollInstance: null,
          prepregQrCode: 'QR-9',
          prepregBindingToken: 'PREPREG-BIND-9',
          barcodeProtocol: 'CODE128',
          barcodeSummary: 'summary',
          boundAt: '2026-04-30T00:00:00.000Z',
          boundBy: 'tester',
          source: 'manual',
          status: 'BOUND',
          message: '',
        },
      ],
      total: 1,
    })

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useProductBindingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.setProductBarcode('PROD-9')
      result.current.setPrepregQrCode('QR-NEW')
    })

    await act(async () => {
      await result.current.handleSubmitBinding()
    })

    await waitFor(() => {
      expect(result.current.feedbackState).toBe('conflict')
    })
    expect(listBindingsMock).toHaveBeenCalledWith({
      limit: 1,
      productBarcode: 'PROD-9',
    })
    expect(result.current.submitError).toBe('该产品码已绑定到其它预浸料卷，不允许重复绑定')
    expect(result.current.bindingResult).toEqual(
      expect.objectContaining({
        id: 'binding-conflict',
        message: '该产品码已绑定到其它预浸料卷，不允许重复绑定',
      })
    )
  })

  it('stores submit error when binding submission fails', async () => {
    submitBindingMock.mockRejectedValueOnce(new Error('submit-failed'))

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useProductBindingPageState(), {
      wrapper: createWrapper(queryClient),
    })

    act(() => {
      result.current.setProductBarcode('PROD-3')
      result.current.setPrepregQrCode('QR-3')
    })

    await act(async () => {
      await result.current.handleSubmitBinding()
    })

    await waitFor(() => {
      expect(result.current.feedbackState).toBe('error')
    })
    expect(result.current.submitError).toBe('submit-failed')
    expect(invalidateProductBindingHistoryQueriesMock).not.toHaveBeenCalled()
  })
})
