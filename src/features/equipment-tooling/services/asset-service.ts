import { MoldCoreService } from './mold-core-service'
import { MoldTransactionService } from './mold-transaction-service'
import { MoldMaintenanceService } from './mold-maintenance-service'
import { FurnaceService } from './furnace-service'
import { MoldLoanService } from './mold-loan-service'

/**
 * AssetService - 资产管理服务 (Facade 模式 - 已适配后端与性能优化)
 */
export class AssetService {
    static getMolds = MoldCoreService.getMolds.bind(MoldCoreService)
    static getGroupNames = MoldCoreService.getGroupNames.bind(MoldCoreService)
    static saveMolds = MoldMaintenanceService.saveMolds.bind(MoldMaintenanceService)
    static checkMoldCapacity = MoldTransactionService.checkMoldCapacity.bind(MoldTransactionService)
    static checkMoldCapacityAlerts = MoldTransactionService.checkMoldCapacityAlerts.bind(MoldTransactionService)
    static checkLinkIntegrity = MoldCoreService.checkLinkIntegrity.bind(MoldCoreService)

    static getFurnaces = FurnaceService.getFurnaces.bind(FurnaceService)
    static saveFurnaces = FurnaceService.saveFurnaces.bind(FurnaceService)

    static getLoans = MoldLoanService.getLoans.bind(MoldLoanService)
    static lendMold = MoldLoanService.createLoan.bind(MoldLoanService)
    static borrowMold = MoldLoanService.createBorrowRecord.bind(MoldLoanService)
    static returnMold = MoldLoanService.returnMold.bind(MoldLoanService)

    /**
     * 更新资产遥测数据
     */
    static async updateTelemetry(assetId: string, type: 'MOLD' | 'FURNACE', data: { temp?: number; cycles?: number }) {
        if (type === 'MOLD' && data.cycles !== undefined) {
            await MoldTransactionService.updateTelemetry(assetId, data.cycles)
        } else if (type === 'FURNACE' && data.temp !== undefined) {
            await FurnaceService.updateTelemetry(assetId, data.temp)
        }
    }
}
