export const RUST_WASM_CUTTING_ENGINE_STRATEGY_KEY =
  'rust-wasm-single-line-candidate-core'

export const RUST_WASM_CUTTING_ENGINE_PRESET_KEY =
  RUST_WASM_CUTTING_ENGINE_STRATEGY_KEY

export const RUST_WASM_CUTTING_ENGINE_SOLVER_STATUS =
  'RUST_WASM_SINGLE_LINE_CANDIDATE_SET'

export function buildRustWasmCuttingEngineSummaryMessage(options: {
  eligibleDemandLineCount: number
  returnedPlanCount: number
  warnings: string[]
}) {
  const { eligibleDemandLineCount, returnedPlanCount, warnings } = options
  const baseMessage = `Rust/WASM 当前仍为单需求行候选模式：从 ${eligibleDemandLineCount} 个可求解需求行中返回 ${returnedPlanCount} 个候选方案，尚未执行跨行组合排样。`
  return warnings.length ? `${baseMessage} ${warnings.join('；')}` : baseMessage
}
