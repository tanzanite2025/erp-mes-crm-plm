import type { ScanPluginDefinition } from '../../core/plugin-contract'
import type {
  LogisticsInboundHostContext,
  LogisticsInboundScanPayload,
} from '../../models/logistics-inbound'
import { logisticsInboundResolutionService } from '../../services/logistics-inbound-resolution-service'

export const logisticsInboundScanPlugin: ScanPluginDefinition<
  LogisticsInboundScanPayload,
  LogisticsInboundHostContext
> = {
  code: 'logistics-inbound',
  name: '进货物流扫描',
  description: '用于来料收货、采购物流绑定与入库前校验的扫码插件。',
  entryPath: '/scan/logistics-inbound',
  mode: 'submit',
  permissions: {
    page: 'page.scan.logisticsInbound',
    action: 'action.scan.logisticsInbound.submit',
  },
  resolveScan: logisticsInboundResolutionService.resolve,
  async submitAction(context) {
    return {
      success: true,
      message: `预留提交能力: ${context.rawCode}`,
    }
  },
}
