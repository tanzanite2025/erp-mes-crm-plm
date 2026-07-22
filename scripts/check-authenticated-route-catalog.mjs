#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import {
  buildAuthenticatedRouteCatalogSource,
  getAuthenticatedRouteCatalogFile,
} from './authenticated-route-catalog-output.mjs'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const catalogFile = getAuthenticatedRouteCatalogFile(repoRoot)
const expected = buildAuthenticatedRouteCatalogSource(repoRoot)

function fail(message, details = '') {
  console.error(`\n[AUTH_ROUTE_CATALOG_CHECK_FAILED] ${message}`)
  if (details) console.error(details)
  process.exit(1)
}

if (!existsSync(catalogFile)) {
  fail(
    'Missing authenticated route catalog.',
    'Run: pnpm run gen:auth-routes\nThen commit the generated catalog.',
  )
}

const actual = readFileSync(catalogFile, 'utf8')

if (actual !== expected) {
  fail(
    'Authenticated route catalog is stale.',
    'Run: pnpm run gen:auth-routes\nThen commit src/features/authz/data/authenticated-route-catalog.ts.',
  )
}

console.log('[AUTH_ROUTE_CATALOG_CHECK] OK: authenticated route catalog matches route files.')
