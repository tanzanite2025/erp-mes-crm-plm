import { type ScanPluginDefinition } from '../../core/plugin-contract'
import { type ScanSubmitResult } from '../../core/types'

export interface LogisticsInboundContext {
  orderId: string
  currentItems: Array<{ sku: string; qty: number; version: number }>
}

export interface InboundPayload {
  sku: string
  name: string
  category: string
  suggestedQty: number
}

/**
 * 物流入库插件 (Logistics Inbound)
 * 演示如何通过扫码产生 SDRTS 差量补丁
 */
export const logisticsInboundPlugin: ScanPluginDefinition<
  InboundPayload,
  LogisticsInboundContext
> = {
  code: 'LOGISTICS_INBOUND_V1',
  name: '物流入库扫码',
  description: '扫描送货单或标签，自动产生入库 SDRTS 补丁。',
  mode: 'submit',
  entryPath: '/logistics/inbound',
  permissions: { page: 'logistics.inbound' },

  /**
   * 解析扫码内容
   */
  async resolveScan({ rawCode, context: _context }) {
    // 模拟后端解析延迟
    await new Promise((resolve) => setTimeout(resolve, 800))

    // 模拟解析出的物料
    return {
      rawCode,
      mode: 'submit',
      payload: {
        sku: rawCode,
        name: `模拟物料_${rawCode.slice(-4)}`,
        category: 'RAW_MATERIAL',
        suggestedQty: 100,
      },
    }
  },

  /**
   * 提交动作为 SDRTS 差量生成
   */
  async submitAction(resolvedContext): Promise<ScanSubmitResult> {
    const { payload } = resolvedContext

    // 模拟业务检查
    if (!payload.sku.startsWith('SKU')) {
      return { success: false, message: '[INVALID_SKU] 非法物料编码格式' }
    }

    // 核心：构建 SDRTS Delta 结果
    return {
      success: true,
      message: '已生成入库差量记录',
      deltaResult: {
        id: payload.sku,
        delta: {
          inboundQty: { o: 0, n: payload.suggestedQty },
          status: { o: 'PENDING', n: 'SCANNED' },
        },
        version: 1, // 初始版次
      },
    }
  },
}
