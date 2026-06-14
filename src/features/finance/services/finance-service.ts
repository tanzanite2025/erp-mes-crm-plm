/**
 * [DEPRECATED] financeService
 *
 * 此服务已根据 [XDFC 架构归一化] 协议废弃。
 * 请按照以下映射进行迁移：
 * - 币种查询 -> CurrencyCoreService
 * - 币种维护/同步 -> CurrencyMaintenanceService
 * - 结算方式查询 -> PaymentTermCoreService
 * - 结算方式维护 -> PaymentTermMaintenanceService
 *
 * @deprecated 严禁在新代码中使用。
 */
import { createLogger } from '@/lib/logger'

const logger = createLogger('FinanceService')

export const financeService = new Proxy({} as Record<string, never>, {
  get(_, prop) {
    const errorMsg = `[CRITICAL] 调用了已废弃的 financeService.${String(prop)}。请立即迁移至 Currency 或 PaymentTerm 相关域服务。`
    logger.error(errorMsg)
    throw new Error(errorMsg)
  },
})

// 为了兼容部分存量代码的类型推断，保留接口定义（仅作为类型参考）
export type { Currency, PaymentTerm } from '../data/schema'
