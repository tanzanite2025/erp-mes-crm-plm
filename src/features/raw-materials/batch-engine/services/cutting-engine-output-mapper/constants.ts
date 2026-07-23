export const RUST_WASM_CUTTING_ENGINE_STRATEGY_KEY =
  'rust-wasm-single-roll-greedy-candidate-core'

export const RUST_WASM_CUTTING_ENGINE_PRESET_KEY =
  RUST_WASM_CUTTING_ENGINE_STRATEGY_KEY

export const RUST_WASM_CUTTING_ENGINE_SOLVER_STATUS =
  'RUST_WASM_SINGLE_ROLL_GREEDY_CANDIDATE_SET'

export function buildRustWasmCuttingEngineSummaryMessage(options: {
  eligibleDemandLineCount: number
  returnedPlanCount: number
  warnings: string[]
}) {
  const { eligibleDemandLineCount, returnedPlanCount, warnings } = options
  const baseMessage = `Rust/WASM 当前为单卷多需求行矩形贪心候选模式：处理 ${eligibleDemandLineCount} 个可求解需求行并返回 ${returnedPlanCount} 个候选方案，尚未执行多卷分配与旋转排样。`
  return warnings.length ? `${baseMessage} ${warnings.join('；')}` : baseMessage
}
