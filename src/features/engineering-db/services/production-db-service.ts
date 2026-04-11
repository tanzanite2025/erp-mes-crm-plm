import { type DrillingPlan, type LabelingDraft, drillingPlanSchema, labelingDraftSchema } from '../data/schema'
import { engineeringSpecService, type EngineeringSpec } from '@/features/engineering/services/engineering-spec-service'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

/**
 * 生产数据库服务 (Production DB Service)
 * 职责: 管理钻孔 (Drilling) 与贴标 (Labeling) 等物理生产工艺参数。
 */
export const ProductionDBService = {
  // --- Drilling (钻孔方案) ---
  
  getDrilling: async (): Promise<DrillingPlan[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('DRILLING_PLAN')
      return raw.map(s => ({
        ...s.drillingData,
        id: s.id,
        version: s._v,
        createdAt: s.createdAt || new Date().toISOString()
      })).filter(item => drillingPlanSchema.safeParse(item).success)
    } catch (e) {
      console.error('Failed to get drilling stats from cloud', e)
      return []
    }
  },

  saveDrilling: async (data: DrillingPlan[]) => {
    if (data.length === 0) return;
    const item = data[0];
    const spec: EngineeringSpec = {
      id: item.id,
      name: item.name,
      code: item.id,
      type: 'DRILLING_PLAN',
      active: true,
      drillingData: item,
      _v: item.version || 1
    }
    await engineeringSpecService.saveSpec(spec);
  },

  saveDrillingItem: async (item: DrillingPlan) => {
    await ProductionDBService.saveDrilling([item])
  },

  patchDrilling: async (id: string, delta: DeltaSet, version: number) => {
    const mappedDelta: any = {}
    Object.entries(delta).forEach(([path, value]) => {
      mappedDelta[`drillingData.${path}`] = value
    })
    
    const payload: DeltaPayload = {
        op: 'PATCH',
        delta: mappedDelta,
        metadata: { id, version, intent: 'DRILLING_PLAN_UPDATE' }
    }
    
    await engineeringSpecService.patchSpec(id, payload.delta, version)
  },

  deleteDrilling: async (id: string) => {
    await engineeringSpecService.deleteSpec(id)
  },

  // --- Labeling (贴标方案) ---

  getLabeling: async (): Promise<LabelingDraft[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('LABELING_DRAFT')
      return raw.map(s => ({
        ...s.labelingData,
        id: s.id,
        version: s._v,
        createdAt: s.createdAt || new Date().toISOString()
      })).filter(item => labelingDraftSchema.safeParse(item).success)
    } catch (e) {
      console.error('Failed to get labeling stats from cloud', e)
      return []
    }
  },

  saveLabeling: async (data: LabelingDraft[]) => {
    if (data.length === 0) return;
    const item = data[0];
    const spec: EngineeringSpec = {
      id: item.id,
      name: item.name,
      code: item.id,
      type: 'LABELING_DRAFT',
      active: true,
      labelingData: item,
      _v: item.version || 1
    }
    await engineeringSpecService.saveSpec(spec);
  },

  saveLabelingItem: async (item: LabelingDraft) => {
    await ProductionDBService.saveLabeling([item])
  },

  patchLabeling: async (id: string, delta: DeltaSet, version: number) => {
    const mappedDelta: any = {}
    Object.entries(delta).forEach(([path, value]) => {
      mappedDelta[`labelingData.${path}`] = value
    })

    const payload: DeltaPayload = {
        op: 'PATCH',
        delta: mappedDelta,
        metadata: { id, version, intent: 'LABELING_DRAFT_UPDATE' }
    }

    await engineeringSpecService.patchSpec(id, payload.delta, version)
  },

  deleteLabeling: async (id: string) => {
    await engineeringSpecService.deleteSpec(id)
  }
}
