'use client'

import { MoldService } from './mold-service'
import { FurnaceService } from './furnace-service'
import { MoldLoanService } from './mold-loan-service'

/**
 * AssetService - 资产管理服务 (Facade 模式 - 已适配后端与性能优化)
 */
export class AssetService {
    static getMolds = MoldService.getMolds.bind(MoldService)
    static getGroupNames = MoldService.getGroupNames.bind(MoldService)
    static saveMolds = MoldService.saveMolds.bind(MoldService)
    static checkMoldCapacity = MoldService.checkMoldCapacity.bind(MoldService)
    static checkLinkIntegrity = MoldService.checkLinkIntegrity.bind(MoldService)

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
            await MoldService.updateTelemetry(assetId, data.cycles)
        } else if (type === 'FURNACE' && data.temp !== undefined) {
            await FurnaceService.updateTelemetry(assetId, data.temp)
        }
    }
}
