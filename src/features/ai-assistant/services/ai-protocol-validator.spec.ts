import { describe, expect, it } from 'vitest'
import { isValidCommand, isValidRoute } from './ai-protocol-validator'

describe('AI protocol validator', () => {
  it('validates ACT routes against the generated route permission registry', () => {
    expect(isValidRoute('/system-management/ai-capability')).toBe(true)
    expect(isValidRoute('/quality/standards/STD-001/edit')).toBe(true)
    expect(isValidRoute('/system-mgmt/users')).toBe(false)
    expect(isValidRoute('https://example.com/system-management')).toBe(false)
  })

  it('keeps CMD payloads bounded and non-recursive', () => {
    expect(isValidCommand('检查 AI 连接配置')).toBe(true)
    expect(isValidCommand('[ACT: 打开系统 | /system-management]')).toBe(false)
    expect(isValidCommand('x'.repeat(501))).toBe(false)
  })
})
