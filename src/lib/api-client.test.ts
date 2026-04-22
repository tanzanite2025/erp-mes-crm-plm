import { beforeEach, describe, expect, it, vi } from 'vitest'

const { resetAuthMock, loggerMock } = vi.hoisted(() => ({
  resetAuthMock: vi.fn(),
  loggerMock: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: 'token-for-test',
      reset: resetAuthMock,
    }),
  },
}))

vi.mock('@/lib/logger', () => ({
  createLogger: () => loggerMock,
}))

import { apiFetch } from './api-client'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetAuthMock.mockReset()
    loggerMock.debug.mockReset()
    loggerMock.error.mockReset()
    loggerMock.warn.mockReset()
  })

  it('preserves paginated object responses instead of reshaping them into arrays', async () => {
    const payload = {
      items: [{ id: 'order-1' }],
      total: 1,
      page: 1,
      pageSize: 20,
    }

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: { get: vi.fn().mockReturnValue(null) },
        json: vi.fn().mockResolvedValue(payload),
      }),
    )

    const result = await apiFetch<typeof payload>('/sales-orders')

    expect(Array.isArray(result)).toBe(false)
    expect(result).toEqual(payload)
  })
})
