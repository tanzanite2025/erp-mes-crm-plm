#!/usr/bin/env node

import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

const packageJsonPath = resolve(repoRoot, 'package.json')
const pnpmLockPath = resolve(repoRoot, 'pnpm-lock.yaml')

function fail(message, details = '') {
  console.error(`\n[PREDEPLOY_CHECK_FAILED] ${message}`)
  if (details) console.error(details)
  process.exit(1)
}

if (!existsSync(packageJsonPath)) {
  fail('Missing package.json', `Path: ${packageJsonPath}`)
}

if (!existsSync(pnpmLockPath)) {
  fail(
    'Missing pnpm-lock.yaml',
    'Run: pnpm install\nThen commit pnpm-lock.yaml before deployment.'
  )
}

const pnpmVersion = spawnSync('pnpm', ['--version'], {
  cwd: repoRoot,
  encoding: 'utf8',
  shell: true,
})

if (pnpmVersion.status !== 0) {
  fail(
    'pnpm is not available in PATH.',
    'Install pnpm first, then re-run: pnpm run predeploy:check'
  )
}

console.log(`[PREDEPLOY_CHECK] pnpm version: ${pnpmVersion.stdout.trim()}`)
console.log('[PREDEPLOY_CHECK] Verifying package.json <-> pnpm-lock.yaml sync...')

const check = spawnSync(
  'pnpm',
  ['install', '--frozen-lockfile', '--lockfile-only', '--ignore-scripts'],
  {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: true,
  }
)

if (check.status !== 0) {
  const output = `${check.stdout || ''}${check.stderr || ''}`.trim()
  fail(
    'Lockfile is out of sync with package.json.',
    `${output}\n\nFix:\n1) pnpm install\n2) git add package.json pnpm-lock.yaml\n3) git commit -m "chore: sync pnpm lockfile"`
  )
}

console.log('[PREDEPLOY_CHECK] OK: package.json and pnpm-lock.yaml are in sync.')
