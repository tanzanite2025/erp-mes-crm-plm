import { createLogger } from './logger'
import { getServerErrorPresentation, showServerErrorToast } from './handle-server-error'

const logger = createLogger('SafeCatch')

/**
 * Fail-Loudly 鏍稿績寮傚父鎷︽埅鍑芥暟銆? *
 * 璇ュ嚱鏁版槸鍏ㄩ」鐩紓姝ユ搷浣滅殑鏈€缁堝紓甯稿嚭鍙ｃ€? * 璋冪敤姝ゅ嚱鏁版剰鍛崇潃寮傚父宸茶鏄庣‘澶勭悊锛堟棩蹇?+ UI 鍙嶉锛夛紝涓嶄細鍐嶈閬楁紡銆? *
 * @param error   - 鎹曡幏鍒扮殑寮傚父瀵硅薄
 * @param scope   - 鏉ユ簮鏍囪瘑锛堝 "StocktakeMgmt.onConfirmAdjustment"锛? * @param options - 閰嶇疆閫夐」
 *   - silentUI: 濡傛灉涓?true锛屼粎鍚庡彴涓婃姤锛屼笉寮瑰嚭鐢ㄦ埛鍙鐨?Toast銆傞€傜敤浜庯細
 *     1. JSON 瑙ｆ瀽 fallback锛堝 service-layer 鐨勫閲?parse锛? *     2. 鍚庡彴浣庝紭鍏堢骇鍚屾锛堝 cloud-sync锛? *     榛樿 false锛屽嵆寮?Toast + 鍚庡彴涓婃姤銆? */
export function failLoudly(
  error: unknown,
  scope: string,
  options: { silentUI?: boolean } = {}
): void {
  const { silentUI = false } = options

  // 寮哄埗鍚庡彴鎶ヨ 鈥?杩欐槸 Fail Loudly 鐨勬牳蹇冨绾?  logger.error(`[FAIL_LOUDLY] ${scope}`, error)

  // UI 灞傛姤閿欙紙璋冪敤椤圭洰宸叉湁鐨勬爣鍑嗗寲閿欒澶勭悊鍣級
  if (!silentUI) {
    showServerErrorToast(getServerErrorPresentation(error))
  }
}

/**
 * 瀹夊叏寮傛鎵ц鍖呰鍣ㄣ€? *
 * 灏嗕竴涓?async 鎿嶄綔鍖呰鎴?涓嶅彲鑳介潤榛樺け璐?鐨勭増鏈細
 * - 鎴愬姛 鈫?杩斿洖缁撴灉
 * - 澶辫触 鈫?璋冪敤 failLoudly 瀹屾垚闂幆锛岃繑鍥?undefined
 *
 * 閫傜敤浜庝笉甯屾湜鍦?UI 缁勪欢涓啓 try/catch 鐨勫満鏅€? *
 * @example
 * ```ts
 * const result = await safeAsync(
 *   () => inventoryService.reconcileInventory(),
 *   'StockMgmt.reconcile'
 * )
 * if (result !== undefined) {
 *   toast.success('瀵硅处瀹屾垚')
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

