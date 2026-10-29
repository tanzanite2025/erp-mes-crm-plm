// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NavGroup } from '@/components/layout/types'
import { useSidebarNavGroupsWithBadges } from '@/components/layout/use-sidebar-nav-badges'
import { useAiPermissions } from '@/features/ai-assistant/hooks/use-ai-permissions'

const backgroundQueryVerification = vi.hoisted(() => ({
  identity: {
    user: null as { id: string; permissions: string[] } | null,
    accessToken: '',
  },
  fetchRuntimePolicy: vi.fn(),
  fetchSystemAlerts: vi.fn(),
  fetchApprovals: vi.fn(),
  logError: vi.fn(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: Object.assign(
    (
      selector: (
        identity: typeof backgroundQueryVerification.identity
      ) => unknown
    ) => selector(backgroundQueryVerification.identity),
    { getState: () => backgroundQueryVerification.identity }
  ),
}))
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => '/home',
}))
vi.mock('@/features/ai-assistant/services/ai-policy-service', () => ({
  aiPolicyService: {
    getRuntimePolicy: backgroundQueryVerification.fetchRuntimePolicy,
  },
}))
vi.mock('@/features/ai-assistant/utils/ai-permission-groups', () => ({
  isAiRoutePermissionAllowed: () => true,
}))
vi.mock('@/features/system-mgmt/services/storage-service', () => ({
  StorageService: { removeItem: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({ error: backgroundQueryVerification.logError }),
}))
vi.mock('@/lib/api-client', () => ({
  apiFetch: backgroundQueryVerification.fetchSystemAlerts,
}))
vi.mock('@/features/approval/services/approval-service', () => ({
  ApprovalService: {
    getMyApprovals: backgroundQueryVerification.fetchApprovals,
  },
}))

const enabledRuntimePolicy = {
  enabled: true,
  allowedPermissions: [],
  api: { configured: true, provider: 'openai', model: 'verification-model' },
}
const verificationNavigationGroups: NavGroup[] = [
  {
    id: 'verification-navigation',
    title: 'Verification navigation',
    children: [
      { title: 'System', id: 'system-management', url: '/system-management' },
    ],
  },
]

function setBackgroundQueryVerificationIdentity(userId: string | null) {
  backgroundQueryVerification.identity = {
    user: userId ? { id: userId, permissions: ['menu_approval'] } : null,
    accessToken: userId ? `verification-token-${userId}` : '',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  setBackgroundQueryVerificationIdentity(null)
  backgroundQueryVerification.fetchRuntimePolicy.mockResolvedValue(
    enabledRuntimePolicy
  )
  backgroundQueryVerification.fetchSystemAlerts.mockResolvedValue([])
  backgroundQueryVerification.fetchApprovals.mockResolvedValue([])
})
afterEach(cleanup)

describe('authenticated background work during password-change logout', () => {
  it('does not request AI policy while signed out, including configuration refresh events', async () => {
    const { result } = renderHook(useAiPermissions)
    await act(async () => {
      window.dispatchEvent(new Event('xdfc_ai_config_updated'))
    })
    expect(
      backgroundQueryVerification.fetchRuntimePolicy
    ).not.toHaveBeenCalled()
    expect(result.current.isChecking).toBe(false)
    expect(result.current.canUsePageContext).toBe(false)
  })

  it('discards a successful AI policy response arriving after identity was cleared', async () => {
    setBackgroundQueryVerificationIdentity('original-user')
    let resolveOriginalPolicy!: (policy: typeof enabledRuntimePolicy) => void
    backgroundQueryVerification.fetchRuntimePolicy.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOriginalPolicy = resolve
      })
    )
    const { result, rerender } = renderHook(useAiPermissions)
    expect(
      backgroundQueryVerification.fetchRuntimePolicy
    ).toHaveBeenCalledTimes(1)
    setBackgroundQueryVerificationIdentity(null)
    rerender()
    await act(async () => resolveOriginalPolicy(enabledRuntimePolicy))
    expect(result.current.isVisible).toBe(false)
    expect(result.current.isApiConfigured).toBe(false)
    expect(result.current.isChecking).toBe(false)
    expect(
      backgroundQueryVerification.fetchRuntimePolicy
    ).toHaveBeenCalledTimes(1)
  })

  it('does not let an obsolete identity failure clear a newer login policy', async () => {
    setBackgroundQueryVerificationIdentity('original-user')
    let rejectOriginalPolicy!: (error: Error) => void
    backgroundQueryVerification.fetchRuntimePolicy.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectOriginalPolicy = reject
      })
    )
    const { result, rerender } = renderHook(useAiPermissions)
    setBackgroundQueryVerificationIdentity('new-user')
    rerender()
    await waitFor(() => expect(result.current.canUsePageContext).toBe(true))
    await act(async () => rejectOriginalPolicy(new Error('obsolete session')))
    expect(result.current.canUsePageContext).toBe(true)
    expect(result.current.isChecking).toBe(false)
    expect(backgroundQueryVerification.logError).not.toHaveBeenCalled()
  })

  it('hides the previous account AI policy while a newer login policy is loading', async () => {
    setBackgroundQueryVerificationIdentity('original-user')
    const { result, rerender } = renderHook(useAiPermissions)
    await waitFor(() => expect(result.current.canUsePageContext).toBe(true))
    backgroundQueryVerification.fetchRuntimePolicy.mockReturnValueOnce(
      new Promise(() => {})
    )
    setBackgroundQueryVerificationIdentity('new-user')
    rerender()
    expect(result.current.isVisible).toBe(false)
    expect(result.current.canUsePageContext).toBe(false)
    expect(result.current.isChecking).toBe(true)
  })

  it('keeps the newest configuration refresh when older policy requests finish later', async () => {
    setBackgroundQueryVerificationIdentity('original-user')
    let resolveOriginalPolicy!: (policy: typeof enabledRuntimePolicy) => void
    backgroundQueryVerification.fetchRuntimePolicy.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOriginalPolicy = resolve
      })
    )
    const { result } = renderHook(useAiPermissions)
    await act(async () => {
      window.dispatchEvent(new Event('xdfc_ai_config_updated'))
    })
    expect(result.current.canUsePageContext).toBe(true)
    await act(async () =>
      resolveOriginalPolicy({ ...enabledRuntimePolicy, enabled: false })
    )
    expect(result.current.canUsePageContext).toBe(true)
  })

  it('does not start badge requests while signed out or when cache clearing races React rendering', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { rerender } = renderHook(
      () => useSidebarNavGroupsWithBadges(verificationNavigationGroups),
      { wrapper }
    )
    expect(backgroundQueryVerification.fetchSystemAlerts).not.toHaveBeenCalled()
    expect(backgroundQueryVerification.fetchApprovals).not.toHaveBeenCalled()
    setBackgroundQueryVerificationIdentity('original-user')
    rerender()
    await waitFor(() =>
      expect(
        backgroundQueryVerification.fetchSystemAlerts
      ).toHaveBeenCalledTimes(1)
    )
    await waitFor(() =>
      expect(backgroundQueryVerification.fetchApprovals).toHaveBeenCalledTimes(
        1
      )
    )
    await act(async () => {
      setBackgroundQueryVerificationIdentity(null)
      queryClient.clear()
    })
    rerender()
    expect(backgroundQueryVerification.fetchSystemAlerts).toHaveBeenCalledTimes(
      1
    )
    expect(backgroundQueryVerification.fetchApprovals).toHaveBeenCalledTimes(1)
    queryClient.clear()
  })

  it('does not display the previous account system-alert badge in a new account', async () => {
    setBackgroundQueryVerificationIdentity('original-user')
    backgroundQueryVerification.fetchSystemAlerts.mockResolvedValueOnce([
      { id: 'original-account-alert' },
    ])
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    const { result, rerender } = renderHook(
      () => useSidebarNavGroupsWithBadges(verificationNavigationGroups),
      { wrapper }
    )
    await waitFor(() => expect(result.current[0].children[0].badge).toBe('●'))
    backgroundQueryVerification.fetchSystemAlerts.mockReturnValueOnce(
      new Promise(() => {})
    )
    setBackgroundQueryVerificationIdentity('new-user')
    rerender()
    expect(result.current[0].children[0].badge).toBeUndefined()
    queryClient.clear()
  })
})
