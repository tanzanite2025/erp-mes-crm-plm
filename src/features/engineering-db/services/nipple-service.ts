import { Nipple, nippleSchema } from '../data/nipple-schema'
import { engineeringSpecService, type EngineeringSpecInput } from '@/features/engineering/services/engineering-spec-service'

export const nippleService = {
  getNipples: async (): Promise<Nipple[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('NIPPLE_DATA')
      return raw.map(s => ({
        ...s.nippleData,
        id: s.id,
        version: s._v,
        createdAt: s.createdAt || new Date().toISOString()
      })).filter(item => nippleSchema.safeParse(item).success)
    } catch (e) {
      console.error('Failed to get nipples from cloud', e)
      return []
    }
  },

  saveNipple: async (data: Nipple) => {
    const spec: EngineeringSpecInput = {
      id: data.id,
      name: data.name,
      code: data.id,
      type: 'NIPPLE_DATA',
      active: true,
      nippleData: data,
      _v: data.version || 1
    }
    await engineeringSpecService.saveSpec(spec);
  },

  patchNipple: async (id: string, delta: any, version: number) => {
    const mappedDelta: any = {}
    Object.entries(delta).forEach(([path, value]) => {
      mappedDelta[`nippleData.${path}`] = value
    })
    await engineeringSpecService.patchSpec(id, mappedDelta, version)
  },

  saveNipples: async (data: Nipple[]) => {
    if (data.length === 0) return;
    await nippleService.saveNipple(data[0]);
  },

  deleteNipple: async (id: string) => {
    await engineeringSpecService.deleteSpec(id);
  }
}
