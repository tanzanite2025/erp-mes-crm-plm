import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const TRADING_ROOT = join(process.cwd(), 'src/features/trading')
const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx'])
const IGNORED_FILE_SUFFIXES = ['.test.ts', '.test.tsx']
const SUSPICIOUS_TOKENS = [
  '鏈€',
  '鍙拌处',
  '鎼滅储',
  '甯佺',
  '鐘舵€',
  '纭',
  '閫夋嫨',
  '姝ｅ湪',
  '璇疯緭鍏',
  '鏈寚瀹',
  '闄嶅簭',
  '鍗囧簭',
  '�',
] as const

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry)
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      return collectFiles(fullPath)
    }
    if (!SCANNED_EXTENSIONS.has(fullPath.slice(fullPath.lastIndexOf('.')))) {
      return []
    }
    if (IGNORED_FILE_SUFFIXES.some((suffix) => fullPath.endsWith(suffix))) {
      return []
    }
    return [fullPath]
  })
}

describe('trading copy and encoding guard', () => {
  it('does not contain known mojibake tokens in source files', () => {
    const violations = collectFiles(TRADING_ROOT).flatMap((filePath) => {
      const content = readFileSync(filePath, 'utf8')
      const matchedTokens = SUSPICIOUS_TOKENS.filter((token) => content.includes(token))
      if (matchedTokens.length === 0) {
        return []
      }
      return [`${filePath}: ${matchedTokens.join(', ')}`]
    })

    expect(violations).toEqual([])
  })
})
