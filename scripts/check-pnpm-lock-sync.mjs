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
const npmLockPath = resolve(repoRoot, 'package-lock.json')

function fail(message, details = '') {
  console.error(`\n[PREDEPLOY_CHECK_FAILED] ${message}`)
  if (details) console.error(details)
  process.exit(1)
}

function runCommand(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
}

function renderOutput(result) {
  const execError =
    result.error instanceof Error
      ? `${result.error.name}: ${result.error.message}`
      : ''
  return `${execError}\n${result.stdout || ''}${result.stderr || ''}`.trim()
}

function detectPnpmRunner() {
  const invocations =
    process.platform === 'win32'
      ? [
          { command: 'pnpm.cmd', prefixArgs: [] },
          { command: 'pnpm', prefixArgs: [] },
          { command: 'corepack', prefixArgs: ['pnpm'] },
          { command: 'corepack.cmd', prefixArgs: ['pnpm'] },
        ]
      : [
          { command: 'pnpm', prefixArgs: [] },
          { command: 'corepack', prefixArgs: ['pnpm'] },
        ]

  const errors = []
  for (const invocation of invocations) {
    const result = runCommand(invocation.command, [...invocation.prefixArgs, '--version'])
    if (result.status === 0) {
      return {
        ...invocation,
        version: renderOutput(result) || 'unknown',
      }
    }

    const details = renderOutput(result)
    errors.push(
      `${invocation.command} ${invocation.prefixArgs.join(' ')} --version -> ${
        details || 'failed to execute'
      }`
    )
  }

  fail(
    'pnpm runtime is unavailable in this environment.',
    `Tried executors:\n- ${errors.join('\n- ')}\n\nInstall/fix pnpm and retry: pnpm run predeploy:check`
  )
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

if (existsSync(npmLockPath)) {
  fail(
    'Found package-lock.json while repository is configured for pnpm-only.',
    'Remove package-lock.json and keep pnpm-lock.yaml as the single source of dependency lock state.'
  )
}

const pnpmRunner = detectPnpmRunner()

console.log(`[PREDEPLOY_CHECK] pnpm version: ${pnpmRunner.version}`)
console.log('[PREDEPLOY_CHECK] Verifying package.json <-> pnpm-lock.yaml sync...')

const check = runCommand(
  pnpmRunner.command,
  [...pnpmRunner.prefixArgs, 'install', '--frozen-lockfile', '--lockfile-only', '--ignore-scripts']
)

if (check.status !== 0) {
  const output = renderOutput(check)
  const lockfileMismatchPatterns = [
    /ERR_PNPM_OUTDATED_LOCKFILE/i,
    /Cannot install with "frozen-lockfile"/i,
    /lockfile is up to date, resolution step is skipped/i,
    /out of sync/i,
  ]
  const isLockfileMismatch = lockfileMismatchPatterns.some((pattern) => pattern.test(output))

  if (isLockfileMismatch) {
    fail(
      'Lockfile is out of sync with package.json.',
      `${output}\n\nFix:\n1) pnpm install\n2) git add package.json pnpm-lock.yaml\n3) git commit -m "chore: sync pnpm lockfile"`
    )
  }

  fail(
    'Failed to verify pnpm lockfile sync due to runtime/permission error.',
    `${output}\n\nEnsure pnpm/corepack is executable in this environment, then retry.`
  )
}

console.log('[PREDEPLOY_CHECK] OK: package.json and pnpm-lock.yaml are in sync.')
