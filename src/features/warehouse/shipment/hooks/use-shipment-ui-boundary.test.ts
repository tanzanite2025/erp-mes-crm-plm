import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('useShipment UI boundary', () => {
  it('keeps shipment hooks free of direct UI side effects', () => {
    const hooksDir = join(process.cwd(), 'src/features/warehouse/shipment/hooks')
    const source = readdirSync(hooksDir)
      .filter((fileName) => fileName.endsWith('.ts'))
      .filter((fileName) => fileName !== 'shipment-ui-feedback.ts')
      .filter((fileName) => !fileName.endsWith('.test.ts'))
      .map((fileName) => readFileSync(join(hooksDir, fileName), 'utf8'))
      .join('\n')

    expect(source).not.toMatch(/from\s+['"]sonner['"]/)
    expect(source).not.toMatch(/(?<![.\w])toast\s*(?:\.|\()/)
    expect(source).not.toMatch(/(?<![.\w])(?:window\.)?confirm\s*\(/)
    expect(source).not.toMatch(/(?<![.\w])(?:window\.)?alert\s*\(/)
    expect(source).not.toMatch(/\bresolveInventoryErrorTip\s*\(/)
  })
})
