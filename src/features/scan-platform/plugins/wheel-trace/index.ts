import type { ScanPluginDefinition } from '../../core/plugin-contract'
import type { WheelTracePayload } from '../../models/wheel-trace'
import type { WheelTraceParserContext } from '../../services/wheel-trace-parser-service'
import { runWheelTraceLookup } from '../../use-cases/wheel-trace-lookup'

export const wheelTraceScanPlugin: ScanPluginDefinition<
  WheelTracePayload,
  WheelTraceParserContext
> = {
  code: 'wheel-trace',
  name: '车圈追溯',
  description: '用于查询车圈当前工段、历史轨迹与最近处理记录的扫码插件。',
  entryPath: '/scan/wheel-trace',
  mode: 'view',
  permissions: {
    page: 'page.scan.wheelTrace',
    action: 'action.scan.wheelTrace.view',
  },
  async resolveScan(input) {
    const payload = await runWheelTraceLookup(input)

    return {
      rawCode: payload.barcode.rawCode,
      mode: 'view',
      payload,
    }
  },
}
