import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import process from 'node:process'
import ts from 'typescript'

const currentFilePath = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(currentFilePath), '..')
const localesEntry = path.join(projectRoot, 'src', 'locales', 'index.ts')
const baselinePath = path.join(projectRoot, 'scripts', 'i18n-parity-baseline.json')
const WRITE_BASELINE_FLAG = '--write-baseline'

const moduleCache = new Map()

function transpileFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: filePath,
  }).outputText
}

function resolveModulePath(specifier, parentFile) {
  if (!specifier.startsWith('.')) {
    throw new Error(`Unsupported non-relative import: ${specifier} from ${parentFile}`)
  }

  const basePath = path.resolve(path.dirname(parentFile), specifier)
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.mjs`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.js'),
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }

  throw new Error(`Cannot resolve module '${specifier}' from ${parentFile}`)
}

function loadTsModule(filePath) {
  const normalizedPath = path.normalize(filePath)
  if (moduleCache.has(normalizedPath)) {
    return moduleCache.get(normalizedPath)
  }

  const module = { exports: {} }
  moduleCache.set(normalizedPath, module.exports)

  const code = transpileFile(normalizedPath)
  const dirname = path.dirname(normalizedPath)
  const wrapper = `(function (exports, require, module, __filename, __dirname) { ${code}\n})`
  const compiled = vm.runInThisContext(wrapper, { filename: normalizedPath })

  const localRequire = (specifier) => {
    const resolvedPath = resolveModulePath(specifier, normalizedPath)
    return loadTsModule(resolvedPath)
  }

  compiled(module.exports, localRequire, module, normalizedPath, dirname)
  moduleCache.set(normalizedPath, module.exports)
  return module.exports
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function collectPaths(source, prefix = '', target = new Map()) {
  if (!isRecord(source)) {
    return target
  }

  for (const [key, value] of Object.entries(source)) {
    const nextPath = prefix ? `${prefix}.${key}` : key
    if (isRecord(value)) {
      target.set(nextPath, { type: 'object' })
      collectPaths(value, nextPath, target)
      continue
    }

    if (typeof value === 'string') {
      target.set(nextPath, {
        type: 'string',
        placeholders: extractPlaceholders(value),
      })
      continue
    }

    target.set(nextPath, { type: typeof value })
  }

  return target
}

function extractPlaceholders(template) {
  const placeholders = new Set()
  const regex = /\{\{\s*(\w+)\s*\}\}/g
  let match = regex.exec(template)
  while (match) {
    placeholders.add(match[1])
    match = regex.exec(template)
  }
  return [...placeholders].sort()
}

function formatList(title, items) {
  if (items.length === 0) return []
  return [`\n[${title}]`, ...items.map((item) => `- ${item}`)]
}

function buildIssueSnapshot(result) {
  return {
    missingInZh: result.missingInZh,
    missingInEn: result.missingInEn,
    typeMismatch: result.typeMismatch,
    interpolationMismatch: result.interpolationMismatch,
  }
}

function computeIssueCount(snapshot) {
  return (
    snapshot.missingInZh.length +
    snapshot.missingInEn.length +
    snapshot.typeMismatch.length +
    snapshot.interpolationMismatch.length
  )
}

function readBaseline() {
  if (!fs.existsSync(baselinePath)) {
    return null
  }

  return JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
}

function writeBaseline(snapshot) {
  fs.writeFileSync(baselinePath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
}

function subtractKnownIssues(current, baseline) {
  const baselineSets = {
    missingInZh: new Set(baseline.missingInZh ?? []),
    missingInEn: new Set(baseline.missingInEn ?? []),
    typeMismatch: new Set(baseline.typeMismatch ?? []),
    interpolationMismatch: new Set(baseline.interpolationMismatch ?? []),
  }

  return {
    missingInZh: current.missingInZh.filter((item) => !baselineSets.missingInZh.has(item)),
    missingInEn: current.missingInEn.filter((item) => !baselineSets.missingInEn.has(item)),
    typeMismatch: current.typeMismatch.filter((item) => !baselineSets.typeMismatch.has(item)),
    interpolationMismatch: current.interpolationMismatch.filter(
      (item) => !baselineSets.interpolationMismatch.has(item)
    ),
  }
}

function compareLocaleMaps(zhMap, enMap) {
  const missingInZh = []
  const missingInEn = []
  const typeMismatch = []
  const interpolationMismatch = []

  for (const [key, enValue] of enMap.entries()) {
    if (!zhMap.has(key)) {
      missingInZh.push(key)
      continue
    }

    const zhValue = zhMap.get(key)
    if (zhValue.type !== enValue.type) {
      typeMismatch.push(`${key} (zh-CN: ${zhValue.type}, en-US: ${enValue.type})`)
      continue
    }

    if (zhValue.type === 'string') {
      const zhPlaceholders = zhValue.placeholders.join(', ')
      const enPlaceholders = enValue.placeholders.join(', ')
      if (zhPlaceholders !== enPlaceholders) {
        interpolationMismatch.push(
          `${key} (zh-CN: [${zhPlaceholders}], en-US: [${enPlaceholders}])`
        )
      }
    }
  }

  for (const key of zhMap.keys()) {
    if (!enMap.has(key)) {
      missingInEn.push(key)
    }
  }

  return {
    missingInZh: missingInZh.sort(),
    missingInEn: missingInEn.sort(),
    typeMismatch: typeMismatch.sort(),
    interpolationMismatch: interpolationMismatch.sort(),
  }
}

function main() {
  const shouldWriteBaseline = process.argv.includes(WRITE_BASELINE_FLAG)
  const localeExports = loadTsModule(localesEntry)
  const messages = localeExports.messages

  if (!messages || !messages['zh-CN'] || !messages['en-US']) {
    throw new Error('Failed to load aggregated locale messages from src/locales/index.ts')
  }

  const zhMap = collectPaths(messages['zh-CN'])
  const enMap = collectPaths(messages['en-US'])
  const result = compareLocaleMaps(zhMap, enMap)

  const snapshot = buildIssueSnapshot(result)
  const totalIssues = computeIssueCount(snapshot)

  if (shouldWriteBaseline) {
    writeBaseline(snapshot)
    console.log(`[verify:i18n] Baseline updated at ${path.relative(projectRoot, baselinePath)} with ${totalIssues} issue(s).`)
    return
  }

  if (totalIssues === 0) {
    console.log('[verify:i18n] Locale parity check passed. zh-CN and en-US are structurally aligned.')
    return
  }

  const baseline = readBaseline()

  if (!baseline) {
    const output = [
      '[verify:i18n] Locale parity check failed.',
      'No baseline found. Create one with: pnpm run verify:i18n:baseline',
      `Total issues: ${totalIssues}`,
      ...formatList('missing in zh-CN', result.missingInZh),
      ...formatList('missing in en-US', result.missingInEn),
      ...formatList('type mismatch', result.typeMismatch),
      ...formatList('interpolation mismatch', result.interpolationMismatch),
    ]

    console.error(output.join('\n'))
    process.exitCode = 1
    return
  }

  const regressions = subtractKnownIssues(snapshot, baseline)
  const regressionCount = computeIssueCount(regressions)

  if (regressionCount === 0) {
    console.log(
      `[verify:i18n] Locale parity check passed with baseline. Known issues: ${totalIssues}, new regressions: 0.`
    )
    return
  }

  const output = [
    '[verify:i18n] Locale parity check failed with new regressions.',
    `Known issues in baseline: ${computeIssueCount(baseline)}`,
    `Current issues: ${totalIssues}`,
    `New regressions: ${regressionCount}`,
    ...formatList('missing in zh-CN', regressions.missingInZh),
    ...formatList('missing in en-US', regressions.missingInEn),
    ...formatList('type mismatch', regressions.typeMismatch),
    ...formatList('interpolation mismatch', regressions.interpolationMismatch),
  ]

  console.error(output.join('\n'))
  process.exitCode = 1
}

main()
