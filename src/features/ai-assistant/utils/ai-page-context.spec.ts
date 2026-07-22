import { describe, expect, it } from 'vitest'
import {
  AI_CONTEXT_REDACTED_VALUE,
  buildSafeAiPageContext,
  normalizeAiContextTitle,
} from './ai-page-context'

describe('AI page context sanitizer', () => {
  it('redacts sensitive fields before they enter AI prompts', () => {
    const safeContext = buildSafeAiPageContext({
      orderNo: 'SO-001',
      apiKey: 'secret-api-key',
      nested: {
        password: 'secret-password',
        operator: '张三',
      },
    })

    expect(safeContext.orderNo).toBe('SO-001')
    expect(safeContext.apiKey).toBe(AI_CONTEXT_REDACTED_VALUE)
    expect((safeContext.nested as Record<string, unknown>).password).toBe(
      AI_CONTEXT_REDACTED_VALUE
    )
    expect((safeContext.nested as Record<string, unknown>).operator).toBe(
      '张三'
    )
  })

  it('bounds oversized arrays, strings, and titles', () => {
    const safeContext = buildSafeAiPageContext({
      note: 'x'.repeat(500),
      rows: Array.from({ length: 25 }, (_, index) => ({ index })),
    })

    expect(String(safeContext.note)).toHaveLength(301)
    expect(safeContext.note).toMatch(/…$/)
    expect(safeContext.rows).toHaveLength(21)
    expect((safeContext.rows as unknown[])[20]).toBe(
      '[AI_CONTEXT_TRUNCATED_ITEMS:5]'
    )
    expect(normalizeAiContextTitle(' '.repeat(10))).toBe('页面上下文')
  })
})
