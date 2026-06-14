#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const repoRoot = resolve(__dirname, '..')

const excludedDirs = new Set([
  '.git',
  'node_modules',
  '.corepack',
  'dist',
  'dist-ssr',
  '.tanstack',
  '.playwright-cli',
  '.kiro',
  'docs',
])

const excludedFiles = new Set(['scripts/check-package-manager-commands.mjs'])
const excludedExtensions = new Set(['.md', '.mdx'])

const commandPatterns = [
  /\bnpm\s+(?:run|exec|install|test|start|build|ci|create|init|publish|pack|update|upgrade|audit|cache|config|link|uninstall|add|remove|i)\b/,
  /\bnpx\s+\S+/,
  /\byarn\s+(?:run|exec|install|test|start|build|create|init|publish|pack|update|upgrade|audit|cache|config|link|uninstall|add|remove|dlx)\b/,
]

function shouldSkipDir(name) {
  return excludedDirs.has(name)
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      if (!shouldSkipDir(entry.name)) {
        walk(fullPath, files)
      }
      continue
    }
    if (entry.isFile()) {
      files.push(fullPath)
    }
  }
  return files
}

function readTextFile(path) {
  if (excludedExtensions.has(path.slice(path.lastIndexOf('.')).toLowerCase())) return null
  const stat = statSync(path)
  if (stat.size > 2 * 1024 * 1024) return null
  const raw = readFileSync(path)
  if (raw.includes(0)) return null
  return raw.toString('utf8')
}

function findViolations(content) {
  const lines = content.split(/\r?\n/)
  const violations = []
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    if (line.trim().startsWith('#')) continue
    if (line.trim().startsWith('//')) continue
    if (line.trim().startsWith('*')) continue
    for (const pattern of commandPatterns) {
      if (pattern.test(line)) {
        violations.push({
          line: i + 1,
          text: line.trim(),
        })
        break
      }
    }
  }
  return violations
}

const allFiles = walk(repoRoot)
const allViolations = []

for (const filePath of allFiles) {
  const relPath = relative(repoRoot, filePath).replaceAll('\\', '/')
  if (excludedFiles.has(relPath)) continue

  const content = readTextFile(filePath)
  if (!content) continue
  const violations = findViolations(content)
  for (const violation of violations) {
    allViolations.push({
      file: relPath,
      ...violation,
    })
  }
}

if (allViolations.length > 0) {
  console.error('[PACKAGE_MANAGER_COMMAND_CHECK_FAILED] Found forbidden npm/npx/yarn command usages:')
  for (const violation of allViolations) {
    console.error(`- ${violation.file}:${violation.line} -> ${violation.text}`)
  }
  console.error('\nUse pnpm/corepack equivalents instead.')
  process.exit(1)
}

console.log('[PACKAGE_MANAGER_COMMAND_CHECK] OK: no npm/npx/yarn command usages found.')
