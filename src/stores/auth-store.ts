import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { useNotificationStore } from '@/features/system-mgmt/notifications/notification-store'

export const XDFC_AUTH_USER_MUTATION_EVENT = 'xdfc_auth_user_mutation'

type LegacyAuthPersistShape = {
  accessToken?: unknown
  user?: unknown
  auth?: {
    accessToken?: unknown
    user?: unknown
  }
}

export interface AuthUser {
  id: string
  accountNo: string
  employeeId?: string
  email: string
  username: string
  permissions?: string[]
  exp: number
}

interface AuthState {
  user: AuthUser | null
  accessToken: string
  isSyncing: boolean // 记录权限/身份同步状态
  isIdentitySynced: boolean
  setUser: (user: AuthUser | null, source?: string) => void
  setAccessToken: (accessToken: string) => void
  setIsSyncing: (isSyncing: boolean) => void
  setIsIdentitySynced: (isIdentitySynced: boolean) => void
  resetAccessToken: () => void
  reset: () => void
}

type AuthUserSnapshot = {
  id: string
  username: string
  accountNo: string
  email: string
  permissionCount: number
}

type AuthUserMutationRecord = {
  source: string
  changed: boolean
  before: AuthUserSnapshot | null
  after: AuthUserSnapshot | null
  at: string
}

function toAuthUserSnapshot(user: AuthUser | null): AuthUserSnapshot | null {
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    accountNo: user.accountNo,
    email: user.email,
    permissionCount: Array.isArray(user.permissions) ? user.permissions.length : 0,
  }
}

function logAuthUserMutation(prevUser: AuthUser | null, nextUser: AuthUser | null, source: string) {
  if (typeof window === 'undefined') return

  const before = toAuthUserSnapshot(prevUser)
  const after = toAuthUserSnapshot(nextUser)
  const sourceLabel = source.trim() || 'unknown'
  const detail: AuthUserMutationRecord = {
    source: sourceLabel,
    changed: JSON.stringify(before) !== JSON.stringify(after),
    before,
    after,
    at: new Date().toISOString(),
  }

  const win = window as Window & {
    __XDFC_AUTH_USER_MUTATIONS__?: AuthUserMutationRecord[]
  }

  const history = Array.isArray(win.__XDFC_AUTH_USER_MUTATIONS__)
    ? win.__XDFC_AUTH_USER_MUTATIONS__
    : []

  history.push(detail)
  if (history.length > 30) {
    history.splice(0, history.length - 30)
  }
  win.__XDFC_AUTH_USER_MUTATIONS__ = history

  window.dispatchEvent(new CustomEvent(XDFC_AUTH_USER_MUTATION_EVENT, { detail }))
}

/**
 * AuthStore [安全加固版]
 * 核心变更：禁止持久化 AuthUser 对象。
 * 逻辑：登录状态仅依靠 accessToken 维持。刷新后，user 状态初始为 null，
 * 强制触发 AuthenticatedLayout 中的后端同步逻辑，确保角色与权限始终由后端裁决。
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: '',
      isSyncing: false,
      isIdentitySynced: false,
      setUser: (user, source = 'unknown') => {
        logAuthUserMutation(get().user, user, source)
        set({ user })
      },
      setAccessToken: (accessToken) => set({ accessToken }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      setIsIdentitySynced: (isIdentitySynced) => set({ isIdentitySynced }),
      resetAccessToken: () => set({ accessToken: '' }),
      reset: () => {
        logAuthUserMutation(get().user, null, 'reset')
        set({ user: null, accessToken: '', isSyncing: false, isIdentitySynced: false })
        void StorageService.removeItem('system_effective_permissions')
        useNotificationStore.getState().clearAll()
      },
    }),
    {
      name: 'xdfc_auth_v2',
      storage: createJSONStorage(() => ({
        getItem: (name) => StorageService.getItem(name).then((data) => JSON.stringify(data)),
        setItem: (name, value) => {
          // 深度过滤：即使 middleware 尝试写入，我们也确保持久化层不包含 user
          const parsed = JSON.parse(value)
          if (parsed.state) delete parsed.state.user
          if (parsed.state) delete parsed.state.auth
          return StorageService.setItem(name, parsed)
        },
        removeItem: (name) => StorageService.removeItem(name),
      })),
      partialize: (state) => ({
        // 显式排除 user，仅持久化 Token
        accessToken: state.accessToken,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedAuthState(persistedState),
      }),
    },
  ),
)

type AuthPersistApi = {
  hasHydrated?: () => boolean
  rehydrate?: () => Promise<void> | void
  onFinishHydration?: (listener: () => void) => (() => void) | void
}

function getAuthPersistApi(): AuthPersistApi | undefined {
  return (useAuthStore as typeof useAuthStore & { persist?: AuthPersistApi }).persist
}

function sanitizePersistedAuthState(persistedState: unknown): Partial<AuthState> {
  // [BACKEND-AUTHORITY & FAIL-LOUDLY]: 身份验证状态必须严谨。
  // 严禁使用 persistedState ?? {} 掩盖加载失败或状态损坏。
  if (persistedState !== null && persistedState !== undefined && typeof persistedState !== 'object') {
    const errorMsg = `[CRITICAL] Auth Storage Corruption: Persisted state is not an object (type: ${typeof persistedState})`
    throw new Error(errorMsg)
  }

  const raw = (persistedState || {}) as LegacyAuthPersistShape
  const nestedAuth = raw.auth && typeof raw.auth === 'object' ? raw.auth : undefined

  // 校验 Token 类型，非字符串则视为缺失
  const accessTokenCandidate =
    typeof raw.accessToken === 'string'
      ? raw.accessToken
      : typeof nestedAuth?.accessToken === 'string'
        ? (nestedAuth.accessToken as string)
        : ''

  return {
    accessToken: accessTokenCandidate,
    user: null,
    isSyncing: false,
    isIdentitySynced: false,
  }
}

export function isAuthHydrated(): boolean {
  const persistApi = getAuthPersistApi()
  return persistApi?.hasHydrated?.() ?? true
}

export async function waitForAuthHydration(): Promise<void> {
  const persistApi = getAuthPersistApi()
  if (!persistApi || persistApi.hasHydrated?.()) return

  try {
    await persistApi.rehydrate?.()
  } catch {
    // Fall through
  }

  if (persistApi.hasHydrated?.()) return

  await new Promise<void>((resolve) => {
    if (!persistApi.onFinishHydration) {
      resolve()
      return
    }

    const unsubscribe = persistApi.onFinishHydration(() => {
      if (typeof unsubscribe === 'function') unsubscribe()
      resolve()
    })
  })
}
