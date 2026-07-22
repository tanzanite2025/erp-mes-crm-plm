import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import {
  buildAuthenticatedRouteCatalogSource,
  getAuthenticatedRouteCatalogFile,
} from './authenticated-route-catalog-output.mjs'

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputFile = getAuthenticatedRouteCatalogFile(repoRoot)
const output = buildAuthenticatedRouteCatalogSource(repoRoot)

writeFileSync(outputFile, output)
