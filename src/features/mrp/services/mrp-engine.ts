import { type MrpCalculationInput, type MrpResult, type MaterialRequirement } from '../data/schema'
import { productService } from '@/features/engineering/services/product-service'

/**
 * MrpEngine
 * XDFC 工业 ERP 核心计算引擎
 * 负责解析销售订单、展开 BOM 配方、对冲仓库库存并计算最终物料需求。
 */
export const MrpEngine = {
    /**
     * 执行全量或增量 MRP 计算 (与界面解耦)
     */
    runCalculation(input: MrpCalculationInput): MrpResult {
        const { orders, boms, materials, products, rules, inventory } = input
        
        // 1. 预过滤活动数据
        const filteredOrders = orders.filter(o => !o.isDeleted && ['Pending', 'InProgress'].includes(o.status))
        const activeBOMs = boms.filter(b => b.status === 'active')
        
        const requirementMap = new Map<string, MaterialRequirement>()
        const productsMissingBOM = new Set<string>()
        const modelQtyMap = new Map<string, number>()

        // 2. 销售订单遍历与 BOM 爆炸 (Explosion)
        for (const order of filteredOrders) {
            for (const line of order.lines) {
                if (!line.productId) continue
                
                const modelName = line.productModel || '未知型号'
                modelQtyMap.set(modelName, (modelQtyMap.get(modelName) || 0) + line.qty)

                const productBOM = activeBOMs.find(b => b.productId === line.productId)
                if (!productBOM) {
                    productsMissingBOM.add(line.productModel)
                    continue
                }

                // 2.1 展开 BOM 细项
                for (const bomItem of productBOM.items) {
                    const mId = bomItem.materialId
                    const section = bomItem.section || '其他'
                    const compositeKey = `${section}_${mId}`
                    const qtyNeeded = line.qty * bomItem.standardUsage

                    // 2.1.1 初始化或累加物料需求
                    if (!requirementMap.has(compositeKey)) {
                        const mInfo = materials.find(m => m.id === mId || m.code === mId || m.name === mId)
                        
                        requirementMap.set(compositeKey, {
                            materialId: mId,
                            materialCode: (mInfo?.code || mId || 'UNKNOWN').toUpperCase(),
                            materialName: mInfo?.name || bomItem.materialName || '未命名物料',
                            materialSpec: mInfo?.spec || bomItem.materialSpec || '-',
                            section: section,
                            totalRequired: 0,
                            // 计算当前实时库存
                            inventoryQty: inventory
                                .filter(i => i.materialId === mId)
                                .reduce((sum, i) => sum + i.quantity, 0),
                            shortageGap: 0,
                            unit: mInfo?.uom || bomItem.unit || '双',
                            sourceOrders: [],
                            hasBOM: true
                        })
                    }

                    const req = requirementMap.get(compositeKey)!
                    req.totalRequired += qtyNeeded
                    
                    // 2.1.2 溯源信息记录
                    const product = products.find(p => p.id === line.productId || p.sku === line.productCode)
                    const friendlyProductName = product ? productService.formatDisplay(product) : line.productModel

                    const existingOrder = req.sourceOrders.find(so => 
                        so.orderNo === order.orderNo && 
                        so.productName === friendlyProductName &&
                        so.lineNo === line.lineNo
                    )
                    
                    if (existingOrder) {
                        existingOrder.qty += line.qty
                    } else {
                        req.sourceOrders.push({
                            orderNo: order.orderNo,
                            customerName: order.customerName || '未知客户',
                            qty: line.qty,
                            productName: friendlyProductName,
                            lineNo: line.lineNo,
                            totalLines: order.lines.length
                        })
                    }
                }
            }
        }

        // 3. 后处理：库存对冲与拼装建议计算
        const requirements = Array.from(requirementMap.values()).map(req => {
            // 计算缺料差额
            const reqWithGap = { ...req, shortageGap: Math.max(0, req.totalRequired - req.inventoryQty) }
            
            // 匹配拼装规则
            const rule = rules.find(r => r.materialId === req.materialId)
            if (rule) {
                const packQty = rule.direction === 'reverse'
                    ? Math.ceil(reqWithGap.totalRequired * rule.conversionFactor)
                    : Math.ceil(reqWithGap.totalRequired / rule.conversionFactor)
                
                return { 
                    ...reqWithGap, 
                    packaging: { 
                        packUnit: rule.packUnit, 
                        packQty, 
                        factor: rule.conversionFactor, 
                        direction: rule.direction 
                    } 
                }
            }
            return reqWithGap
        }).sort((a, b) => {
            // 排序逻辑：工段优先级 > 需求量倒序
            if (a.section !== b.section) return a.section.localeCompare(b.section)
            return b.totalRequired - a.totalRequired
        })
        
        // 4. 返回计算结果与统计快照
        return {
            requirements,
            stats: {
                totalMaterials: requirements.length,
                missingBOMCount: productsMissingBOM.size,
                activeOrderCount: filteredOrders.length,
                analyzedModels: Array.from(modelQtyMap.entries()).map(([name, qty]) => ({ 
                    modelName: name, 
                    totalQty: qty 
                }))
            }
        }
    }
}
