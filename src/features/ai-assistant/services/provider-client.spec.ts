import { describe, expect, it } from 'vitest'
import { toAIUserFacingErrorMessage } from './provider-client'

describe('AI provider client error presentation', () => {
  it('translates missing gateway credentials into a Chinese action hint', () => {
    expect(toAIUserFacingErrorMessage(new Error('API_KEY_MISSING'))).toContain(
      '引擎网关'
    )
  })

  it('translates governance rate limits without leaking raw error codes', () => {
    const message = toAIUserFacingErrorMessage(
      new Error('AI_PROXY_ERROR (429): AI_PROXY_USER_RATE_LIMIT')
    )

    expect(message).toContain('限流保护')
    expect(message).not.toContain('AI_PROXY_USER_RATE_LIMIT')
  })

  it('translates stream timeout into a retryable user message', () => {
    expect(
      toAIUserFacingErrorMessage(new Error('AI_TIMEOUT (120s)'))
    ).toContain('响应超时')
  })
})
