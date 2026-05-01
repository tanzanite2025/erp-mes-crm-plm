import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const WAREHOUSE_HOOK_FILES = [
  'src/features/warehouse/hooks/use-adjustment-history.ts',
  'src/features/warehouse/hooks/use-stock-mgmt.ts',
  'src/features/warehouse/hooks/use-stocktake-adjustment-submission.ts',
  'src/features/warehouse/category/hooks/use-warehouse-category.ts',
]

describe('warehouse hook UI boundary', () => {
  it('keeps remaining warehouse hooks free of direct UI side effects', () => {
    const source = WAREHOUSE_HOOK_FILES
      .map((filePath) => readFileSync(join(process.cwd(), filePath), 'utf8'))
      .join('\n')

    expect(source).not.toMatch(/from\s+['"]sonner['"]/)
    expect(source).not.toMatch(/(?<![.\w])toast\s*(?:\.|\()/)
    expect(source).not.toMatch(/(?<![.\w])(?:window\.)?confirm\s*\(/)
    expect(source).not.toMatch(/(?<![.\w])(?:window\.)?alert\s*\(/)
  })
})
