import { hubSchema, type Hub } from '../data/hub-schema'
import { engineeringSpecService, type EngineeringSpecInput } from '@/features/engineering/services/engineering-spec-service'

export const hubService = {
  getHubs: async (): Promise<Hub[]> => {
    const raw = await engineeringSpecService.getSpecs('HUB_DATA')
    return raw.flatMap((s) => {
      const parsed = hubSchema.safeParse({
        id: s.id,
        name: s.hubData?.name ?? s.name,
        brand: s.hubData?.brand,
        model: s.hubData?.model,
        holeCount: s.hubData?.holeCount,
        pcdLeft: s.hubData?.pcdLeft,
        pcdRight: s.hubData?.pcdRight,
        flangeLeft: s.hubData?.flangeLeft,
        flangeRight: s.hubData?.flangeRight,
        fileUrl: s.hubData?.fileUrl,
        fileExtension: s.hubData?.fileExtension,
        version: s._v ?? 1,
        createdAt: s.createdAt || new Date().toISOString(),
      })
      return parsed.success ? [parsed.data] : []
    })
  },

  saveHub: async (data: Hub) => {
    const spec: EngineeringSpecInput = {
      id: data.id,
      name: data.name,
      code: data.id,
      type: 'HUB_DATA',
      active: true,
      hubData: data,
      _v: data.version || 1
    }
    await engineeringSpecService.saveSpec(spec);
  },

  patchHub: async (id: string, delta: Record<string, unknown>, version: number) => {
    // 映射 delta 路径：工艺数据存储在 hubData 字段下
    const mappedDelta: Record<string, unknown> = {}
    Object.entries(delta).forEach(([path, value]) => {
      mappedDelta[`hubData.${path}`] = value
    })
    await engineeringSpecService.patchSpec(id, mappedDelta, version)
  },

  saveHubs: async (data: Hub[]) => {
    if (data.length === 0) return;
    // 兼容 UI 层面的全量保存逻辑（取第一项进行云端同步）
    await hubService.saveHub(data[0]);
  },

  deleteHub: async (id: string) => {
    await engineeringSpecService.deleteSpec(id);
  }
}
