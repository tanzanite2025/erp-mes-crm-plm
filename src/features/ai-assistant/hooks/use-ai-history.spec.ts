import { describe, expect, it } from 'vitest'
import { getAiHistoryStorageKey } from './use-ai-history'

describe('AI history storage key', () => {
  it('is isolated per authenticated user', () => {
    expect(getAiHistoryStorageKey('user-a')).toBe('xdfc_ai_chat_history:user-a')
    expect(getAiHistoryStorageKey(' user-b ')).toBe(
      'xdfc_ai_chat_history:user-b'
    )
    expect(getAiHistoryStorageKey(null)).toBeNull()
  })
})
