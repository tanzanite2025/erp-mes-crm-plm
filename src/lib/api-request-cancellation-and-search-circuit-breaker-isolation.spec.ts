import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const apiRequestTestState = vi.hoisted(() => ({
  session: { accessToken: 'request-test-token', reset: vi.fn() },
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: { getState: () => apiRequestTestState.session },
}))
vi.mock('@/lib/logger', () => ({
  createLogger: () => apiRequestTestState.logger,
}))

let apiFetch: typeof import('./api-client').apiFetch
const requestFetchMock = vi.fn<typeof fetch>()

describe('API request cancellation and search failure isolation', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', requestFetchMock)
    requestFetchMock.mockReset()
    apiRequestTestState.session.accessToken = 'request-test-token'
    apiRequestTestState.session.reset.mockReset()
    apiRequestTestState.session.reset.mockImplementation(() => {
      apiRequestTestState.session.accessToken = ''
    })
    ;({ apiFetch } = await import('./api-client'))
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('keeps the application API available after repeated search dependency failures', async () => {
    requestFetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify({ error: 'search unavailable' }), {
          status: 503,
        })
    )
    for (let index = 0; index < 51; index++) {
      await apiFetch('/search/global?q=order', {
        circuitBreakerScope: 'global-business-search',
      }).catch(() => undefined)
    }
    await expect(
      apiFetch('/search/global?q=order', {
        circuitBreakerScope: 'global-business-search',
      })
    ).rejects.toMatchObject({ kind: 'circuit_breaker' })
    requestFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true }))
    )
    await expect(apiFetch('/orders')).resolves.toEqual({ available: true })
  })

  it('keeps search recovery independent from the application circuit breaker state', async () => {
    requestFetchMock.mockImplementation(
      async () => new Response('{}', { status: 503 })
    )
    for (let index = 0; index < 51; index++) {
      await apiFetch('/orders').catch(() => undefined)
    }
    requestFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true }))
    )
    await expect(
      apiFetch('/search/global?q=order', {
        circuitBreakerScope: 'global-business-search',
      })
    ).resolves.toEqual({ available: true })
    await expect(apiFetch('/orders')).rejects.toMatchObject({
      kind: 'circuit_breaker',
    })
  })

  it('propagates caller cancellation without logging an outage or converting its reason', async () => {
    let networkSignal: AbortSignal | null | undefined
    requestFetchMock.mockImplementation((_endpoint, options) => {
      networkSignal = options?.signal
      return new Promise((_resolve, reject) =>
        networkSignal?.addEventListener(
          'abort',
          () => reject(networkSignal?.reason),
          { once: true }
        )
      )
    })
    const callerController = new AbortController()
    const cancelledReason = new Error('obsolete search request')
    const request = apiFetch('/orders', { signal: callerController.signal })
    const rejectedRequest = expect(request).rejects.toBe(cancelledReason)
    callerController.abort(cancelledReason)
    expect(networkSignal?.aborted).toBe(true)
    await rejectedRequest
    expect(apiRequestTestState.logger.error).not.toHaveBeenCalled()
    expect(apiRequestTestState.logger.warn).not.toHaveBeenCalled()
  })

  it('does not fetch or trip the circuit breaker for already cancelled requests', async () => {
    for (let index = 0; index < 51; index++) {
      const callerController = new AbortController()
      callerController.abort()
      await expect(
        apiFetch('/orders', { signal: callerController.signal })
      ).rejects.toMatchObject({ name: 'AbortError' })
    }
    expect(requestFetchMock).not.toHaveBeenCalled()
    requestFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ available: true }))
    )
    await expect(apiFetch('/orders')).resolves.toEqual({ available: true })
  })

  it('removes caller abort listeners when a request completes', async () => {
    let networkSignal: AbortSignal | null | undefined
    requestFetchMock.mockImplementation(async (_endpoint, options) => {
      networkSignal = options?.signal
      return new Response('{}')
    })
    const callerController = new AbortController()
    await apiFetch('/orders', { signal: callerController.signal })
    callerController.abort()
    expect(networkSignal?.aborted).toBe(false)
  })

  it('enforces the timeout while the response body is still loading', async () => {
    vi.useFakeTimers()
    requestFetchMock.mockImplementation(async (_endpoint, options) => {
      const response = new Response('{}')
      vi.spyOn(response, 'json').mockImplementation(
        () =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason),
              { once: true }
            )
          )
      )
      return response
    })
    const request = apiFetch('/orders')
    const rejectedRequest = expect(request).rejects.toMatchObject({
      kind: 'timeout',
    })
    await vi.advanceTimersByTimeAsync(30001)
    await rejectedRequest
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not reset previous failures until a success body has fully arrived', async () => {
    vi.useFakeTimers()
    requestFetchMock.mockImplementation(
      async () => new Response('{}', { status: 503 })
    )
    const failureThreshold = import.meta.env.DEV ? 50 : 10
    for (let index = 0; index < failureThreshold - 1; index++) {
      await apiFetch('/orders').catch(() => undefined)
    }
    requestFetchMock.mockImplementationOnce(async (_endpoint, options) => {
      const response = new Response('{}')
      vi.spyOn(response, 'json').mockImplementation(
        () =>
          new Promise((_resolve, reject) =>
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason),
              { once: true }
            )
          )
      )
      return response
    })
    const request = apiFetch('/orders')
    const rejectedRequest = expect(request).rejects.toMatchObject({
      kind: 'timeout',
    })
    await vi.advanceTimersToNextTimerAsync()
    await rejectedRequest
    await expect(apiFetch('/orders')).rejects.toMatchObject({
      kind: 'circuit_breaker',
    })
  })

  it('retains authentication checks for the isolated search scope', async () => {
    apiRequestTestState.session.accessToken = ''
    await expect(
      apiFetch('/search/global?q=order', {
        circuitBreakerScope: 'global-business-search',
      })
    ).rejects.toMatchObject({ kind: 'auth_required' })
    expect(requestFetchMock).not.toHaveBeenCalled()
  })

  it('does not sign out a newer session when an old request returns 401', async () => {
    vi.stubGlobal('window', {
      location: { pathname: '/sign-in', replace: vi.fn() },
    })
    let resolveOldRequest!: (response: Response) => void
    requestFetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveOldRequest = resolve
      })
    )
    const oldRequest = apiFetch('/auth/snapshot')
    const rejectedOldRequest = expect(oldRequest).rejects.toMatchObject({
      status: 401,
    })
    apiRequestTestState.session.accessToken = 'new-password-sign-in-token'
    resolveOldRequest(
      new Response('{"code":"auth_password_version_expired"}', { status: 401 })
    )
    await rejectedOldRequest
    expect(apiRequestTestState.session.reset).not.toHaveBeenCalled()
    expect(window.location.replace).not.toHaveBeenCalled()
    expect(apiRequestTestState.session.accessToken).toBe(
      'new-password-sign-in-token'
    )
  })

  it('resets the matching expired session and handles another session expiring on the sign-in page', async () => {
    vi.stubGlobal('window', {
      location: { pathname: '/sign-in', replace: vi.fn() },
    })
    requestFetchMock.mockImplementation(
      async () => new Response('{}', { status: 401 })
    )
    await expect(apiFetch('/auth/snapshot')).rejects.toMatchObject({
      status: 401,
    })
    expect(apiRequestTestState.session.reset).toHaveBeenCalledTimes(1)
    apiRequestTestState.session.accessToken = 'another-expired-token'
    await expect(apiFetch('/auth/snapshot')).rejects.toMatchObject({
      status: 401,
    })
    expect(apiRequestTestState.session.reset).toHaveBeenCalledTimes(2)
  })

  it('does not count cancelled error bodies as failed application requests', async () => {
    requestFetchMock.mockImplementation(async (_endpoint, options) => {
      const response = new Response('{}', { status: 503 })
      vi.spyOn(response, 'json').mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            options?.signal?.addEventListener(
              'abort',
              () => reject(options.signal?.reason),
              { once: true }
            )
            queueMicrotask(() => currentBodyController.abort())
          })
      )
      return response
    })
    let currentBodyController: AbortController
    for (let index = 0; index < 51; index++) {
      currentBodyController = new AbortController()
      await expect(
        apiFetch('/orders', { signal: currentBodyController.signal })
      ).rejects.toMatchObject({ name: 'AbortError' })
    }
    requestFetchMock.mockResolvedValueOnce(new Response('{}'))
    await expect(apiFetch('/orders')).resolves.toEqual({})
    expect(apiRequestTestState.logger.warn).not.toHaveBeenCalled()
  })
})
