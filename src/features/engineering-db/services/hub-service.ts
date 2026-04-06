import { Hub, hubSchema } from '../data/hub-schema'
import { engineeringSpecService, type EngineeringSpec } from '@/features/engineering/services/engineering-spec-service'

export const hubService = {
  getHubs: async (): Promise<Hub[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('HUB_DATA')
      return raw.map(s => ({
        ...s.hubData,
        id: s.id,
        createdAt: s.createdAt || new Date().toISOString()
      })).filter(item => hubSchema.safeParse(item).success)
    } catch (e) {
      console.error('Failed to get hubs from cloud', e)
      return []
    }
  },

  saveHub: async (data: Hub) => {
    const spec: EngineeringSpec = {
      id: data.id,
      name: data.name,
      code: data.id,
      type: 'HUB_DATA',
      active: true,
      hubData: data,
      _v: 1
    }
    await engineeringSpecService.saveSpec(spec);
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
