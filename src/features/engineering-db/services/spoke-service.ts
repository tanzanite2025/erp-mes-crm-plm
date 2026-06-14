import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  engineeringSpecService,
  type EngineeringSpec,
  type EngineeringSpecInput,
} from '@/features/engineering/services/engineering-spec-service'
import {
  type SpokeLength,
  type SpokeLengthInput,
  spokeLengthSchema,
} from '../data/schema'

function toSpokeLength(spec: EngineeringSpec): SpokeLength {
  return spokeLengthSchema.parse({
    ...(spec.spokeLengthData ?? {}),
    id: spec.id,
    version: spec.version,
    createdAt: spec.createdAt,
  })
}

/**
 * 辐条工程服务 (Spoke Service)
 * 职责: 处理辐条长度计算结果、规格及其物理层 SDRTS 差量更新。
 */
export const SpokeService = {
  /**
   * 获取所有辐条长度记录
   */
  getSpokeLength: async (): Promise<SpokeLength[]> => {
    const raw = await engineeringSpecService.getSpecs('SPOKE_LENGTH')
    return raw.map(toSpokeLength)
  },

  /**
   * 保存辐条长度记录
   */
  saveSpokeLength: async (data: SpokeLengthInput[]) => {
    if (data.length === 0) return
    const item = data[0]
    const spec: EngineeringSpecInput = {
      name: item.name,
      type: 'SPOKE_LENGTH',
      active: true,
      spokeLengthData: item,
      version: item.version || 1,
    }
    await engineeringSpecService.saveSpec(spec)
  },

  saveSpokeLengthItem: async (item: SpokeLengthInput) => {
    await SpokeService.saveSpokeLength([item])
  },

  /**
   * 局部更新辐条记录 (SDRTS Delta Protocol)
   * 事务意图: SPOKE_SPEC_ADJUSTMENT
   */
  patchSpokeLength: async (id: string, delta: DeltaSet, version: number) => {
    const mappedDelta: DeltaSet = {}
    Object.entries(delta).forEach(([path, value]) => {
      mappedDelta[`spokeLengthData.${path}`] = value
    })

    const payload: DeltaPayload = {
      op: 'PATCH',
      delta: mappedDelta,
      metadata: {
        id,
        version,
        intent: 'SPOKE_SPEC_ADJUSTMENT', // 注入辐条规格调整意图
      },
    }

    await engineeringSpecService.patchSpec(id, payload.delta, version)
  },

  deleteSpokeLength: async (id: string) => {
    await engineeringSpecService.deleteSpec(id)
  },
}
