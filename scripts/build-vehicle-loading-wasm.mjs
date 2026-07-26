import { existsSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const repoRoot = path.resolve(path.dirname(scriptPath), '..')
const wasmCratePath = path.join(repoRoot, 'vehicle-loading-engine', 'wasm')
const wasmPackageOutputPath = path.join(
  repoRoot,
  'src',
  'features',
  'logistics-config',
  'vehicle-loading',
  'wasm',
  'pkg'
)

const wasmPackArgs = [
  'build',
  wasmCratePath,
  '--target',
  'web',
  '--out-dir',
  wasmPackageOutputPath,
  '--out-name',
  'vehicle_loading_engine_wasm',
]

const wasmPackResult = spawnSync('wasm-pack', wasmPackArgs, {
  cwd: repoRoot,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

if (wasmPackResult.status !== 0) {
  process.exit(wasmPackResult.status ?? 1)
}

const generatedGitignorePath = path.join(wasmPackageOutputPath, '.gitignore')
if (existsSync(generatedGitignorePath)) {
  rmSync(generatedGitignorePath, { force: true })
}

console.log(`Vehicle loading WASM package generated at ${wasmPackageOutputPath}`)
