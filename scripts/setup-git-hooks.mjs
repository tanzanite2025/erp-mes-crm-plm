import { chmodSync, existsSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const projectRoot = resolve(process.cwd())
const gitDir = resolve(projectRoot, '.git')

if (!existsSync(gitDir)) {
  console.log('[setup-git-hooks] skip: .git directory not found.')
  process.exit(0)
}

try {
  execSync('git config --local core.hooksPath .githooks', {
    cwd: projectRoot,
    stdio: 'ignore',
  })
  if (process.platform !== 'win32') {
    const hooksDir = resolve(projectRoot, '.githooks')
    for (const entry of readdirSync(hooksDir)) {
      const hookPath = resolve(hooksDir, entry)
      if (existsSync(hookPath)) {
        chmodSync(hookPath, 0o755)
      }
    }
  }
  console.log('[setup-git-hooks] configured core.hooksPath=.githooks')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[setup-git-hooks] warning: failed to configure hooks path. ${message}`)
}
