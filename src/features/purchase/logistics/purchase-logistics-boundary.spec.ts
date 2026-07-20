import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = path.join(process.cwd(), 'src')
const logisticsRoot = path.join(sourceRoot, 'features', 'purchase', 'logistics')

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : []
  })
}

describe('purchase logistics TAB ownership', () => {
  const sourceFiles = collectSourceFiles(sourceRoot)

  it('keeps purchase logistics out of the top-level legacy feature', () => {
    const legacyFiles = sourceFiles
      .map((file) => path.relative(sourceRoot, file).split('\\').join('/'))
      .filter((file) => file.startsWith('features/purchase-logistics/'))

    expect(legacyFiles).toEqual([])
  })

  it('requires consumers to use the purchase logistics public API', () => {
    const violations = sourceFiles
      .filter((file) => !file.startsWith(logisticsRoot))
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        return (
          source.includes('@/features/purchase-logistics') ||
          source.includes('@/features/purchase/logistics/')
        )
      })
      .map((file) => path.relative(sourceRoot, file).split('\\').join('/'))

    expect(violations).toEqual([])
  })
})
