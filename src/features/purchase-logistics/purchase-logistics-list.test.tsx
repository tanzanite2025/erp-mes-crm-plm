import { type ReactElement, type ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PurchaseLogisticsList } from './purchase-logistics-list'

const {
  getRecordsMock,
  getControlledTrackingDetailMock,
  toastSuccessMock,
  toastErrorMock,
  toastWarningMock,
} = vi.hoisted(() => ({
  getRecordsMock: vi.fn(),
  getControlledTrackingDetailMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastWarningMock: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
    warning: toastWarningMock,
  },
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string, params?: Record<string, string | number>) => {
      if (params?.message) return `${key}:${params.message}`
      return key
    },
  }),
}))

vi.mock('@/components/forbidden-state', () => ({
  ForbiddenState: () => <div>forbidden</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type }: { children: ReactNode; onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' | 'reset' }) => (
    <button type={type ?? 'button'} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: { value?: string; onChange?: (event: { target: { value: string } }) => void; placeholder?: string }) => (
    <input
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      placeholder={placeholder}
    />
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/sheet', async () => {
  const ReactModule = await import('react')
  const SheetContext = ReactModule.createContext<{
    open: boolean
    onOpenChange: (open: boolean) => void
  }>({
    open: false,
    onOpenChange: () => undefined,
  })

  return {
    Sheet: ({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: ReactNode }) => (
      <SheetContext.Provider value={{ open: Boolean(open), onOpenChange: onOpenChange ?? (() => undefined) }}>
        {children}
      </SheetContext.Provider>
    ),
    SheetTrigger: ({ children }: { children: ReactElement<{ onClick?: () => void }> }) => {
      const context = ReactModule.useContext(SheetContext)
      return ReactModule.cloneElement<{ onClick?: () => void }>(children, {
        onClick: () => context.onOpenChange(true),
      })
    },
    SheetContent: ({ children }: { children: ReactNode }) => {
      const context = ReactModule.useContext(SheetContext)
      return context.open ? <div>{children}</div> : null
    },
    SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  }
})

vi.mock('./purchase-logistics-timeline', () => ({
  PurchaseLogisticsTimeline: ({ events }: { events: Array<{ id: string; description: string }> }) => (
    <div>
      {events.map((event) => (
        <div key={event.id}>{event.description}</div>
      ))}
    </div>
  ),
}))

vi.mock('./services/purchase-logistics-service', () => ({
  PurchaseLogisticsService: {
    getRecords: getRecordsMock,
    getControlledTrackingDetail: getControlledTrackingDetailMock,
  },
}))

function buildRecord() {
  return {
    id: 'purchase-log-1',
    orderNo: 'PO-001',
    carrier: '17TRACK',
    trackingNo: 'RR123456789CN',
    status: 'InTransit' as const,
    lastLocation: 'Hangzhou',
    events: [
      {
        id: 'local-1',
        time: '2026-05-03T08:00:00.000Z',
        location: 'Local Site',
        description: 'Local event',
        status: 'InTransit',
      },
    ],
    version: 1,
    updatedAt: '2026-05-03T08:00:00.000Z',
    purchaseOrder: {
      id: 'po-1',
      orderNo: 'PO-001',
      supplierName: '测试供应商',
      status: 'Sent',
    },
  }
}

function renderComponent() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={client}>
      <PurchaseLogisticsList />
    </QueryClientProvider>
  )
}

describe('PurchaseLogisticsList', () => {
  beforeEach(() => {
    getRecordsMock.mockReset()
    getControlledTrackingDetailMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    toastWarningMock.mockReset()

    getRecordsMock.mockResolvedValue({
      items: [buildRecord()],
      total: 1,
      page: 1,
      pageSize: 100,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('shows trusted tracking detail and refreshes from the sheet', async () => {
    getControlledTrackingDetailMock.mockImplementation(
      async (_trackingNo: string, options?: { refresh?: boolean }) => {
        if (options?.refresh) {
          return {
            order: {
              id: 1,
              createdAt: '2026-05-03T08:00:00.000Z',
              updatedAt: '2026-05-03T08:02:00.000Z',
              bizOrderNo: 'PO-001',
              bizType: 'Receipt',
              carrierCode: '17TRACK',
              carrierName: '17TRACK',
              trackingNo: 'RR123456789CN',
              status: 'InTransit',
              lastLocation: 'Hangzhou',
              lastEvent: 'Trusted update',
              version: 1,
            },
            events: [
              {
                id: 'trusted-1',
                time: '2026-05-03T08:01:00.000Z',
                location: 'Hangzhou',
                description: 'Trusted update',
                status: 'InTransit',
              },
            ],
            refresh: {
              status: 'refreshed',
              providerCode: '17TRACK',
              message: 'trusted tracking query completed',
              action: '受控刷新成功',
              insertedTraces: 1,
              checkedAt: '2026-05-03T08:02:00.000Z',
            },
          }
        }

        return {
          order: {
            id: 1,
            createdAt: '2026-05-03T08:00:00.000Z',
            updatedAt: '2026-05-03T08:01:00.000Z',
            bizOrderNo: 'PO-001',
            bizType: 'Receipt',
            carrierCode: '17TRACK',
            carrierName: '17TRACK',
            trackingNo: 'RR123456789CN',
            status: 'InTransit',
            lastLocation: 'Hangzhou',
            lastEvent: 'Trusted update',
            version: 1,
          },
          events: [
            {
              id: 'trusted-1',
              time: '2026-05-03T08:01:00.000Z',
              location: 'Hangzhou',
              description: 'Trusted update',
              status: 'InTransit',
            },
          ],
        }
      }
    )

    const user = userEvent.setup()
    renderComponent()

    await user.click((await screen.findAllByRole('button'))[0]!)

    expect(await screen.findByText('Trusted update')).toBeTruthy()
    expect(screen.getByText('purchase.logistics.detailSourceTrusted')).toBeTruthy()

    await user.click(screen.getByText('purchase.logistics.detailRefresh'))

    await waitFor(() => {
      expect(getControlledTrackingDetailMock).toHaveBeenCalledWith('RR123456789CN', { refresh: true })
    })
    expect(toastSuccessMock).toHaveBeenCalled()
  })

  it('falls back to local events when no trusted tracking detail exists', async () => {
    getControlledTrackingDetailMock.mockResolvedValue(null)

    const user = userEvent.setup()
    renderComponent()

    await user.click((await screen.findAllByRole('button'))[0]!)

    expect(await screen.findByText('Local event')).toBeTruthy()
    expect(screen.getByText('purchase.logistics.detailFallback')).toBeTruthy()
    expect(screen.getByText('purchase.logistics.detailSourceLocal')).toBeTruthy()
  })
})
