import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, normalize } from 'node:path'

const workspaceRoot = process.cwd()

const forbiddenPatterns = [
  { label: 'sonner import', pattern: /from\s+['"]sonner['"]/ },
  { label: 'toast call', pattern: /\btoast\s*(?:\.|\()/ },
  { label: 'browser alert', pattern: /\b(?:window\.)?alert\s*\(/ },
  { label: 'browser confirm', pattern: /\b(?:window\.)?confirm\s*\(/ },
  { label: 'UI server error handler', pattern: /\bhandleServerError\b/ },
]

function listSourceFiles(root: string): string[] {
  if (!existsSync(root)) return []

  return readdirSync(root).flatMap((entry) => {
    const fullPath = join(root, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      return listSourceFiles(fullPath)
    }
    if (
      !/\.(ts|tsx)$/.test(entry) ||
      /\.test\.(ts|tsx)$/.test(entry) ||
      /\.d\.ts$/.test(entry)
    ) {
      return []
    }
    return [fullPath]
  })
}

function toSlashPath(path: string) {
  return normalize(path).replace(/\\/g, '/')
}

function findBoundaryViolations(files: string[]) {
  return files.flatMap((file) => {
    const source = readFileSync(file, 'utf8')
    return forbiddenPatterns
      .filter(({ pattern }) => pattern.test(source))
      .map(({ label }) => `${toSlashPath(file).replace(toSlashPath(workspaceRoot) + '/', '')}: ${label}`)
  })
}

describe('service UI boundary', () => {
  it('keeps warehouse service modules free of direct UI feedback', () => {
    const warehouseRoot = join(workspaceRoot, 'src/features/warehouse')
    const serviceFiles = listSourceFiles(warehouseRoot).filter((file) =>
      toSlashPath(file).includes('/services/')
    )

    expect(findBoundaryViolations(serviceFiles)).toEqual([])
  })

  it('keeps user service and query/mutation hooks free of direct UI feedback', () => {
    const usersRoot = join(workspaceRoot, 'src/features/users')
    const boundaryFiles = listSourceFiles(usersRoot).filter((file) => {
      const path = toSlashPath(file)
      return path.includes('/services/') || path.includes('/hooks/')
    })

    expect(findBoundaryViolations(boundaryFiles)).toEqual([])
  })
})
