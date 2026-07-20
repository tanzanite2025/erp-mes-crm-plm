import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = path.join(process.cwd(), 'src')
const supplierRoot = path.join(sourceRoot, 'features', 'purchase', 'suppliers')

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : []
  })
}

describe('supplier TAB ownership', () => {
  const sourceFiles = collectSourceFiles(sourceRoot)

  it('keeps supplier implementation out of the trading feature', () => {
    const legacyFiles = sourceFiles
      .map((file) => path.relative(sourceRoot, file).split('\\').join('/'))
      .filter((file) => /^features\/trading\/(supplier\/|.*\/supplier-)/.test(file))

    expect(legacyFiles).toEqual([])
  })

  it('requires consumers to use the purchase supplier public API', () => {
    const violations = sourceFiles
      .filter((file) => !file.startsWith(supplierRoot))
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        return (
          source.includes('features/trading/supplier') ||
          source.includes('@/features/purchase/suppliers/')
        )
      })
      .map((file) => path.relative(sourceRoot, file).split('\\').join('/'))

    expect(violations).toEqual([])
  })
})
