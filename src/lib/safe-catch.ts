import { createLogger } from './logger'
import { getServerErrorPresentation, showServerErrorToast } from './handle-server-error'

const logger = createLogger('SafeCatch')

/**
 * Fail-Loudly 核心异常拦截函数。
 *
 * 该函数是全项目异步操作的最终异常出口。
 * 调用此函数意味着异常已被明确处理（日志 + UI 反馈），不会再被遗漏。
 *
 * @param error   - 捕获到的异常对象
 * @param scope   - 来源标识（如 "StocktakeMgmt.onConfirmAdjustment"）
 * @param options - 配置选项
 *   - silentUI: 如果为 true，仅后台上报，不弹出用户可见的 Toast。适用于：
 *     1. JSON 解析 fallback（如 dictionary-service 的多重 parse）
 *     2. 后台低优先级同步（如 cloud-sync）
 *     默认 false，即弹 Toast + 后台上报。
 */
export function failLoudly(
  error: unknown,
  scope: string,
  options: { silentUI?: boolean } = {}
): void {
  const { silentUI = false } = options

  // 强制后台报警 — 这是 Fail Loudly 的核心契约
  logger.error(`[FAIL_LOUDLY] ${scope}`, error)

  // UI 层报错（调用项目已有的标准化错误处理器）
  if (!silentUI) {
    showServerErrorToast(getServerErrorPresentation(error))
  }
}

/**
 * 安全异步执行包装器。
 *
 * 将一个 async 操作包装成"不可能静默失败"的版本：
 * - 成功 → 返回结果
 * - 失败 → 调用 failLoudly 完成闭环，返回 undefined
 *
 * 适用于不希望在 UI 组件中写 try/catch 的场景。
 *
 * @example
 * ```ts
 * const result = await safeAsync(
 *   () => inventoryService.reconcileInventory(),
 *   'StockMgmt.reconcile'
 * )
 * if (result !== undefined) {
 *   toast.success('对账完成')
 * }
 * ```
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  scope: string,
  options: { silentUI?: boolean } = {}
): Promise<T | undefined> {
  try {
    return await fn()
  } catch (error) {
    failLoudly(error, scope, options)
    return undefined
  }
}
