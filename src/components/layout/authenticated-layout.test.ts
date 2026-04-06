import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  lazyMock,
  suspenseMock,
  startTransitionMock,
  useEffectMock,
  useStateMock,
  navigateMock,
  useLocationMock,
  useAuthStoreMock,
  syncIdentitySnapshotFromProfileMock,
} = vi.hoisted(() => ({
  lazyMock: vi.fn((loader: () => Promise<unknown>) => {
    void loader
    return () => null
  }),
  suspenseMock: vi.fn(({ children }: { children: unknown }) => children),
  startTransitionMock: vi.fn((callback: () => void) => callback()),
  useEffectMock: vi.fn(),
  useStateMock: vi.fn(),
  navigateMock: vi.fn(),
  useLocationMock: vi.fn(),
  useAuthStoreMock: vi.fn(),
  syncIdentitySnapshotFromProfileMock: vi.fn(),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    lazy: lazyMock,
    Suspense: suspenseMock,
    startTransition: startTransitionMock,
    useEffect: useEffectMock,
    useState: useStateMock,
  }
})

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => null,
  useLocation: useLocationMock,
  useNavigate: () => navigateMock,
}))

vi.mock('@/lib/cookies', () => ({
  getCookie: vi.fn(() => 'true'),
}))

vi.mock('@/lib/utils', () => ({
  cn: (...values: Array<string | false | null | undefined>) => values.filter(Boolean).join(' '),
}))

vi.mock('@/context/layout-provider', () => ({
  LayoutProvider: ({ children }: { children: unknown }) => children,
}))

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: unknown }) => children,
  SidebarInset: ({ children }: { children: unknown }) => children,
}))

vi.mock('@/components/layout/app-sidebar', () => ({
  AppSidebar: () => null,
}))

vi.mock('@/components/skip-to-main', () => ({
  SkipToMain: () => null,
}))

vi.mock('@/hooks/use-notifications', () => ({
  useNotifications: vi.fn(),
}))

vi.mock('@/features/system-mgmt/monitor/hooks/use-system-monitor', () => ({
  useSystemMonitor: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: useAuthStoreMock,
}))

vi.mock('@/features/authz/services/effective-permission-service', () => ({
  syncIdentitySnapshotFromProfile: syncIdentitySnapshotFromProfileMock,
}))

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    error: vi.fn(),
  })),
}))

import { AuthenticatedLayout } from './authenticated-layout'

describe('authenticated-layout regression', () => {
  beforeEach(() => {
    lazyMock.mockClear()
    suspenseMock.mockClear()
    startTransitionMock.mockClear()
    navigateMock.mockReset()
    useLocationMock.mockReset()
    useAuthStoreMock.mockReset()
    syncIdentitySnapshotFromProfileMock.mockReset()

    useLocationMock.mockReturnValue({ pathname: '/dashboard' })
    useStateMock.mockImplementation((initialValue: unknown) => [initialValue, vi.fn()])
    useEffectMock.mockImplementation((effect: () => void | (() => void)) => {
      effect()
    })
  })

  it('blocks page rendering until backend identity snapshot sync completes', async () => {
    const setIsSyncing = vi.fn()
    syncIdentitySnapshotFromProfileMock.mockResolvedValue(['menu_org'])
    useAuthStoreMock.mockReturnValue({
      accessToken: 'token-1',
      isIdentitySynced: false,
      isSyncing: false,
      setIsSyncing,
    })

    const view = AuthenticatedLayout({ children: 'protected-page' })
    await Promise.resolve()

    expect(syncIdentitySnapshotFromProfileMock).toHaveBeenCalledTimes(1)
    expect(setIsSyncing).toHaveBeenNthCalledWith(1, true)
    expect(setIsSyncing).toHaveBeenLastCalledWith(false)
    expect(JSON.stringify(view)).toContain('正在等待后端同步身份权限')
    expect(JSON.stringify(view)).not.toContain('protected-page')
  })

  it('renders protected children after identity is already synced', () => {
    useAuthStoreMock.mockReturnValue({
      accessToken: 'token-1',
      isIdentitySynced: true,
      isSyncing: false,
      setIsSyncing: vi.fn(),
    })

    const view = AuthenticatedLayout({ children: 'protected-page' })

    expect(syncIdentitySnapshotFromProfileMock).not.toHaveBeenCalled()
    expect(JSON.stringify(view)).toContain('protected-page')
    expect(JSON.stringify(view)).not.toContain('正在等待后端同步身份权限')
  })
})
