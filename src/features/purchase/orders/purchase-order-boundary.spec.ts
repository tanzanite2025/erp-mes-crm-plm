import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const sourceRoot = path.join(process.cwd(), 'src')
const orderRoot = path.join(sourceRoot, 'features', 'purchase', 'orders')

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectSourceFiles(fullPath)
    return /\.(ts|tsx)$/.test(entry.name) ? [fullPath] : []
  })
}

function relativeSourcePath(file: string): string {
  return path.relative(sourceRoot, file).split('\\').join('/')
}

describe('purchase orders TAB ownership', () => {
  const sourceFiles = collectSourceFiles(sourceRoot)

  it('keeps purchase-order implementation out of the trading feature', () => {
    const legacyFiles = sourceFiles
      .map(relativeSourcePath)
      .filter((file) =>
        /^features\/trading\/(purchase\/|components\/purchase\/|data\/purchase-|hooks\/.*purchase)/.test(
          file
        )
      )

    expect(legacyFiles).toEqual([])
  })

  it('requires consumers to use the purchase orders public API', () => {
    const violations = sourceFiles
      .filter((file) => !file.startsWith(orderRoot))
      .filter((file) => {
        const source = readFileSync(file, 'utf8')
        return (
          source.includes('features/trading/purchase') ||
          source.includes('features/trading/components/purchase') ||
          source.includes('@/features/purchase/orders/')
        )
      })
      .map(relativeSourcePath)

    expect(violations).toEqual([])
  })

  it('allows only the declared accounts-payable integration into trading', () => {
    const tradingImports = collectSourceFiles(orderRoot)
      .filter((file) => !file.endsWith('.spec.ts'))
      .flatMap((file) => {
        const source = readFileSync(file, 'utf8')
        return source.includes('@/features/trading')
          ? [relativeSourcePath(file)]
          : []
      })

    expect(tradingImports).toEqual([
      'features/purchase/orders/components/purchase-order-list.tsx',
    ])
  })
})
