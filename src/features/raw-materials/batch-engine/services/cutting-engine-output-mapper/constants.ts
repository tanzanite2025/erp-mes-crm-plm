export const RUST_WASM_CUTTING_ENGINE_STRATEGY_KEY =
  'rust-wasm-multi-roll-greedy-candidate-core'

export const RUST_WASM_CUTTING_ENGINE_PRESET_KEY =
  RUST_WASM_CUTTING_ENGINE_STRATEGY_KEY

export const RUST_WASM_CUTTING_ENGINE_SOLVER_STATUS =
  'RUST_WASM_MULTI_ROLL_GREEDY_CANDIDATE_SET'

export function buildRustWasmCuttingEngineSummaryMessage(options: {
  eligibleDemandLineCount: number
  returnedPlanCount: number
  warnings: string[]
}) {
  const { eligibleDemandLineCount, returnedPlanCount, warnings } = options
  const baseMessage = `Rust/WASM 当前为单卷/多卷矩形贪心候选模式：处理 ${eligibleDemandLineCount} 个可求解需求行并返回 ${returnedPlanCount} 个候选方案，已支持跨卷拆分；尚未执行旋转、嵌套排样或跨卷全局最优优化。`
  return warnings.length ? `${baseMessage} ${warnings.join('；')}` : baseMessage
}
