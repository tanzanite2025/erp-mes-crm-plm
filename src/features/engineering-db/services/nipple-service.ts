import { nippleSchema, type Nipple } from '../data/nipple-schema'
import { engineeringSpecService, type EngineeringSpecInput } from '@/features/engineering/services/engineering-spec-service'

export const nippleService = {
  getNipples: async (): Promise<Nipple[]> => {
    const raw = await engineeringSpecService.getSpecs('NIPPLE_DATA')
    return raw.flatMap((s) => {
      const parsed = nippleSchema.safeParse({
        id: s.id,
        name: s.nippleData?.name ?? s.name,
        brand: s.nippleData?.brand,
        material: s.nippleData?.material,
        length: s.nippleData?.length,
        color: s.nippleData?.color,
        fileUrl: s.nippleData?.fileUrl,
        fileExtension: s.nippleData?.fileExtension,
        version: s.version,
        createdAt: s.createdAt || new Date().toISOString(),
      })
      return parsed.success ? [parsed.data] : []
    })
  },

  saveNipple: async (data: Nipple) => {
    const spec: EngineeringSpecInput = {
      id: data.id,
      name: data.name,
      code: data.id,
      type: 'NIPPLE_DATA',
      active: true,
      nippleData: data,
      version: data.version || 1
    }
    await engineeringSpecService.saveSpec(spec);
  },

  patchNipple: async (id: string, delta: Record<string, unknown>, version: number) => {
    const mappedDelta: Record<string, unknown> = {}
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
