import { type BarcodeConfig } from '../../engineering/data/schema'

/**
 * 打印中心核心服务 - 负责编码生成与批量逻辑
 */
export const BarcodeService = {
    /**
     * 生成单个 14 位 DM 码 (Data Matrix)
     * 规则：年(2位) + 月(1位) + 型号(2位) + 外观(1位) + 孔位类别(3位) + 流水号(5位)
     */
    generateCode(config: BarcodeConfig, date: Date = new Date()): string {
        const year = date.getFullYear().toString().slice(-2)

        // 月份规范：1-9, 10=0, 11=N, 12=D
        const monthMap: Record<number, string> = {
            1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
            10: '0', 11: 'N', 12: 'D'
        }
        const month = monthMap[date.getMonth() + 1] || '1'

        const model = config.modelCode.padStart(2, '0')
        const appearance = config.appearanceCode.slice(0, 1)
        const category = config.category
        const holes = Math.min(Math.max(config.holes, 1), 99).toString().padStart(2, '0')
        const holesPart = `${category}${holes}`
        
        // 流水号直接使用配置中的 5 位字符串 (已在后端或跳号逻辑中处理为 36 进制)
        const serial = config.serialNumber.padStart(5, '0').toUpperCase()

        return `${year}${month}${model}${appearance}${holesPart}${serial}`
    },

    /**
     * 获取视读文本 (支持消水孔 H 前缀及由 轮向+适应范围 合成的后缀)
     */
    getFullText(config: BarcodeConfig, code: string): string {
        const prefix = config.isDrainHole ? 'H' : ''
        
        // 合成后缀逻辑：[轮向]-[适应范围]
        const parts: string[] = []
        if (config.wheelType) parts.push(config.wheelType)
        if (config.scopeCode) parts.push(config.scopeCode.trim().toUpperCase())
        
        const suffixStr = parts.join('-')
        const suffix = suffixStr ? ` ${suffixStr}` : ''
        
        return `${prefix}${code}${suffix}`
    }
}
