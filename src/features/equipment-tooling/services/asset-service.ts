import { type MoldLoan } from '../data/schema'
import { FurnaceService } from './furnace-service'
import { MoldCoreService } from './mold-core-service'
import { MoldLoanService } from './mold-loan-service'
import { MoldTransactionService } from './mold-transaction-service'

/**
 * AssetService - 资产管理服务 (Facade 模式 - 已适配后端与性能优化)
 */
export class AssetService {
  static getMolds = MoldCoreService.getMolds.bind(MoldCoreService)
  static getGroupNames = MoldCoreService.getGroupNames.bind(MoldCoreService)
  static checkMoldCapacity = MoldTransactionService.checkMoldCapacity.bind(
    MoldTransactionService
  )
  static checkMoldCapacityAlerts =
    MoldTransactionService.checkMoldCapacityAlerts.bind(MoldTransactionService)

  /**
   * [UI-PREVIEW-INDICATOR]: 前端仅消费该预览分数用于即时反馈展示。
   * [BACKEND-AUTHORITY]: 权威健康评分属于后端 BRP/Asset-Core 核算范畴。
   */
  static previewHealthScore(currentCycles: number, maxCycles: number): number {
    if (!Number.isFinite(maxCycles) || maxCycles <= 0) return 0
    if (!Number.isFinite(currentCycles)) return 0

    const ratio = ((maxCycles - currentCycles) / maxCycles) * 100
    return Math.max(0, Math.min(100, Math.round(ratio)))
  }

  static getFurnaces = FurnaceService.getFurnaces.bind(FurnaceService)

  static getLoans = MoldLoanService.getLoans.bind(MoldLoanService)
  static async lendMold(loan: Omit<MoldLoan, 'id' | 'createdAt'>) {
    return MoldLoanService.createLoan({
      ...loan,
      metadata: {
        ...loan.metadata,
        intent: 'PHYSICAL_LOAN_TRANSITION',
      },
    })
  }
  static borrowMold = MoldLoanService.createBorrowRecord.bind(MoldLoanService)
  static returnMold = MoldLoanService.returnMold.bind(MoldLoanService)

  /**
   * 更新资产遥测数据
   */
  static async updateTelemetry(
    assetId: string,
    type: 'MOLD' | 'FURNACE',
    data: { temp?: number; cycles?: number }
  ) {
    if (type === 'MOLD' && data.cycles !== undefined) {
      await MoldTransactionService.updateTelemetry(assetId, data.cycles)
    } else if (type === 'FURNACE' && data.temp !== undefined) {
      await FurnaceService.updateTelemetry(assetId, data.temp)
    }
  }
}
