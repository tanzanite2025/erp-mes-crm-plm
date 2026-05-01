import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('useReport UI boundary', () => {
  it('keeps the report orchestration hook free of direct UI side effects', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/features/warehouse/hooks/use-report.ts'),
      'utf8',
    )

    expect(source).not.toMatch(/from\s+['"]sonner['"]/)
    expect(source).not.toMatch(/(?<![.\w])toast\s*(?:\.|\()/)
    expect(source).not.toMatch(/(?<![.\w])(?:window\.)?confirm\s*\(/)
    expect(source).not.toMatch(/(?<![.\w])(?:window\.)?alert\s*\(/)
  })
})
