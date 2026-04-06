import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, relative } from 'node:path'

const repoRoot = resolve(process.cwd())
const allowedSrcFiles = new Set([
  'src/lib/logger.ts',
  'src/lib/log-drain.ts',
])

function collectFiles(directory) {
  const entries = readdirSync(directory)
  const files = []

  for (const entry of entries) {
    const fullPath = resolve(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      if (fullPath.includes('src\\components\\ui') || fullPath.includes('src/components/ui')) {
        continue
      }

      files.push(...collectFiles(fullPath))
      continue
    }

    if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath)
    }
  }

  return files
}

const srcFiles = collectFiles(resolve(repoRoot, 'src'))

const offenders = []

for (const file of srcFiles) {
  const relativePath = relative(repoRoot, file).replace(/\\/g, '/')
  if (allowedSrcFiles.has(relativePath)) continue

  const content = readFileSync(file, 'utf8')
  const lines = content.split(/\r?\n/)

  lines.forEach((line, index) => {
    if (/console\.(log|warn|error|debug|info)\s*\(/.test(line)) {
      offenders.push(`${relativePath}:${index + 1}: ${line.trim()}`)
    }
  })
}

if (offenders.length > 0) {
  console.error('[frontend-logging] direct console usage is forbidden in src/** business code:')
  offenders.forEach((item) => console.error(`- ${item}`))
  process.exit(1)
}

console.log('[frontend-logging] OK: no direct console usage found in src/** business code.')
