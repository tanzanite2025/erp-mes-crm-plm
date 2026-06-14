import fs from 'node:fs'
import path from 'node:path'

/**
 * 加载后端 contract sample。
 *
 * Sample 由 `server/services/wire_contract_test.go` 通过 `go test -update` 生成，
 * 存放于 `server/contract-samples/`。前端测试读取这些 JSON 验证 wire format
 * 与 zod schema 的对齐情况。
 *
 * 详细背景：`server/contract-samples/README.md`。
 */
export function loadWireSample<T = unknown>(name: string): T {
  // 测试在 vitest 下运行，cwd 通常为项目根。从根再相对到 server/contract-samples
  const rootDir = process.cwd()
  const samplePath = path.join(rootDir, 'server', 'contract-samples', name)
  if (!fs.existsSync(samplePath)) {
    throw new Error(
      `[CONTRACT_SAMPLE_MISSING] ${name} not found at ${samplePath}. ` +
        `Run \`go test ./services/ -run TestExportContractSamples -update\` to regenerate.`
    )
  }
  const raw = fs.readFileSync(samplePath, 'utf-8')
  return JSON.parse(raw) as T
}
