// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LogisticsMgmt } from './logistics-mgmt'

const {
  useGetLogisticsMock,
  useGetLogisticsDetailMock,
  useGetControlledTrackingDetailMock,
  useLogisticsMutationsMock,
  navigateMock,
  refreshTrackingMutationMock,
  updateStatusMutateMock,
  toastSuccessMock,
  toastErrorMock,
  toastWarningMock,
} = vi.hoisted(() => ({
  useGetLogisticsMock: vi.fn(),
  useGetLogisticsDetailMock: vi.fn(),
  useGetControlledTrackingDetailMock: vi.fn(),
  useLogisticsMutationsMock: vi.fn(),
  navigateMock: vi.fn(),
  refreshTrackingMutationMock: vi.fn(),
  updateStatusMutateMock: vi.fn(),
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

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => ({ navigate: navigateMock }),
}))

vi.mock('@/routes/_authenticated/shipping-management/logistics', () => ({
  Route: {
    useSearch: () => ({}),
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
}))

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder, className }: { value?: string; onChange?: (event: { target: { value: string } }) => void; placeholder?: string; className?: string }) => (
    <input
      value={value}
      onChange={(event) => onChange?.({ target: { value: event.target.value } })}
      placeholder={placeholder}
      className={className}
    />
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, children }: { open: boolean; children: ReactNode }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
}))

vi.mock('./logistics-action-dialog', () => ({
  LogisticsActionDialog: () => null,
}))

vi.mock('./logistics-timeline', () => ({
  LogisticsTimeline: ({ events }: { events: Array<{ id: string; description: string }> }) => (
    <div>
      {events.map((event) => (
        <div key={event.id}>{event.description}</div>
      ))}
    </div>
  ),
}))

vi.mock('../hooks/use-logistics', () => ({
  useGetLogistics: useGetLogisticsMock,
  useGetLogisticsDetail: useGetLogisticsDetailMock,
  useGetControlledTrackingDetail: useGetControlledTrackingDetailMock,
  useLogisticsMutations: useLogisticsMutationsMock,
}))

function buildRecord() {
  return {
    id: 'log-1',
    orderNo: 'SO-001',
    type: 'Shipment' as const,
    carrier: '顺丰速运',
    trackingNo: 'RR123456789CN',
    status: 'InTransit' as const,
    lastLocation: 'Hangzhou',
    contactPerson: '',
    contactPhone: '13800000000',
    events: [
      {
        id: 'local-1',
        time: '2026-05-03T08:00:00.000Z',
        location: 'Local Site',
        description: 'Local event',
        status: 'InTransit' as const,
      },
    ],
    version: 1,
    isDeleted: false,
    createdAt: '2026-05-03T08:00:00.000Z',
    updatedAt: '2026-05-03T08:00:00.000Z',
  }
}

describe('LogisticsMgmt', () => {
  beforeEach(() => {
    refreshTrackingMutationMock.mockReset()
    updateStatusMutateMock.mockReset()
    toastSuccessMock.mockReset()
    toastErrorMock.mockReset()
    toastWarningMock.mockReset()

    useGetLogisticsMock.mockReturnValue({
      data: {
        items: [buildRecord()],
        total: 1,
        page: 1,
        pageSize: 20,
      },
      error: null,
      isLoading: false,
    })
    useGetLogisticsDetailMock.mockReturnValue({
      data: null,
      isLoading: false,
    })
    useLogisticsMutationsMock.mockReturnValue({
      updateStatusMutation: { mutate: updateStatusMutateMock },
      refreshTrackingMutation: {
        mutateAsync: refreshTrackingMutationMock,
        isPending: false,
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('shows trusted tracking events in detail and triggers refresh from the sheet', async () => {
    useGetControlledTrackingDetailMock.mockReturnValue({
      data: {
        order: {
          id: 1,
          createdAt: '2026-05-03T08:00:00.000Z',
          updatedAt: '2026-05-03T08:02:00.000Z',
          bizOrderNo: 'SO-001',
          bizType: 'Sales',
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
            status: 'InTransit' as const,
          },
        ],
      },
      isLoading: false,
    })
    refreshTrackingMutationMock.mockResolvedValue({
      refresh: {
        status: 'refreshed',
        message: 'trusted tracking query completed',
        action: '受控刷新成功',
        providerCode: '17TRACK',
        insertedTraces: 1,
        checkedAt: '2026-05-03T08:02:00.000Z',
      },
    })

    const user = userEvent.setup()
    render(<LogisticsMgmt />)

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1]!)

    expect(screen.getByText('Trusted update')).toBeTruthy()
    expect(screen.getByText('trading.logistics.detailSourceTrusted')).toBeTruthy()

    await user.click(screen.getByText('trading.logistics.detailRefresh'))

    expect(refreshTrackingMutationMock).toHaveBeenCalledWith('RR123456789CN')
    expect(toastSuccessMock).toHaveBeenCalled()
  })

  it('falls back to local events when no trusted tracking detail is available', async () => {
    useGetControlledTrackingDetailMock.mockReturnValue({
      data: null,
      isLoading: false,
    })

    const user = userEvent.setup()
    render(<LogisticsMgmt />)

    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1]!)

    expect(screen.getByText('Local event')).toBeTruthy()
    expect(screen.getByText('trading.logistics.detailFallback')).toBeTruthy()
    expect(screen.getByText('trading.logistics.detailSourceLocal')).toBeTruthy()
  })
})
