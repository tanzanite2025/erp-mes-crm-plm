import type {
  WheelTraceLookupRequestContract,
  WheelTraceLookupResponseContract,
} from '../../contracts/wheel-trace-gateway-contract'
import type { WheelTraceQueryGateway } from '../../services/wheel-trace-query-service'

function buildTimeline(
  rawCode: string
): WheelTraceLookupResponseContract['timeline'] {
  return [
    {
      id: `${rawCode}-production`,
      time: '2026-04-02T08:20:00.000Z',
      title: '轮圈上线',
      description: '条码已进入生产流转，并完成首站采集。',
      type: 'production',
      segmentName: '成型段',
      processName: '上线确认',
      operatorName: '张三',
      status: 'done',
    },
    {
      id: `${rawCode}-quality`,
      time: '2026-04-02T10:05:00.000Z',
      title: '质检复核',
      description: '外观复核完成，等待转入包装段。',
      type: 'quality',
      segmentName: '质检段',
      processName: '外观检',
      operatorName: '李四',
      status: 'done',
    },
  ]
}

export const mockWheelTraceGateway: WheelTraceQueryGateway = {
  async lookup(
    request: WheelTraceLookupRequestContract
  ): Promise<WheelTraceLookupResponseContract> {
    return {
      currentStage: {
        status: 'resolved',
        lineCode: 'LINE-A',
        lineName: '一号轮圈线',
        segmentName: '包装段',
        processCode: 'PACK',
        processName: '包装确认',
        teamName: '白班 A 组',
        operatorName: '王五',
        scannedAt: '2026-04-02T10:18:00.000Z',
      },
      timeline: request.includeTimeline ? buildTimeline(request.rawCode) : [],
      warnings: [],
    }
  },
}
