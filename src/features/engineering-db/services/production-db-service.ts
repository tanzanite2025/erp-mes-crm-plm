import {
  type DrillingPlan,
  type DrillingPlanInput,
  type LabelingDraft,
  type LabelingDraftInput,
  drillingPlanSchema,
  labelingDraftSchema,
} from '../data/schema'
import {
  engineeringSpecService,
  type EngineeringSpec,
  type EngineeringSpecInput,
} from '@/features/engineering/services/engineering-spec-service'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { failLoudly } from '@/lib/safe-catch'

function toDrillingPlan(spec: EngineeringSpec): DrillingPlan {
  return drillingPlanSchema.parse({
    ...(spec.drillingData ?? {}),
    id: spec.id,
    version: spec._v,
    createdAt: spec.createdAt,
  })
}

function toLabelingDraft(spec: EngineeringSpec): LabelingDraft {
  return labelingDraftSchema.parse({
    ...(spec.labelingData ?? {}),
    id: spec.id,
    version: spec._v,
    createdAt: spec.createdAt,
  })
}

/**
 * 生产数据库服务 (Production DB Service)
 * 职责: 管理钻孔 (Drilling) 与贴标 (Labeling) 等物理生产工艺参数。
 */
export const ProductionDBService = {
  // --- Drilling (钻孔方案) ---
  
  getDrilling: async (): Promise<DrillingPlan[]> => {
    try {
      const raw = await engineeringSpecService.getSpecs('DRILLING_PLAN')
      return raw.map(toDrillingPlan)
    } catch (e) {
      failLoudly(e, 'ProductionDBService.getDrilling')
      return []
    }
  },

  saveDrilling: async (data: DrillingPlanInput[]) => {
    if (data.length === 0) return;
    const item = data[0];
    const spec: EngineeringSpecInput = {
      name: item.name,
      type: 'DRILLING_PLAN',
      active: true,
      drillingData: item,
      _v: item.version || 1
    }
    await engineeringSpecService.saveSpec(spec);
  },

  saveDrillingItem: async (item: DrillingPlanInput) => {
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
      return raw.map(toLabelingDraft)
    } catch (e) {
      failLoudly(e, 'ProductionDBService.getLabeling')
      return []
    }
  },

  saveLabeling: async (data: LabelingDraftInput[]) => {
    if (data.length === 0) return;
    const item = data[0];
    const spec: EngineeringSpecInput = {
      name: item.name,
      type: 'LABELING_DRAFT',
      active: true,
      labelingData: item,
      _v: item.version || 1
    }
    await engineeringSpecService.saveSpec(spec);
  },

  saveLabelingItem: async (item: LabelingDraftInput) => {
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
