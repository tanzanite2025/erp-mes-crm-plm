import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, relative, extname } from 'node:path'
import { TextDecoder } from 'node:util'
import ts from 'typescript'

const projectRoot = resolve(process.cwd())
const localesRoot = resolve(projectRoot, 'src', 'locales')
const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
const tsExtensions = new Set(['.ts', '.tsx'])
const allowedExtensions = new Set(['.ts', '.tsx', '.json'])

// Common mojibake fragments seen when UTF-8 Chinese content is decoded with the wrong charset.
const suspiciousFragments = [
  '璐︽埛',
  '鐢ㄦ埛',
  '绠＄悊',
  '鍔犺浇',
  '澶辫触',
  '鎴愬姛',
  '璇峰悗',
  '璇峰厛',
  '淇濆瓨',
  '鍒犻櫎',
  '缂栬緫',
  '鍒楄〃',
  '鍚庡彴',
  '鑾峰彇',
  '鎿嶄綔',
  '浠ユ',
  '銆',
  '锛',
  '锟',
]

function collectZhCnFiles(directory) {
  const entries = readdirSync(directory)
  const files = []

  for (const entry of entries) {
    const fullPath = resolve(directory, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      files.push(...collectZhCnFiles(fullPath))
      continue
    }

    const extension = extname(fullPath).toLowerCase()
    if (!allowedExtensions.has(extension)) {
      continue
    }

    const normalizedPath = fullPath.replace(/\\/g, '/')
    if (!normalizedPath.includes('zh-CN')) {
      continue
    }

    files.push(fullPath)
  }

  return files
}

function formatParseDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
  if (typeof diagnostic.start !== 'number') {
    return message
  }

  const location = diagnostic.file?.getLineAndCharacterOfPosition(diagnostic.start)
  if (!location) {
    return message
  }

  return `line ${location.line + 1}, col ${location.character + 1}: ${message}`
}

function collectSyntaxIssues(filePath, content) {
  const extension = extname(filePath).toLowerCase()
  if (!tsExtensions.has(extension)) {
    return []
  }

  const scriptKind = extension === '.tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind)
  return sourceFile.parseDiagnostics.map((diagnostic) => formatParseDiagnostic(diagnostic))
}

function collectMojibakeHits(content) {
  const lines = content.split(/\r?\n/)
  const hits = []

  lines.forEach((line, index) => {
    for (const fragment of suspiciousFragments) {
      if (line.includes(fragment)) {
        hits.push({
          line: index + 1,
          fragment,
          sample: line.trim().slice(0, 120),
        })
      }
    }
  })

  return hits
}

function main() {
  const files = collectZhCnFiles(localesRoot)
  const issues = []

  for (const file of files) {
    const relativePath = relative(projectRoot, file).replace(/\\/g, '/')
    const raw = readFileSync(file)
    let content = ''

    try {
      content = utf8Decoder.decode(raw)
    } catch (error) {
      issues.push({
        file: relativePath,
        type: 'invalid-utf8',
        detail: error instanceof Error ? error.message : String(error),
      })
      continue
    }

    if (content.includes('\uFFFD')) {
      issues.push({
        file: relativePath,
        type: 'replacement-char',
        detail: 'Contains replacement character (U+FFFD), likely from decode corruption.',
      })
    }

    const syntaxIssues = collectSyntaxIssues(file, content)
    for (const item of syntaxIssues) {
      issues.push({
        file: relativePath,
        type: 'syntax',
        detail: item,
      })
    }

    const mojibakeHits = collectMojibakeHits(content)
    for (const hit of mojibakeHits) {
      issues.push({
        file: relativePath,
        type: 'suspicious-fragment',
        detail: `line ${hit.line}: "${hit.fragment}" -> ${hit.sample}`,
      })
    }
  }

  if (issues.length === 0) {
    console.log(`[verify:zh-cn-encoding] OK. Scanned ${files.length} zh-CN locale file(s), no encoding anomalies.`)
    return
  }

  console.error(`[verify:zh-cn-encoding] Found ${issues.length} issue(s) in zh-CN locale files:`)
  for (const issue of issues) {
    console.error(`- [${issue.type}] ${issue.file}: ${issue.detail}`)
  }
  process.exit(1)
}

main()
